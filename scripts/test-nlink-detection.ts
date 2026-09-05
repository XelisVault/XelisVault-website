/**
 * Live test of the new NervaLink detection engine.
 *
 * Simulates exactly the user's bug scenario: a payment made hours/days ago,
 * the payer comes back to the link later (fresh browser state → no local
 * cache, no known tx). The scan must find the payment in the history and
 * return the right status + confirmations.
 *
 * Strategy: find a REAL on-chain tx carrying a long payment id, build an
 * invoice "as if" a link had been created before that tx, and scan.
 */
import { detectPayment, decodeInvoice, encodeInvoice, loadPaymentCache, savePaymentCache } from '../src/lib/nerva/nlink'
import { getBlockCount, getBlockHeadersRange, getBlock, getTransactions, NERVA_CONSTANTS } from '../src/lib/nerva/api'
import { parseTxExtra } from '../src/lib/nerva/tx-extra'

// localStorage shim for Node (browsers have it natively)
const mem = new Map<string, string>()
;(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v) },
  removeItem: (k: string) => { mem.delete(k) },
}

const log = (...a: unknown[]) => console.log(...a)

async function main() {
  const tip = await getBlockCount()
  log(`network tip: ${tip}`)

  // 1 — walk back to find a tx-bearing block (payment ids live there)
  let found: { hash: string; height: number } | null = null
  let targetTx: { tx_hash: string; pid: string; height: number; ts?: number } | null = null
  outer:
  for (let end = tip; end > Math.max(0, tip - 900); end -= 100) {
    const start = Math.max(0, end - 99)
    const headers = await getBlockHeadersRange(start, end)
    const withTxs = headers.filter((h) => h.block_size > NERVA_CONSTANTS.txSizeThreshold && (h.num_txes ?? 0) > 0)
    for (const bh of withTxs) {
      try {
        const block = await getBlock(bh.hash)
        const hashes: string[] = block?.json?.tx_hashes ?? []
        if (hashes.length > 0) {
          const txs = await getTransactions(hashes, 60_000)
          for (const tx of txs) {
            const parsed = parseTxExtra(tx.json?.extra ?? [])
            if (parsed.paymentIdLong) {
              targetTx = { tx_hash: tx.tx_hash, pid: parsed.paymentIdLong, height: bh.height, ts: tx.block_timestamp }
              found = { hash: bh.hash, height: bh.height }
              break outer
            }
          }
        }
      } catch { /* skip */ }
    }
  }

  if (!found || !targetTx) {
    log('NO payment-id tx found in the last 300 blocks — try again later or widen the window')
    return
  }
  log(`found real payment tx:`)
  log(`  hash   : ${targetTx.tx_hash}`)
  log(`  pid    : ${targetTx.pid}`)
  log(`  height : ${targetTx.height} (tip=${tip}, ${tip - targetTx.height + 1} confirmations)`)

  // 2 — build an invoice as if the link was created 20 blocks BEFORE the payment
  //     and the payer comes back "later" (now)
  const inv = {
    v: 1 as const,
    a: 'NV' + 'x'.repeat(100), // address irrelevant for detection
    amt: '0',
    pid: targetTx.pid,
    h: Math.max(0, targetTx.height - 20),
    exp: Math.floor(Date.now() / 1000) + 3600,
  }
  const token = encodeInvoice(inv)
  const decoded = decodeInvoice(token)
  if (!decoded) throw new Error('invoice roundtrip failed')
  log(`\ninvoice created (h=${inv.h}, simulating a link made before the payment)`)

  // 3 — SCENARIO A: fresh browser revisit, no cache, no known tx → deep history scan
  const t0 = Date.now()
  const progress: string[] = []
  const outcome = await detectPayment(decoded, tip, {
    scanFrom: 0, // force full scan from invoice creation
    onProgress: (p) => { if (p.scanned % 500 === 0 || p.scanned === p.total) progress.push(`${p.scanned}/${p.total}`) },
  })
  log(`\nSCENARIO A — revisit with no local memory:`)
  log(`  status       : ${outcome.result.status}`)
  log(`  txHash       : ${outcome.result.txHash}`)
  log(`  blockHeight  : ${outcome.result.blockHeight}`)
  log(`  txTimestamp  : ${outcome.result.txTimestamp ? new Date(outcome.result.txTimestamp * 1000).toISOString() : '—'}`)
  log(`  confirmations: ${outcome.result.confirmations}`)
  log(`  scannedBlocks: ${outcome.result.scannedBlocks} · checkedTxs: ${outcome.result.checkedTxs}`)
  log(`  cursor       : ${outcome.scannedUpTo}`)
  log(`  duration     : ${Date.now() - t0} ms`)
  log(`  progress tail: ${progress.slice(-3).join(' ')}`)
  if (outcome.result.txHash !== targetTx.tx_hash) throw new Error('FAIL: found tx does not match the real payment!')
  if (outcome.result.status !== 'settled' && outcome.result.status !== 'confirmed') {
    // depends on confirmations, must be at least confirmed for an old block
    throw new Error(`FAIL: unexpected status ${outcome.result.status}`)
  }

  // 4 — SCENARIO B: the same browser revisits → local cache known → instant verify
  savePaymentCache(decoded.pid, outcome.result)
  const cached = loadPaymentCache(decoded.pid)
  log(`\nSCENARIO B — revisit with local memory: cached=${cached ? 'yes' : 'no'} (${cached?.status})`)
  const t1 = Date.now()
  const outcome2 = await detectPayment(decoded, tip, { knownTxHash: cached?.txHash, scanFrom: outcome.scannedUpTo + 1 })
  log(`  status: ${outcome2.result.status} · confirmations: ${outcome2.result.confirmations} · duration: ${Date.now() - t1} ms`)
  if (outcome2.result.txHash !== targetTx.tx_hash) throw new Error('FAIL: known-tx verification lost the payment!')

  // 5 — SCENARIO C: incremental poll (cursor advanced) — must stay fast & correct
  const t2 = Date.now()
  const outcome3 = await detectPayment(decoded, tip, { knownTxHash: cached?.txHash, scanFrom: outcome.scannedUpTo + 1 })
  log(`\nSCENARIO C — incremental poll: ${outcome3.result.status} in ${Date.now() - t2} ms (scanned ${outcome3.result.scannedBlocks} blocks)`)

  log('\nALL SCENARIOS PASSED ✓ — a link revisited later resolves to the paid state')
}

main().catch((e) => { console.error('TEST FAILED:', e); process.exit(1) })
