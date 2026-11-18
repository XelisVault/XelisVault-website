// VaultLaunch candle archive — the server-side sync engine (server only).
//
// THE CONTRACT with the client (src/lib/launch/*):
//   • coin series are rebuilt with THE SAME walk, THE SAME integer
//     replay and THE SAME calibration proof as the in-browser backfill
//     (community-backfill.ts) — same chain data → same chart, so a
//     server series and a client series are interchangeable
//   • the archive stores every walked TRADE durably: a later rebuild is
//     a replay from the database, not a re-walk of the chain
//   • walks are RESUMABLE: each wave persists its trades + the covered
//     height range, so a budget cut (serverless function limits) or a
//     crash loses nothing — the next request continues from the frontier
//   • pool-era series ('coinpool', 'pool') and project curves ('curve')
//     have no on-chain history to walk: the archive SAMPLES them (each
//     sync appends the live spot), building a shared history for every
//     visitor over time
//
// Sync coordination: candle_sync's atomic claim guarantees one worker
// per asset; claims expire after 120 s so a killed worker never blocks
// the asset forever.

import {
  db, ensureSchema, getAssetRow, getSeriesRow, getSyncRow,
  claimSync, releaseSync, progressSync, saveSeriesRow, rowToSeries,
  type AssetRow, type SyncRow,
} from './db'
import { getTopoheight, rpcCall, rpcBatchCached, type BatchCall } from '@/lib/xelis/rpc'
import { fetchCoin, fetchCommunityStats, type RawCoin } from '@/lib/launch/community-reader'
import { fetchPool, fetchProject, fetchProtocolStats } from '@/lib/launch/reader'
import { fetchCommunityParams, readStorage, VG } from '@/lib/launch/protocol'
import { isHiddenTicker } from '@/lib/launch/official'
import {
  replayCurve, closeEnough, fetchWindowTrades, backwardSteps,
  resolveTxs, toTrade, sampleCoinSeries,
  type BackfillTrade, type CurveFees, type BackfillInput, type ReplayStep,
} from '@/lib/launch/community-backfill'
import { appendPoint, emptySeries, type ChartSeries } from '@/lib/launch/persist'
import { toHuman } from '@/lib/launch/chain-math'
import { coinSpotPrice } from '@/lib/launch/community-math'

// ── Types ───────────────────────────────────────────────────────────

export type ArchiveKind = 'coin' | 'coinpool' | 'curve' | 'pool'

export interface SyncOutcome {
  status: 'ready' | 'syncing' | 'missing' | 'frozen' | 'error' | 'unconfigured'
  series?: ChartSeries
  progress?: number
  phase?: string
  error?: string
}

export function archiveAsset(kind: ArchiveKind, id: string): string {
  return `${kind}:${id}`
}

/** Parse a client `series` param ('coin:42') — null when malformed. */
export function parseSeriesParam(value: string): { kind: ArchiveKind; id: string } | null {
  const i = value.indexOf(':')
  if (i <= 0) return null
  const kind = value.slice(0, i)
  const id = value.slice(i + 1)
  if (kind !== 'coin' && kind !== 'coinpool' && kind !== 'curve' && kind !== 'pool') return null
  if (!id || id.length > 40) return null
  return { kind: kind as ArchiveKind, id }
}

// ── Walk constants (mirroring the client's community-backfill.ts) ───

const WALK_PAGE_HEIGHTS = 20       // node cap per get_blocks_range_by_height
const WALK_CALLS_PER_POST = 20     // JSON-RPC batch_limit
const POST_HEIGHTS = WALK_CALLS_PER_POST * WALK_PAGE_HEIGHTS // 400
const WAVE_POSTS = 6               // concurrent batched POSTs per wave
const WALK_BOTTOM_MARGIN = 1000    // DAG spread margin below the birth height
/** Hard POST ceiling per invocation (160 000 heights ≈ 9 days). The
 *  real bound is the time budget — the resume frontier lets a deep
 *  walk continue across invocations until it truly reaches the coin's
 *  birth, however old the coin is. */
const WALK_MAX_POSTS = 4000

interface RawBlock {
  hash?: string
  height?: number
  topoheight?: number
  timestamp?: number
  txs_hashes?: string[]
}

// ── Coin curve sync (the full engine) ───────────────────────────────

interface StoredTrade { hash: string; topo: number; ts_ms: number; kind: string; amount: string }

async function loadStoredTrades(sql: NonNullable<ReturnType<typeof db>>, asset: string): Promise<BackfillTrade[]> {
  const rows = (await sql`
    SELECT hash, topo, ts_ms, kind, amount FROM candle_trades
    WHERE asset = ${asset} ORDER BY topo ASC
  `) as unknown as StoredTrade[]
  return rows.map((r) => ({
    hash: r.hash,
    topo: Number(r.topo),
    tsMs: Number(r.ts_ms),
    kind: r.kind as 'buy' | 'sell',
    amount: BigInt(r.amount),
  }))
}

async function storeTrades(
  sql: NonNullable<ReturnType<typeof db>>,
  asset: string,
  trades: BackfillTrade[],
): Promise<void> {
  if (trades.length === 0) return
  const hashes = trades.map((t) => t.hash)
  const topos = trades.map((t) => t.topo)
  const tsMs = trades.map((t) => t.tsMs)
  const kinds = trades.map((t) => t.kind)
  const amounts = trades.map((t) => t.amount.toString())
  await sql`
    INSERT INTO candle_trades (asset, hash, topo, ts_ms, kind, amount)
    SELECT ${asset}, * FROM unnest(
      ${hashes}::text[], ${topos}::bigint[], ${tsMs}::bigint[],
      ${kinds}::text[], ${amounts}::text[]
    )
    ON CONFLICT (asset, hash) DO NOTHING
  `
}

/** Height of the block at `topo` (null when unreachable). */
async function heightOfTopo(topo: number): Promise<number | null> {
  const b = await rpcCall<RawBlock>(
    'get_block_at_topoheight', { topoheight: topo },
    { retries: 2, network: 'mainnet' },
  ).catch(() => null)
  return typeof b?.height === 'number' ? b.height : null
}

/** In-module TTL cache of the factory params (every sync reads them;
 *  they change ~never). */
let paramsCache: { at: number; value: Awaited<ReturnType<typeof fetchCommunityParams>> | null } | null = null
async function communityParamsCached() {
  if (paramsCache && Date.now() - paramsCache.at < 60_000) return paramsCache.value
  const v = await fetchCommunityParams().catch(() => null)
  paramsCache = { at: Date.now(), value: v }
  return v
}

interface WalkRange { lo: number; hi: number }

/**
 * Walk heights (hi → lo, both inclusive) collecting every buy/sell of
 * `cid`, persisting trades + the covered frontier per wave. Resumable
 * by construction: every completed wave is already in the database.
 * Returns whether the range was fully covered and the LOWEST height
 * actually reached (`reachedLo`) — the resume frontier. The budget
 * gate stops LAUNCHING new waves past the deadline; the in-flight wave
 * always completes and is processed, so `reachedLo` never lies (a lie
 * here would silently skip a height band forever).
 */
async function walkRange(
  sql: NonNullable<ReturnType<typeof db>>,
  asset: string,
  cid: number,
  range: WalkRange,
  known: Map<string, BackfillTrade>,
  totalTrades: number,
  deadline: number,
  onProgress: (found: number, progress: number) => void,
): Promise<{ complete: boolean; reachedLo: number }> {
  let nextHi = range.hi
  let posts = 0
  let failedWaves = 0
  let pending: string[] = []

  const totalHeights = range.hi - range.lo + 1
  const totalPages = Math.max(1, Math.ceil(totalHeights / WALK_PAGE_HEIGHTS))

  async function fetchBlocksPost(lo: number, hi: number): Promise<boolean> {
    try {
      const calls: BatchCall[] = []
      for (let h = hi; h >= lo && calls.length < WALK_CALLS_PER_POST; h -= WALK_PAGE_HEIGHTS) {
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
        for (const b of blocks) {
          if (b?.hash && Array.isArray(b.txs_hashes) && b.txs_hashes.length > 0) {
            pending.push(...b.txs_hashes)
          }
        }
      }
      return gotAny
    } catch {
      return false
    }
  }

  function launchWave(): Promise<boolean>[] {
    const wave: Promise<boolean>[] = []
    while (wave.length < WAVE_POSTS && nextHi >= range.lo && posts < WALK_MAX_POSTS) {
      const lo = Math.max(range.lo, nextHi - POST_HEIGHTS + 1)
      wave.push(fetchBlocksPost(lo, nextHi))
      nextHi = lo - 1
      posts++
    }
    return wave
  }

  let wave = launchWave()
  while (wave.length > 0 && failedWaves < 2 && known.size < totalTrades) {
    const results = await Promise.all(wave)
    failedWaves = results.every((ok) => !ok) ? failedWaves + 1 : 0
    const hashes = pending
    pending = []

    // launch the next wave BEFORE resolving txs — same overlap trick as
    // the client walk (blocks stream while tx lookups fly). The budget
    // gate only stops LAUNCHING; the in-flight wave is always awaited
    // below, so the recorded frontier matches reality.
    wave = failedWaves < 2 && known.size < totalTrades && Date.now() <= deadline
      ? launchWave()
      : []

    if (hashes.length > 0) {
      const parsed = await resolveTxs(hashes)
      const fresh: BackfillTrade[] = []
      for (const p of parsed) {
        if (!p || p.cid !== cid || known.has(p.hash)) continue
        const trade = await toTrade(p)
        if (trade) {
          known.set(trade.hash, trade)
          fresh.push(trade)
        }
      }
      // a wave's trades land in the DB immediately — crash-safe resume
      await storeTrades(sql, asset, fresh).catch(() => {})
    }

    const pagesDone = Math.min(totalPages, Math.ceil((range.hi - nextHi) / WALK_PAGE_HEIGHTS))
    onProgress(known.size, pagesDone / totalPages)
  }

  // complete when the range is exhausted (early exit at the counter
  // implies completeness for this range too) or the counter is satisfied.
  // reachedLo = the lowest height whose POST landed and was processed.
  const complete = (nextHi < range.lo || known.size >= totalTrades) && failedWaves < 2
  const reachedLo = nextHi < range.lo ? range.lo : nextHi + 1
  return { complete, reachedLo }
}

/**
 * Sync one community coin's CURVE-era series ('coin:{cid}').
 * Full rebuilds walk the chain; catch-ups replay the stored trades and
 * only walk the height range that was never covered. The calibration
 * proof against the live reserves guarantees correctness either way.
 */
export async function syncCoinCurve(
  cid: number,
  opts: { budgetMs?: number } = {},
): Promise<SyncOutcome> {
  const sql = db()
  if (!sql) return { status: 'unconfigured' }
  if (!(await ensureSchema())) return { status: 'error', error: 'schema init failed' }

  const asset = archiveAsset('coin', String(cid))
  const deadline = Date.now() + (opts.budgetMs ?? 45_000)

  // 1 — the live coin record (identity + calibration targets)
  const raw = await fetchCoin(cid).catch(() => null)
  if (!raw || isHiddenTicker(raw.symbol)) return { status: 'missing' }

  // migrated: the curve is closed forever — serve what we have, frozen
  if (raw.migrated) {
    const row = await getSeriesRow(sql, asset)
    return row
      ? { status: 'frozen', series: rowToSeries(row) }
      : { status: 'frozen' }
  }
  if (raw.yr <= 0n || raw.createdTopo <= 0) return { status: 'missing' }

  // 2 — asset row (identity + curve params for future syncs)
  const params = await communityParamsCached()
  const curveFeeBps = params?.curveFeeBps ?? 100
  const graduatedFeeBps = params?.graduatedFeeBps ?? 50
  await sql`
    INSERT INTO candle_assets (asset, kind, cid, ticker, name, created_topo, meta, updated_at)
    VALUES (${asset}, 'coin', ${cid}, ${raw.symbol}, ${raw.name}, ${raw.createdTopo},
            ${JSON.stringify({
              y0: raw.y0.toString(),
              vx: raw.vx.toString(),
              totalSupply: raw.totalSupply.toString(),
              curveFeeBps,
              graduatedFeeBps,
            })}, now())
    ON CONFLICT (asset) DO UPDATE SET
      ticker = EXCLUDED.ticker, name = EXCLUDED.name,
      created_topo = EXCLUDED.created_topo, meta = EXCLUDED.meta, updated_at = now()
  `

  // 3 — stored trades + walk state
  const stored = await loadStoredTrades(sql, asset)
  const known = new Map(stored.map((t) => [t.hash, t]))
  const syncRow = await getSyncRow(sql, asset)
  const totalTrades = raw.trades

  const fees: CurveFees = {
    y0: raw.y0,
    vx: raw.vx,
    graduated: raw.graduated,
    graduatedTopo: raw.graduatedTopo,
    curveFeeBps,
    graduatedFeeBps,
  }

  const finish = async (
    steps: ReplayStep[],
    endXr: bigint,
    endYr: bigint,
    currentTopo: number,
    degraded: boolean,
  ): Promise<SyncOutcome> => {
    const input: BackfillInput = {
      cid,
      currentTopo,
      createdTopo: raw.createdTopo,
      y0: raw.y0,
      vx: raw.vx,
      graduated: raw.graduated,
      graduatedTopo: raw.graduatedTopo,
      curveFeeBps,
      graduatedFeeBps,
      totalTrades,
      liveXr: raw.xr,
      liveYr: raw.yr,
    }
    const series = sampleCoinSeries(input, steps, endXr, endYr)
    await saveSeriesRow(sql, asset, series)
    await releaseSync(sql, asset, 'ready', {
      phase: degraded ? 'ready (backward anchor)' : 'ready',
      progress: 1,
    })
    return { status: 'ready', series }
  }

  // 4 — the walk, only across heights we have never covered. A coin
  //     whose walk is complete and whose trade counter is satisfied
  //     needs NO walk at all — its catch-up is a pure replay of the
  //     stored trades plus the registry window (a couple of seconds).
  const tipTopo = await getTopoheight('mainnet').catch(() => 0)
  if (!tipTopo || tipTopo <= raw.createdTopo) return { status: 'missing' }

  const coveredLo = syncRow?.walked_to_height ?? null   // lowest walked height
  const coveredHi = syncRow?.covered_to_height ?? null  // highest walked height
  const walkComplete = syncRow?.walk_complete === true
  const needsWalk = !walkComplete || known.size < totalTrades

  let tipH: number | null = null
  let bottomH = 1
  const ranges: WalkRange[] = []
  if (needsWalk) {
    tipH = await heightOfTopo(tipTopo)
    const birthH = await heightOfTopo(raw.createdTopo)
    if (tipH == null || birthH == null) {
      return { status: 'error', error: 'tip/birth height unreachable' }
    }
    bottomH = Math.max(1, birthH - WALK_BOTTOM_MARGIN)
    // pending height work = never-covered ranges that may hold unknown trades
    if (coveredLo == null) {
      ranges.push({ lo: bottomH, hi: tipH })
    } else {
      // (a) the deep past, below any previous walk
      if (coveredLo > bottomH) ranges.push({ lo: bottomH, hi: coveredLo - 1 })
      // (b) the fresh top, above the last completed walk
      if (coveredHi != null && tipH > coveredHi) ranges.push({ lo: coveredHi + 1, hi: tipH })
      if (coveredHi == null) ranges.push({ lo: coveredLo, hi: tipH })
    }
  }

  let walkedAny = false
  let progressBase = totalTrades > 0 ? Math.min(1, known.size / totalTrades) : 1
  for (const range of ranges) {
    if (Date.now() > deadline || known.size >= totalTrades) break
    if (range.hi < range.lo) continue
    walkedAny = true
    await progressSync(sql, asset, { phase: 'walking', total_trades: totalTrades })
    const r = await walkRange(
      sql, asset, cid, range, known, totalTrades, deadline,
      (found, p) => {
        void progressSync(sql, asset, {
          phase: 'walking',
          progress: Math.max(0, Math.min(1, progressBase + (1 - progressBase) * p)),
          found_trades: found,
        }).catch(() => {})
      },
    )
    // extend the covered range with the heights REALLY reached — the
    // bottom frontier only moves DOWN and only to a height whose POST
    // landed (reachedLo), so a budget cut never marks unwalked heights
    // as covered (that would skip a band of the coin's life forever)
    const newLo = Math.min(coveredLo ?? Number.MAX_SAFE_INTEGER, r.reachedLo)
    const newHi = Math.max(coveredHi ?? 0, range.hi)
    const completeNow =
      known.size >= totalTrades || (r.complete && newLo <= bottomH)
    await progressSync(sql, asset, {
      walked_to_height: newLo,
      covered_to_height: newHi,
      walk_complete: completeNow,
      found_trades: known.size,
    })
    progressBase = totalTrades > 0 ? Math.min(1, known.size / totalTrades) : 1
  }

  // 5 — the registry window AFTER the walk: catches trades that landed
  //     while we were walking (same union trick as the client)
  const windowTrades = await fetchWindowTrades(cid).catch(() => [] as BackfillTrade[])
  for (const t of windowTrades) {
    if (t.topo >= raw.createdTopo && !known.has(t.hash)) known.set(t.hash, t)
  }
  if (windowTrades.length > 0) {
    await storeTrades(sql, asset, windowTrades.filter((t) => t.topo >= raw.createdTopo)).catch(() => {})
  }

  const trades = [...known.values()].sort((a, b) => a.topo - b.topo)
  if (trades.length === 0) {
    // no trades at all — a flat birth line is the truth
    return finish([], 0n, raw.y0, tipTopo, false)
  }

  // 6 — replay + calibrate against the LIVE reserves (the proof)
  const replay = replayCurve(trades, fees)
  if (closeEnough(replay.xr, raw.xr) && closeEnough(replay.yr, raw.yr)) {
    return finish(replay.steps, replay.xr, replay.yr, tipTopo, false)
  }

  // 7 — calibration miss. If the budget cut the walk mid-range, the
  //     trades are still incomplete: persist a BACKWARD-ANCHORED series
  //     from what was found (the recent history is exact — far better
  //     than a blank chart) and report progress; the next request
  //     resumes from the frontier and replaces it with the full
  //     calibrated series.
  if (walkedAny && Date.now() > deadline && known.size < totalTrades) {
    const p = totalTrades > 0 ? Math.min(0.98, known.size / totalTrades) : 0.98
    const b = backwardSteps(trades, fees, raw.xr, raw.yr)
    const input: BackfillInput = {
      cid,
      currentTopo: tipTopo,
      createdTopo: raw.createdTopo,
      y0: raw.y0,
      vx: raw.vx,
      graduated: raw.graduated,
      graduatedTopo: raw.graduatedTopo,
      curveFeeBps,
      graduatedFeeBps,
      totalTrades,
      liveXr: raw.xr,
      liveYr: raw.yr,
    }
    await saveSeriesRow(sql, asset, sampleCoinSeries(input, b.steps, raw.xr, raw.yr)).catch(() => {})
    await progressSync(sql, asset, {
      phase: 'walking',
      progress: p,
      found_trades: known.size,
    })
    return { status: 'syncing', progress: p, phase: 'walking' }
  }

  // ancient coin beyond every walk attempt — backward anchor: the
  // recent history is exact, the deep past stays flat
  const b = backwardSteps(trades, fees, raw.xr, raw.yr)
  return finish(b.steps, raw.xr, raw.yr, tipTopo, true)
}

// ── Sampling syncs (pool era + project curves) ──────────────────────

/**
 * Append ONE live spot sample to a sampled series ('coinpool', 'pool',
 * 'curve'). These eras have no walkable trade history on-chain (pool
 * reserves change with swaps AND liquidity events) — the archive
 * samples the spot on every sync, building a shared history for all
 * visitors. The grid semantics are appendPoint's (persist.ts): samples
 * in the same slot update in place, gaps flat-fill.
 */
export async function sampleAssetSpot(
  kind: 'coinpool' | 'pool' | 'curve',
  id: string,
): Promise<SyncOutcome> {
  const sql = db()
  if (!sql) return { status: 'unconfigured' }
  if (!(await ensureSchema())) return { status: 'error', error: 'schema init failed' }

  const asset = archiveAsset(kind, id)
  const topo = await getTopoheight('mainnet').catch(() => 0)
  if (!topo) return { status: 'error', error: 'node unreachable' }

  let price = 0
  let ticker: string | null = null
  let name: string | null = null

  if (kind === 'coinpool') {
    const cid = Number(id)
    const raw = await fetchCoin(cid).catch(() => null)
    if (!raw || isHiddenTicker(raw.symbol)) return { status: 'missing' }
    ticker = raw.symbol
    name = raw.name
    if (!raw.migrated || !raw.asset) {
      // not on the DEX (yet) — nothing to sample; the curve sync owns it
      return { status: 'missing' }
    }
    const pool = await fetchPool(raw.asset).catch(() => null)
    if (!pool) return { status: 'error', error: 'pool unreadable' }
    price = toHuman((pool.xelReserve * 100000000n) / (pool.tokenReserve || 1n))
    await sql`
      INSERT INTO candle_assets (asset, kind, cid, ticker, name, created_topo, meta, updated_at)
      VALUES (${asset}, 'coinpool', ${cid}, ${ticker}, ${name}, ${raw.migratedTopo},
              ${JSON.stringify({ asset: raw.asset, totalSupply: raw.totalSupply.toString() })}, now())
      ON CONFLICT (asset) DO UPDATE SET
        ticker = EXCLUDED.ticker, name = EXCLUDED.name, meta = EXCLUDED.meta, updated_at = now()
    `
  } else {
    const pid = Number(id)
    const proj = await fetchProject(pid).catch(() => null)
    if (!proj) return { status: 'missing' }
    ticker = proj.symbol
    name = proj.name
    if (kind === 'curve') {
      if (proj.migrated || proj.curveSupply <= 0n) return { status: 'missing' }
      price = toHuman((proj.reserves * 100000000n) / (proj.curveSupply || 1n))
    } else {
      if (!proj.migrated || !proj.asset) return { status: 'missing' }
      const pool = await fetchPool(proj.asset).catch(() => null)
      if (!pool) return { status: 'error', error: 'pool unreadable' }
      price = toHuman((pool.xelReserve * 100000000n) / (pool.tokenReserve || 1n))
    }
    await sql`
      INSERT INTO candle_assets (asset, kind, cid, ticker, name, created_topo, meta, updated_at)
      VALUES (${asset}, ${kind}, NULL, ${ticker}, ${name}, ${proj.createdTopo}, '{}', now())
      ON CONFLICT (asset) DO UPDATE SET
        ticker = EXCLUDED.ticker, name = EXCLUDED.name, updated_at = now()
    `
  }

  const row = await getSeriesRow(sql, asset)
  const prev: ChartSeries = row ? rowToSeries(row) : emptySeries(topo)
  const next = appendPoint(prev, price, topo)
  if (next.history.length < 1) return { status: 'error', error: 'sample rejected' }
  await saveSeriesRow(sql, asset, next)
  await releaseSync(sql, asset, 'ready', { phase: 'sampling', progress: 1 })
  return { status: 'ready', series: next }
}

// ── The serve path (GET /api/launch/candles) ────────────────────────

export interface ServeResult {
  ok: boolean
  status: 'ready' | 'syncing' | 'missing' | 'unconfigured' | 'frozen' | 'error'
  series?: ChartSeries
  ageS?: number
  progress?: number
  phase?: string
  /** the caller (route) should run the sync in `after()` */
  kick?: 'coin' | 'sample'
}

/** A series is served fresh for this long; older → the route kicks a catch-up. */
const FRESH_S = 90

export async function serveArchiveSeries(kind: ArchiveKind, id: string): Promise<ServeResult> {
  const sql = db()
  if (!sql) return { ok: false, status: 'unconfigured' }
  if (!(await ensureSchema())) return { ok: false, status: 'error' }

  const asset = archiveAsset(kind, id)
  const row = await getSeriesRow(sql, asset)
  if (row) {
    const ageS = Math.max(0, (Date.now() - new Date(row.updated_at).getTime()) / 1000)
    if (ageS > FRESH_S) {
      return { ok: true, status: 'ready', series: rowToSeries(row), ageS, kick: kind === 'coin' ? 'coin' : 'sample' }
    }
    return { ok: true, status: 'ready', series: rowToSeries(row), ageS }
  }

  // no series yet — is a sync already running? (an EXPIRED claim means
  // the worker died mid-walk: kick a continuation, the persisted
  // frontier resumes exactly where it stopped)
  const syncRow = await getSyncRow(sql, asset)
  if (syncRow?.status === 'syncing') {
    const active = syncRow.claimed_until != null && new Date(syncRow.claimed_until) > new Date()
    return {
      ok: false,
      status: 'syncing',
      progress: syncRow.progress,
      phase: syncRow.phase ?? 'starting',
      kick: active ? undefined : kind === 'coin' ? 'coin' : 'sample',
    }
  }
  return { ok: false, status: 'missing', kick: kind === 'coin' ? 'coin' : 'sample' }
}

/** Run the right sync for an asset (used by the route inside after()). */
export async function runAssetSync(kind: ArchiveKind, id: string, budgetMs = 45_000): Promise<SyncOutcome> {
  const sql = db()
  if (!sql) return { status: 'unconfigured' }
  const asset = archiveAsset(kind, id)
  const claimed = await claimSync(sql, asset)
  if (!claimed) {
    const syncRow = await getSyncRow(sql, asset)
    return { status: 'syncing', progress: syncRow?.progress, phase: syncRow?.phase ?? 'starting' }
  }
  try {
    if (kind === 'coin') return await syncCoinCurve(Number(id), { budgetMs })
    return await sampleAssetSpot(kind, id)
  } catch (e: unknown) {
    await releaseSync(sql, asset, 'error', { error: String((e as Error)?.message ?? e) }).catch(() => {})
    return { status: 'error', error: String((e as Error)?.message ?? e) }
  }
}

// ── The maintenance pass (POST /api/launch/sync, cron) ──────────────

export interface MaintenanceSummary {
  ok: boolean
  budgetMs: number
  coins: { synced: number; sampled: number; errors: number }
  projects: { sampled: number; errors: number }
  durationMs: number
}

/**
 * One maintenance sweep over the whole board, newest first, inside a
 * time budget: catch up every coin that already has a series, sample
 * every pool-era asset, discover new coins, keep project curves warm.
 * The heavy FIRST walk of a brand-new coin stays on-demand (the GET
 * route) — a cron must never burn its budget on one deep history.
 */
export async function runMaintenance(budgetMs = 50_000): Promise<MaintenanceSummary> {
  const started = Date.now()
  const out: MaintenanceSummary = {
    ok: true, budgetMs, durationMs: 0,
    coins: { synced: 0, sampled: 0, errors: 0 },
    projects: { sampled: 0, errors: 0 },
  }
  const sql = db()
  if (!sql) return { ...out, ok: false }
  if (!(await ensureSchema())) return { ...out, ok: false }
  const deadline = started + budgetMs

  const stats = await fetchCommunityStats().catch(() => null)
  const coinCount = Math.min(stats?.coinCount ?? 0, 200)
  for (let cid = coinCount - 1; cid >= 0 && Date.now() < deadline; cid--) {
    const asset = archiveAsset('coin', String(cid))
    // coins WITH a series → catch-up (replay stored trades + fresh top)
    const seriesRow = await getSeriesRow(sql, asset).catch(() => null)
    if (seriesRow) {
      const claimed = await claimSync(sql, asset).catch(() => false)
      if (claimed) {
        const r = await syncCoinCurve(cid, { budgetMs: Math.max(5_000, deadline - Date.now()) }).catch(() => null)
        if (r && (r.status === 'ready' || r.status === 'frozen')) out.coins.synced++
        else if (!r) out.coins.errors++
      }
    }
    // every migrated coin keeps its pool series warm; live coins get a
    // coinpool row the moment they migrate (discovered here)
    const coinpool = archiveAsset('coinpool', String(cid))
    const poolRow = await getSeriesRow(sql, coinpool).catch(() => null)
    if (poolRow && Date.now() < deadline) {
      const claimed = await claimSync(sql, coinpool).catch(() => false)
      if (claimed) {
        const r = await sampleAssetSpot('coinpool', String(cid)).catch(() => null)
        if (r && r.status === 'ready') out.coins.sampled++
      }
    }
  }

  // project track: sample every known curve/pool series
  const projStats = await fetchProtocolStats().catch(() => null)
  const projCount = Math.min(projStats?.projectCount ?? 0, 120)
  for (let pid = projCount - 1; pid >= 0 && Date.now() < deadline; pid--) {
    for (const kind of ['curve', 'pool'] as const) {
      const asset = archiveAsset(kind, String(pid))
      const row = await getSeriesRow(sql, asset).catch(() => null)
      if (!row) continue
      const claimed = await claimSync(sql, asset).catch(() => false)
      if (!claimed) continue
      const r = await sampleAssetSpot(kind, String(pid)).catch(() => null)
      if (r && r.status === 'ready') out.projects.sampled++
      else if (!r) out.projects.errors++
    }
  }

  out.durationMs = Date.now() - started
  return out
}

// ── Diagnostics ─────────────────────────────────────────────────────

export async function archiveStatus(): Promise<Record<string, unknown>> {
  const sql = db()
  if (!sql) return { configured: false }
  await ensureSchema()
  const [assets, series, trades, syncing] = (await Promise.all([
    sql`SELECT count(*)::int AS n FROM candle_assets`,
    sql`SELECT count(*)::int AS n FROM candle_series`,
    sql`SELECT count(*)::int AS n FROM candle_trades`,
    sql`SELECT asset, progress, phase FROM candle_sync WHERE status = 'syncing' LIMIT 20`,
  ])) as unknown as [
    { n: number }[], { n: number }[], { n: number }[],
    { asset: string; progress: number; phase: string | null }[],
  ]
  return {
    configured: true,
    assets: assets[0]?.n ?? 0,
    series: series[0]?.n ?? 0,
    trades: trades[0]?.n ?? 0,
    syncing: syncing,
  }
}
