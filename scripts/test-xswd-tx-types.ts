// Test — XSWD transaction payloads vs the REAL wallet's type rules.
//
// Reproduces the exact CommunityLaunch buy that failed on mainnet with
// `invalid type string "500000000", expected u64` and proves the fix:
//
//   1. a strict mini-wallet (same serde rules as xelis_wallet — verified
//      against xelis_common/transaction/builder/payload/mod.rs and
//      xelis_vm types/src/values/mod.rs) listens on ws://127.0.0.1:44325
//   2. the REAL XSWDClient (src/lib/xelis/xswd.ts) connects to it
//   3. we send the same invoke as buyCoinTx (entry 16, 5 XEL deposit)
//      plus a >2^53 transfer to prove bigint precision survives
//   4. we assert on the RAW wire JSON:
//        • deposits[].amount  → UNQUOTED number  (bare u64 — was the bug)
//        • transfers[].amount → UNQUOTED number, bit-exact at 1.2e19
//        • ValueCell u64 params → QUOTED string (xelis-vm custom serde)
//        • max_gas / entry_id  → numbers
//
// Run: bun scripts/test-xswd-tx-types.ts
// (use scripts/mock-xswd-wallet.mjs for a long-lived mock with 20s approval)

import { WebSocketServer } from 'ws'
import { getXSWDClient } from '../src/lib/xelis/xswd'
import { valU64, valStr } from '../src/lib/xelis/types'

const XEL = '0'.repeat(64)
const PORT = 44325
const t0 = Date.now()
const log = (...a: unknown[]) => console.log(`[+${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a)

// ── 1. strict mini-wallet ────────────────────────────────────────────
const wire: string[] = [] // every raw JSON message the client sends
const failures: string[] = []

function validateBuildTx(msg: any): string | null {
  const tx = msg.params ?? {}
  const inv = tx.invoke_contract
  if (inv) {
    if (typeof inv.max_gas !== 'number') return `max_gas must be a number, got ${JSON.stringify(inv.max_gas)}`
    if (typeof inv.entry_id !== 'number') return `entry_id must be a number, got ${JSON.stringify(inv.entry_id)}`
    for (const [asset, dep] of Object.entries<any>(inv.deposits ?? {})) {
      if (typeof dep?.amount !== 'number')
        return `deposit ${asset.slice(0, 8)}… amount must be a NUMBER (bare u64), got string "${dep?.amount}"`
    }
    for (let i = 0; i < (inv.parameters ?? []).length; i++) {
      const p = inv.parameters[i]
      if (p?.type === 'primitive' && ['u64', 'u128', 'u256'].includes(p.value?.type) && typeof p.value?.value !== 'string')
        return `parameter #${i} (${p.value?.type}) must be a STRING (xelis-vm string serde), got ${typeof p.value?.value}`
    }
  }
  for (let i = 0; i < (tx.transfers ?? []).length; i++) {
    const t = tx.transfers[i]
    if (typeof t?.amount !== 'number') return `transfer #${i} amount must be a NUMBER (bare u64), got string "${t?.amount}"`
  }
  if (tx.fee?.fixed != null && typeof tx.fee.fixed !== 'number') return 'fee.fixed must be a number'
  return null
}

const wss = new WebSocketServer({ host: '127.0.0.1', port: PORT, path: '/xswd' })
wss.on('connection', (ws) => {
  let registered = false
  ws.on('message', (raw) => {
    const s = String(raw)
    let msg: any
    try { msg = JSON.parse(s) } catch { return }

    if (!registered && !msg.jsonrpc && msg.name) {
      // instant approval — this test is about TYPES, not timing
      registered = true
      wire.push(s)
      return ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { message: 'Application has been registered', success: true } }))
    }
    if (msg.jsonrpc === '2.0') {
      wire.push(s)
      const method = String(msg.method ?? '').replace(/^wallet\./, '')
      if (method === 'build_transaction') {
        const err = validateBuildTx(msg)
        if (err) {
          log('❌ mini-wallet REFUSED:', err)
          failures.push(`wallet refused build_transaction: ${err}`)
          return ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: `Invalid params: invalid type, expected u64 — ${err}` } }))
        }
        log('✓ mini-wallet accepted build_transaction (types match the real wallet)')
        return ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { hash: 'f'.padEnd(64, '0') } }))
      }
      return ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: true }))
    }
  })
})

// ── 2. drive the REAL client ─────────────────────────────────────────
function assert(cond: boolean, label: string) {
  if (cond) { log(`✓ ${label}`) } else { log(`✗ ${label}`); failures.push(label) }
}

try {
  const client = getXSWDClient()
  await client.connect()
  assert(client.state === 'connected', 'XSWDClient connected to the strict mini-wallet')

  // ── the exact failing call: CommunityLaunch buy, entry 16, 5 XEL ──
  const invokeJson = await (async () => {
    const p = client.invokeContract({
      contract: 'c'.repeat(64),
      entryId: 16, // COMMUNITY_ENTRIES.buy
      parameters: [valU64(1), valU64(9_876_543_210_987_654_321n)], // cid + min_tokens_out (> 2^53!)
      deposits: { [XEL]: { amount: 500000000n } }, // 5 XEL — the "500000000" from the bug report
      maxGas: 5_000_000,
      permission: 'all',
    })
    const r = await p
    return r
  })()
  assert(invokeJson.length === 64, `invoke broadcast returned a hash (${invokeJson.slice(0, 8)}…)`)

  // transfer with a >2^53 amount — precision must survive bit-exact
  const transferHash = await client.transfer({ destination: 'xel:test', amount: 12_345_678_901_234_567_890n })
  assert(transferHash.length === 64, 'transfer broadcast returned a hash')

  // a string parameter (propose-style) still round-trips as a ValueCell string
  await client.invokeContract({
    contract: 'c'.repeat(64),
    entryId: 20,
    parameters: [valU64(7), valStr('XVLT')],
    maxGas: 5_000_000,
  })

  // ── 3. assert on the RAW wire bytes ────────────────────────────────
  const buyMsg = wire.find((s) => s.includes('"entry_id":16'))
  const transferMsg = wire.find((s) => s.includes('"transfers"'))
  const strParamMsg = wire.find((s) => s.includes('XVLT'))

  assert(buyMsg != null, 'the buy invoke reached the wallet')
  if (buyMsg) {
    assert(buyMsg.includes('"amount":500000000,'), 'deposit amount is an UNQUOTED JSON number (was the bug: "500000000")')
    assert(!buyMsg.includes('"amount":"500000000"'), 'deposit amount is NOT a string anymore')
    assert(buyMsg.includes('"max_gas":5000000'), 'max_gas is a number')
    assert(buyMsg.includes('"entry_id":16'), 'entry_id is a number')
    assert(buyMsg.includes('"value":"1"'), 'ValueCell u64 param (cid) is a QUOTED string (xelis-vm serde)')
    assert(buyMsg.includes('"value":"9876543210987654321"'), '>2^53 u64 param is a bit-exact string')
  }
  assert(transferMsg != null, 'the transfer reached the wallet')
  if (transferMsg) {
    assert(transferMsg.includes('"amount":12345678901234567890'), '>2^53 transfer amount is an UNQUOTED, BIT-EXACT number (no 2^53 loss)')
    assert(!transferMsg.includes('"amount":"12345678901234567890"'), 'transfer amount is NOT a string')
  }
  assert(strParamMsg != null && strParamMsg.includes('"value":"XVLT"'), 'string ValueCell params unchanged')
} finally {
  wss.close()
}

console.log('')
if (failures.length) {
  console.error(`FAILED — ${failures.length} assertion(s):`)
  for (const f of failures) console.error(`  ✗ ${f}`)
  process.exit(1)
}
console.log('ALL PASS — transaction payloads match the real wallet\'s type rules exactly.')
process.exit(0)
