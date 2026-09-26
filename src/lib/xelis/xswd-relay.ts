// XSWD RELAY — connect web dApps to wallets that can't accept local
// WebSocket connections (Genesix WEB at wallet.xelis.io, Genesix mobile)
// through the official XELIS relay server with END-TO-END encryption.
//
// Vendored & adapted from xelis-project/xswd-connect (MIT) — the
// official TypeScript relay client, files src/RelayerClient.ts,
// src/TunneledWebSocket.ts and src/crypto/aes.ts, version 0.1.2.
// Trimmed to what this site needs: no bundled QR widget (we render the
// QR with the `qrcode` package already in the tree), no bundled
// XSWD client (we run our battle-tested lib/xelis/xswd.ts on top of
// the tunneled socket). Protocol logic is UNCHANGED.
//
// Flow (the official XELIS standard QR payload):
//   1. the dApp opens a WebSocket to the relayer (wss://relay.xelis.io/ws)
//      and receives a fresh channel_id + the relayer's own timeout
//   2. an AES-256-GCM key is generated locally and exported to hex
//   3. the QR payload { app_data, relayer: <url>/<channel>, encryption_mode }
//      is shown to the user — the WALLET scans (or pastes) it
//   4. the wallet connects to the same channel; every frame is
//      AES-GCM encrypted with the key from the QR — the relayer NEVER
//      sees plaintext (zero trust)
//   5. once the wallet's first frame arrives, the returned socket is a
//      drop-in WebSocket: our XSWDClient runs its normal
//      ApplicationData handshake + JSON-RPC on top of it
//
// The relay only ever sees ciphertext: it can route, but not read,
// alter (GCM authenticates), or replay (fresh key per channel).

'use client'

// ── AES-256-GCM (WebCrypto) ─────────────────────────────────────────

async function aesGenerateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

async function aesExportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key)
  return Array.from(new Uint8Array(exported))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Encrypt to bytes with a fresh 12-byte IV prepended (GCM). */
async function aesEncryptBytes(plaintext: string, key: CryptoKey): Promise<Uint8Array> {
  const data = new TextEncoder().encode(plaintext)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)
  return combined
}

/** Decrypt base64 ciphertext with the IV prepended. */
async function aesDecrypt(ciphertext: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
  return new TextDecoder().decode(decrypted)
}

function bytesToBase64(bytes: Uint8Array): string {
  // chunked conversion — no stack overflow on big frames
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

// ── TunneledWebSocket — a WebSocket-shaped view of the relay channel ──

/**
 * Wraps the relayer WebSocket with optional AES encryption.
 * Implements the surface our XSWDClient uses: onopen/onmessage/onclose/
 * onerror, send(), close(), readyState, add/removeEventListener.
 * Async work (encrypt / decrypt / Blob conversion) is serialized in
 * both directions (sendChain / recvChain) so ordering is preserved —
 * XSWD's JSON-RPC must never see reordered frames.
 */
export class TunneledWebSocket {
  private relayerWs: WebSocket
  private encryptionKey?: CryptoKey

  private messageListeners = new Set<EventListener>()
  private openListeners = new Set<EventListener>()
  private closeListeners = new Set<EventListener>()
  private errorListeners = new Set<EventListener>()

  private sendChain: Promise<void> = Promise.resolve()
  private recvChain: Promise<void> = Promise.resolve()

  private _onopen: ((e: Event) => any) | null = null
  private _onmessage: ((e: MessageEvent) => any) | null = null
  private _onclose: ((e: CloseEvent) => any) | null = null
  private _onerror: ((e: Event) => any) | null = null

  readonly CONNECTING = WebSocket.CONNECTING
  readonly OPEN = WebSocket.OPEN
  readonly CLOSING = WebSocket.CLOSING
  readonly CLOSED = WebSocket.CLOSED

  constructor(relayerWs: WebSocket, encryptionKey?: CryptoKey) {
    this.relayerWs = relayerWs
    this.encryptionKey = encryptionKey
    this.relayerWs.addEventListener('open', this.handleOpen)
    this.relayerWs.addEventListener('close', this.handleClose as any)
    this.relayerWs.addEventListener('error', this.handleError)
    this.relayerWs.addEventListener('message', this.handleMessage)
  }

  get readyState(): number {
    return this.relayerWs.readyState
  }

  get bufferedAmount(): number {
    return this.relayerWs.bufferedAmount
  }

  get binaryType(): BinaryType {
    return this.relayerWs.binaryType
  }
  set binaryType(value: BinaryType) {
    this.relayerWs.binaryType = value
  }

  get onopen() { return this._onopen }
  set onopen(fn: ((e: Event) => any) | null) { this._onopen = fn }

  get onmessage() { return this._onmessage }
  set onmessage(fn: ((e: MessageEvent) => any) | null) { this._onmessage = fn }

  get onclose() { return this._onclose }
  set onclose(fn: ((e: CloseEvent) => any) | null) { this._onclose = fn }

  get onerror() { return this._onerror }
  set onerror(fn: ((e: Event) => any) | null) { this._onerror = fn }

  /** Synchronous outward (like a native WebSocket); encryption queued. */
  send(data: string | ArrayBuffer | Blob): void {
    this.sendChain = this.sendChain
      .then(() => this.sendInternal(data))
      .catch(() => { /* never break the chain */ })
  }

  private async sendInternal(data: string | ArrayBuffer | Blob): Promise<void> {
    if (this.readyState !== WebSocket.OPEN) throw new Error('WebSocket is not open')
    let payload: string
    if (data instanceof ArrayBuffer) {
      payload = new TextDecoder().decode(data)
    } else if (data instanceof Blob) {
      payload = await data.text()
    } else {
      payload = data
    }
    if (this.encryptionKey) {
      const encrypted = await aesEncryptBytes(payload, this.encryptionKey)
      this.relayerWs.send(encrypted.buffer as ArrayBuffer)
    } else {
      this.relayerWs.send(payload)
    }
  }

  close(code?: number, reason?: string): void {
    try {
      this.relayerWs.close(code, reason)
    } catch { /* already closed */ }
  }

  addEventListener(type: string, listener: EventListener): void {
    switch (type) {
      case 'message': this.messageListeners.add(listener); break
      case 'open': this.openListeners.add(listener); break
      case 'close': this.closeListeners.add(listener); break
      case 'error': this.errorListeners.add(listener); break
    }
  }

  removeEventListener(type: string, listener: EventListener): void {
    switch (type) {
      case 'message': this.messageListeners.delete(listener); break
      case 'open': this.openListeners.delete(listener); break
      case 'close': this.closeListeners.delete(listener); break
      case 'error': this.errorListeners.delete(listener); break
    }
  }

  private handleOpen = (event: Event) => {
    try { this._onopen?.(event) } catch { /* handler error */ }
    this.openListeners.forEach((l) => { try { l(event) } catch { /* ignore */ } })
  }

  private handleClose = (event: CloseEvent) => {
    try { this._onclose?.(event) } catch { /* handler error */ }
    this.closeListeners.forEach((l) => { try { l(event) } catch { /* ignore */ } })
    this.cleanup()
  }

  private handleError = (event: Event) => {
    try { this._onerror?.(event) } catch { /* handler error */ }
    this.errorListeners.forEach((l) => { try { l(event) } catch { /* ignore */ } })
  }

  private handleMessage = (event: MessageEvent) => {
    this.recvChain = this.recvChain
      .then(() => this.handleMessageInternal(event))
      .catch(() => { /* decrypt failure — dropped frame */ })
  }

  private async handleMessageInternal(event: MessageEvent) {
    let data: any = event.data
    if (this.encryptionKey) {
      if (typeof data === 'string') {
        data = await aesDecrypt(data, this.encryptionKey)
      } else if (data instanceof ArrayBuffer) {
        data = await aesDecrypt(bytesToBase64(new Uint8Array(data)), this.encryptionKey)
      } else if (data instanceof Blob) {
        const buf = await data.arrayBuffer()
        data = await aesDecrypt(bytesToBase64(new Uint8Array(buf)), this.encryptionKey)
      } else {
        return
      }
    }
    const newEvent = new MessageEvent('message', {
      data,
      origin: event.origin,
      lastEventId: event.lastEventId,
      source: event.source,
      ports: event.ports as any,
    })
    try { this._onmessage?.(newEvent) } catch { /* handler error */ }
    this.messageListeners.forEach((l) => { try { l(newEvent) } catch { /* ignore */ } })
  }

  private cleanup(): void {
    this.relayerWs.removeEventListener('open', this.handleOpen)
    this.relayerWs.removeEventListener('close', this.handleClose as any)
    this.relayerWs.removeEventListener('error', this.handleError)
    this.relayerWs.removeEventListener('message', this.handleMessage)
    this.messageListeners.clear()
    this.openListeners.clear()
    this.closeListeners.clear()
    this.errorListeners.clear()
    this._onopen = null
    this._onmessage = null
    this._onclose = null
    this._onerror = null
  }
}

// ── The relayed connection (channel creation + QR payload) ──────────

/** The official XELIS standard QR payload (what the wallet scans). */
export interface RelayerQRData {
  app_data: {
    id: string
    name: string
    description: string
    url?: string
    permissions: string[]
  }
  /** full channel URL: <relayer>/<channel_id> */
  relayer: string
  encryption_mode: { mode: 'aes'; key: string }
}

export interface RelayedConnection {
  /** WebSocket-shaped tunnel — feed it to XSWDClient.connect */
  socket: TunneledWebSocket
  /** the QR payload (JSON string) — render it as a QR / copyable code */
  qrData: string
  /** the relayer's own channel timeout, seconds (for the countdown) */
  timeoutSeconds: number | undefined
  /** close the channel */
  close: () => void
}

export interface RelayConnectOptions {
  /** relayer WebSocket URL (default: the official XELIS relay) */
  relayerUrl?: string
  /** how long to wait for the wallet to scan, ms (default 3 min) */
  timeout?: number
  appData: RelayerQRData['app_data']
  /** the QR payload is ready — show it to the user */
  onQRReady?: (qr: RelayerQRData) => void
  onConnected?: () => void
  onError?: (error: Error) => void
  onClose?: (event: CloseEvent) => void
}

export const DEFAULT_RELAYER_URL = 'wss://relay.xelis.io/ws'

/**
 * Open a relay channel and wait for the wallet to join it.
 * Resolves with the tunneled socket once the wallet's first frame
 * arrives — the standard XSWD handshake (ApplicationData → approval)
 * still has to run on the socket afterwards, exactly like a local
 * connection.
 */
export function createRelayedConnection(options: RelayConnectOptions): Promise<RelayedConnection> {
  const {
    relayerUrl = DEFAULT_RELAYER_URL,
    timeout = 180_000,
    appData,
    onQRReady,
    onConnected,
    onError,
    onClose,
  } = options

  return new Promise((resolve, reject) => {
    let encryptionKey: CryptoKey | undefined
    let exportedKey = ''
    let channelId = ''
    let relayerWs: WebSocket
    let tunneledSocket: TunneledWebSocket
    let timeoutHandle: ReturnType<typeof setTimeout>
    let isResolved = false
    let relayerTimeoutSeconds: number | undefined

    const cleanup = () => {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      if (relayerWs && relayerWs.readyState === WebSocket.OPEN) relayerWs.close()
    }

    const handleError = (error: Error) => {
      if (isResolved) return
      isResolved = true
      cleanup()
      onError?.(error)
      reject(error)
    }

    const handleSuccess = () => {
      if (isResolved) return
      isResolved = true
      if (timeoutHandle) clearTimeout(timeoutHandle)
      onConnected?.()
      const result: RelayedConnection = {
        socket: tunneledSocket,
        qrData: JSON.stringify(createQRDataObj()),
        timeoutSeconds: relayerTimeoutSeconds,
        close: () => tunneledSocket.close(),
      }
      resolve(result)
    }

    const createQRDataObj = (): RelayerQRData => ({
      app_data: appData,
      relayer: `${relayerUrl}/${channelId}`,
      encryption_mode: { mode: 'aes', key: exportedKey },
    })

    timeoutHandle = setTimeout(() => {
      handleError(new Error('Connection timed out — the wallet did not scan the code in time.'))
    }, timeout)

    const initPromise = (async () => {
      encryptionKey = await aesGenerateKey()
      exportedKey = await aesExportKey(encryptionKey)
    })()

    relayerWs = new WebSocket(relayerUrl)

    relayerWs.addEventListener('error', () => {
      handleError(new Error('Cannot reach the XSWD relay (relay.xelis.io). Try again or use the desktop wallet.'))
    })

    relayerWs.addEventListener('close', (event) => {
      if (!isResolved) {
        const reason = event.reason
          || (event.code === 1006 ? 'could not reach the relay' : 'unknown reason')
        handleError(new Error(`Relay connection closed: ${reason}`))
      }
      onClose?.(event)
    })

    relayerWs.addEventListener('message', (event: MessageEvent) => {
      try {
        // text = control messages from the relayer; binary = encrypted
        // wallet frames (handled by the tunnel)
        if (typeof event.data !== 'string') return
        const data = JSON.parse(event.data)
        if (data.type === 'peer_connected') return // handled by the tunnel
        if (!data.channel_id) {
          handleError(new Error('Invalid response from the relay server'))
          return
        }
        channelId = data.channel_id
        relayerTimeoutSeconds = typeof data.timeout === 'number' ? data.timeout : undefined

        void initPromise.then(() => {
          onQRReady?.(createQRDataObj())
        })

        tunneledSocket = new TunneledWebSocket(relayerWs, encryptionKey)

        // the wallet's first frame = the peer is connected and the
        // relay is routing — resolve
        const handleFirstMessage = () => {
          removeEarlyListeners()
          handleSuccess()
        }
        const handleEarlyError = () => {
          removeEarlyListeners()
          handleError(new Error('Connection lost before the wallet joined.'))
        }
        const handleEarlyClose = () => {
          removeEarlyListeners()
          if (!isResolved) handleError(new Error('Connection closed before the wallet joined.'))
        }
        const removeEarlyListeners = () => {
          tunneledSocket.removeEventListener('message', handleFirstMessage)
          tunneledSocket.removeEventListener('error', handleEarlyError)
          tunneledSocket.removeEventListener('close', handleEarlyClose)
        }
        tunneledSocket.addEventListener('message', handleFirstMessage)
        tunneledSocket.addEventListener('error', handleEarlyError)
        tunneledSocket.addEventListener('close', handleEarlyClose)
      } catch (error) {
        handleError(error instanceof Error ? error : new Error(String(error)))
      }
    })
  })
}
