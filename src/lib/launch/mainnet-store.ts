// VaultLaunch — MAINNET store (Zustand).
//
// Replaces the demo engine: the chain is the backend. A background
// poller reads the two contracts through the public mainnet node:
//   • fast cycle (~15 s) — topoheight + the fast fields of ACTIVE
//     projects (validating / bonding / pre-migration graduated) + the
//     reserves of live DEX pools. Each cycle samples the spot price and
//     appends it to the locally-persisted chart series.
//   • deep cycle (~60 s) — full re-scan: protocol params, scoreboard,
//     every project record, every pool, and the connected wallet's
//     votes (read on-chain via the D21 vote slots).
//
// Everything the UI shows comes from here, and everything here comes
// from a storage read — no indexer, no database, no cache to
// invalidate. After any transaction, tx.ts calls refresh(true) so the
// effect of the confirmed transaction is visible within a second.

'use client'

import { create } from 'zustand'
import { getTopoheight } from '@/lib/xelis/rpc'
import {
  TOPO_SECONDS, MAINNET_PARAMS, type ProtocolParams, fetchProtocolParams,
} from './protocol'
import {
  fetchProject, fetchProjectFast, fetchPool, fetchProtocolStats,
  fetchMigratedPids, fetchHasVoted, STATUS_FROM_CODE,
  type RawProject, type RawPool, type ProtocolStats,
} from './reader'
import { loadSeries, saveSeries, appendPoint, emptySeries, seriesPointSeconds, type ChartSeries } from './persist'
import { toHuman } from './chain-math'
import type { Project, ProjectStatus } from './types'

// ── Helpers ──────────────────────────────────────────────────────────

/** Deterministic brand hue from the ticker (stable across sessions). */
function hueOf(ticker: string): number {
  let h = 0
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) % 360
  return h
}

export function statusOf(p: Project): ProjectStatus {
  return p.status
}

/** Graduation progress 0..1 for a curve project (mainnet gmu = ×2). */
export function graduationOf(p: Project, params: ProtocolParams = MAINNET_PARAMS): number {
  if (!p.curve || p.curve.seed <= 0) return 0
  const target = p.curve.seed * params.graduationMultiplier
  return Math.min(1, p.curve.reserves / target)
}

function deadlineMsOf(deadlineTopo: number, topoheight: number): number {
  return Date.now() + Math.max(0, deadlineTopo - topoheight) * TOPO_SECONDS * 1000
}

// ── State ────────────────────────────────────────────────────────────

export type NodeStatus = 'connecting' | 'live' | 'offline'

interface MainnetStore {
  status: NodeStatus
  statusMessage: string | null
  topoheight: number
  params: ProtocolParams
  projects: Project[]
  stats: ProtocolStats | null
  charts: Record<string, ChartSeries>
  lastSyncMs: number
  syncing: boolean
  /** wallet votes refresh trigger (address or null) */
  walletAddress: string | null

  start: () => void
  refresh: (deep?: boolean) => Promise<void>
  refreshUserVotes: (address: string | null) => Promise<void>
  seriesFor: (kind: string, id: string) => ChartSeries
}

const FAST_MS = 15_000
const DEEP_MS = 60_000
/** Hard cap on fully-scanned projects per deep cycle (newest first). */
const SCAN_CAP = 120

const internal: { fast: ReturnType<typeof setInterval> | null; deep: ReturnType<typeof setInterval> | null; started: boolean } = {
  fast: null, deep: null, started: false,
}

export const useMainnet = create<MainnetStore>((set, get) => ({
  status: 'connecting',
  statusMessage: null,
  topoheight: 0,
  params: MAINNET_PARAMS,
  projects: [],
  stats: null,
  charts: {},
  lastSyncMs: 0,
  syncing: false,
  walletAddress: null,

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
      const prevStatus = get().status

      if (deep) {
        await deepScan(topo, set, get)
      } else {
        await fastScan(topo, set, get)
      }
      set({
        topoheight: topo,
        status: 'live',
        statusMessage: null,
        lastSyncMs: Date.now(),
      })
      if (prevStatus !== 'live') {
        // re-check user votes once we're back (state may have moved)
        const addr = get().walletAddress
        if (addr) void get().refreshUserVotes(addr)
      }
    } catch (e: any) {
      set({
        status: 'offline',
        statusMessage: e instanceof Error ? e.message : 'mainnet node unreachable — retrying',
      })
    } finally {
      set({ syncing: false })
    }
  },

  refreshUserVotes: async (address) => {
    set({ walletAddress: address })
    if (!address) {
      // clear all user votes
      set({
        projects: get().projects.map((p) =>
          p.vote ? { ...p, vote: { ...p.vote, userVoted: false } } : p,
        ),
      })
      return
    }
    const open = get().projects.filter(
      (p) => p.vote && (p.status === 'validating' || p.status === 'recovery'),
    )
    const results = await Promise.all(
      open.map((p) => fetchHasVoted(p.pid, p.vote!.round, address).catch(() => false)),
    )
    // Only apply if the list didn't change underneath us
    const current = get().projects
    set({
      projects: current.map((p) => {
        const idx = open.findIndex((o) => o.id === p.id)
        if (idx < 0 || !p.vote) return p
        return { ...p, vote: { ...p.vote, userVoted: results[idx] } }
      }),
    })
  },
}))

// ── Scan cycles ──────────────────────────────────────────────────────

type SetFn = (partial: Partial<MainnetStore>) => void
type GetFn = () => MainnetStore

/** Fast fields of active projects + live pool reserves + price samples. */
async function fastScan(topo: number, set: SetFn, get: GetFn): Promise<void> {
  const prev = get().projects
  if (prev.length === 0) {
    // nothing known yet — bootstrap with a deep scan
    await deepScan(topo, set, get)
    return
  }

  const charts = { ...get().charts }
  const projects = [...prev]

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i]
    const active =
      p.status === 'validating' || p.status === 'recovery' ||
      (p.status === 'bonding') ||
      ((p.status === 'graduated' || p.status === 'trusted' || p.status === 'untrusted') && !p.migrated)
    if (active) {
      const fresh = await fetchProjectFast(p.pid).catch(() => null)
      if (fresh) {
        projects[i] = mergeFast(projects[i], fresh, topo, get().params, charts)
      }
    }
    if (p.migrated && p.pool) {
      const pool = await fetchPool(p.pool.asset).catch(() => null)
      if (pool) {
        projects[i] = mergePool(projects[i], pool, topo, charts)
      }
    }
  }

  set({ projects, charts })
}

/** Full re-scan: params, stats, every project record, every pool. */
async function deepScan(topo: number, set: SetFn, get: GetFn): Promise<void> {
  const [params, stats] = await Promise.all([
    fetchProtocolParams().catch(() => get().params),
    fetchProtocolStats().catch(() => get().stats),
  ])
  const count = Math.min(stats?.projectCount ?? 0, SCAN_CAP)
  if (count === 0) {
    set({ params, stats, projects: [] })
    return
  }

  const ids: number[] = []
  for (let pid = count - 1; pid >= 0; pid--) ids.push(pid)
  const raws = await Promise.all(ids.map((pid) => fetchProject(pid).catch(() => null)))
  const valid = raws.filter((r): r is RawProject => !!r)

  // pools: one per migrated project (a pool can only exist through migration)
  const poolReads = valid
    .filter((r) => r.migrated && r.asset)
    .map((r) => fetchPool(r.asset!).then((pool) => ({ pid: r.id, pool })).catch(() => null))
  const poolResults = await Promise.all(poolReads)
  const poolByPid = new Map<number, RawPool>()
  for (const pr of poolResults) {
    if (pr && pr.pool) poolByPid.set(pr.pid, pr.pool)
  }

  const charts = { ...get().charts }
  const projects = valid.map((raw) => {
    const pool = poolByPid.get(raw.id) ?? null
    return mapProject(raw, pool, topo, params, charts)
  })

  set({ params, stats, projects, charts })
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

function mapProject(
  raw: RawProject,
  pool: RawPool | null,
  topo: number,
  params: ProtocolParams,
  charts: Record<string, ChartSeries>,
): Project {
  const status: ProjectStatus = STATUS_FROM_CODE[raw.status] ?? 'validating'
  const ticker = raw.symbol || `P${raw.id}`
  const hue = hueOf(ticker)
  const longDescription =
    raw.description ||
    `${raw.name} (${ticker}) — launched through the XelisVault community launchpad.`

  const p: Project = {
    id: String(raw.id),
    pid: raw.id,
    name: raw.name || `Project ${raw.id}`,
    ticker,
    description: raw.description,
    longDescription,
    creator: raw.creator ?? 'unknown',
    creatorAddress: raw.creator ?? '',
    website: raw.website || undefined,
    logo: raw.logo || undefined,
    twitter: raw.twitter || undefined,
    telegram: raw.telegram || undefined,
    discord: raw.discord || undefined,
    hue,
    avatar: ticker.slice(0, 2).toUpperCase(),
    status,
    directListing: raw.directListing,
    graduated: raw.graduated,
    migrated: raw.migrated,
    asset: raw.asset,
    proposedAtTopo: raw.createdTopo,
    trust: { up: raw.supports, down: raw.reports },
    tags: buildTags(raw, status, params),
    vestingPlanTopos: raw.vestingPlan,
    teamBps: raw.teamBps,
    totalSupply: toHuman(raw.totalSupply),
    dexSynced: raw.dexSynced,
    refundClaimed: raw.refundClaimed,
  }

  // vote window (validating / recovery)
  if (status === 'validating' || status === 'recovery') {
    p.vote = {
      supporters: raw.supports,
      reporters: raw.reports,
      quorum: params.minParticipants,
      approvalThreshold: params.minApprovalPct,
      deadlineTopo: raw.deadlineTopo,
      deadlineMs: deadlineMsOf(raw.deadlineTopo, topo),
      round: raw.round,
      userVoted: false,
    }
  }

  // curve era (bonding, or graduated while the pool doesn't exist yet)
  if (!raw.migrated && raw.curveSupply > 0n && (status === 'bonding' || raw.graduated || status === 'untrusted' || status === 'recovery')) {
    const price = toHuman((raw.reserves * 100000000n) / (raw.curveSupply || 1n))
    const series = samplePrice(charts, 'curve', p.id, price, topo)
    p.curve = {
      reserves: toHuman(raw.reserves),
      circulating: toHuman(raw.curveSupply),
      seed: toHuman(raw.liquidity),
      feeBps: raw.graduated
        ? Math.min(params.graduatedFeeBps, params.tradingFeeBps)
        : params.tradingFeeBps,
      teamBps: raw.teamBps,
      history: series.history,
      histStart: series.histStart,
      points: series.points,
      pointSeconds: seriesPointSeconds(series, TOPO_SECONDS),
      volume: toHuman(raw.volume),
      trades: raw.trades,
      marketCap: toHuman(raw.marketCap),
      marketCapHigh: toHuman(raw.marketCapHigh),
    }
  }

  // pool era (migrated)
  if (raw.migrated && pool) {
    const price = toHuman((pool.xelReserve * 100000000n) / (pool.tokenReserve || 1n))
    const series = samplePrice(charts, 'pool', p.id, price, topo)
    p.pool = {
      id: p.id,
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
  }

  return p
}

/** Merge a fast-scan partial into an existing Project (no full refetch). */
function mergeFast(
  p: Project,
  fresh: Partial<RawProject>,
  topo: number,
  params: ProtocolParams,
  charts: Record<string, ChartSeries>,
): Project {
  const next: Project = {
    ...p,
    trust: {
      up: fresh.supports ?? p.trust.up,
      down: fresh.reports ?? p.trust.down,
    },
    graduated: fresh.graduated ?? p.graduated,
    migrated: fresh.migrated ?? p.migrated,
  }
  if (fresh.status != null) {
    const st = STATUS_FROM_CODE[fresh.status] ?? p.status
    next.status = st
    if ((st === 'validating' || st === 'recovery') && fresh.deadlineTopo != null) {
      next.vote = {
        supporters: fresh.supports ?? next.trust.up,
        reporters: fresh.reports ?? next.trust.down,
        quorum: params.minParticipants,
        approvalThreshold: params.minApprovalPct,
        deadlineTopo: fresh.deadlineTopo,
        deadlineMs: deadlineMsOf(fresh.deadlineTopo, topo),
        round: p.vote?.round ?? 0,
        userVoted: p.vote?.userVoted ?? false,
      }
    } else {
      next.vote = undefined
    }
  }
  if (fresh.reserves != null && fresh.curveSupply != null && !next.migrated && next.curve) {
    const price = toHuman((fresh.reserves * 100000000n) / (fresh.curveSupply || 1n))
    const series = samplePrice(charts, 'curve', p.id, price, topo)
    next.curve = {
      ...next.curve,
      reserves: toHuman(fresh.reserves),
      circulating: toHuman(fresh.curveSupply),
      history: series.history,
      histStart: series.histStart,
      points: series.points,
      pointSeconds: seriesPointSeconds(series, TOPO_SECONDS),
      volume: toHuman(fresh.volume ?? 0n),
      trades: fresh.trades ?? next.curve.trades,
      marketCap: toHuman(fresh.marketCap ?? 0n),
      marketCapHigh: toHuman(fresh.marketCapHigh ?? 0n),
    }
  }
  return next
}

/** Merge a fresh pool read into an existing Project. */
function mergePool(
  p: Project,
  pool: RawPool,
  topo: number,
  charts: Record<string, ChartSeries>,
): Project {
  if (!p.pool) {
    // first time we see the pool — full mapping needed
    return mapProject(
      {
        id: p.pid, creator: p.creatorAddress, status: 3,
        name: p.name, symbol: p.ticker, description: p.description,
        website: p.website ?? '', logo: p.logo ?? '',
        twitter: p.twitter ?? '', telegram: p.telegram ?? '', discord: p.discord ?? '',
        totalSupply: BigInt(Math.round(p.totalSupply * 1e8)),
        teamBps: p.teamBps, liquidity: 0n, reserves: 0n, curveSupply: 0n,
        createdTopo: p.proposedAtTopo, deadlineTopo: 0,
        supports: p.trust.up, reports: p.trust.down, graduated: true,
        refundClaimed: false, round: 0, volume: 0n, directListing: p.directListing,
        bondingStart: 0, teamPaid: 0n, vestingStart: 0, vestingDuration: 0,
        vestingPlan: p.vestingPlanTopos, buyVolume: 0n, sellVolume: 0n,
        trades: pool.trades, lastTradeTopo: 0, marketCap: 0n, marketCapHigh: 0n,
        marketCapGrad: 0n, asset: pool.asset, budget: 0n, migrated: true,
        migratedAt: 0, migratedXel: pool.xelReserve, migratedTokens: pool.tokenReserve,
        dexSynced: pool.buysPaused,
      } as RawProject,
      pool, topo, MAINNET_PARAMS, charts,
    )
  }
  const price = toHuman((pool.xelReserve * 100000000n) / (pool.tokenReserve || 1n))
  const series = samplePrice(charts, 'pool', p.id, price, topo)
  return {
    ...p,
    pool: {
      ...p.pool,
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

function buildTags(raw: RawProject, status: ProjectStatus, params: ProtocolParams): string[] {
  const tags: string[] = []
  if (raw.directListing) tags.push('direct listing')
  if (raw.vestingPlan > 0) tags.push('vesting declared')
  if (raw.teamBps === 0) tags.push('no team alloc')
  if (status === 'bonding') tags.push(`graduates at ${Math.round(toHuman(raw.liquidity) * params.graduationMultiplier)} XEL`)
  return tags.slice(0, 3)
}
