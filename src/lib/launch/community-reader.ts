// CommunityLaunch — structured on-chain reads (mainnet, C101).
//
// Every function here maps raw storage cells (`c:{cid}:{field}` — the
// flat KV layout of CommunityLaunch.slx) to the app's domain objects.
// Mirrors the Python reference (sdk/xvault/xvault/community.py): same
// keys, same field order, same derivations. All amounts stay ATOMIC
// bigint until the store converts them for display; quotes and
// min_outs are computed with community-math.ts (exact integer
// formulas — the same math the contract runs).

import {
  COMMUNITY_CONTRACT, readStorage, coinKey, CF, CG,
} from './protocol'

// ── Raw coin record (atomic values, as stored) ────────────────────────

export interface RawCoin {
  cid: number
  creator: string | null
  status: number // 0 live · 1 graduated · 2 migrated
  name: string
  symbol: string
  description: string
  website: string
  logo: string
  twitter: string
  telegram: string
  discord: string
  totalSupply: bigint
  creatorBps: number
  xr: bigint // real XEL reserves
  yr: bigint // real token inventory
  y0: bigint // initial inventory snapshot
  vx: bigint // launch depth (snapshot)
  gdx: bigint // graduation depth (snapshot)
  createdTopo: number
  graduated: boolean
  graduatedTopo: number
  migrated: boolean
  migratedTopo: number
  migratedXel: bigint
  migratedTokens: bigint
  creatorPaid: boolean
  asset: string | null
  buyVolume: bigint
  sellVolume: bigint
  trades: number
  lastTradeTopo: number
  volume: bigint
}

export const COIN_STATUS_FROM_CODE: Record<number, 'live' | 'graduated' | 'migrated'> = {
  0: 'live', 1: 'graduated', 2: 'migrated',
}

const big = (v: any): bigint => (v == null ? 0n : BigInt(v))
const num = (v: any): number => (v == null ? 0 : Number(v))
const str = (v: any): string => (v == null ? '' : String(v))
const bool = (v: any): boolean => v === true

/** Read one coin record (all 31 fields) from the factory storage. */
export async function fetchCoin(cid: number): Promise<RawCoin | null> {
  const f = (field: string) => readStorage(COMMUNITY_CONTRACT, coinKey(cid, field))
  const [
    cr, st, nm, sy, ds, ws, lg, tw, tg, dc,
    ts, cb, xr, yr, y0, vx, gx,
    ct, gr, gt, mi, ma, mx, mt, cp, ah,
    bv, sv, tc, lt, vo,
  ] = await Promise.all([
    f(CF.creator), f(CF.status), f(CF.name), f(CF.symbol), f(CF.description),
    f(CF.website), f(CF.logo), f(CF.twitter), f(CF.telegram), f(CF.discord),
    f(CF.supply), f(CF.creatorBps),
    f(CF.xelReserve), f(CF.tokenInventory), f(CF.initialInventory),
    f(CF.virtualXel), f(CF.gradDepth),
    f(CF.created), f(CF.graduated), f(CF.graduatedAt),
    f(CF.migrated), f(CF.migratedAt), f(CF.migratedXel), f(CF.migratedTokens),
    f(CF.creatorPaid), f(CF.asset),
    f(CF.buyVolume), f(CF.sellVolume), f(CF.trades), f(CF.lastTrade),
    f(CF.volume),
  ])
  if (nm == null && sy == null && st == null) return null // never launched
  return {
    cid,
    creator: cr == null ? null : str(cr),
    status: num(st),
    name: str(nm), symbol: str(sy), description: str(ds),
    website: str(ws), logo: str(lg),
    twitter: str(tw), telegram: str(tg), discord: str(dc),
    totalSupply: big(ts), creatorBps: num(cb),
    xr: big(xr), yr: big(yr), y0: big(y0), vx: big(vx), gdx: big(gx),
    createdTopo: num(ct),
    graduated: bool(gr), graduatedTopo: num(gt),
    migrated: bool(mi), migratedTopo: num(ma),
    migratedXel: big(mx), migratedTokens: big(mt),
    creatorPaid: bool(cp),
    asset: ah == null ? null : str(ah),
    buyVolume: big(bv), sellVolume: big(sv),
    trades: num(tc), lastTradeTopo: num(lt), volume: big(vo),
  }
}

/** Read the fast-changing fields only (status, reserves, scores). */
export async function fetchCoinFast(cid: number): Promise<Partial<RawCoin> | null> {
  const f = (field: string) => readStorage(COMMUNITY_CONTRACT, coinKey(cid, field))
  const [st, xr, yr, gr, mi, cp, bv, sv, tc, lt, vo] = await Promise.all([
    f(CF.status), f(CF.xelReserve), f(CF.tokenInventory),
    f(CF.graduated), f(CF.migrated), f(CF.creatorPaid),
    f(CF.buyVolume), f(CF.sellVolume), f(CF.trades), f(CF.lastTrade),
    f(CF.volume),
  ])
  if (st == null && xr == null && yr == null) return null
  return {
    status: num(st), xr: big(xr), yr: big(yr),
    graduated: bool(gr), migrated: bool(mi), creatorPaid: bool(cp),
    buyVolume: big(bv), sellVolume: big(sv),
    trades: num(tc), lastTradeTopo: num(lt), volume: big(vo),
  }
}

// ── Registry & reverse bridge ─────────────────────────────────────────

/** Ticker registry: is the symbol already taken on the factory?
 *  (`t:{SYMBOL}` → cid — one per symbol, forever.) */
export async function fetchCoinTickerTaken(symbol: string): Promise<boolean> {
  const v = await readStorage(COMMUNITY_CONTRACT, `t:${symbol.toUpperCase()}`, 6000)
  return v != null
}

/** Reverse bridge (`a:{asset}` → cid): which coin owns this asset? */
export async function fetchCidByAsset(asset: string): Promise<number | null> {
  const v = await readStorage(COMMUNITY_CONTRACT, `a:${asset}`, 30000)
  return v == null ? null : Number(v)
}

// ── Factory scoreboard ────────────────────────────────────────────────

export interface CommunityStats {
  coinCount: number
  migratedCount: number
  totalVolume: bigint
  totalBuyVolume: bigint
  totalSellVolume: bigint
  totalTrades: number
  feesCollected: bigint
  pendingFees: bigint
  totalCurveXel: bigint
}

export async function fetchCommunityStats(): Promise<CommunityStats> {
  const [pc, mgc, tvl, tbv, tsv, ttc, fcl, pfe, tcx] = await Promise.all([
    readStorage(COMMUNITY_CONTRACT, CG.count, 10000),
    readStorage(COMMUNITY_CONTRACT, CG.migratedCount, 30000),
    readStorage(COMMUNITY_CONTRACT, CG.totalVolume, 10000),
    readStorage(COMMUNITY_CONTRACT, CG.totalBuyVolume, 10000),
    readStorage(COMMUNITY_CONTRACT, CG.totalSellVolume, 10000),
    readStorage(COMMUNITY_CONTRACT, CG.totalTrades, 10000),
    readStorage(COMMUNITY_CONTRACT, CG.feesCollected, 30000),
    readStorage(COMMUNITY_CONTRACT, CG.pendingFees, 30000),
    readStorage(COMMUNITY_CONTRACT, CG.totalCurveXel, 30000),
  ])
  return {
    coinCount: num(pc),
    migratedCount: num(mgc),
    totalVolume: big(tvl), totalBuyVolume: big(tbv), totalSellVolume: big(tsv),
    totalTrades: num(ttc), feesCollected: big(fcl), pendingFees: big(pfe),
    totalCurveXel: big(tcx),
  }
}
