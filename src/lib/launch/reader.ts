// VaultLaunch — structured on-chain reads (mainnet).
//
// Every function here maps raw storage cells to the app's domain objects.
// Mirrors the Python reference reader (sdk/xvault/xvault/launchpad.py /
// dex.py): same keys, same field order, same derivations. All amounts
// stay ATOMIC bigint until the store converts them for display; quotes
// and min_outs are computed with chain-math.ts (exact integer formulas).

import {
  VAULT_CONTRACT, DEX_CONTRACT, XEL_ASSET,
  readStorage, projKey, poolKey, lpKey, voteKey, migratedIndexKey,
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

/** Read one project record (all 38 fields) from the launchpad storage. */
export async function fetchProject(pid: number): Promise<RawProject | null> {
  const f = (field: string) => readStorage(VAULT_CONTRACT, projKey(pid, field))
  const [
    cr, st, nm, sy, ds, ws, lg, tw, tg, dc,
    ts, tb, lq, rv, cs, ct, ve, sp, rp, gr,
    rc, rd, vo, dl, bt, tp, vs, vd, vp,
    bv, sv, tc, lt, mc, mh, mg, ah, ab,
    mi, ma, mx, mt, dsy,
  ] = await Promise.all([
    f(PF.creator), f(PF.status), f(PF.name), f(PF.symbol), f(PF.description),
    f(PF.website), f(PF.logo), f(PF.twitter), f(PF.telegram), f(PF.discord),
    f(PF.supply), f(PF.teamBps), f(PF.liquidity), f(PF.reserves), f(PF.curve),
    f(PF.created), f(PF.deadline), f(PF.supports), f(PF.reports), f(PF.graduated),
    f(PF.refundClaimed), f(PF.round), f(PF.volume), f(PF.directListing),
    f(PF.bondingStart), f(PF.teamPaid), f(PF.vestingStart), f(PF.vestingDuration),
    f(PF.vestingPlan),
    f(PF.buyVolume), f(PF.sellVolume), f(PF.trades), f(PF.lastTrade),
    f(PF.marketCap), f(PF.marketCapHigh), f(PF.marketCapGrad),
    f(PF.asset), f(PF.budget),
    f(PF.migrated), f(PF.migratedAt), f(PF.migratedXel), f(PF.migratedTokens),
    f(PF.dexSynced),
  ])
  if (nm == null && sy == null && st == null) return null // never proposed
  return {
    id: pid,
    creator: cr == null ? null : str(cr),
    status: num(st),
    name: str(nm), symbol: str(sy), description: str(ds),
    website: str(ws), logo: str(lg),
    twitter: str(tw), telegram: str(tg), discord: str(dc),
    totalSupply: big(ts), teamBps: num(tb), liquidity: big(lq),
    reserves: big(rv), curveSupply: big(cs),
    createdTopo: num(ct), deadlineTopo: num(ve),
    supports: num(sp), reports: num(rp),
    graduated: bool(gr),
    refundClaimed: bool(rc), round: num(rd),
    volume: big(vo),
    directListing: bool(dl), bondingStart: num(bt),
    teamPaid: big(tp),
    vestingStart: num(vs), vestingDuration: num(vd), vestingPlan: num(vp),
    buyVolume: big(bv), sellVolume: big(sv), trades: num(tc), lastTradeTopo: num(lt),
    marketCap: big(mc), marketCapHigh: big(mh), marketCapGrad: big(mg),
    asset: ah == null ? null : str(ah),
    budget: big(ab),
    migrated: bool(mi), migratedAt: num(ma),
    migratedXel: big(mx), migratedTokens: big(mt),
    dexSynced: bool(dsy),
  }
}

/** Read the fast-changing fields only (status, reserves, votes, scores). */
export async function fetchProjectFast(pid: number): Promise<Partial<RawProject> | null> {
  const f = (field: string) => readStorage(VAULT_CONTRACT, projKey(pid, field))
  const [st, rv, cs, sp, rp, ve, vo, bv, sv, tc, mc, mh, mi, gr] = await Promise.all([
    f(PF.status), f(PF.reserves), f(PF.curve), f(PF.supports), f(PF.reports),
    f(PF.deadline), f(PF.volume), f(PF.buyVolume), f(PF.sellVolume),
    f(PF.trades), f(PF.marketCap), f(PF.marketCapHigh), f(PF.migrated),
    f(PF.graduated),
  ])
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

/** Read one DEX pool by asset hash. */
export async function fetchPool(asset: string): Promise<RawPool | null> {
  const f = (field: string) => readStorage(DEX_CONTRACT, poolKey(asset, field))
  const [xr, yr, bp, ct, bv, sv, tc, fl, lp, lx, ly, tl, pl] = await Promise.all([
    f(QF.xelReserve), f(QF.tokenReserve), f(QF.buysPaused), f(QF.created),
    f(QF.buyVolume), f(QF.sellVolume), f(QF.trades), f(QF.lifetimeFees),
    f(QF.lpCount), f(QF.lpPotXel), f(QF.lpPotTokens), f(QF.lpTotal), f(QF.lpLocked),
  ])
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

/** A provider's position in one pool (X10/X12). */
export interface RawLpInfo {
  parts: bigint
  claimableXel: bigint
  claimableTokens: bigint
  withdrawable: bigint
}

export async function fetchLpInfo(asset: string, wallet: string): Promise<RawLpInfo> {
  const f = (field: string) => readStorage(DEX_CONTRACT, lpKey(asset, wallet, field))
  const [x, cx, cy, w] = await Promise.all([
    f(LPF.parts), f(LPF.claimXel), f(LPF.claimTokens), f(LPF.withdrawable),
  ])
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

/** D22: every migrated project id, oldest first. */
export async function fetchMigratedPids(count: number): Promise<number[]> {
  const out: number[] = []
  const reads = Array.from({ length: Math.min(count, 200) }, (_, r) =>
    readStorage(VAULT_CONTRACT, migratedIndexKey(r), 30000),
  )
  const vals = await Promise.all(reads)
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
  const [pc, mgc, tvl, tbv, tsv, ttc, fcl, pfe, tcx, dpc, dxa] = await Promise.all([
    readStorage(VAULT_CONTRACT, VG.count, 10000),
    readStorage(VAULT_CONTRACT, VG.migratedCount, 30000),
    readStorage(VAULT_CONTRACT, VG.totalVolume, 10000),
    readStorage(VAULT_CONTRACT, VG.totalBuyVolume, 10000),
    readStorage(VAULT_CONTRACT, VG.totalSellVolume, 10000),
    readStorage(VAULT_CONTRACT, VG.totalTrades, 10000),
    readStorage(VAULT_CONTRACT, VG.feesCollected, 30000),
    readStorage(VAULT_CONTRACT, VG.pendingFees, 30000),
    readStorage(VAULT_CONTRACT, VG.totalCurveXel, 30000),
    readStorage(DEX_CONTRACT, DG.poolsCount, 30000),
    readStorage(DEX_CONTRACT, DG.launchpad, 60000),
  ])
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
