// XSWD Client — XELIS Secure WebSocket Daemon
//
// Connects to a local XELIS wallet (Genesix / xelis_wallet) on ws://127.0.0.1:44325/xswd.
// Validated against the official docs + xelis_wallet source (api/xswd):
//
//  1. Open WebSocket to ws://127.0.0.1:44325/xswd
//  2. Send ApplicationData as FIRST message (plain JSON, no JSON-RPC wrapper):
//     { id: <64 hex>, name ≤32, description ≤255, url, permissions: [<wallet methods>] }
//     ⚠ id MUST be 64 hex chars and MUST be regenerated for each connection attempt
//       (an already-used id → ApplicationIdAlreadyUsed + socket close)
//  3. Wallet shows an approval popup. Response after approval:
//     { id: "<app id>", jsonrpc: "2.0", result: { message: "Application has been registered", success: true } }
//     On refusal: JSON-RPC error, then the wallet CLOSES the socket.
//  4. Subsequent messages are JSON-RPC 2.0:
//     { jsonrpc: "2.0", id: N, method: "wallet.<method>" | "node.<method>" | "xswd.<method>", params? }
//     - wallet.* requires permissions; node.* proxies to the daemon (no permission)
//  5. Events: subscribe via { method: "subscribe", params: { notify: "balance_changed" } }
//
// Permissions list MUST contain only valid wallet RPC method names
// (unknown names → UnknownMethodInPermissionsList + socket close).
// We also call xswd.prefetch_permissions so the user approves everything in one popup.

export type XSWDState = 'disconnected' | 'connecting' | 'awaiting-approval' | 'connected' | 'error'

export interface XSWDAppData {
  id: string
  name: string
  description: string
  url: string | null
  permissions: string[]
}

type Notification = { method?: string; params?: any; result?: any }

type PendingRequest = {
  resolve: (value: any) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout> | null
}

const XSWD_URL = 'ws://127.0.0.1:44325/xswd'

// Valid wallet RPC methods we use (must all exist on the wallet API)
export const XSWD_PERMISSIONS = [
  'get_address',
  'get_balance',
  'get_assets',
  'get_tracked_assets',
  'track_asset',
  'get_nonce',
  'get_topoheight',
  'estimate_fees',
  'build_transaction',
  'get_transaction',
  'list_transactions',
  'get_pending_transactions',
  'sign_data',
]

// XSWD requests wait for user approval — no aggressive timeout.
// 120s allows the user to open Genesix and click Approve.
const REQUEST_TIMEOUT_MS = 120_000

function randomAppId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export class XSWDClient {
  private ws: WebSocket | null = null
  private appId = ''
  private reqId = 0
  private pending = new Map<number, PendingRequest>()
  private state: XSWDState = 'disconnected'
  private stateListeners = new Set<(s: XSWDState, msg?: string) => void>()
  private notificationListeners = new Set<(n: Notification) => void>()
  private connectReject: ((e: Error) => void) | null = null
  private manualClose = false

  get state(): XSWDState { return this.state }

  onStateChange(listener: (s: XSWDState, msg?: string) => void): () => void {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  onNotification(listener: (n: Notification) => void): () => void {
    this.notificationListeners.add(listener)
    return () => this.notificationListeners.delete(listener)
  }

  private setState(s: XSWDState, msg?: string) {
    this.state = s
    this.stateListeners.forEach((l) => l(s, msg))
  }

  /** Open the WebSocket and perform the ApplicationData handshake. */
  async connect(appData?: Partial<XSWDAppData>): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting' || this.state === 'awaiting-approval') {
      return
    }
    this.manualClose = false
    this.setState('connecting')

    // Regenerate app id on every attempt (a reused id is rejected)
    this.appId = randomAppId()

    const data: XSWDAppData = {
      id: this.appId,
      name: 'XELIS Vault',
      description: 'Confidential-first DeFi on XELIS: vaults, xUSD, swaps, mining and governance.',
      url: typeof window !== 'undefined' ? window.location.origin : null,
      permissions: XSWD_PERMISSIONS,
      ...appData,
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false
      const ws = new WebSocket(XSWD_URL)
      this.ws = ws
      this.connectReject = reject

      const failTimer = setTimeout(() => {
        if (!settled) {
          settled = true
          this.cleanupSocket()
          reject(new Error(
            'Cannot reach the wallet on ws://127.0.0.1:44325. Is Genesix (or xelis_wallet) running?'
          ))
        }
      }, 12_000)

      ws.onopen = () => {
        this.setState('awaiting-approval', 'Waiting for wallet approval…')
        // First message: ApplicationData (plain JSON)
        ws.send(JSON.stringify(data))
      }

      ws.onerror = () => {
        if (!settled) {
          settled = true
          clearTimeout(failTimer)
          this.cleanupSocket()
          this.setState('error', 'Wallet not detected')
          reject(new Error(
            'Cannot reach the wallet on ws://127.0.0.1:44325. Is Genesix (or xelis_wallet) running?'
          ))
        }
      }

      ws.onclose = () => {
        clearTimeout(failTimer)
        if (!settled) {
          settled = true
          this.setState('disconnected')
          reject(new Error('Wallet refused the connection (or is closing). Try again from the wallet popup.'))
        } else {
          this.handleDisconnect()
        }
      }

      ws.onmessage = (ev) => {
        let msg: any
        try { msg = JSON.parse(String(ev.data)) } catch { return }
        // Handshake response: { id: <appId>, jsonrpc: "2.0", result: { success: true, message } }
        if (settled === false && msg.id === this.appId && msg.result && typeof msg.result === 'object' && 'success' in msg.result) {
          if (msg.result.success === true) {
            settled = true
            clearTimeout(failTimer)
            this.setState('connected')
            this.prefetchPermissions().catch(() => {})
            resolve()
          } else {
            settled = true
            clearTimeout(failTimer)
            this.cleanupSocket()
            this.setState('error', 'Connection refused by wallet')
            reject(new Error(msg.result.message || 'Wallet refused the connection'))
          }
          return
        }
        // Legacy handshake shape (older wallets): { id: null, result: true }
        if (settled === false && msg.result === true) {
          settled = true
          clearTimeout(failTimer)
          this.setState('connected')
          this.prefetchPermissions().catch(() => {})
          resolve()
          return
        }
        // JSON-RPC error during handshake
        if (settled === false && msg.error) {
          settled = true
          clearTimeout(failTimer)
          this.cleanupSocket()
          this.setState('error', msg.error.message)
          reject(new Error(msg.error.message || 'Wallet rejected the application'))
          return
        }

        // Post-handshake traffic
        this.handleMessage(msg)
      }
    })
  }

  private handleMessage(msg: any) {
    if (msg && typeof msg.id === 'number' && (msg.result !== undefined || msg.error !== undefined)) {
      const p = this.pending.get(msg.id)
      if (p) {
        this.pending.delete(msg.id)
        if (p.timer) clearTimeout(p.timer)
        if (msg.error) p.reject(new Error(msg.error.message || 'XSWD error'))
        else p.resolve(msg.result)
        return
      }
    }
    // Notifications (events): { method: "...", params: {...} } or { result: {...} }
    this.notificationListeners.forEach((l) => l(msg))
  }

  private handleDisconnect() {
    // Reject all pending
    for (const [id, p] of this.pending) {
      if (p.timer) clearTimeout(p.timer)
      p.reject(new Error('XSWD connection closed'))
      this.pending.delete(id)
    }
    if (!this.manualClose) this.setState('disconnected', 'Wallet connection lost')
    else this.setState('disconnected')
  }

  private cleanupSocket() {
    if (this.ws) {
      try { this.ws.onclose = null; this.ws.onerror = null; this.ws.onmessage = null; this.ws.onopen = null } catch {}
      try { this.ws.close() } catch {}
      this.ws = null
    }
  }

  disconnect() {
    this.manualClose = true
    this.cleanupSocket()
    for (const [id, p] of this.pending) {
      if (p.timer) clearTimeout(p.timer)
      p.reject(new Error('Disconnected'))
      this.pending.delete(id)
    }
    this.setState('disconnected')
  }

  /** Ask the wallet to pre-approve all our permissions in one popup. */
  private async prefetchPermissions(): Promise<void> {
    try {
      await this.call('xswd.prefetch_permissions', {
        reason: 'XELIS Vault needs these permissions to display your balances and build transactions.',
        permissions: XSWD_PERMISSIONS,
      })
    } catch {
      // Not critical — the wallet will prompt per method
    }
  }

  /** Generic JSON-RPC call through XSWD (wallet.* / node.* / xswd.*). */
  call(method: string, params?: Record<string, any> | any[]): Promise<any> {
    if (this.state !== 'connected' || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('XSWD not connected'))
    }
    const id = ++this.reqId
    const payload: Record<string, any> = { jsonrpc: '2.0', id, method }
    if (params !== undefined) payload.params = params
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`${method}: timeout (${REQUEST_TIMEOUT_MS / 1000}s — was the wallet popup answered?)`))
      }, REQUEST_TIMEOUT_MS)
      this.pending.set(id, { resolve, reject, timer })
      this.ws!.send(JSON.stringify(payload))
    })
  }

  // ---- Wallet helpers (typed) ----

  async getAddress(): Promise<string> {
    return this.call('wallet.get_address')
  }

  async getBalance(asset: string): Promise<bigint> {
    const res = await this.call('wallet.get_balance', { asset })
    return BigInt(res ?? 0)
  }

  async trackAsset(asset: string): Promise<void> {
    try { await this.call('wallet.track_asset', { asset }) } catch { /* already tracked or prompt refused */ }
  }

  async getTopoheight(): Promise<number> {
    return this.call('wallet.get_topoheight')
  }

  async estimateFees(txType: string, payload: Record<string, any>): Promise<any> {
    return this.call('wallet.estimate_fees', { tx_type: txType, ...payload })
  }

  /** Build & broadcast an invoke_contract transaction. Returns the tx hash. */
  async invokeContract(args: {
    contract: string
    entryId: number
    parameters: any[]
    deposits?: Record<string, { amount: bigint | number; private?: boolean }>
    maxGas?: number
    fee?: number
    permission?: 'none' | 'all'
  }): Promise<string> {
    const deposits: Record<string, { amount: string; private: boolean }> = {}
    for (const [asset, d] of Object.entries(args.deposits ?? {})) {
      deposits[asset] = {
        amount: BigInt(d.amount).toString(),
        private: d.private ?? false,
      }
    }
    const params: Record<string, any> = {
      invoke_contract: {
        contract: args.contract,
        entry_id: args.entryId,
        parameters: args.parameters,
        max_gas: args.maxGas ?? 5_000_000,
        permission: args.permission ?? 'all',
        ...(Object.keys(deposits).length ? { deposits } : {}),
      },
      broadcast: true,
      tx_as_hex: false,
    }
    if (args.fee != null) params.fee = { fixed: args.fee }
    const res = await this.call('wallet.build_transaction', params)
    return res?.hash ?? res?.data?.hash ?? 'submitted'
  }

  /** Build & broadcast a simple transfer. Returns the tx hash. */
  async transfer(args: {
    destination: string
    amount: bigint | number
    asset?: string
    fee?: number
  }): Promise<string> {
    const params: Record<string, any> = {
      transfers: [{
        destination: args.destination,
        amount: BigInt(args.amount).toString(),
        asset: args.asset ?? '0'.repeat(64),
      }],
      broadcast: true,
      tx_as_hex: false,
    }
    if (args.fee != null) params.fee = { fixed: args.fee }
    const res = await this.call('wallet.build_transaction', params)
    return res?.hash ?? 'submitted'
  }

  /** Subscribe to a wallet event (e.g. balance_changed, new_transaction). */
  async subscribe(notify: string): Promise<any> {
    return this.call('subscribe', { notify })
  }

  // ---- Node helpers (proxied through the wallet's daemon) ----

  async getNodeInfo(): Promise<any> {
    return this.call('node.get_info')
  }

  async getTransactionFromNode(hash: string): Promise<any> {
    return this.call('node.get_transaction', { hash })
  }

  async getContractLogs(caller: string): Promise<any[]> {
    try {
      const res = await this.call('node.get_contract_logs', { caller })
      return Array.isArray(res) ? res : []
    } catch {
      return []
    }
  }
}

// Singleton
let client: XSWDClient | null = null

export function getXSWDClient(): XSWDClient {
  if (!client) client = new XSWDClient()
  return client
}
