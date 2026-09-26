// CommunityLaunch — MAINNET store (Zustand, C101).
//
// The pump.fun track's data layer, mirroring mainnet-store: the chain
// is the backend. A background poller reads the factory through the
// public mainnet node:
//   • fast cycle (~15 s) — the fast fields of ACTIVE coins (live /
//     graduated — the curve era) + the reserves of migrated pools.
//     Each cycle samples the spot price and appends it to the
//     locally-persisted chart series (kind "coin" / "coinpool").
//   • deep cycle (~60 s) — full re-scan: factory config, scoreboard,
//     every coin record (newest first, capped), every migrated pool.
//
// Migrated coins keep their record but lose the curve (the contract
// reports zeros on the curve views once migrated — v1.0.1): the pool
// owns the market, the price lives on the pool.
//
// Everything the UI shows comes from here, and everything here comes
// from a storage read — no indexer, no database.

'use client'

import { create } from 'zustand'
import { getTopoheight } from '@/lib/xelis/rpc'
import {
  TOPO_SECONDS, COMMUNITY_PARAMS, type CommunityParams, fetchCommunityParams,
} from './protocol'
import {
  fetchCoin, fetchCoinFast, fetchCommunityStats, COIN_STATUS_FROM_CODE,
  type RawCoin, type CommunityStats,
} from './community-reader'
import { fetchPool } from './reader'
import { loadSeries, saveSeries, appendPoint, emptySeries, seriesPointSeconds, type ChartSeries } from './persist'
import { toHuman } from './chain-math'
import { coinSpotPrice, coinMarketCap, coinContinuity, coinGraduationAnalysis } from './community-math'
import {
  backfillCoinCurveSeries, fetchWindowTrades, replayFromState, closeEnough,
  type BackfillTrade,
} from './community-backfill'
import { isHiddenTicker, officialInfoOf } from './official'
import type { CommunityCoin, CoinStatus, PoolState } from './types'

// ── Helpers ──────────────────────────────────────────────────────────

/** Deterministic brand hue from the ticker (same rule as projects). */
function hueOf(ticker: string): number {
  let h = 0
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) % 360
  return h
}

// ── State ────────────────────────────────────────────────────────────

export type CommunityNodeStatus = 'connecting' | 'live' | 'offline'

/** Live state of a coin's chain-history rebuild — drives the chart's
 *  loading panel so the user SEES the scan happening (it can take up
 *  to a minute on a first visit) instead of a blank chart. */
export interface CoinBackfillState {
  phase: 'starting' | 'scanning' | 'rebuilding' | 'done' | 'error'
  /** walk pages fetched so far (phase 'scanning') */
  pages: number
  maxPages: number
  foundTrades: number
  totalTrades: number
  startedAt: number
  finishedAt: number | null
}

interface CommunityStore {
  status: CommunityNodeStatus
  statusMessage: string | null
  cParams: CommunityParams
  coins: CommunityCoin[]
  cStats: CommunityStats | null
  charts: Record<string, ChartSeries>
  lastSyncMs: number
  syncing: boolean
  /** per-cid chain-history rebuild state (the chart loading panel) */
  backfills: Record<number, CoinBackfillState>

  start: () => void
  refresh: (deep?: boolean) => Promise<void>
  seriesFor: (kind: string, id: string) => ChartSeries
  /** Rebuild a coin's price history FROM THE CHAIN when the local
   *  series is missing or short — a brand-new visitor gets the full
   *  chart, not a blank one. Runs at most once per coin per session. */
  ensureCoinHistory: (cid: number) => Promise<void>
}

const FAST_MS = 15_000
const DEEP_MS = 60_000
/** Hard cap on fully-scanned coins per deep cycle (newest first). */
const SCAN_CAP = 150
/** A coin series older than this (topos) stops being live-sampled
 *  until the catch-up has reconciled it with the chain — sampling
 *  into the gap would flat-fill OVER trades that happened while the
 *  tab was closed. */
const COIN_STALE_TOPOS = 30 // ~2.5 min
/** Beyond this staleness the sampler gives up waiting for the catch-up
 *  and flat-fills anyway (the next full backfill rebuilds the truth). */
const COIN_STALE_HARD_TOPOS = 1440 // ~2 h

const internal: { fast: ReturnType<typeof setInterval> | null; deep: ReturnType<typeof setInterval> | null; started: boolean } = {
  fast: null, deep: null, started: false,
}

/** Backfill bookkeeping: once per coin per SUCCESS — failures are
 *  retried by the next deep scan or navigation. */
const backfillTried = new Set<number>()

/** A rebuild in one of these phases will REPLACE the coin's series on
 *  commit — the live sampler is therefore HELD while it runs (sampling
 *  into the empty/fragment local series would flip the chart on
 *  prematurely, with a couple of live points — the "0 candles" bug). */
export function isBackfillActive(bf: CoinBackfillState | undefined | null): boolean {
  return bf != null && (
    bf.phase === 'starting' || bf.phase === 'scanning' || bf.phase === 'rebuilding'
  )
}

/** Does a series start at (or just after) the coin's creation — i.e. is
 *  it the FULL history rather than a live-sampled fragment? The chart
 *  gate and the backfill trigger (MODE A) share this exact test. */
export function seriesCoversBirth(
  histStart: number,
  intervalTopo: number,
  createdTopo: number,
): boolean {
  return histStart * intervalTopo <= createdTopo + 2 * intervalTopo
}

/** THE chart gate the coin view asks: is the FULL chart ready to draw
 *  RIGHT NOW? Not while the chain rebuild runs (its commit replaces
 *  the series anyway), and not from a live-sampled fragment that
 *  starts after the coin's birth — the loading panel covers both, so
 *  the animated "scanning the chain" state stays visible for the whole
 *  walk (~1 min on a first visit) instead of flashing a broken chart. */
export function isCurveChartReady(coin: {
  createdTopo: number
  curve?: {
    history: number[]
    histStart: number
    intervalTopo?: number
  } | null
}, bf?: CoinBackfillState | null): boolean {
  const curve = coin.curve
  if (!curve || curve.history.length < 2) return false
  if (isBackfillActive(bf)) return false
  // legacy shapes without intervalTopo: trust the backfill gate alone
  if (curve.intervalTopo == null) return true
  return seriesCoversBirth(curve.histStart, curve.intervalTopo, coin.createdTopo)
}

/** Patch one coin's backfill state (shallow, immutable replace). */
function patchBackfill(
  cid: number,
  partial: Partial<CoinBackfillState>,
  set: (p: Partial<CommunityStore>) => void,
  get: () => CommunityStore,
): void {
  const prev = get().backfills[cid] ?? {
    phase: 'starting',
    pages: 0,
    maxPages: 0,
    foundTrades: 0,
    totalTrades: 0,
    startedAt: Date.now(),
    finishedAt: null,
  }
  set({ backfills: { ...get().backfills, [cid]: { ...prev, ...partial } } })
}

/** float human → atomic bigint without float-drift (via string). */
function toAtomicSafe(human: number): bigint {
  const s = human.toFixed(8)
  const [int, frac = ''] = s.split('.')
  return BigInt((int || '0') + (frac + '0'.repeat(8)).slice(0, 8))
}

export const useCommunity = create<CommunityStore>((set, get) => ({
  status: 'connecting',
  statusMessage: null,
  cParams: COMMUNITY_PARAMS,
  coins: [],
  cStats: null,
  charts: {},
  lastSyncMs: 0,
  syncing: false,
  backfills: {},

  seriesFor: (kind, id) => {
    const key = `${kind}:${id}`
    return get().charts[key] ?? loadSeries(kind, id) ?? emptySeries(0)
  },

  start: () => {
    if (internal.started || typeof window === 'undefined') return
    internal.started = true
    void get().refresh(true)
    internal.fast = setInterval(() => void get().refresh(false), FAST_MS)
    internal.deep = setInterval(() => void get().refresh(true), DEEP_MS)
  },

  refresh: async (deep = false) => {
    const s = get()
    if (s.syncing) return
    set({ syncing: true })
    try {
      const topo = await getTopoheight('mainnet')
      if (!topo || topo <= 0) throw new Error('node unreachable')
      if (deep) {
        await deepScan(topo, set, get)
      } else {
        await fastScan(topo, set, get)
      }
      set({
        status: 'live',
        statusMessage: null,
        lastSyncMs: Date.now(),
      })
    } catch (e: any) {
      set({
        status: 'offline',
        statusMessage: e instanceof Error ? e.message : 'mainnet node unreachable — retrying',
      })
    } finally {
      set({ syncing: false })
    }
  },

  ensureCoinHistory: async (cid) => {
    if (backfillTried.has(cid)) return
    const coin = get().coins.find((c) => c.cid === cid)
    if (!coin || !coin.curve || coin.migratedTopo > 0) return // curve era only

    // ── MODE A detection is SYNCHRONOUS (loadSeries only reads
    // localStorage): deciding before any await makes the loading panel
    // appear on the first paint of the coin view — no one-frame flash
    // of a partial chart while the walk arms. v3 semantics: histStart
    // is the ABSOLUTE grid index of history[0], so the topo of the
    // first point is histStart × intervalTopo. The series "covers
    // birth" when its first point sits at (or just after) the coin's
    // creation — exactly what a new visitor lacks.
    const existing = loadSeries('coin', coin.id)
    const modeA = !existing || existing.history.length < 2
      || !seriesCoversBirth(existing.histStart, existing.intervalTopo, coin.createdTopo)

    if (modeA) {
      backfillTried.add(cid)
      patchBackfill(cid, {
        phase: 'starting', startedAt: Date.now(), finishedAt: null,
        pages: 0, foundTrades: 0,
      }, set, get)
    }

    const topo = await getTopoheight('mainnet').catch(() => 0)
    if (!topo || topo <= coin.createdTopo) {
      if (modeA) {
        backfillTried.delete(cid) // node hiccup — allow the retry
        patchBackfill(cid, { phase: 'error', finishedAt: Date.now() }, set, get)
      }
      return
    }

    const params = get().cParams

    // ── MODE B — catch-up: the series covers birth but went stale
    // (tab closed / hidden — the sampler froze it instead of
    // flat-filling over unseen trades) ──
    if (!modeA) {
      const staleness = topo - existing!.lastTopo
      if (staleness <= COIN_STALE_TOPOS) return // live sampling is active
      backfillTried.add(cid)

      const fresh = await fetchCoinFast(cid).catch(() => null)
      if (!fresh || fresh.xr == null || fresh.yr == null || fresh.migrated) {
        backfillTried.delete(cid)
        return
      }

      const fees = {
        y0: toAtomicSafe(coin.curve.initialInventory),
        vx: toAtomicSafe(coin.curve.virtualXel),
        graduated: coin.status === 'graduated',
        graduatedTopo: coin.graduatedTopo,
        curveFeeBps: params.curveFeeBps,
        graduatedFeeBps: params.graduatedFeeBps,
      }
      const livePrice = toHuman(coinSpotPrice(fresh.xr, fresh.yr, fees.y0, fees.vx))

      const windowTrades = await fetchWindowTrades(cid).catch(() => [] as BackfillTrade[])
      const newer = windowTrades.filter((t) => t.topo > existing!.lastTopo)

      let next: ChartSeries | null = null
      if (newer.length > 0 && existing!.st) {
        // continue the EXACT integer replay from the stored state across
        // the trades that landed while we were away — the calibration
        // against the fresh live state proves nothing was missed
        const r = replayFromState(existing!.st, newer, fees)
        if (closeEnough(r.xr, fresh.xr) && closeEnough(r.yr, fresh.yr)) {
          let s = existing!
          for (const step of r.steps) s = appendPoint(s, step.price, step.topo)
          s = appendPoint(s, livePrice, topo)
          next = { ...s, st: { xr: r.xr.toString(), yr: r.yr.toString() } }
        }
      } else if (newer.length === 0) {
        // no trades while away — the gap is genuinely flat
        next = appendPoint(existing!, livePrice, topo)
      }

      if (next && next.history.length >= 2) {
        commitCoinSeries(coin.id, next, set, get)
        return
      }

      // no state anchor, or the window missed trades (>20 while away) —
      // rebuild the whole history from the chain (the walk is the truth)
      const series = await backfillCoinCurveSeries({
        cid,
        currentTopo: topo,
        createdTopo: coin.createdTopo,
        y0: fees.y0,
        vx: fees.vx,
        graduated: fees.graduated,
        graduatedTopo: fees.graduatedTopo,
        curveFeeBps: fees.curveFeeBps,
        graduatedFeeBps: fees.graduatedFeeBps,
        totalTrades: fresh.trades ?? 0,
        liveXr: fresh.xr,
        liveYr: fresh.yr,
      })
      if (series && series.history.length >= 2) commitCoinSeries(coin.id, series, set, get)
      else backfillTried.delete(cid) // node hiccup — allow a retry
      return
    }

    // ── MODE A — full chain backfill (series missing or starts late) ──
    const fresh = await fetchCoinFast(cid).catch(() => null)
    if (!fresh || fresh.xr == null || fresh.yr == null || fresh.migrated) {
      backfillTried.delete(cid)
      patchBackfill(cid, { phase: 'error', finishedAt: Date.now() }, set, get)
      return
    }
    const series = await backfillCoinCurveSeries({
      cid,
      currentTopo: topo,
      createdTopo: coin.createdTopo,
      y0: toAtomicSafe(coin.curve.initialInventory),
      vx: toAtomicSafe(coin.curve.virtualXel),
      graduated: coin.status === 'graduated',
      graduatedTopo: coin.graduatedTopo,
      curveFeeBps: params.curveFeeBps,
      graduatedFeeBps: params.graduatedFeeBps,
      totalTrades: fresh.trades ?? 0,
      liveXr: fresh.xr,
      liveYr: fresh.yr,
      onProgress: (p) => patchBackfill(cid, {
        phase: p.phase === 'walk' ? 'scanning' : 'rebuilding',
        pages: p.pages,
        maxPages: p.maxPages,
        foundTrades: p.foundTrades,
        totalTrades: p.totalTrades,
      }, set, get),
    })
    if (series && series.history.length >= 2) {
      patchBackfill(cid, {
        phase: 'done',
        foundTrades: fresh.trades ?? 0,
        totalTrades: fresh.trades ?? 0,
        finishedAt: Date.now(),
      }, set, get)
      commitCoinSeries(coin.id, series, set, get)
    } else if (series) {
      // a flat birth series with a single slot — the coin is BRAND
      // NEW: nothing went wrong, the chart starts with the trades
      patchBackfill(cid, {
        phase: 'done', totalTrades: fresh.trades ?? 0, finishedAt: Date.now(),
      }, set, get)
    } else {
      backfillTried.delete(cid) // node hiccup — allow a retry
      patchBackfill(cid, { phase: 'error', finishedAt: Date.now() }, set, get)
    }
  },
}));

// ── Scan cycles ──────────────────────────────────────────────────────

type SetFn = (partial: Partial<CommunityStore>) => void
type GetFn = () => CommunityStore

/** Commit a rebuilt/caught-up series: persist + live charts + the
 *  coin's own curve fields (the UI reads those directly). */
function commitCoinSeries(
  coinId: string,
  series: ChartSeries,
  set: SetFn,
  get: GetFn,
): void {
  saveSeries('coin', coinId, series)
  const charts = { ...get().charts, [`coin:${coinId}`]: series }
  const coins = get().coins.map((c) =>
    c.id === coinId && c.curve
      ? {
          ...c,
          curve: {
            ...c.curve,
            history: series.history,
            histStart: series.histStart,
            points: series.points,
            pointSeconds: seriesPointSeconds(series, TOPO_SECONDS),
            intervalTopo: series.intervalTopo,
          },
        }
      : c,
  )
  set({ charts, coins })
}

/** The series a coin should display RIGHT NOW: the held/existing one
 *  while a backfill runs (sampling would build a premature fragment —
 *  the backfill's commit replaces it anyway), the freshly sampled one
 *  otherwise. */
function currentSeries(
  charts: Record<string, ChartSeries>,
  kind: string,
  id: string,
  topo: number,
): ChartSeries {
  return charts[`${kind}:${id}`] ?? loadSeries(kind, id) ?? emptySeries(topo)
}

/** Fast fields of active coins + live pool reserves + price samples. */
async function fastScan(topo: number, set: SetFn, get: GetFn): Promise<void> {
  const prev = get().coins
  if (prev.length === 0) {
    await deepScan(topo, set, get)
    return
  }

  const charts = { ...get().charts }
  const coins = [...prev]

  for (let i = 0; i < coins.length; i++) {
    const c = coins[i]
    if (c.status === 'live' || c.status === 'graduated') {
      const fresh = await fetchCoinFast(c.cid).catch(() => null)
      if (fresh) {
        // HOLD the sampler while the coin's chain rebuild runs: its
        // commit replaces the series, and a couple of live points would
        // flip the chart on prematurely (the "0 candles" bug)
        const hold = isBackfillActive(get().backfills[c.cid])
        coins[i] = mergeFast(coins[i], fresh, topo, get().cParams, charts, hold)
      }
    }
    if (c.status === 'migrated' && c.asset) {
      const pool = await fetchPool(c.asset).catch(() => null)
      if (pool) coins[i] = mergePool(coins[i], pool, topo, get().cParams, charts)
    }
  }

  set({ coins, charts })
}

/** Full re-scan: params, stats, every coin record, every migrated pool. */
async function deepScan(topo: number, set: SetFn, get: GetFn): Promise<void> {
  const [cParams, cStats] = await Promise.all([
    fetchCommunityParams().catch(() => get().cParams),
    fetchCommunityStats().catch(() => get().cStats),
  ])
  const count = Math.min(cStats?.coinCount ?? 0, SCAN_CAP)
  if (count === 0) {
    set({ cParams, cStats, coins: [] })
    return
  }

  const ids: number[] = []
  for (let cid = count - 1; cid >= 0; cid--) ids.push(cid) // newest first
  const raws = await Promise.all(ids.map((cid) => fetchCoin(cid).catch(() => null)))
  // hidden tickers (launch errors) never enter the store — no board,
  // no rail, no badge, no deep link, no trade path can reach them.
  const valid = raws.filter((r): r is RawCoin => !!r && !isHiddenTicker(r.symbol))

  // pools: one per migrated coin
  const poolReads = valid
    .filter((r) => r.migrated && r.asset)
    .map((r) => fetchPool(r.asset!).then((pool) => ({ cid: r.cid, pool })).catch(() => null))
  const poolResults = await Promise.all(poolReads)
  const poolByCid = new Map<number, Awaited<ReturnType<typeof fetchPool>>>()
  for (const pr of poolResults) {
    if (pr && pr.pool) poolByCid.set(pr.cid, pr.pool)
  }

  const charts = { ...get().charts }
  const coins = valid.map((raw) => {
    const pool = poolByCid.get(raw.cid) ?? null
    return mapCoin(raw, pool, topo, cParams, charts, get().backfills)
  })

  set({ cParams, cStats, coins, charts })

  // re-arm the catch-up for coins whose series went stale while the
  // tab was closed (the sampler freezes those instead of flat-filling
  // over unseen trades) — ensureCoinHistory no-ops once reconciled.
  // Coins whose backfill FAILED this session get a retry (once per
  // deep cycle) — never a mass backfill of every coin.
  for (const c of coins) {
    if (!c.curve) continue
    const s = charts[`coin:${c.id}`] ?? loadSeries('coin', c.id)
    const stale = s && s.history.length > 0 && topo - s.lastTopo > COIN_STALE_TOPOS
    const failed = get().backfills[c.cid]?.phase === 'error'
    if (stale || failed) void get().ensureCoinHistory(c.cid)
  }
}

// ── Mapping (raw storage → display shape) ────────────────────────────

function samplePrice(
  charts: Record<string, ChartSeries>,
  kind: string,
  id: string,
  price: number,
  topo: number,
  st?: { xr: bigint; yr: bigint },
): ChartSeries {
  const key = `${kind}:${id}`
  const s = charts[key] ?? loadSeries(kind, id) ?? emptySeries(topo)
  // A STALE coin series is frozen until the catch-up has reconciled
  // it with the chain — sampling into the gap would flat-fill OVER
  // trades that happened while the tab was closed. Past the hard cap
  // the sampler gives up and flat-fills (the next full backfill
  // rebuilds the truth).
  if (
    kind === 'coin' && s.history.length > 0 &&
    topo - s.lastTopo > COIN_STALE_TOPOS &&
    topo - s.lastTopo <= COIN_STALE_HARD_TOPOS
  ) {
    return s
  }
  let next = appendPoint(s, price, topo)
  // track the replayed curve state so a later catch-up can continue
  // the EXACT integer replay from where the series stopped
  if (st && kind === 'coin') {
    next = { ...next, st: { xr: st.xr.toString(), yr: st.yr.toString() } }
  }
  saveSeries(kind, id, next)
  charts[key] = next
  return next
}

function mapCoin(
  raw: RawCoin,
  pool: Awaited<ReturnType<typeof fetchPool>> | null,
  topo: number,
  params: CommunityParams,
  charts: Record<string, ChartSeries>,
  backfills: Record<number, CoinBackfillState> = {},
): CommunityCoin {
  const status: CoinStatus = COIN_STATUS_FROM_CODE[raw.status] ?? 'live'
  const ticker = raw.symbol || `C${raw.cid}`
  const hue = hueOf(ticker)

  const c: CommunityCoin = {
    cid: raw.cid,
    id: String(raw.cid),
    creator: raw.creator ?? 'unknown',
    status,
    name: raw.name || `Coin ${raw.cid}`,
    ticker,
    description: raw.description,
    website: raw.website || undefined,
    logo: raw.logo || undefined,
    twitter: raw.twitter || undefined,
    telegram: raw.telegram || undefined,
    discord: raw.discord || undefined,
    hue,
    avatar: ticker.slice(0, 2).toUpperCase(),
    official: false,
    asset: raw.asset,
    totalSupply: toHuman(raw.totalSupply),
    teamBps: raw.creatorBps,
    creatorPaid: raw.creatorPaid,
    createdTopo: raw.createdTopo,
    graduatedTopo: raw.graduatedTopo,
    migratedTopo: raw.migratedTopo,
    migratedXel: toHuman(raw.migratedXel),
    migratedTokens: toHuman(raw.migratedTokens),
    price: 0,
    marketCap: 0,
    progress: 0,
    continuity: false,
    tags: buildTags(raw, status, params),
  }

  // the platform's own tokens: official metadata, official presentation
  const official = officialInfoOf(ticker)
  if (official) {
    c.official = true
    c.name = official.name
    c.description = official.description
    c.website = official.website
    c.twitter = official.twitter
    c.discord = official.discord
    c.hue = 38 // champagne gold — the house color
    c.tags = ['official token', 'trusted', 'fixed supply']
  }

  // curve era — live + graduated (the curve keeps trading at the
  // graduated fee until the pool exists; migrated coins report zeros)
  if (!raw.migrated && raw.yr > 0n) {
    const priceA = coinSpotPrice(raw.xr, raw.yr, raw.y0, raw.vx)
    const price = toHuman(priceA)
    // HOLD the sampler while the coin's chain rebuild runs — the
    // rebuild's commit replaces the series, and live-sampling into the
    // empty/fragment local series flipped the chart on prematurely
    // (the "0 candles" bug on a first visit)
    const series = isBackfillActive(backfills[raw.cid])
      ? currentSeries(charts, 'coin', c.id, topo)
      : samplePrice(charts, 'coin', c.id, price, topo, { xr: raw.xr, yr: raw.yr })
    const mcapA = coinMarketCap(raw.xr, raw.yr, raw.y0, raw.vx, raw.totalSupply)
    const feeBps = raw.graduated
      ? Math.min(params.graduatedFeeBps, params.curveFeeBps)
      : params.curveFeeBps
    c.curve = {
      reserves: toHuman(raw.xr),
      inventory: toHuman(raw.yr),
      initialInventory: toHuman(raw.y0),
      virtualXel: toHuman(raw.vx),
      gradDepth: toHuman(raw.gdx),
      feeBps,
      history: series.history,
      histStart: series.histStart,
      points: series.points,
      pointSeconds: seriesPointSeconds(series, TOPO_SECONDS),
      intervalTopo: series.intervalTopo,
      volume: toHuman(raw.volume),
      trades: raw.trades,
    }
    c.price = price
    c.marketCap = toHuman(mcapA)
    c.progress = raw.gdx > 0n
      ? Math.min(1, Number((raw.xr * 100000000n) / raw.gdx) / 100000000)
      : 0
    c.continuity = coinContinuity(raw.xr, raw.yr, raw.y0, raw.vx)
    c.graduation = coinGraduationAnalysis(
      raw.xr, raw.yr, raw.y0, raw.vx, raw.gdx,
      raw.graduated ? Math.min(params.graduatedFeeBps, params.curveFeeBps) : params.curveFeeBps,
    )
  }

  // pool era (migrated) — the price lives on the LaunchDEX pool
  if (raw.migrated && pool) {
    const price = toHuman((pool.xelReserve * 100000000n) / (pool.tokenReserve || 1n))
    const series = samplePrice(charts, 'coinpool', c.id, price, topo)
    const p: PoolState = {
      id: c.id,
      asset: pool.asset,
      xel: toHuman(pool.xelReserve),
      token: toHuman(pool.tokenReserve),
      feeBps: params.dexSwapFeeBps,
      adminSplitBps: params.dexFeeSplitBps,
      seedLocked: toHuman(pool.lpLockedDepth),
      totalParts: toHuman(pool.lpTotalDepth),
      history: series.history,
      histStart: series.histStart,
      points: series.points,
      pointSeconds: seriesPointSeconds(series, TOPO_SECONDS),
      volume: toHuman(pool.buyVolume + pool.sellVolume),
      fees: toHuman(pool.lifetimeFees),
      trades: pool.trades,
      buysPaused: pool.buysPaused,
    }
    c.pool = p
    c.price = price
    // FDV on the pool: price × supply
    c.marketCap = toHuman((pool.xelReserve * raw.totalSupply) / (pool.tokenReserve || 1n))
  }

  return c
}

/** Merge a fast-scan partial into an existing coin (no full refetch). */
function mergeFast(
  c: CommunityCoin,
  fresh: Partial<RawCoin>,
  topo: number,
  params: CommunityParams,
  charts: Record<string, ChartSeries>,
  holdChart = false,
): CommunityCoin {
  const next: CommunityCoin = { ...c }
  if (fresh.status != null) {
    next.status = COIN_STATUS_FROM_CODE[fresh.status] ?? c.status
  }
  next.creatorPaid = fresh.creatorPaid ?? next.creatorPaid

  // status transition: graduated or migrated while we weren't looking —
  // the derived shape changes (curve closes at migration), so rebuild
  // from a partial that carries the needed curve fields.
  if (fresh.migrated && !next.pool) {
    // pool not loaded yet — the deep scan will complete it; keep the
    // curve closed (price 0) so nothing stale shows.
    next.curve = undefined
    next.price = 0
    next.marketCap = 0
    return next
  }

  if (fresh.xr != null && fresh.yr != null && !fresh.migrated && next.curve) {
    const y0 = toAtomicSafe(next.curve.initialInventory)
    const vx = toAtomicSafe(next.curve.virtualXel)
    const price = toHuman(coinSpotPrice(fresh.xr, fresh.yr, y0, vx))
    // holdChart: the chain rebuild running for this coin will REPLACE
    // the series on commit — keep the current one instead of sampling a
    // premature fragment (price/mcap/reserves below stay live)
    const series = holdChart
      ? currentSeries(charts, 'coin', c.id, topo)
      : samplePrice(charts, 'coin', c.id, price, topo, { xr: fresh.xr, yr: fresh.yr })
    // graduation flips the curve fee to the graduated rate (cfe → gfe)
    const feeBps = fresh.graduated
      ? Math.min(params.graduatedFeeBps, params.curveFeeBps)
      : next.curve.feeBps
    next.curve = {
      ...next.curve,
      reserves: toHuman(fresh.xr),
      inventory: toHuman(fresh.yr),
      feeBps,
      history: series.history,
      histStart: series.histStart,
      points: series.points,
      pointSeconds: seriesPointSeconds(series, TOPO_SECONDS),
      intervalTopo: series.intervalTopo,
      volume: toHuman(fresh.volume ?? 0n),
      trades: fresh.trades ?? next.curve.trades,
    }
    next.price = price
    next.marketCap = toHuman(
      coinMarketCap(fresh.xr, fresh.yr, y0, vx, toAtomicSafe(next.totalSupply)),
    )
    const gdx = toAtomicSafe(next.curve.gradDepth)
    next.progress = gdx > 0n
      ? Math.min(1, Number((fresh.xr * 100000000n) / gdx) / 100000000)
      : 0
    next.continuity = coinContinuity(fresh.xr, fresh.yr, y0, vx)
    next.graduation = coinGraduationAnalysis(
      fresh.xr, fresh.yr, y0, vx, gdx,
      fresh.graduated
        ? Math.min(params.graduatedFeeBps, params.curveFeeBps)
        : next.curve.feeBps,
    )
  }
  return next
}

/** Merge a fresh pool read into an existing coin. */
function mergePool(
  c: CommunityCoin,
  pool: NonNullable<Awaited<ReturnType<typeof fetchPool>>>,
  topo: number,
  params: CommunityParams,
  charts: Record<string, ChartSeries>,
): CommunityCoin {
  if (!c.pool) {
    // first time we see the pool — no curve fields needed, map directly
    const price = toHuman((pool.xelReserve * 100000000n) / (pool.tokenReserve || 1n))
    const series = samplePrice(charts, 'coinpool', c.id, price, topo)
    return {
      ...c,
      curve: undefined,
      price,
      marketCap: toHuman((pool.xelReserve * toAtomicSafe(c.totalSupply)) / (pool.tokenReserve || 1n)),
      pool: {
        id: c.id,
        asset: pool.asset,
        xel: toHuman(pool.xelReserve),
        token: toHuman(pool.tokenReserve),
        feeBps: params.dexSwapFeeBps,
        adminSplitBps: params.dexFeeSplitBps,
        seedLocked: toHuman(pool.lpLockedDepth),
        totalParts: toHuman(pool.lpTotalDepth),
        history: series.history,
        histStart: series.histStart,
        points: series.points,
        pointSeconds: seriesPointSeconds(series, TOPO_SECONDS),
        volume: toHuman(pool.buyVolume + pool.sellVolume),
        fees: toHuman(pool.lifetimeFees),
        trades: pool.trades,
        buysPaused: pool.buysPaused,
      },
    }
  }
  const price = toHuman((pool.xelReserve * 100000000n) / (pool.tokenReserve || 1n))
  const series = samplePrice(charts, 'coinpool', c.id, price, topo)
  return {
    ...c,
    price,
    marketCap: toHuman((pool.xelReserve * toAtomicSafe(c.totalSupply)) / (pool.tokenReserve || 1n)),
    pool: {
      ...c.pool,
      xel: toHuman(pool.xelReserve),
      token: toHuman(pool.tokenReserve),
      history: series.history,
      histStart: series.histStart,
      points: series.points,
      pointSeconds: seriesPointSeconds(series, TOPO_SECONDS),
      volume: toHuman(pool.buyVolume + pool.sellVolume),
      fees: toHuman(pool.lifetimeFees),
      trades: pool.trades,
      buysPaused: pool.buysPaused,
    },
  }
}

function buildTags(raw: RawCoin, status: CoinStatus, params: CommunityParams): string[] {
  const tags: string[] = []
  if (raw.creatorBps === 0) tags.push('no creator alloc')
  if (status === 'live') tags.push(`graduates at ${params.graduationDepth} XEL depth + continuity`)
  if (status === 'graduated') tags.push('ready to migrate')
  if (status === 'migrated') tags.push('DEX pool')
  return tags.slice(0, 3)
}
