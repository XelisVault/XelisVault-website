// Mock XSWD wallet server — simulates Genesix / xelis_wallet XSWD daemon
// on ws://127.0.0.1:44325/xswd, speaking the EXACT protocol from
// xelis-blockchain/xelis_wallet/src/api (xswd_server.rs).
//
// Simulates the human approval delay (3s) to reproduce the real-world
// timing that used to break the 12s client timeout.
//
// Usage: node scripts/mock-xswd-wallet.mjs

import { WebSocketServer } from 'ws'

const PORT = 44325
const APPROVAL_DELAY_MS = 20_000 // 20s "user reads the popup" — longer than the old 12s bug!

// Valid wallet RPC methods (from xelis_wallet/src/api/rpc.rs)
const VALID_METHODS = new Set([
  'get_version', 'get_network', 'get_nonce', 'get_topoheight', 'get_address',
  'split_address', 'rescan', 'get_balance', 'has_balance', 'get_tracked_assets',
  'is_asset_tracked', 'track_asset', 'untrack_asset', 'get_asset_precision',
  'get_assets', 'get_asset', 'get_transaction', 'search_transaction',
  'dump_transaction', 'build_transaction', 'build_transaction_offline',
  'build_unsigned_transaction', 'finalize_unsigned_transaction',
  'sign_unsigned_transaction', 'get_pending_transactions', 'clear_tx_cache',
  'list_transactions', 'is_online', 'set_online_mode', 'set_offline_mode',
  'sign_data', 'verify_signed_data', 'estimate_fees', 'estimate_extra_data_size',
  'network_info', 'decrypt_extra_data', 'decrypt_ciphertext',
  'create_ownership_proof', 'create_balance_proof', 'verify_human_readable_proof',
  'get_matching_keys', 'count_matching_entries', 'get_value_from_key', 'store',
  'delete', 'delete_tree_entries', 'has_key', 'query_db',
  'subscribe', 'unsubscribe',
  'xswd.prefetch_permissions',
])

const XEL = '0'.repeat(64)
const VLT = '3f1f9a3c0a90a0a548670a069e8edad5c0c20914b20b289426b2857c6715f58f'
const XUSD = 'be39794c4a32f231d410c8be3a4d9e80455c667d902c5edf8527dea52533356e'

const log = (...a) => console.log('[mock-wallet]', ...a)

const wss = new WebSocketServer({ host: '127.0.0.1', port: PORT, path: '/xswd' })

wss.on('connection', (ws, req) => {
  if (req.url !== '/xswd') return
  log('dApp connected, waiting for ApplicationData…')
  let registered = false

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(String(raw)) } catch { return log('non-JSON message ignored') }

    // ---- Phase 1: ApplicationData handshake (plain JSON, no jsonrpc field) ----
    if (!registered && !msg.jsonrpc && msg.id !== undefined && msg.name) {
      log(`ApplicationData from "${msg.name}" (${msg.id.slice(0, 12)}…), ${msg.permissions?.length} permissions`)

      // verify_application checks (from xswd/mod.rs)
      if (typeof msg.id !== 'string' || msg.id.length !== 64 || !/^[0-9a-f]+$/.test(msg.id)) {
        return ws.send(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Invalid application id' } }))
      }
      if (!msg.url || !(msg.url.startsWith('http://') || msg.url.startsWith('https://'))) {
        return ws.send(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Invalid URL format' } }))
      }
      for (const p of msg.permissions ?? []) {
        const bare = p.startsWith('wallet.') ? p.slice(7) : p
        if (!VALID_METHODS.has(bare)) {
          log(`REFUSED: unknown permission "${p}" → socket close (real wallet behaviour)`)
          ws.send(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: `Unknown method in permissions list: ${p}` } }))
          return ws.close()
        }
      }

      // Simulate the user reading + accepting the popup
      log(`showing approval popup… auto-accepting in ${APPROVAL_DELAY_MS / 1000}s (simulated slow human)`)
      setTimeout(() => {
        registered = true
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: { message: 'Application has been registered', success: true },
        }))
        log('approved → handshake response sent')
      }, APPROVAL_DELAY_MS)
      return
    }

    // ---- Phase 2: JSON-RPC 2.0 ----
    if (msg.jsonrpc === '2.0') {
      const method = msg.method?.startsWith('wallet.')
        ? msg.method.slice(7)
        : msg.method
      log(`RPC #${msg.id}: ${msg.method}`, msg.params ? JSON.stringify(msg.params).slice(0, 90) : '')

      if (!VALID_METHODS.has(method)) {
        return ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `Method not found: ${method}` } }))
      }

      switch (method) {
        case 'xswd.prefetch_permissions':
          // wallet shows ONE grouped popup — auto-approve after 2s
          setTimeout(() => {
            ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: true }))
            log('prefetch_permissions → true (grouped popup approved)')
          }, 2000)
          break
        case 'get_address':
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: 'xel:n4Y6GPtuWE2wJyE8SLuixyXZ6dCyNM7Tzj6yMByyFtCgBr4t3BiVwGeBcsDhguBZhyJspzLsjUCUqBnvhvhJ4AXjC' }))
          break
        case 'get_balance': {
          const asset = msg.params?.asset ?? XEL
          const balances = { [XEL]: 150_00000000, [VLT]: 42_00000000, [XUSD]: 3000_00000000 }
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: balances[asset] ?? 0 }))
          break
        }
        case 'track_asset':
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { success: true } }))
          break
        case 'subscribe':
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: true }))
          break
        default:
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: true }))
      }
      return
    }

    log('unrecognised message:', String(raw).slice(0, 100))
  })

  ws.on('close', () => log('dApp disconnected'))
})

// health check endpoint like the real one (GET / → "XSWD is running!")
import http from 'http'
http.createServer((_, res) => res.end('XSWD is running !')).listen(44324, '127.0.0.1')

console.log(`[mock-wallet] XSWD mock listening on ws://127.0.0.1:${PORT}/xswd`)
console.log(`[mock-wallet] approval delay: ${APPROVAL_DELAY_MS / 1000}s (reproduces the >12s human case)`)
