// Test — XSWD RELAY handshake: the registration frame, not ApplicationData.
//
// Reproduces the EXACT live failure reported on mainnet:
//   wallet web (QR) → approval OK → site shows "Invalid body in request".
//
// Root cause (verified against xelis-blockchain/xelis_wallet/src/api/xswd/
// relayer/{mod,client}.rs): in RELAY mode the app identity travels in the
// QR — the wallet shows its approval popup at scan time, joins the channel
// only AFTER the user accepts, and its FIRST frame is the registration
// response. From then on the wallet only accepts JSON-RPC requests:
// parse_request_from_bytes() on any other shape → InternalRpcError::
// ParseBodyError → "Invalid body in request" (xelis_common/src/rpc/
// error.rs:44). Our old client sent the ApplicationData on the tunnel
// right after the session resolved → exactly that error.
//
// This test builds the full loop locally:
//   1. a FAKE RELAYER (same rules as xswd-relayer: /ws creates a channel
//      and sends {channel_id, timeout}; /ws/{id} joins and forwards frames)
//   2. the REAL site code: createRelayedConnection (src/lib/xelis/
//      xswd-relay.ts) + XSWDClient (src/lib/xelis/xswd.ts)
//   3. a FAKE WALLET that scans the QR, joins the channel, sends the
//      registration response as its first frame, and then enforces the
//      REAL wallet rule: non-JSON-RPC frames → "Invalid body in request"
//
// Assertions:
//   • the session resolves with firstFrame = the registration response
//   • connect() reaches 'connected' WITHOUT sending anything on the tunnel
//   • wallet.get_address round-trips over the AES-GCM tunnel
//   • REGRESSION: an ApplicationData frame sent on the tunnel is answered
//     "Invalid body in request" (documents why we never send it)
//
// Run: bun scripts/test-xswd-relay-handshake.ts

import { WebSocketServer, WebSocket as WSWebSocket } from 'ws'
import { createRelayedConnection } from '../src/lib/xelis/xswd-relay'
import { XSWDClient } from '../src/lib/xelis/xswd'

const log = (...a: unknown[]) => console.log('[test]', ...a)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── AES-256-GCM helpers (wallet side — mirrors xswd-relay.ts) ─────────
function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

async function importAesKey(hex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', hexToBytes(hex), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function aesEncrypt(plaintext: string, key: CryptoKey): Promise<Uint8Array> {
  const data = new TextEncoder().encode(plaintext)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data))
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(encrypted, iv.length)
  return combined
}

async function aesDecrypt(ciphertext: Uint8Array, key: CryptoKey): Promise<string> {
  const iv = ciphertext.slice(0, 12)
  const encrypted = ciphertext.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
  return new TextDecoder().decode(decrypted)
}

// ── The fake relayer (xswd-relayer rules) ──────────────────────────────
interface Channel {
  host: import('ws').WebSocket
  peer: import('ws').WebSocket | null
}
const channels = new Map<string, Channel>()

const wss = new WebSocketServer({ host: '127.0.0.1', port: 0 })
const RELAYER_PORT: number = await new Promise((resolve) => {
  wss.once('listening', () => resolve((wss as unknown as { address(): { port: number } }).address().port))
})

wss.on('connection', (ws: import('ws').WebSocket, req: { url?: string }) => {
  const url = req.url ?? ''
  if (url === '/ws') {
    // create a channel, send the id, wait for the peer
    const id = crypto.randomUUID()
    channels.set(id, { host: ws, peer: null })
    ws.send(JSON.stringify({ channel_id: id, timeout: 120 }))
    ws.on('close', () => channels.delete(id))
    return
  }
  const channelId = url.replace(/^\/ws\//, '')
  const channel = channels.get(channelId)
  if (!channel) { ws.close(); return }
  // peer (wallet) joined — forward frames both ways
  channel.peer = ws
  log('fake relayer: wallet joined channel', channelId)
  ws.on('message', (data: unknown, isBinary: boolean) => { try { channel.host.send(data as never, { binary: isBinary }) } catch { /* host gone */ } })
  channel.host.on('message', (data: unknown, isBinary: boolean) => { try { ws.send(data as never, { binary: isBinary }) } catch { /* peer gone */ } })
  ws.on('close', () => { try { channel.host.close() } catch { /* already closed */ } })
})

// ── The fake wallet (REAL wallet rules after registration) ────────────
interface WalletSim {
  ws: import('ws').WebSocket
  key: CryptoKey
  frames: string[] // every decrypted frame the wallet received
}

let currentWallet: WalletSim | null = null

async function startFakeWallet(channelUrl: string, keyHex: string, appId: string): Promise<void> {
  const key = await importAesKey(keyHex)
  const ws = new WSWebSocket(channelUrl)
  ws.binaryType = 'arraybuffer'
  currentWallet = { ws, key, frames: [] }
  const sim = currentWallet

  ws.on('open', async () => {
    // the wallet joins ONLY after the user approves (identity came from
    // the QR) — its first frame is the registration response
    await sleep(80) // approval → join → register
    const registration = JSON.stringify({
      jsonrpc: '2.0',
      id: appId,
      result: { message: 'Application has been registered', success: true },
    })
    ws.send(await aesEncrypt(registration, key))
  })

  ws.on('message', async (data: unknown) => {
    const bytes = new Uint8Array(data as ArrayBuffer)
    const plaintext = await aesDecrypt(bytes, key)
    sim.frames.push(plaintext)
    let msg: any
    try { msg = JSON.parse(plaintext) } catch { return }
    // REAL wallet rule (xswd/mod.rs on_request → parse_request_from_bytes):
    // after registration, only { jsonrpc, id, method, params? } is accepted
    const isRpcRequest = typeof msg?.jsonrpc === 'string' && typeof msg?.method === 'string'
    if (!isRpcRequest) {
      const error = JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Invalid body in request' },
      })
      ws.send(await aesEncrypt(error, key))
      return
    }
    // JSON-RPC: answer get_address
    if (msg.method === 'wallet.get_address') {
      const response = JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: 'xel:test:address' })
      ws.send(await aesEncrypt(response, key))
    }
  })

  await new Promise<void>((resolve, reject) => {
    ws.on('open', () => resolve())
    ws.on('error', (e: unknown) => reject(e))
  })
}

function randomAppId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function waitFor(cond: () => boolean, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const t0 = Date.now()
    const tick = () => {
      if (cond()) resolve(true)
      else if (Date.now() - t0 > ms) resolve(false)
      else setTimeout(tick, 25)
    }
    tick()
  })
}

function testAppData() {
  return {
    id: randomAppId(),
    name: 'VaultLaunch',
    description: 'test app',
    url: 'http://127.0.0.1:3000',
    permissions: ['get_address', 'get_balance', 'subscribe'],
  }
}

// ── Scenario 1: the FIXED flow ─────────────────────────────────────────
async function scenarioFixedFlow(): Promise<void> {
  log('── scenario 1: relay connect with the registration frame (the fix)')
  const appData = testAppData()
  currentWallet = null

  const session = await createRelayedConnection({
    relayerUrl: `ws://127.0.0.1:${RELAYER_PORT}/ws`,
    appData,
    timeout: 15_000,
    onQRReady: (qr) => {
      log('QR ready — fake wallet scans it and joins the channel')
      void startFakeWallet(qr.relayer, qr.encryption_mode.key, qr.app_data.id)
    },
  })

  // 1. the session resolved on the wallet's first frame — the registration
  if (!session.firstFrame) throw new Error('FAIL: session resolved without firstFrame')
  const reg = JSON.parse(session.firstFrame)
  if (reg.id !== appData.id || reg.result?.success !== true) {
    throw new Error(`FAIL: firstFrame is not the registration response: ${session.firstFrame}`)
  }
  log('✓ session resolved with the registration response as firstFrame')

  // 2. connect WITHOUT sending anything on the tunnel
  const client = new XSWDClient()
  await client.connect(appData, session.socket as never, session.firstFrame)
  if (client.state !== 'connected') throw new Error(`FAIL: state is ${client.state}, expected connected`)
  log('✓ connect() reached connected')

  // 3. JSON-RPC over the tunnel
  const address = await client.getAddress()
  if (address !== 'xel:test:address') throw new Error(`FAIL: getAddress returned ${address}`)
  log('✓ wallet.get_address round-tripped over the AES-GCM tunnel:', address)

  // 4. the wallet received ONLY the JSON-RPC request — no ApplicationData
  if (!await waitFor(() => (currentWallet?.frames.length ?? 0) === 1, 5000)) {
    throw new Error(`FAIL: expected exactly 1 frame at the wallet, saw ${currentWallet?.frames.length ?? 0}`)
  }
  const only = JSON.parse(currentWallet!.frames[0])
  if (only.method !== 'wallet.get_address' || only.jsonrpc !== '2.0') {
    throw new Error(`FAIL: unexpected frame at the wallet: ${currentWallet!.frames[0]}`)
  }
  log('✓ the wallet received ONLY the JSON-RPC call (no ApplicationData on the tunnel)')

  client.disconnect()
  session.close()
}

// ── Scenario 2: REGRESSION — why ApplicationData must never be sent ────
async function scenarioRegressionOldBug(): Promise<void> {
  log('── scenario 2: regression — sending ApplicationData on the tunnel')
  const appData = testAppData()

  const session = await createRelayedConnection({
    relayerUrl: `ws://127.0.0.1:${RELAYER_PORT}/ws`,
    appData,
    timeout: 15_000,
    onQRReady: (qr) => {
      void startFakeWallet(qr.relayer, qr.encryption_mode.key, qr.app_data.id)
    },
  })

  // the OLD behaviour: send the ApplicationData on the tunnel…
  session.socket.send(JSON.stringify(appData))

  // …and the wallet answers exactly what the real wallet answered on mainnet
  const reply = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('FAIL: no answer from the wallet')), 5000)
    session.socket.addEventListener('message', (ev: Event) => {
      clearTimeout(timer)
      resolve(String((ev as MessageEvent).data))
    })
  })
  const msg = JSON.parse(reply)
  if (msg.error?.message !== 'Invalid body in request') {
    throw new Error(`FAIL: expected 'Invalid body in request', got ${reply}`)
  }
  log("✓ reproduced: an ApplicationData frame on the tunnel → 'Invalid body in request'")
  log('  (this is exactly the error the site showed before the fix)')
  session.close()
}

// ── run ────────────────────────────────────────────────────────────────
try {
  log(`fake relayer listening on ws://127.0.0.1:${RELAYER_PORT}/ws`)
  await scenarioFixedFlow()
  await sleep(150) // let the relayer clean the closed channel
  await scenarioRegressionOldBug()
  log('\nALL TESTS PASSED')
  process.exit(0)
} catch (e) {
  console.error('\n[test] FAILURE:', e)
  process.exit(1)
} finally {
  wss.close()
}
