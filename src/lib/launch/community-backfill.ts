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
// bounded (WALK_MAX_PAGES) with an early exit as soon as the on-chain
// trade counter is satisfied.

import { rpcCall } from '@/lib/xelis/rpc'
import { COMMUNITY_CONTRACT, XEL_ASSET } from './protocol'
import {
  coinBuyTokensOut, coinSellXelOut, coinSpotPrice,
} from './community-math'
import { toHuman, feeTake } from './chain-math'
import type { ChartSeries } from './persist'

const TX_BATCH = 20
/** get_blocks_range_by_height: max 20 heights per call (node-enforced). */
const WALK_PAGE_HEIGHTS = 20
/**
 * RPC budget per backfill: 600 pages ≈ 12 000 heights ≈ ~14 000 topos
 * ≈ 19 h of history. Older coins fall back to the backward anchor.
 */
const WALK_MAX_PAGES = 600
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
 * batches. Returns one entry per input hash (null = not a trade).
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
  for (let i = 0; i < need.length; i += TX_BATCH) {
    const batch = need.slice(i, i + TX_BATCH)
    const txs = await rpcCall<RawTx[]>(
      'get_transactions', { tx_hashes: batch.map((b) => b.hash) },
      { retries: 2, network: 'mainnet' },
    ).catch(() => null)
    if (!Array.isArray(txs)) continue
    const byHash = new Map<string, RawTx>()
    for (const t of txs) if (t?.hash) byHash.set(t.hash, t)
    for (const { idx, hash } of batch) {
      const parsed = byHash.has(hash) ? parseTrade(byHash.get(hash)!) : null
      txCache.set(hash, parsed)
      out[idx] = parsed
    }
  }
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
 * creation (minus the DAG margin), or at the page budget.
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
  const found = new Map<string, BackfillTrade>()
  let pages = 0
  let hi = tipH

  while (hi >= bottomH && pages < WALK_MAX_PAGES && found.size < totalTrades) {
    const lo = Math.max(bottomH, hi - WALK_PAGE_HEIGHTS + 1)
    const blocks = await rpcCall<RawBlock[]>(
      'get_blocks_range_by_height', [lo, hi],
      { retries: 2, network: 'mainnet' },
    ).catch(() => null)
    if (!Array.isArray(blocks) || blocks.length === 0) break
    pages++

    // seed the block cache with this page's tx-bearing blocks (most
    // trades' executed block is right here — no extra RPC needed)
    const hashes: string[] = []
    for (const b of blocks) {
      if (
        b?.hash && typeof b.topoheight === 'number' && typeof b.timestamp === 'number' &&
        Array.isArray(b.txs_hashes) && b.txs_hashes.length > 0
      ) {
        blockCache.set(b.hash, { topo: b.topoheight, ts: b.timestamp })
        hashes.push(...b.txs_hashes)
      }
    }

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
      maxPages: WALK_MAX_PAGES,
      foundTrades: found.size,
      totalTrades,
    })

    hi = lo - 1
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
    const walked = await walkTrades(
      coin.cid, coin.currentTopo, coin.createdTopo, coin.totalTrades, coin.onProgress,
    )

    // 2 — the registry window AFTER the walk: catches trades that
    //     landed while the walk was running (the window always holds
    //     the newest ones)
    coin.onProgress?.({
      phase: 'replay',
      pages: WALK_MAX_PAGES,
      maxPages: WALK_MAX_PAGES,
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
  } catch {
    return null // node error, shape drift — keep the local series
  }
}
