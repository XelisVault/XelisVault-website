// VaultLaunch — structured on-chain reads (mainnet).
//
// Every function here maps raw storage cells to the app's domain objects.
// Mirrors the Python reference reader (sdk/xvault/xvault/launchpad.py /
// dex.py): same keys, same field order, same derivations. All amounts
// stay ATOMIC bigint until the store converts them for display; quotes
// and min_outs are computed with chain-math.ts (exact integer formulas).

import {
  VAULT_CONTRACT, DEX_CONTRACT, XEL_ASSET,
  readStorage, readStorageBatch, projKey, poolKey, lpKey, voteKey, migratedIndexKey,
  PF, QF, LPF, VG, DG, type ProtocolParams,
} from './protocol'
import {
  curveSpotPrice, curveMarketCap, dexSpotPrice, dexMarketCap,
  teamAllocOf, currentFeeBps, ATOMIC,
} from './chain-math'
import type { ProjectStatus } from './types'

// ── Raw project record (atomic values, as stored) ────────────────────

export interface RawProject {
  id: number
  creator: string | null
  status: number // 0..6 on-chain lifecycle code
  name: string
  symbol: string
  description: string
  website: string
  logo: string
  twitter: string
  telegram: string
  discord: string
  totalSupply: bigint
  teamBps: number
  liquidity: bigint
  reserves: bigint
  curveSupply: bigint
  createdTopo: number
  deadlineTopo: number
  supports: number
  reports: number
  graduated: boolean
  refundClaimed: boolean
  round: number
  volume: bigint
  directListing: boolean
  bondingStart: number
  teamPaid: bigint
  vestingStart: number
  vestingDuration: number
  vestingPlan: number
  buyVolume: bigint
  sellVolume: bigint
  trades: number
  lastTradeTopo: number
  marketCap: bigint
  marketCapHigh: bigint
  marketCapGrad: bigint
  asset: string | null
  budget: bigint
  migrated: boolean
  migratedAt: number
  migratedXel: bigint
  migratedTokens: bigint
  dexSynced: boolean
}

export const STATUS_FROM_CODE: Record<number, ProjectStatus> = {
  0: 'validating', 1: 'rejected', 2: 'bonding', 3: 'graduated',
  4: 'trusted', 5: 'untrusted', 6: 'recovery',
}

const big = (v: any): bigint => (v == null ? 0n : BigInt(v))
const num = (v: any): number => (v == null ? 0 : Number(v))
const str = (v: any): string => (v == null ? '' : String(v))
const bool = (v: any): boolean => v === true

/** Read one project record (all 38 fields) from the launchpad storage.
 *  One batched sweep: 2 POSTs instead of 43 sequential round-trips. */
export async function fetchProject(pid: number): Promise<RawProject | null> {
  const order = [
    PF.creator, PF.status, PF.name, PF.symbol, PF.description,
    PF.website, PF.logo, PF.twitter, PF.telegram, PF.discord,
    PF.supply, PF.teamBps, PF.liquidity, PF.reserves, PF.curve,
    PF.created, PF.deadline, PF.supports, PF.reports, PF.graduated,
    PF.refundClaimed, PF.round, PF.volume, PF.directListing,
    PF.bondingStart, PF.teamPaid, PF.vestingStart, PF.vestingDuration,
    PF.vestingPlan,
    PF.buyVolume, PF.sellVolume, PF.trades, PF.lastTrade,
    PF.marketCap, PF.marketCapHigh, PF.marketCapGrad,
    PF.asset, PF.budget,
    PF.migrated, PF.migratedAt, PF.migratedXel, PF.migratedTokens,
    PF.dexSynced,
  ]
  const vals = await readStorageBatch(
    VAULT_CONTRACT, order.map((f) => projKey(pid, f)),
  )
  const v = (i: number) => vals[i]
  const nm = v(2), sy = v(3), st = v(1)
  if (nm == null && sy == null && st == null) return null // never proposed
  return {
    id: pid,
    creator: v(0) == null ? null : str(v(0)),
    status: num(st),
    name: str(nm), symbol: str(sy), description: str(v(4)),
    website: str(v(5)), logo: str(v(6)),
    twitter: str(v(7)), telegram: str(v(8)), discord: str(v(9)),
    totalSupply: big(v(10)), teamBps: num(v(11)), liquidity: big(v(12)),
    reserves: big(v(13)), curveSupply: big(v(14)),
    createdTopo: num(v(15)), deadlineTopo: num(v(16)),
    supports: num(v(17)), reports: num(v(18)),
    graduated: bool(v(19)),
    refundClaimed: bool(v(20)), round: num(v(21)),
    volume: big(v(22)),
    directListing: bool(v(23)), bondingStart: num(v(24)),
    teamPaid: big(v(25)),
    vestingStart: num(v(26)), vestingDuration: num(v(27)), vestingPlan: num(v(28)),
    buyVolume: big(v(29)), sellVolume: big(v(30)), trades: num(v(31)), lastTradeTopo: num(v(32)),
    marketCap: big(v(33)), marketCapHigh: big(v(34)), marketCapGrad: big(v(35)),
    asset: v(36) == null ? null : str(v(36)),
    budget: big(v(37)),
    migrated: bool(v(38)), migratedAt: num(v(39)),
    migratedXel: big(v(40)), migratedTokens: big(v(41)),
    dexSynced: bool(v(42)),
  }
}

/** Read the fast-changing fields only (status, reserves, votes, scores).
 *  One batched POST instead of 14 sequential round-trips. */
export async function fetchProjectFast(pid: number): Promise<Partial<RawProject> | null> {
  const order = [
    PF.status, PF.reserves, PF.curve, PF.supports, PF.reports,
    PF.deadline, PF.volume, PF.buyVolume, PF.sellVolume,
    PF.trades, PF.marketCap, PF.marketCapHigh, PF.migrated,
    PF.graduated,
  ]
  const vals = await readStorageBatch(
    VAULT_CONTRACT, order.map((f) => projKey(pid, f)),
  )
  const [st, rv, cs, sp, rp, ve, vo, bv, sv, tc, mc, mh, mi, gr] = vals
  if (st == null && rv == null) return null
  return {
    status: num(st), reserves: big(rv), curveSupply: big(cs),
    supports: num(sp), reports: num(rp), deadlineTopo: num(ve),
    volume: big(vo), buyVolume: big(bv), sellVolume: big(sv),
    trades: num(tc), marketCap: big(mc), marketCapHigh: big(mh),
    migrated: bool(mi), graduated: bool(gr),
  }
}

// ── DEX pools ────────────────────────────────────────────────────────

export interface RawPool {
  asset: string
  xelReserve: bigint
  tokenReserve: bigint
  buysPaused: boolean
  createdTopo: number
  buyVolume: bigint
  sellVolume: bigint
  trades: number
  lifetimeFees: bigint
  lpCount: number
  lpTotalDepth: bigint     // tl — total LP depth in XEL
  lpLockedDepth: bigint    // pl — the protocol-locked seed floor (X11)
  lpPotXel: bigint
  lpPotTokens: bigint
}

/** Read one DEX pool by asset hash. One batched POST. */
export async function fetchPool(asset: string): Promise<RawPool | null> {
  const order = [
    QF.xelReserve, QF.tokenReserve, QF.buysPaused, QF.created,
    QF.buyVolume, QF.sellVolume, QF.trades, QF.lifetimeFees,
    QF.lpCount, QF.lpPotXel, QF.lpPotTokens, QF.lpTotal, QF.lpLocked,
  ]
  const vals = await readStorageBatch(
    DEX_CONTRACT, order.map((f) => poolKey(asset, f)),
  )
  const [xr, yr, bp, ct, bv, sv, tc, fl, lp, lx, ly, tl, pl] = vals
  if (xr == null && yr == null) return null
  return {
    asset,
    xelReserve: big(xr), tokenReserve: big(yr),
    buysPaused: bool(bp), createdTopo: num(ct),
    buyVolume: big(bv), sellVolume: big(sv), trades: num(tc),
    lifetimeFees: big(fl), lpCount: num(lp),
    lpPotXel: big(lx), lpPotTokens: big(ly),
    lpTotalDepth: big(tl), lpLockedDepth: big(pl),
  }
}

/** Read many DEX pools in ONE batched sweep (one POST per pool, all
 *  chunks in parallel waves) — the fast cycle's pool refresh. */
export async function fetchPoolsBatch(assets: string[]): Promise<(RawPool | null)[]> {
  return Promise.all(assets.map((a) => fetchPool(a)))
}

/** A provider's position in one pool (X10/X12). */
export interface RawLpInfo {
  parts: bigint
  claimableXel: bigint
  claimableTokens: bigint
  withdrawable: bigint
}

export async function fetchLpInfo(asset: string, wallet: string): Promise<RawLpInfo> {
  const order = [LPF.parts, LPF.claimXel, LPF.claimTokens, LPF.withdrawable]
  const vals = await readStorageBatch(
    DEX_CONTRACT, order.map((f) => lpKey(asset, wallet, f)),
  )
  const [x, cx, cy, w] = vals
  return {
    parts: big(x), claimableXel: big(cx), claimableTokens: big(cy),
    withdrawable: big(w),
  }
}

// ── Votes, listings, bridge ──────────────────────────────────────────

/** Has `addr` voted on `pid` round? (presence IS the vote marker, D21) */
export async function fetchHasVoted(pid: number, round: number, addr: string): Promise<boolean> {
  const v = await readStorage(VAULT_CONTRACT, voteKey(pid, round, addr), 8000)
  return v != null && v !== false && v !== 0n
}

/** D22: every migrated project id, oldest first. One batched sweep. */
export async function fetchMigratedPids(count: number): Promise<number[]> {
  const n = Math.min(count, 200)
  if (n <= 0) return []
  const vals = await readStorageBatch(
    VAULT_CONTRACT,
    Array.from({ length: n }, (_, r) => migratedIndexKey(r)),
  )
  const out: number[] = []
  for (const v of vals) {
    if (v == null) continue
    out.push(Number(v))
  }
  return out
}

/** D22 reverse bridge: asset hash → project id (null if not ours). */
export async function fetchPidByAsset(asset: string): Promise<number | null> {
  const v = await readStorage(VAULT_CONTRACT, `a:${asset}`, 30000)
  return v == null ? null : Number(v)
}

/** Ticker registry check: is the symbol already taken? */
export async function fetchTickerTaken(symbol: string): Promise<boolean> {
  const v = await readStorage(VAULT_CONTRACT, `t:${symbol.toUpperCase()}`, 6000)
  return v != null
}

// ── Protocol scoreboard ──────────────────────────────────────────────

export interface ProtocolStats {
  projectCount: number
  migratedCount: number
  totalVolume: bigint
  totalBuyVolume: bigint
  totalSellVolume: bigint
  totalTrades: number
  feesCollected: bigint
  pendingFees: bigint
  totalCurveXel: bigint
  poolsCount: number
  dexPinned: string | null
}

export async function fetchProtocolStats(): Promise<ProtocolStats> {
  const [v, d] = await Promise.all([
    readStorageBatch(VAULT_CONTRACT, [
      VG.count, VG.migratedCount, VG.totalVolume, VG.totalBuyVolume,
      VG.totalSellVolume, VG.totalTrades, VG.feesCollected,
      VG.pendingFees, VG.totalCurveXel,
    ]),
    readStorageBatch(DEX_CONTRACT, [DG.poolsCount, DG.launchpad]),
  ])
  const [pc, mgc, tvl, tbv, tsv, ttc, fcl, pfe, tcx] = v
  const [dpc, dxa] = d
  return {
    projectCount: num(pc),
    migratedCount: num(mgc),
    totalVolume: big(tvl), totalBuyVolume: big(tbv), totalSellVolume: big(tsv),
    totalTrades: num(ttc), feesCollected: big(fcl), pendingFees: big(pfe),
    totalCurveXel: big(tcx),
    poolsCount: num(dpc),
    dexPinned: dxa == null ? null : str(dxa),
  }
}

// ── Derived values (composition, exactly like the SDK) ───────────────

export interface ProjectDerived {
  status: ProjectStatus
  /** curve-era spot price (atomic XEL per whole token); 0 once migrated */
  curvePrice: bigint
  /** live pool price for migrated projects */
  poolPrice: bigint
  /** live market cap (curve era, or pool era for migrated) */
  marketCap: bigint
  /** the project's effective trading fee on the curve */
  feeBps: number
  /** graduation target in atomic XEL (liquidity × gmu) */
  graduationTarget: bigint
  /** 0..1 progress toward graduation on the curve */
  graduationProgress: number
  /** circulating tokens outside the curve (bought back by holders) */
  circulatingHeld: bigint
}

export function deriveProject(
  p: RawProject, pool: RawPool | null, params: ProtocolParams,
): ProjectDerived {
  const status = STATUS_FROM_CODE[p.status] ?? 'validating'
  const feeBps = currentFeeBps(p.graduated, params.tradingFeeBps, params.graduatedFeeBps)
  const curvePrice = p.migrated ? 0n : curveSpotPrice(p.reserves, p.curveSupply)
  const poolPrice = pool ? dexSpotPrice(pool.xelReserve, pool.tokenReserve) : 0n
  const teamRem = teamAllocOf(p.totalSupply, p.teamBps) - p.teamPaid
  const marketCap = p.migrated && pool
    ? dexMarketCap(pool.xelReserve, pool.tokenReserve, p.totalSupply, teamRem)
    : curveMarketCap(p.reserves, p.curveSupply, p.totalSupply, p.teamBps, p.teamPaid)
  const target = p.liquidity * BigInt(params.graduationMultiplier)
  const progress = p.liquidity > 0n
    ? Math.min(1, Number((p.reserves * ATOMIC) / target) / Number(ATOMIC))
    : 0
  const circulatingHeld = p.totalSupply - p.curveSupply - teamRem
  return {
    status, curvePrice, poolPrice, marketCap, feeBps,
    graduationTarget: target, graduationProgress: progress,
    circulatingHeld,
  }
}
