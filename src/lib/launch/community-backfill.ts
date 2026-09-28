// CommunityLaunch — ON-CHAIN HISTORY BACKFILL (C102, full rewrite).
//
// THE PROBLEM this kills for good: the chart used to be built only from
// the local poller's samples (localStorage) — a brand-new visitor, or
// the same visitor on another computer 30 minutes later, saw a single
// big candle instead of the real history. The node's
// `get_contract_transactions` registry was tried as a "shared" source
// first, but it returns an ARBITRARY 20-transaction subset that changes
// between calls — trades appear and disappear from it mid-range, so no
// two computers ever saw the same window.
//
// THE FIX — reconstruct the ENTIRE history from the blocks themselves
// (deterministic: same chain data → same chart, on every computer):
//
//   get_contract_transactions     → hint: the newest factory txs
//   get_blocks_range_by_height    → pages of 20 heights walked down
//                                   from the tip (txs_hashes per block)
//   get_transactions (batch 20)   → entry 16/17 invokes for THIS cid
//   executed_in_block → block     → the trade's exact topoheight AND
//                                   wall-clock timestamp
//   early exit                    → stop when the found (deduped) trades
//                                   match the on-chain `tc` counter
//   replay from (0, y0)          → exact integer curve math, fee
//                                   EXTRACTED (the contract's model)
//   calibration vs live storage   → the replayed (xr, yr) must reproduce
//                                   the live reserves (0.2% + dust) —
//                                   only a complete, correct trade set
//                                   can, so the check is a proof.
//   backward anchor (fallback)    → for coins older than the walk
//                                   budget: start from the LIVE state
//                                   and invert the found trades
//                                   (closed forms) — the recent history
//                                   is exact, the deep past is flat.
//
// Sampling: points sit on an ABSOLUTE grid (point index =
// floor(topo / interval)) — every computer derives the same buckets,
// and closed candles are frozen forever. The price only moves on
// trades: between two trades the fill is flat, which is the truth.
// `topoSeconds` is calibrated from the real block timestamps (the 5 s
// assumption drifts a few % on mainnet), and `st` carries the replayed
// curve state so later catch-ups can continue the exact replay without
// re-walking.
//
// Cost control: every RPC goes through the shared rate-limited client
// (14 req/s), tx-bearing blocks are cached per hash, tx parses are
// cached per hash and shared across coins in-session, and the walk is
// bounded (WALK_MAX_POSTS) with an early exit as soon as the on-chain
// trade counter is satisfied.
//
// BATCHED WALK (v3): the node enforces ≤ 20 heights per
// get_blocks_range_by_height call but happily answers JSON-RPC BATCHES
// (verified live, batch_limit = 20) — so ONE HTTP POST carries 20 range
// calls = 400 heights. Waves of 3 such POSTs run concurrently, and the
// tx resolution rides batched POSTs too (20 × get_transactions of 20
// hashes). A full first-visit rebuild of a 43 h-old coin measured
// ~80 s+ under the old one-page-per-request pattern (and its 600-page
// budget could not even reach the coin's birth — the walk ALWAYS ended
// in the partial backward anchor); the batched walk covers the coin's
// ENTIRE life (88 000-height budget ≈ 5.7 days) in ~10-15 s, the
// calibration proof passes, and the series covers birth — so the walk
// happens ONCE per device, never again on later visits.

import { rpcCall, rpcBatchCached, type BatchCall } from '@/lib/xelis/rpc'
import { COMMUNITY_CONTRACT, XEL_ASSET } from './protocol'
import {
  coinBuyTokensOut, coinSellXelOut, coinSpotPrice,
} from './community-math'
import { toHuman, feeTake } from './chain-math'
import type { ChartSeries } from './persist'

/** get_transactions: tx hashes per call (node-verified). */
const TX_BATCH = 20
/** get_blocks_range_by_height: max 20 heights per call (node-enforced). */
const WALK_PAGE_HEIGHTS = 20
/** Range calls packed per batched POST — the node's batch_limit is 20. */
const WALK_CALLS_PER_POST = 20
/** Heights covered by one batched POST (20 calls × 20 heights). */
const POST_HEIGHTS = WALK_CALLS_PER_POST * WALK_PAGE_HEIGHTS // 400
/** Concurrent batched POSTs per wave. */
const WAVE_POSTS = 5
/**
 * RPC budget per backfill: 220 batched POSTs ≈ 88 000 heights ≈ ~5.7
 * days of history (XVLT at 43 h needs ~72). Older coins fall back to
 * the backward anchor.
 */
const WALK_MAX_POSTS = 220
/**
 * DAG margin: blocks of a topo range can sit a few hundred heights
 * away from the "expected" height (observed spread ≈ 415 over a day).
 * The walk therefore overshoots BELOW the creation height by this much.
 */
const WALK_BOTTOM_MARGIN = 1000
/** Series cap — persist.ts decimates beyond 3600 anyway. */
const MAX_POINTS = 3200
/** Calibrated seconds/topo is clamped to this sane band. */
const MIN_TOPO_SECONDS = 3
const MAX_TOPO_SECONDS = 15

// ── Raw shapes (node JSON-RPC, verified live) ────────────────────────

interface RawTx {
  hash: string
  executed_in_block: string | null
  data?: { invoke_contract?: {
    entry_id: number
    parameters?: { value?: { value?: unknown } }[]
    deposits?: Record<string, { public?: number | string }>
  } }
}

interface RawBlock {
  hash?: string
  height?: number
  topoheight?: number
  timestamp?: number
  txs_hashes?: string[]
}

// ── Inputs / output ─────────────────────────────────────────────────

export interface BackfillInput {
  cid: number
  /** current topoheight (call getTopoheight first) */
  currentTopo: number
  createdTopo: number
  /** initial inventory y0, ATOMIC */
  y0: bigint
  /** launch depth vx, ATOMIC */
  vx: bigint
  graduated: boolean
  graduatedTopo: number
  curveFeeBps: number
  graduatedFeeBps: number
  /** on-chain trade counter (c:{cid}:tc) — completeness target */
  totalTrades: number
  /** live atomic reserves — the calibration targets */
  liveXr: bigint
  liveYr: bigint
  /** live progress report — drives the chart's loading panel */
  onProgress?: (p: BackfillProgress) => void
}

/** Live progress of a chain backfill, for the UI loading panel. */
export interface BackfillProgress {
  /** 'walk' — walking blocks; 'replay' — replaying/calibrating trades */
  phase: 'walk' | 'replay'
  /** pages of 20 heights fetched so far */
  pages: number
  /** page budget for the whole walk (WALK_MAX_PAGES) */
  maxPages: number
  /** deduped trades of THIS coin found so far */
  foundTrades: number
  /** on-chain trade counter — the completeness target */
  totalTrades: number
}

/** One trade, resolved from its executed block (hash = dedup key). */
export interface BackfillTrade {
  hash: string
  topo: number
  /** real block timestamp, ms — drives the time axis calibration */
  tsMs: number
  kind: 'buy' | 'sell'
  /** XEL attached (buy) or tokens attached (sell), ATOMIC */
  amount: bigint
}

/** A price step of the replay: the spot right after a trade. */
export interface ReplayStep {
  topo: number
  tsMs: number
  price: number
}

export interface CurveFees {
  y0: bigint
  vx: bigint
  graduated: boolean
  graduatedTopo: number
  curveFeeBps: number
  graduatedFeeBps: number
}

// ── Cross-coin caches (one session shares parses & blocks) ──────────

/** tx hash → parsed trade (any coin, cid attached) or null (= not an executed buy/sell). */
const txCache = new Map<string, ParsedTx | null>()

interface ParsedTx {
  hash: string
  cid: number
  kind: 'buy' | 'sell'
  amount: bigint
  executedIn: string
}

/** block hash → { topo, ts } (only tx-bearing blocks are worth caching). */
const blockCache = new Map<string, { topo: number; ts: number }>()

function depositPublic(
  deposits: Record<string, { public?: number | string }> | undefined,
  asset: string,
): bigint | null {
  const d = deposits?.[asset]
  if (d == null || d.public == null) return null
  try { return BigInt(d.public) } catch { return null }
}

/** Parse a resolved tx into a trade of ANY coin — null when it is not an executed buy/sell. */
function parseTrade(tx: RawTx): ParsedTx | null {
  const inv = tx.data?.invoke_contract
  if (!inv || (inv.entry_id !== 16 && inv.entry_id !== 17)) return null
  const rawCid = inv.parameters?.[0]?.value?.value
  if (rawCid == null || !tx.executed_in_block) return null
  const deposits = inv.deposits
  let kind: 'buy' | 'sell'
  let amount: bigint | null
  if (inv.entry_id === 16) {
    kind = 'buy'
    amount = depositPublic(deposits, XEL_ASSET)
  } else {
    kind = 'sell'
    // the attached deposit IS the coin's asset — the one key that is not XEL
    const key = Object.keys(deposits ?? {}).find((k) => k !== XEL_ASSET)
    amount = key ? depositPublic(deposits, key) : null
  }
  if (amount == null || amount <= 0n) return null
  let cid: number
  try { cid = Number(rawCid) } catch { return null }
  if (!Number.isFinite(cid)) return null
  return { hash: tx.hash, cid, kind, amount, executedIn: tx.executed_in_block }
}

/**
 * Resolve tx hashes through the shared cache, fetching unknown ones in
 * BATCHED POSTs: 20 get_transactions calls of 20 hashes ride ONE HTTP
 * request (400 txs per POST — a whole walk's worth of txs is 2-3 POSTs
 * instead of ~45 sequential round-trips).
 * Returns one entry per input hash (null = not a trade).
 */
async function resolveTxs(hashes: string[]): Promise<(ParsedTx | null)[]> {
  const out: (ParsedTx | null)[] = new Array(hashes.length).fill(null)
  const need: { idx: number; hash: string }[] = []
  const seen = new Set<string>()
  hashes.forEach((hash, idx) => {
    if (seen.has(hash)) return // duplicates in the same page/batch
    seen.add(hash)
    if (txCache.has(hash)) out[idx] = txCache.get(hash) ?? null
    else need.push({ idx, hash })
  })
  if (need.length === 0) return out

  const calls: BatchCall[] = []
  const groups: { idx: number; hash: string }[][] = []
  for (let i = 0; i < need.length; i += TX_BATCH) {
    const group = need.slice(i, i + TX_BATCH)
    groups.push(group)
    calls.push({ method: 'get_transactions', params: { tx_hashes: group.map((g) => g.hash) } })
  }
  const res = await rpcBatchCached(calls, { retries: 2, network: 'mainnet' })
  res.forEach((r, g) => {
    const txs = Array.isArray(r.result) ? (r.result as RawTx[]) : null
    if (!txs) return
    const byHash = new Map<string, RawTx>()
    for (const t of txs) if (t?.hash) byHash.set(t.hash, t)
    for (const { idx, hash } of groups[g]) {
      const parsed = byHash.has(hash) ? parseTrade(byHash.get(hash)!) : null
      txCache.set(hash, parsed)
      out[idx] = parsed
    }
  })
  return out
}

/** topo + wall-clock timestamp of a block (cached). */
async function blockTopoTs(hash: string): Promise<{ topo: number; ts: number } | null> {
  const hit = blockCache.get(hash)
  if (hit) return hit
  const b = await rpcCall<RawBlock>(
    'get_block_by_hash', { hash }, { retries: 2, network: 'mainnet' },
  ).catch(() => null)
  if (!b || typeof b.topoheight !== 'number' || typeof b.timestamp !== 'number') return null
  const v = { topo: b.topoheight, ts: b.timestamp }
  blockCache.set(hash, v)
  return v
}

/** Attach the executed block's topo + timestamp to a parsed tx. */
async function toTrade(p: ParsedTx): Promise<BackfillTrade | null> {
  const blk = await blockTopoTs(p.executedIn)
  if (!blk) return null
  return { hash: p.hash, topo: blk.topo, tsMs: blk.ts, kind: p.kind, amount: p.amount }
}

// ── The registry window (newest trades — a HINT, never the truth) ────

/**
 * The newest factory transactions from the node's registry.
 * ⚠ The registry returns an arbitrary ~20-entry subset that CHANGES
 * BETWEEN CALLS (verified on mainnet: trades appear and disappear
 * mid-range) — it is only used to catch the newest trades (for the
 * backfill union and for catch-ups), NEVER as the complete history.
 */
export async function fetchWindowTrades(cid: number): Promise<BackfillTrade[]> {
  const hashes = await rpcCall<string[]>(
    'get_contract_transactions',
    { contract: COMMUNITY_CONTRACT },
    { retries: 3, network: 'mainnet' },
  ).catch(() => null)
  if (!Array.isArray(hashes) || hashes.length === 0) return []

  const parsed = await resolveTxs(hashes)
  const out: BackfillTrade[] = []
  for (const p of parsed) {
    if (!p || p.cid !== cid) continue
    const trade = await toTrade(p)
    if (trade) out.push(trade)
  }
  const dedup = new Map(out.map((t) => [t.hash, t]))
  const list = [...dedup.values()]
  list.sort((a, b) => a.topo - b.topo)
  return list
}

// ── The block walk (the source of truth) ────────────────────────────

/**
 * Walk blocks by height, newest → oldest, collecting every buy/sell of
 * `cid`. Stops as soon as the deduped found-count reaches the on-chain
 * trade counter (we then provably have them all), at the coin's
 * creation (minus the DAG margin), or at the POST budget.
 *
 * BATCHED + OVERLAPPED PIPELINE: one HTTP POST carries 20
 * get_blocks_range_by_height calls (400 heights — the node's per-call
 * cap is 20 heights, its batch cap is 20 requests), WAVE_POSTS such
 * POSTs run concurrently, and the tx resolution of wave N OVERLAPS the
 * block POSTs of wave N+1 — the blocks stream and the tx lookups never
 * serialize behind each other. The old one-20-height-page-per-request
 * pattern was latency-bound (~2 pages/s ≈ 80 s+ for XVLT at 43 h, and
 * its 600-page budget covered only ~19 h of chain — the coin's birth
 * was UNREACHABLE, every first visit ended in the partial backward
 * anchor); the batched pipeline covers the coin's whole life in
 * seconds. The shared limiter still paces every POST, so the node never
 * sees more than it already accepts.
 */
async function walkTrades(
  cid: number,
  currentTopo: number,
  createdTopo: number,
  totalTrades: number,
  onProgress?: (p: BackfillProgress) => void,
): Promise<BackfillTrade[]> {
  if (totalTrades <= 0) return []
  const [tipRes, birthRes] = await Promise.all([
    rpcCall<RawBlock>('get_block_at_topoheight', { topoheight: currentTopo },
      { retries: 2, network: 'mainnet' }).catch(() => null),
    rpcCall<RawBlock>('get_block_at_topoheight', { topoheight: createdTopo },
      { retries: 2, network: 'mainnet' }).catch(() => null),
  ])
  const tipH = tipRes?.height
  const birthH = birthRes?.height
  if (typeof tipH !== 'number' || typeof birthH !== 'number') return []

  const bottomH = Math.max(1, birthH - WALK_BOTTOM_MARGIN)
  const totalHeights = tipH - bottomH + 1
  // progress is reported in 20-height PAGES (the panel's unit) — the
  // real total, not an arbitrary budget, so the bar reflects the walk
  const totalPages = Math.ceil(totalHeights / WALK_PAGE_HEIGHTS)
  const found = new Map<string, BackfillTrade>()
  let pages = 0 // completed pages — monotonic, drives the loading panel
  let posts = 0 // batched POSTs launched — the budget gate
  let nextHi = tipH // top height of the next POST to launch
  // TWO full waves of failures = the node is gone (single transient
  // POST failures don't kill the walk — the calibration proof catches
  // any hole, exactly as a mid-walk break did before).
  let failedWaves = 0
  // tx hashes accumulated by landed block POSTs, resolved wave by wave
  let pending: string[] = []

  /** One batched POST of up to 20 range calls (400 heights) — BLOCKS
   * ONLY: seeds the block cache, accumulates the tx hashes it saw into
   * `pending`. Never rejects (a dead POST resolves ok:false so the wave
   * accounting can stop the walk when the node is gone). */
  async function fetchBlocksPost(lo: number, hi: number): Promise<boolean> {
    try {
      const calls: BatchCall[] = []
      for (
        let h = hi;
        h >= lo && calls.length < WALK_CALLS_PER_POST;
        h -= WALK_PAGE_HEIGHTS
      ) {
        const l = Math.max(lo, h - WALK_PAGE_HEIGHTS + 1)
        calls.push({ method: 'get_blocks_range_by_height', params: [l, h] })
      }
      if (calls.length === 0) return false
      const res = await rpcBatchCached(calls, { retries: 2, network: 'mainnet' })

      let gotAny = false
      for (const r of res) {
        const blocks = Array.isArray(r.result) ? (r.result as RawBlock[]) : null
        if (!blocks || blocks.length === 0) continue
        gotAny = true
        // seed the block cache with this page's tx-bearing blocks (most
        // trades' executed block is right here — no extra RPC needed)
        for (const b of blocks) {
          if (
            b?.hash && typeof b.topoheight === 'number' && typeof b.timestamp === 'number' &&
            Array.isArray(b.txs_hashes) && b.txs_hashes.length > 0
          ) {
            blockCache.set(b.hash, { topo: b.topoheight, ts: b.timestamp })
            pending.push(...b.txs_hashes)
          }
        }
      }
      return gotAny
    } catch {
      return false // unreachable in practice — belt and braces
    }
  }

  /** Launch the next wave of block POSTs; returns its promises. */
  function launchWave(): Promise<boolean>[] {
    const wave: Promise<boolean>[] = []
    while (
      wave.length < WAVE_POSTS && nextHi >= bottomH && posts < WALK_MAX_POSTS
    ) {
      const lo = Math.max(bottomH, nextHi - POST_HEIGHTS + 1)
      wave.push(fetchBlocksPost(lo, nextHi))
      nextHi = lo - 1
      posts++
    }
    return wave
  }

  let wave = launchWave()
  while (wave.length > 0 && failedWaves < 2 && found.size < totalTrades) {
    // 1 — the wave's block POSTs land
    const results = await Promise.all(wave)
    failedWaves = results.every((ok) => !ok) ? failedWaves + 1 : 0
    pages = Math.min(totalPages, Math.ceil((tipH - nextHi) / WALK_PAGE_HEIGHTS))
    const hashes = pending
    pending = []

    // 2 — launch the NEXT wave BEFORE resolving this one's txs: the
    // block POSTs stream while the tx lookups fly (the pipeline's whole
    // point — they never serialize). The found-count gate runs one wave
    // late, which bounds the overshoot at one wave — harmless.
    wave = failedWaves < 2 && found.size < totalTrades ? launchWave() : []

    // 3 — resolve this wave's txs (overlapped with the next wave)
    if (hashes.length > 0) {
      const parsed = await resolveTxs(hashes)
      for (const p of parsed) {
        if (!p || p.cid !== cid || found.has(p.hash)) continue
        const trade = await toTrade(p)
        if (trade && trade.topo >= createdTopo) found.set(trade.hash, trade)
      }
    }

    onProgress?.({
      phase: 'walk',
      pages,
      maxPages: totalPages,
      foundTrades: found.size,
      totalTrades,
    })

    // early exit — we provably have them all (the in-flight wave, if
    // any, only holds txs of other coins or duplicates by then)
    if (found.size >= totalTrades) break
  }

  const out = [...found.values()]
  out.sort((a, b) => a.topo - b.topo)
  return out
}

// ── Replay — EXACT, fee EXTRACTED (the contract's own model) ─────────

/**
 * Replay the curve across the trades, oldest → newest, from (0, y0).
 * Buy: fee extracted from the deposit, net joins xr. Sell: the whole
 * gross leaves the reserves (the fee is taken from it on the way out
 * to the seller, never parked in the curve). This mirrors
 * CommunityLaunch.slx byte for byte — a complete trade set reproduces
 * the live (xr, yr) exactly (diff 0 verified on mainnet).
 */
export function replayCurve(
  trades: BackfillTrade[],
  fees: CurveFees,
): { steps: ReplayStep[]; xr: bigint; yr: bigint } {
  return replayFromState({ xr: 0n, yr: fees.y0 }, trades, fees)
}

/**
 * Continue an exact replay from a previously stored state (series.st)
 * across the given trades — the catch-up path. Same fee model.
 */
export function replayFromState(
  st: { xr: string | bigint; yr: string | bigint },
  trades: BackfillTrade[],
  fees: CurveFees,
): { steps: ReplayStep[]; xr: bigint; yr: bigint } {
  const { y0, vx } = fees
  let xr = typeof st.xr === 'bigint' ? st.xr : BigInt(st.xr)
  let yr = typeof st.yr === 'bigint' ? st.yr : BigInt(st.yr)
  const steps: ReplayStep[] = []
  for (const t of trades) {
    const bps = fees.graduated && t.topo >= fees.graduatedTopo
      ? Math.min(fees.graduatedFeeBps, fees.curveFeeBps)
      : fees.curveFeeBps
    if (t.kind === 'buy') {
      const net = t.amount - feeTake(t.amount, bps)
      const out = coinBuyTokensOut(xr, yr, y0, vx, net)
      xr += net
      yr -= out
    } else {
      const gross = coinSellXelOut(xr, yr, y0, vx, t.amount)
      xr -= gross
      yr += t.amount
    }
    steps.push({
      topo: t.topo,
      tsMs: t.tsMs,
      price: toHuman(coinSpotPrice(xr, yr, y0, vx)),
    })
  }
  return { steps, xr, yr }
}

/**
 * Backward replay: anchor at the LIVE state and invert the trades
 * newest → oldest (closed forms). Used when the walk budget can't
 * reach the coin's birth: the reconstructed recent history is exact,
 * and the deep past stays flat at the oldest reachable price.
 */
export function backwardSteps(
  trades: BackfillTrade[],
  fees: CurveFees,
  liveXr: bigint,
  liveYr: bigint,
): { steps: ReplayStep[]; xr: bigint; yr: bigint } {
  const { y0, vx } = fees
  let xr = liveXr
  let yr = liveYr
  const steps: ReplayStep[] = []
  for (let i = trades.length - 1; i >= 0; i--) {
    const t = trades[i]
    const bps = fees.graduated && t.topo >= fees.graduatedTopo
      ? Math.min(fees.graduatedFeeBps, fees.curveFeeBps)
      : fees.curveFeeBps
    if (t.kind === 'buy') {
      // forward: out = (yr_pre+y0)·net / ((xr_pre+vx)+net) — inverted
      // from the post-state (xr', yr'): out = net·(yr'+y0) / (xr'+vx−net)
      const net = t.amount - feeTake(t.amount, bps)
      const denom = xr + vx - net
      const out = denom > 0n ? (net * (yr + y0)) / denom : 0n
      xr -= net
      yr += out
    } else {
      // forward: gross = (xr_pre+vx)·T / ((yr_pre+y0)+T) — inverted:
      // gross = T·(xr'+vx) / (yr'+y0−T)
      const denom = yr + y0 - t.amount
      const gross = denom > 0n ? (t.amount * (xr + vx)) / denom : 0n
      xr += gross
      yr -= t.amount
    }
    steps.push({
      topo: t.topo,
      tsMs: t.tsMs,
      price: toHuman(coinSpotPrice(xr, yr, y0, vx)),
    })
  }
  steps.reverse() // oldest → newest, matching replayCurve's contract
  return { steps, xr, yr }
}

// ── Calibration ─────────────────────────────────────────────────────

export function closeEnough(replayed: bigint, live: bigint): boolean {
  const tolerance = live > 0n ? live / 500n + 10n : 10n // 0.2% + dust
  const d = replayed > live ? replayed - live : live - replayed
  return d <= tolerance
}

// ── Sampling to a ChartSeries (absolute grid) ───────────────────────

/**
 * Lay the replay steps on the absolute grid (index = floor(topo /
 * interval)), flat between trades — the price only moves on trades.
 * Also calibrates `topoSeconds` from the real block timestamps and
 * stores the end state in `st` for future catch-ups.
 */
function sampleSeries(
  coin: BackfillInput,
  steps: ReplayStep[],
  endXr: bigint,
  endYr: bigint,
): ChartSeries {
  const birth = toHuman(coinSpotPrice(0n, coin.y0, coin.y0, coin.vx))

  // resolution: the finest grid that keeps the coin's life under the cap
  let interval = 1
  while ((coin.currentTopo - coin.createdTopo) / interval > MAX_POINTS) interval *= 2

  const gBirth = Math.floor(coin.createdTopo / interval)
  const gNow = Math.floor(coin.currentTopo / interval)
  const nSlots = Math.min(gNow - gBirth + 1, MAX_POINTS)

  const history: number[] = new Array(nSlots)
  let price = birth
  let ti = 0
  for (let i = 0; i < nSlots; i++) {
    // slot i covers topos [ (gBirth+i)·interval, (gBirth+i+1)·interval )
    const slotEnd = (gBirth + i + 1) * interval
    while (ti < steps.length && steps[ti].topo < slotEnd) {
      price = steps[ti].price
      ti++
    }
    history[i] = price
  }

  // seconds/topo from the real block timestamps (deterministic — the
  // same trades give the same slope on every computer)
  let topoSeconds = 5
  if (steps.length >= 2) {
    const first = steps[0]
    const last = steps[steps.length - 1]
    if (last.topo > first.topo && last.tsMs > first.tsMs) {
      const s = (last.tsMs - first.tsMs) / 1000 / (last.topo - first.topo)
      if (Number.isFinite(s) && s > 0) topoSeconds = s
    }
  }
  topoSeconds = Math.min(MAX_TOPO_SECONDS, Math.max(MIN_TOPO_SECONDS, topoSeconds))

  return {
    history,
    histStart: gBirth,
    points: gBirth + nSlots, // = gNow + 1 when the whole life fits
    lastTopo: coin.currentTopo,
    intervalTopo: interval,
    topoSeconds,
    st: { xr: endXr.toString(), yr: endYr.toString() },
    savedAt: Date.now(),
  }
}

// ── The backfill ────────────────────────────────────────────────────

/**
 * Rebuild a coin's curve price series from the chain itself.
 * Never returns null on a mere calibration miss (the backward anchor
 * still produces an exact recent history) — null means the node could
 * not be reached at all, and callers keep whatever they have.
 */
export async function backfillCoinCurveSeries(
  coin: BackfillInput,
): Promise<ChartSeries | null> {
  try {
    if (coin.currentTopo <= coin.createdTopo || coin.y0 <= 0n) return null

    const fees: CurveFees = {
      y0: coin.y0,
      vx: coin.vx,
      graduated: coin.graduated,
      graduatedTopo: coin.graduatedTopo,
      curveFeeBps: coin.curveFeeBps,
      graduatedFeeBps: coin.graduatedFeeBps,
    }

    // 1 — the walk (bulk of the history; early-exits at the counter)
    let lastWalkPages = { pages: 0, maxPages: 0 }
    const walked = await walkTrades(
      coin.cid, coin.currentTopo, coin.createdTopo, coin.totalTrades,
      coin.onProgress
        ? (p) => {
            if (p.phase === 'walk') lastWalkPages = { pages: p.pages, maxPages: p.maxPages }
            coin.onProgress!(p)
          }
        : undefined,
    )

    // 2 — the registry window AFTER the walk: catches trades that
    //     landed while the walk was running (the window always holds
    //     the newest ones). The 'replay' progress keeps the walk's last
    //     page tally so the counters stay monotonic for the panel.
    coin.onProgress?.({
      phase: 'replay',
      pages: lastWalkPages.pages,
      maxPages: lastWalkPages.maxPages,
      foundTrades: walked.length,
      totalTrades: coin.totalTrades,
    })
    const windowTrades = await fetchWindowTrades(coin.cid).catch(() => [] as BackfillTrade[])

    // 3 — union, dedup by tx hash, oldest → newest
    const byHash = new Map<string, BackfillTrade>()
    for (const t of walked) byHash.set(t.hash, t)
    for (const t of windowTrades) byHash.set(t.hash, t)
    const trades = [...byHash.values()].sort((a, b) => a.topo - b.topo)

    // 4 — replay + calibrate: a complete trade set reproduces the live
    //     reserves exactly — this is the proof the history is right
    const r = replayCurve(trades, fees)
    if (
      trades.length > 0 &&
      closeEnough(r.xr, coin.liveXr) &&
      closeEnough(r.yr, coin.liveYr)
    ) {
      return sampleSeries(coin, r.steps, r.xr, r.yr)
    }

    // 5 — calibration miss (ancient coin / walk budget / the state
    //     moved mid-scan): anchor backwards at the LIVE state — the
    //     recent history is exact, the deep past is flat. The catch-up
    //     machinery keeps the recent edge truthful from here on.
    if (trades.length > 0) {
      const b = backwardSteps(trades, fees, coin.liveXr, coin.liveYr)
      return sampleSeries(coin, b.steps, coin.liveXr, coin.liveYr)
    }

    // 6 — no trades at all: a flat line at the birth price (the truth)
    return sampleSeries(coin, [], 0n, coin.y0)
  } catch (e) {
    // node error, shape drift — keep the local series; log the cause so
    // intermittent failures are diagnosable from the browser console
    console.error('[coin-backfill] failed:', e)
    return null
  }
}
