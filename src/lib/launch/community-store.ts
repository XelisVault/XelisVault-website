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
import { coinSpotPrice, coinMarketCap, coinContinuity } from './community-math'
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

interface CommunityStore {
  status: CommunityNodeStatus
  statusMessage: string | null
  cParams: CommunityParams
  coins: CommunityCoin[]
  cStats: CommunityStats | null
  charts: Record<string, ChartSeries>
  lastSyncMs: number
  syncing: boolean

  start: () => void
  refresh: (deep?: boolean) => Promise<void>
  seriesFor: (kind: string, id: string) => ChartSeries
}

const FAST_MS = 15_000
const DEEP_MS = 60_000
/** Hard cap on fully-scanned coins per deep cycle (newest first). */
const SCAN_CAP = 150

const internal: { fast: ReturnType<typeof setInterval> | null; deep: ReturnType<typeof setInterval> | null; started: boolean } = {
  fast: null, deep: null, started: false,
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
}))

// ── Scan cycles ──────────────────────────────────────────────────────

type SetFn = (partial: Partial<CommunityStore>) => void
type GetFn = () => CommunityStore

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
      if (fresh) coins[i] = mergeFast(coins[i], fresh, topo, get().cParams, charts)
    }
    if (c.status === 'migrated' && c.asset) {
      const pool = await fetchPool(c.asset).catch(() => null)
      if (pool) coins[i] = mergePool(coins[i], pool, topo, charts)
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
  const valid = raws.filter((r): r is RawCoin => !!r)

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
    return mapCoin(raw, pool, topo, cParams, charts)
  })

  set({ cParams, cStats, coins, charts })
}

// ── Mapping (raw storage → display shape) ────────────────────────────

function samplePrice(
  charts: Record<string, ChartSeries>,
  kind: string,
  id: string,
  price: number,
  topo: number,
): ChartSeries {
  const key = `${kind}:${id}`
  const s = charts[key] ?? loadSeries(kind, id) ?? emptySeries(topo)
  const next = appendPoint(s, price, topo)
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

  // curve era — live + graduated (the curve keeps trading at the
  // graduated fee until the pool exists; migrated coins report zeros)
  if (!raw.migrated && raw.yr > 0n) {
    const priceA = coinSpotPrice(raw.xr, raw.yr, raw.y0, raw.vx)
    const price = toHuman(priceA)
    const series = samplePrice(charts, 'coin', c.id, price, topo)
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
      volume: toHuman(raw.volume),
      trades: raw.trades,
    }
    c.price = price
    c.marketCap = toHuman(mcapA)
    c.progress = raw.gdx > 0n
      ? Math.min(1, Number((raw.xr * 100000000n) / raw.gdx) / 100000000)
      : 0
    c.continuity = coinContinuity(raw.xr, raw.yr, raw.y0, raw.vx)
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
      feeBps: 30,
      adminSplitBps: 5000,
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
    const series = samplePrice(charts, 'coin', c.id, price, topo)
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
  }
  return next
}

/** Merge a fresh pool read into an existing coin. */
function mergePool(
  c: CommunityCoin,
  pool: NonNullable<Awaited<ReturnType<typeof fetchPool>>>,
  topo: number,
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
        feeBps: 30,
        adminSplitBps: 5000,
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

/** float human → atomic bigint without float-drift (via string). */
function toAtomicSafe(human: number): bigint {
  const s = human.toFixed(8)
  const [int, frac = ''] = s.split('.')
  return BigInt((int || '0') + (frac + '0'.repeat(8)).slice(0, 8))
}

function buildTags(raw: RawCoin, status: CoinStatus, params: CommunityParams): string[] {
  const tags: string[] = []
  if (raw.creatorBps === 0) tags.push('no creator alloc')
  if (status === 'live') tags.push(`graduates at ${params.graduationDepth} XEL depth`)
  if (status === 'graduated') tags.push('ready to migrate')
  if (status === 'migrated') tags.push('DEX pool')
  return tags.slice(0, 3)
}
