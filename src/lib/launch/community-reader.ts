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
  COMMUNITY_CONTRACT, readStorage, readStorageBatch, coinKey, CF, CG,
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

/** Fast-field order shared by fetchCoinFast and fetchCoinsFast. */
const FAST_FIELDS = [
  CF.status, CF.xelReserve, CF.tokenInventory,
  CF.graduated, CF.migrated, CF.creatorPaid,
  CF.buyVolume, CF.sellVolume, CF.trades, CF.lastTrade,
  CF.volume,
]

function coinFastFrom(vals: any[]): Partial<RawCoin> | null {
  const [st, xr, yr, gr, mi, cp, bv, sv, tc, lt, vo] = vals
  if (st == null && xr == null && yr == null) return null
  return {
    status: num(st), xr: big(xr), yr: big(yr),
    graduated: bool(gr), migrated: bool(mi), creatorPaid: bool(cp),
    buyVolume: big(bv), sellVolume: big(sv),
    trades: num(tc), lastTradeTopo: num(lt), volume: big(vo),
  }
}

/** Read one coin record (all 31 fields) from the factory storage.
 *  One batched sweep: 2 POSTs instead of 31 sequential round-trips
 *  through the 14 req/s limiter (~8 s → ~0.5 s for a 3-coin board,
 *  and it stays ~1 s as the board grows). */
export async function fetchCoin(cid: number): Promise<RawCoin | null> {
  const order = [
    CF.creator, CF.status, CF.name, CF.symbol, CF.description,
    CF.website, CF.logo, CF.twitter, CF.telegram, CF.discord,
    CF.supply, CF.creatorBps,
    CF.xelReserve, CF.tokenInventory, CF.initialInventory,
    CF.virtualXel, CF.gradDepth,
    CF.created, CF.graduated, CF.graduatedAt,
    CF.migrated, CF.migratedAt, CF.migratedXel, CF.migratedTokens,
    CF.creatorPaid, CF.asset,
    CF.buyVolume, CF.sellVolume, CF.trades, CF.lastTrade,
    CF.volume,
  ]
  const vals = await readStorageBatch(
    COMMUNITY_CONTRACT, order.map((f) => coinKey(cid, f)),
  )
  const v = (i: number) => vals[i]
  const nm = v(2), sy = v(3), st = v(1)
  if (nm == null && sy == null && st == null) return null // never launched
  return {
    cid,
    creator: v(0) == null ? null : str(v(0)),
    status: num(st),
    name: str(nm), symbol: str(sy), description: str(v(4)),
    website: str(v(5)), logo: str(v(6)),
    twitter: str(v(7)), telegram: str(v(8)), discord: str(v(9)),
    totalSupply: big(v(10)), creatorBps: num(v(11)),
    xr: big(v(12)), yr: big(v(13)), y0: big(v(14)), vx: big(v(15)), gdx: big(v(16)),
    createdTopo: num(v(17)),
    graduated: bool(v(18)), graduatedTopo: num(v(19)),
    migrated: bool(v(20)), migratedTopo: num(v(21)),
    migratedXel: big(v(22)), migratedTokens: big(v(23)),
    creatorPaid: bool(v(24)),
    asset: v(25) == null ? null : str(v(25)),
    buyVolume: big(v(26)), sellVolume: big(v(27)),
    trades: num(v(28)), lastTradeTopo: num(v(29)), volume: big(v(30)),
  }
}

/** Read the fast-changing fields only (status, reserves, scores).
 *  One batched POST instead of 11 sequential round-trips. */
export async function fetchCoinFast(cid: number): Promise<Partial<RawCoin> | null> {
  const vals = await readStorageBatch(
    COMMUNITY_CONTRACT, FAST_FIELDS.map((f) => coinKey(cid, f)),
  )
  return coinFastFrom(vals)
}

/** Read the fast fields of MANY coins in ONE batched sweep — the fast
 *  cycle's board refresh. Every active coin's 11 cells ride 20-cell
 *  POSTs (3 concurrent), so a 50-coin board costs ~28 POSTs ≈ 2-3 s
 *  instead of 50 sequential single-coin fetches ≈ 15 s. Returns one
 *  entry per input cid, in order (null = coin vanished). */
export async function fetchCoinsFast(
  cids: number[],
): Promise<(Partial<RawCoin> | null)[]> {
  if (cids.length === 0) return []
  const keys: string[] = []
  for (const cid of cids) {
    for (const f of FAST_FIELDS) keys.push(coinKey(cid, f))
  }
  const vals = await readStorageBatch(COMMUNITY_CONTRACT, keys)
  return cids.map((_, i) => coinFastFrom(vals.slice(i * FAST_FIELDS.length, (i + 1) * FAST_FIELDS.length)))
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
  const vals = await readStorageBatch(COMMUNITY_CONTRACT, [
    CG.count, CG.migratedCount, CG.totalVolume, CG.totalBuyVolume,
    CG.totalSellVolume, CG.totalTrades, CG.feesCollected,
    CG.pendingFees, CG.totalCurveXel,
  ])
  const [pc, mgc, tvl, tbv, tsv, ttc, fcl, pfe, tcx] = vals
  return {
    coinCount: num(pc),
    migratedCount: num(mgc),
    totalVolume: big(tvl), totalBuyVolume: big(tbv), totalSellVolume: big(tsv),
    totalTrades: num(ttc), feesCollected: big(fcl), pendingFees: big(pfe),
    totalCurveXel: big(tcx),
  }
}
