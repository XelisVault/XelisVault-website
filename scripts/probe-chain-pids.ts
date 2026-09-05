/**
 * Probe the live NERVA chain: do recent transactions carry LONG payment ids
 * (tx_extra tag 0x02 → sub-tag 0x00) or encrypted SHORT payment ids (sub-tag 0x01)?
 *
 * Purpose: diagnose why NervaLink payment detection never fires.
 * If long pids never appear on chain → default wallets refuse/drop them →
 * the whole "public reference" detection mode is dead and must be redesigned.
 */
const PRIMARY = 'https://api.nerva.one/daemon/explorer/index.php'

async function api(endpoint: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ endpoint, ...params })
  const res = await fetch(`${PRIMARY}?${qs.toString()}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function readVarint(bytes: number[], offset: number): [number, number] {
  let result = 0
  let shift = 0
  let i = offset
  while (i < bytes.length) {
    const b = bytes[i]
    result |= (b & 0x7f) << shift
    i++
    if ((b & 0x80) === 0) break
    shift += 7
  }
  return [result, i - offset]
}

interface Stats {
  blocksScanned: number
  blocksWithTxs: number
  txsChecked: number
  longPid: number
  shortPid: number
  txPubkey: number
  txExtraVariants: Map<string, number>
  longPidExamples: { hash: string; pid: string; height: number }[]
  shortPidExamples: { hash: string; height: number }[]
}

async function main() {
  const info = await api('get_info')
  const tip = Number(info.height) - 1
  console.log(`Chain tip: ${tip} (${new Date(Number(info.status) ? Date.now() : Date.now()).toISOString()})`)
  console.log(`tx_pool_size: ${info.tx_pool_size}`)

  const stats: Stats = {
    blocksScanned: 0,
    blocksWithTxs: 0,
    txsChecked: 0,
    longPid: 0,
    shortPid: 0,
    txPubkey: 0,
    txExtraVariants: new Map(),
    longPidExamples: [],
    shortPidExamples: [],
  }

  // scan the last N tx-bearing blocks
  const LOOKBACK = 400 // blocks
  const start = Math.max(0, tip - LOOKBACK)
  const headers = (await api('get_block_headers_range', { start: String(start), end: String(tip) })).headers ?? []
  stats.blocksScanned = headers.length
  const withTxs = headers.filter((h: any) => h.num_txes > 0 && h.block_size > 90)
  stats.blocksWithTxs = withTxs.length
  console.log(`${headers.length} headers, ${withTxs.length} blocks with txs`)

  for (const bh of withTxs) {
    let block: any
    try { block = await api('get_block', { hash: bh.hash }) } catch { continue }
    const hashes: string[] = block?.json?.tx_hashes ?? []
    if (hashes.length === 0) continue
    for (const hash of hashes) {
      try {
        const txs = await api('get_transactions', { 'hash[]': hash })
        const tx = Array.isArray(txs) ? txs[0] : txs?.transactions?.[0]
        if (!tx) continue
        stats.txsChecked++
        const extra: number[] = tx?.json?.extra ?? []
        // classify the tx_extra
        let i = 0
        const tagsSeen: string[] = []
        let longPid: string | null = null
        let shortPid = false
        while (i < extra.length) {
          const tag = extra[i]
          i++
          if (tag === 0x01) { tagsSeen.push('pubkey'); i += 32 }
          else if (tag === 0x02) {
            const [len, n] = readVarint(extra, i)
            i += n
            const nonce = extra.slice(i, i + len)
            i += len
            if (nonce[0] === 0x00 && nonce.length >= 33) { longPid = nonce.slice(1, 33).map((b: number) => b.toString(16).padStart(2, '0')).join(''); tagsSeen.push('longpid') }
            else if (nonce[0] === 0x01 && nonce.length >= 9) { shortPid = true; tagsSeen.push('shortpid') }
          } else if (tag === 0x00) { while (i < extra.length && extra[i] === 0x00) i++ }
          else { tagsSeen.push(`unknown-${tag.toString(16)}`); break }
        }
        const key = tagsSeen.join(',')
        stats.txExtraVariants.set(key, (stats.txExtraVariants.get(key) ?? 0) + 1)
        if (longPid) {
          stats.longPid++
          if (stats.longPidExamples.length < 5) stats.longPidExamples.push({ hash, pid: longPid, height: bh.height })
        }
        if (shortPid) {
          stats.shortPid++
          if (stats.shortPidExamples.length < 5) stats.shortPidExamples.push({ hash, height: bh.height })
        }
      } catch (e) {
        // tx fetch failed, skip
      }
    }
  }

  // mempool too
  try {
    const pool = await api('get_transaction_pool')
    const txs = Array.isArray(pool) ? pool : (pool?.transactions ?? [])
    console.log(`\nMempool: ${txs.length} txs`)
    for (const tx of txs) {
      stats.txsChecked++
      const extra: number[] = tx?.json?.extra ?? []
      let i = 0
      while (i < extra.length) {
        const tag = extra[i]
        i++
        if (tag === 0x01) i += 32
        else if (tag === 0x02) {
          const [len, n] = readVarint(extra, i)
          i += n
          const nonce = extra.slice(i, i + len)
          i += len
          if (nonce[0] === 0x00 && nonce.length >= 33) { stats.longPid++; console.log(`  MEMPOOL long pid: ${nonce.slice(1, 33).map((b: number) => b.toString(16).padStart(2, '0')).join('')}`) }
          else if (nonce[0] === 0x01 && nonce.length >= 9) stats.shortPid++
        } else if (tag === 0x00) { while (i < extra.length && extra[i] === 0x00) i++ }
        else break
      }
    }
  } catch { console.log('mempool fetch failed') }

  console.log(`\n=== RESULTS over blocks ${start}..${tip} ===`)
  console.log(`txs checked:        ${stats.txsChecked}`)
  console.log(`with LONG pid:      ${stats.longPid}`)
  console.log(`with SHORT pid:     ${stats.shortPid}`)
  console.log(`\ntx_extra variants:`)
  for (const [k, v] of [...stats.txExtraVariants.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v.toString().padStart(5)} ×  ${k || '(empty)'} (extra=${'' }`)
  }
  if (stats.longPidExamples.length) {
    console.log(`\nlong pid examples:`)
    for (const e of stats.longPidExamples) console.log(`  h=${e.height} ${e.hash.slice(0, 16)}… pid=${e.pid.slice(0, 16)}…`)
  }
}

main().catch((e) => { console.error('PROBE FAILED:', e); process.exit(1) })
