/**
 * Watch-only scanner for NERVA — detects incoming outputs that belong to a
 * (address, secret view key) pair, entirely client-side.
 *
 * Math (nerva src/crypto/crypto.cpp, byte-exact):
 *   derivation D   = compress(8 · viewPriv · txPubKey)     [generate_key_derivation]
 *   output key P_n = spendPub + Hs(D || varint(n))·G       [derive_public_key]
 *   a payment to the address produced vout[n].target.key == P_n.
 *
 * The scan never has the spend key: it can SEE incoming payments but not
 * amounts (RingCT commitments) and cannot spend.
 */

import { parseTxExtra } from './tx-extra'
import {
  getBlock,
  getBlockHeadersRange,
  getTransactions,
  getTransactionPool,
  NERVA_CONSTANTS,
  type NervaBlockHeader,
} from './api'
import { generateKeyDerivation, deriveOutputKey, bytesToHex } from './cryptonote'

export interface WatchMatch {
  txHash: string
  height: number
  timestamp: number
  inPool: boolean
  /** indices of the outputs paying the watched address */
  outputs: number[]
}

export interface WatchScanResult {
  matches: WatchMatch[]
  /** last height whose headers were fully scanned (persist as cursor) */
  scannedUpTo: number
  checkedTxs: number
  scannedBlocks: number
}

export interface WatchProgress {
  phase: 'headers' | 'txs' | 'mempool'
  scanned: number
  total: number
}

export interface WatchScanOptions {
  onProgress?: (p: WatchProgress) => void
  /** stop the scan early (button) */
  shouldStop?: () => boolean
  /** max tx-bearing blocks inspected in detail (default 500) */
  maxDetailBlocks?: number
}

/* matching predicate: does any output of this tx pay the address? */
function matchTx(tx: unknown, spendPub: Uint8Array, viewPriv: Uint8Array): { outputs: number[]; txHash: string } | null {
  const t = tx as {
    tx_hash?: string
    json?: { vout?: Array<{ amount?: number; target?: { key?: string } }>; extra?: unknown }
  }
  const extra = t?.json?.extra
  if (!Array.isArray(extra)) return null
  const parsed = parseTxExtra(extra)
  if (!parsed.txPubkey) return null
  const vout = t?.json?.vout
  if (!Array.isArray(vout) || vout.length === 0) return null

  const derivation = generateKeyDerivation(parsed.txPubkey, viewPriv)
  if (!derivation) return null

  const outputs: number[] = []
  for (let n = 0; n < vout.length; n++) {
    const keyHex = vout[n]?.target?.key
    if (typeof keyHex !== 'string' || keyHex.length !== 64) continue
    const expected = deriveOutputKey(derivation, n, spendPub)
    if (expected && bytesToHex(expected).toLowerCase() === keyHex.toLowerCase()) {
      outputs.push(n)
    }
  }
  if (outputs.length === 0) return null
  return { outputs, txHash: t.tx_hash ?? '' }
}

/* paged concurrent header fetch (mirrors nlink's proven engine) */
const HEADER_PAGE = 100
const FETCH_CONCURRENCY = 3

async function fetchHeadersPaged(
  start: number,
  end: number,
  onProgress?: (p: WatchProgress) => void,
): Promise<{ headers: NervaBlockHeader[]; completeUpTo: number }> {
  const pages: { s: number; e: number }[] = []
  for (let s = start; s <= end; s += HEADER_PAGE) pages.push({ s, e: Math.min(end, s + HEADER_PAGE - 1) })
  if (pages.length === 0) return { headers: [], completeUpTo: start - 1 }

  const headers: NervaBlockHeader[] = []
  const okPages = new Set<number>()
  const total = end - start + 1
  let done = 0
  let next = 0

  const worker = async () => {
    while (next < pages.length) {
      const idx = next++
      const { s, e } = pages[idx]
      try {
        const hs = await getBlockHeadersRange(s, e)
        headers.push(...hs)
        okPages.add(idx)
      } catch { /* page unreachable — cursor stops at the contiguous frontier */ }
      done++
      onProgress?.({ phase: 'headers', scanned: Math.min(done * HEADER_PAGE, total), total })
    }
  }
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, pages.length) }, () => worker()))

  let last = -1
  for (let i = 0; i < pages.length; i++) {
    if (okPages.has(i)) last = i
    else break
  }
  headers.sort((a, b) => a.height - b.height)
  return { headers, completeUpTo: last >= 0 ? pages[last].e : start - 1 }
}

/**
 * Scan [from..tip] for outputs paying the address.
 * 1. mempool (pending payments appear instantly)
 * 2. every tx-bearing block in the window (oldest first), up to the detail cap
 */
export async function scanWatch(
  spendPub: Uint8Array,
  viewPriv: Uint8Array,
  from: number,
  tip: number,
  opts: WatchScanOptions = {},
): Promise<WatchScanResult> {
  const maxDetail = opts.maxDetailBlocks ?? 500
  const matches: WatchMatch[] = []
  let checkedTxs = 0
  let scannedBlocks = 0
  let scannedUpTo = Math.max(0, from - 1)

  // 1 — mempool
  if (!opts.shouldStop?.()) {
    try {
      const pool = await getTransactionPool()
      checkedTxs += pool.length
      opts.onProgress?.({ phase: 'mempool', scanned: pool.length, total: pool.length })
      for (const tx of pool) {
        const hit = matchTx(tx, spendPub, viewPriv)
        if (hit) {
          const t = tx as { tx_hash?: string }
          matches.push({ txHash: hit.txHash || t.tx_hash || '', height: 0, timestamp: Math.floor(Date.now() / 1000), inPool: true, outputs: hit.outputs })
        }
      }
    } catch { /* pool unavailable */ }
  }

  // 2 — chain history
  if (tip >= from && !opts.shouldStop?.()) {
    const { headers, completeUpTo } = await fetchHeadersPaged(from, tip, opts.onProgress)
    scannedBlocks = headers.length
    scannedUpTo = completeUpTo

    const withTxs = headers.filter(
      (bh) => bh.block_size > NERVA_CONSTANTS.txSizeThreshold && (bh.num_txes ?? 0) > 0
    )
    // oldest first: chronological receipts; capped to keep sessions responsive
    const bounded = withTxs.slice(0, maxDetail)

    let done = 0
    let next = 0
    const worker = async () => {
      while (next < bounded.length && !opts.shouldStop?.()) {
        const bh = bounded[next++]
        try {
          const block = await getBlock(bh.hash)
          const hashes: string[] = block?.json?.tx_hashes ?? []
          if (hashes.length > 0) {
            const txs = await getTransactions(hashes, 600_000) // mined = immutable
            for (const tx of txs) {
              checkedTxs++
              const hit = matchTx(tx, spendPub, viewPriv)
              if (hit) {
                const t = tx as { tx_hash?: string; block_timestamp?: number }
                matches.push({
                  txHash: hit.txHash || t.tx_hash || '',
                  height: bh.height,
                  timestamp: Number(bh.timestamp) || 0,
                  inPool: false,
                  outputs: hit.outputs,
                })
              }
            }
          }
        } catch { /* skip unreachable block */ }
        done++
        opts.onProgress?.({ phase: 'txs', scanned: done, total: bounded.length })
      }
    }
    await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, bounded.length) }, () => worker()))
  }

  return { matches, scannedUpTo, checkedTxs, scannedBlocks }
}

/* ───────────────── localStorage state (per address, this browser only) ───────────────── */

const WATCH_PREFIX = 'nwatch:'

export interface WatchState {
  cursor: number
  matches: WatchMatch[]
  checkedAt: number
}

function stateKey(address: string): string {
  return WATCH_PREFIX + address.trim().toLowerCase()
}

export function loadWatchState(address: string): WatchState | null {
  try {
    const raw = localStorage.getItem(stateKey(address))
    if (!raw) return null
    const obj = JSON.parse(raw)
    if (typeof obj?.cursor !== 'number' || !Array.isArray(obj?.matches)) return null
    return {
      cursor: Math.max(0, obj.cursor),
      matches: obj.matches.filter((m: unknown) => {
        const x = m as { txHash?: string }
        return typeof x?.txHash === 'string' && /^[0-9a-f]{64}$/i.test(x.txHash)
      }),
      checkedAt: Number(obj.checkedAt) || 0,
    }
  } catch {
    return null
  }
}

export function saveWatchState(address: string, state: WatchState): void {
  try {
    localStorage.setItem(stateKey(address), JSON.stringify({
      cursor: state.cursor,
      matches: state.matches.slice(-100),
      checkedAt: Date.now(),
    }))
  } catch { /* private mode / quota */ }
}

export function clearWatchState(address: string): void {
  try { localStorage.removeItem(stateKey(address)) } catch { /* noop */ }
}

/** merge: never lose a found tx, never regress the cursor */
export function mergeWatchState(prev: WatchState | null, result: WatchScanResult): WatchState {
  const byHash = new Map<string, WatchMatch>()
  for (const m of prev?.matches ?? []) byHash.set(m.txHash, m)
  for (const m of result.matches) {
    const old = byHash.get(m.txHash)
    if (old && !m.inPool) {
      byHash.set(m.txHash, { ...m, inPool: false }) // pool → mined upgrade
    } else if (!old) {
      byHash.set(m.txHash, m)
    }
  }
  const matches = [...byHash.values()].sort((a, b) =>
    (a.inPool ? 0 : a.height) - (b.inPool ? 0 : b.height)
  )
  return {
    cursor: Math.max(prev?.cursor ?? 0, result.scannedUpTo),
    matches,
    checkedAt: Date.now(),
  }
}
