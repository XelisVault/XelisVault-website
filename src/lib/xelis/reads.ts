// High-level on-chain reads for the XELIS Vault testnet app.
// All reads go through the public testnet node via get_contract_data
// (mirrors the official CLI's storage reads — see protocol.py / cli_backend.py).

import { rpcCall } from './rpc'
import { keyStr, parseCell, fromAtomic } from './types'
import { resolveContract, XEL_ASSET, VLT_ASSET, XUSD_ASSET } from './contracts'

/** Read a string-keyed storage cell of a contract. Returns null if the key was never written. */
export async function readKey(contractHash: string, key: string, ttlMs = 8000): Promise<any> {
  try {
    const res = await rpcCall<any>(
      'get_contract_data',
      { contract: contractHash, key: keyStr(key) },
      { retries: 4, cacheTtlMs: ttlMs }
    )
    if (!res?.data) return null
    return parseCell(res.data)
  } catch (e: any) {
    const msg = String(e?.message || '')
    // XELIS daemon error for a never-written key: "No data found with requested key"
    if (msg.includes('No data found') || msg.includes('not found')) return null
    throw e
  }
}

/** Raw balance (atomic bigint) of a contract for a given asset. */
export async function readContractBalance(contractHash: string, asset: string): Promise<bigint> {
  try {
    const res = await rpcCall<any>(
      'get_contract_balance',
      { contract: contractHash, asset },
      { retries: 2, cacheTtlMs: 5000 }
    )
    if (res == null) return 0n
    const v = typeof res === 'object' && 'data' in res ? res.data : res
    return BigInt(v ?? 0)
  } catch {
    return 0n
  }
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

export async function getTopBlock(): Promise<{ hash: string; topoheight: number; timestamp: number }> {
  try {
    const b = await rpcCall<any>('get_top_block', undefined, { retries: 2, cacheTtlMs: 3000 })
    return {
      hash: b.hash,
      topoheight: b.topoheight,
      timestamp: b.timestamp ?? 0,
    }
  } catch {
    return { hash: '', topoheight: 0, timestamp: 0 }
  }
}

// ---------------------------------------------------------------------------
// Oracle (StakedOracle)
// ---------------------------------------------------------------------------

export interface OracleAggregate {
  price: bigint        // 8dp atomic, USD per XEL
  topo: number         // topoheight of aggregation
  deviationBps: number
  sources: number      // submissions in the aggregate
  cycle: number
  priceUsd: number
}

export async function getOracleAggregate(feedId = 0): Promise<OracleAggregate | null> {
  const oracle = await resolveContract('StakedOracle')
  const agg = await readKey(oracle, `fg_${feedId}`)
  if (!agg || !Array.isArray(agg) || agg.length < 5) return null
  return {
    price: agg[0],
    topo: Number(agg[1]),
    deviationBps: Number(agg[2]),
    sources: Number(agg[3]),
    cycle: Number(agg[4]),
    priceUsd: fromAtomic(agg[0]),
  }
}

export interface OracleFeed {
  id: number
  name: string
  asset: string
  decimals: number
  minPrice: bigint
  maxPrice: bigint
  createdAt: number
  active: boolean
}

export async function getOracleFeed(feedId = 0): Promise<OracleFeed | null> {
  const oracle = await resolveContract('StakedOracle')
  const [fd, fa] = await Promise.all([
    readKey(oracle, `fd_${feedId}`),
    readKey(oracle, `fa_${feedId}`),
  ])
  if (!fd || !Array.isArray(fd) || fd.length < 7) return null
  return {
    id: Number(fd[0]),
    name: String(fd[1]),
    asset: String(fd[2]),
    decimals: Number(fd[3]),
    minPrice: fd[4],
    maxPrice: fd[5],
    createdAt: Number(fd[6]),
    active: fa === true,
  }
}

export async function getOracleConfig(): Promise<{ minProviders: number; bootstrapMinProviders: number; hardStaleBlocks: number; maxDeviationBps: number; aggregationBlocks: number; maxStaleBlocks: number; bootstrapMode: boolean }> {
  const oracle = await resolveContract('StakedOracle')
  // Keys: mpo = min providers for full oracle, bsmp = bootstrap min, bsm = bootstrap mode (bool),
  // hsb = hard stale, msb = max stale, mdb = max deviation, ab = aggregation blocks
  const [mpo, bsmp, bsm, hsb, mdb, ab, msb] = await Promise.all([
    readKey(oracle, 'mpo', 60000),
    readKey(oracle, 'bsmp', 60000),
    readKey(oracle, 'bsm', 60000),
    readKey(oracle, 'hsb', 60000),
    readKey(oracle, 'mdb', 60000),
    readKey(oracle, 'ab', 60000),
    readKey(oracle, 'msb', 60000),
  ])
  return {
    minProviders: Number(mpo ?? 10),
    bootstrapMinProviders: Number(bsmp ?? 3),
    hardStaleBlocks: Number(hsb ?? 500),
    maxDeviationBps: Number(mdb ?? 500),
    aggregationBlocks: Number(ab ?? 5),
    maxStaleBlocks: Number(msb ?? 30),
    bootstrapMode: bsm === true,
  }
}

// ---------------------------------------------------------------------------
// Miner (XelisVaultMiner)
// ---------------------------------------------------------------------------

export interface MinerStats {
  count: number              // registered miners (mc)
  totalStaked: bigint        // VLT atomic (ts)
  activeOracle: number       // sm_1
  activeChat: number         // sm_2
  budget: bigint             // total budget VLT (tb)
  distributed: bigint        // VLT distributed so far (dist)
  minStake: bigint           // ms
  heartbeatInterval: number  // hi (blocks)
  heartbeatTimeout: number   // ht (blocks)
  emissionPerBlock: number   // constant INITIAL_REWARD_PER_BLOCK (0.43593 VLT)
  halvingIntervalBlocks: number // constant 6,307,200 (1 year)
}

export async function getMinerStats(): Promise<MinerStats> {
  const miner = await resolveContract('XelisVaultMiner')
  const [mc, ts, sm1, sm2, tb, dist, ms, hi, ht] = await Promise.all([
    readKey(miner, 'mc', 12000),
    readKey(miner, 'ts', 12000),
    readKey(miner, 'sm_1', 12000),
    readKey(miner, 'sm_2', 12000),
    readKey(miner, 'tb', 60000),
    readKey(miner, 'dist', 12000),
    readKey(miner, 'ms', 60000),
    readKey(miner, 'hi', 60000),
    readKey(miner, 'ht', 60000),
  ])
  // Emission constants from the contract source (not storage):
  // INITIAL_REWARD_PER_BLOCK = 43,593,000 (0.43593 VLT), halving every 6,307,200 blocks
  return {
    count: Number(mc ?? 0),
    totalStaked: (ts ?? 0n) as bigint,
    activeOracle: Number(sm1 ?? 0),
    activeChat: Number(sm2 ?? 0),
    budget: (tb ?? 550000000000000n) as bigint,
    distributed: (dist ?? 0n) as bigint,
    minStake: (ms ?? 100000000000n) as bigint,
    heartbeatInterval: Number(hi ?? 100),
    heartbeatTimeout: Number(ht ?? 300),
    emissionPerBlock: 0.43593,
    halvingIntervalBlocks: 6_307_200,
  }
}

export interface MinerRecord {
  addr: string
  endpointUrl: string
  pubkey: string
  stake: bigint
  servicesMask: number
  registeredAt: number
  lastHeartbeat: number
  totalRewards: bigint
  totalSlashed: bigint
  reputation: number
  validSubmissions: number
  successfulAnchors: number
  totalSubmissions: number
  lastInfractionTopo: number
  active: boolean
  tier: 'Excellent' | 'Good' | 'Warning' | 'Critical' | 'Banned'
  multiplier: number
}

const REP_TIERS: Array<{ min: number; tier: MinerRecord['tier']; mult: number }> = [
  { min: 8000, tier: 'Excellent', mult: 1.5 },
  { min: 5000, tier: 'Good', mult: 1.0 },
  { min: 2000, tier: 'Warning', mult: 0.7 },
  { min: 1000, tier: 'Critical', mult: 0.4 },
  { min: 0, tier: 'Banned', mult: 0 },
]

export function reputationTier(rep: number): { tier: MinerRecord['tier']; multiplier: number } {
  for (const t of REP_TIERS) {
    if (rep >= t.min) return { tier: t.tier, multiplier: t.mult }
  }
  return { tier: 'Banned', multiplier: 0 }
}

/** Read a miner record by address. Returns null if not registered. */
export async function getMinerRecord(address: string): Promise<MinerRecord | null> {
  const miner = await resolveContract('XelisVaultMiner')
  const m = await readKey(miner, `miner_${address}`)
  if (!m || !Array.isArray(m) || m.length < 15) return null
  const rep = Number(m[9])
  const { tier, multiplier } = reputationTier(rep)
  return {
    addr: String(m[0]),
    endpointUrl: String(m[1]),
    pubkey: String(m[2]),
    stake: m[3],
    servicesMask: Number(m[4]),
    registeredAt: Number(m[5]),
    lastHeartbeat: Number(m[6]),
    totalRewards: m[7],
    totalSlashed: m[8],
    reputation: rep,
    validSubmissions: Number(m[10]),
    successfulAnchors: Number(m[11]),
    totalSubmissions: Number(m[12]),
    lastInfractionTopo: Number(m[13]),
    active: m[14] === true,
    tier,
    multiplier,
  }
}

/** List registered miner addresses (scans ml_<i>, bounded). */
export async function getMinerAddresses(limit = 100): Promise<string[]> {
  const miner = await resolveContract('XelisVaultMiner')
  const mc = await readKey(miner, 'mc')
  const count = Math.min(Number(mc ?? 0), limit)
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const addr = await readKey(miner, `ml_${i}`, 15000)
    if (addr) out.push(String(addr))
  }
  return out
}

// ---------------------------------------------------------------------------
// Delegation (MinerDelegation)
// ---------------------------------------------------------------------------

export async function getDelegationStats(): Promise<{ miners: number; totalDelegated: bigint; minCommission: number; maxCommission: number }> {
  const md = await resolveContract('MinerDelegation')
  const [mc, td, mcom, mxcom] = await Promise.all([
    readKey(md, 'mc'),
    readKey(md, 'td'),
    readKey(md, 'mcom'),
    readKey(md, 'mxcom'),
  ])
  return {
    miners: Number(mc ?? 0),
    totalDelegated: (td ?? 0n) as bigint,
    minCommission: Number(mcom ?? 0),
    maxCommission: Number(mxcom ?? 2000),
  }
}

// ---------------------------------------------------------------------------
// Vault Engine (VaultEngineV3)
// ---------------------------------------------------------------------------

export interface VaultEngineConfig {
  minCrBps: number         // 20000 = 200%
  liqPenaltyBps: number    // 1000 = 10%
  stabilityFeeBps: number  // 200 = 2% APR
  vaultCount: number
  queueSize: number
}

export async function getVaultEngineConfig(): Promise<VaultEngineConfig> {
  const ve = await resolveContract('VaultEngineV3')
  const [mcr, lp, sfb, n, qh, qt] = await Promise.all([
    readKey(ve, 'mcr'),
    readKey(ve, 'lp'),
    readKey(ve, 'sfb'),
    readKey(ve, 'n'),
    readKey(ve, 'qh'),
    readKey(ve, 'qt'),
  ])
  return {
    minCrBps: Number(mcr ?? 20000),
    liqPenaltyBps: Number(lp ?? 1000),
    stabilityFeeBps: Number(sfb ?? 200),
    vaultCount: Number(n ?? 0),
    queueSize: Math.max(0, Number(qt ?? 0) - Number(qh ?? 0)),
  }
}

export interface VaultRecord {
  id: number
  owner: string
  collateralAsset: string
  collateral: bigint
  borrowAmount: bigint
  lastUpdateTopo: number
  liquidated: boolean
  collateralHuman: number
  borrowHuman: number
  /** collateral ratio in % (collateral value / debt value), using XEL=xUSD at parity via oracle */
  collateralRatioPct: number | null
}

export async function getVault(id: number, xelPriceUsd?: number): Promise<VaultRecord | null> {
  const ve = await resolveContract('VaultEngineV3')
  const v = await readKey(ve, `v${id}`)
  if (!v || !Array.isArray(v) || v.length < 8) return null
  const collateral = v[2] as bigint
  const borrow = v[4] as bigint
  const collateralHuman = fromAtomic(collateral)
  const borrowHuman = fromAtomic(borrow)
  let cr: number | null = null
  if (xelPriceUsd && borrow > 0n) {
    cr = (collateralHuman * xelPriceUsd) / borrowHuman
  } else if (borrow === 0n && collateral > 0n) {
    cr = Infinity
  }
  return {
    id,
    owner: String(v[0]),
    collateralAsset: String(v[1]),
    collateral,
    borrowAmount: borrow,
    lastUpdateTopo: Number(v[6]),
    liquidated: v[7] === true,
    collateralHuman,
    borrowHuman,
    collateralRatioPct: cr,
  }
}

/**
 * Find vaults owned by an address. Scans the most recent `scanWindow` vaults
 * (testnet-friendly: vault count is small).
 */
export async function getVaultsForOwner(address: string, scanWindow = 60): Promise<VaultRecord[]> {
  const cfg = await getVaultEngineConfig()
  const start = Math.max(0, cfg.vaultCount - scanWindow)
  const ids: number[] = []
  for (let i = cfg.vaultCount - 1; i >= start; i--) ids.push(i)
  const price = (await getOracleAggregate(0))?.priceUsd
  const vaults = await Promise.all(ids.map((i) => getVault(i, price)))
  return vaults
    .filter((v): v is VaultRecord => !!v && v.owner === address && !v.liquidated)
}

/** Recent vaults across all owners (for the dashboard). */
export async function getRecentVaults(limit = 6): Promise<VaultRecord[]> {
  const cfg = await getVaultEngineConfig()
  const ids: number[] = []
  for (let i = cfg.vaultCount - 1; i >= 0 && ids.length < limit; i--) ids.push(i)
  const price = (await getOracleAggregate(0))?.priceUsd
  const vaults = await Promise.all(ids.map((i) => getVault(i, price)))
  return vaults.filter((v): v is VaultRecord => !!v)
}

// ---------------------------------------------------------------------------
// VaultSwap (AMM)
// ---------------------------------------------------------------------------

export interface AmmPool {
  key: string
  assetA: string
  assetB: string
  reserveA: bigint
  reserveB: bigint
  isPsm: boolean
  lastPrice: bigint
  createdAt: number
}

function poolKeyFor(a: string, b: string): string {
  const [lo, hi] = a <= b ? [a, b] : [b, a]
  return `p${lo}_${hi}`
}

export async function getPool(a: string, b: string): Promise<AmmPool | null> {
  const swap = await resolveContract('VaultSwapV2')
  const key = poolKeyFor(a, b)
  const p = await readKey(swap, key)
  if (!p || !Array.isArray(p) || p.length < 7) return null
  return {
    key,
    assetA: String(p[0]),
    assetB: String(p[1]),
    reserveA: p[2],
    reserveB: p[3],
    isPsm: p[4] === true,
    lastPrice: p[5],
    createdAt: Number(p[6]),
  }
}

export async function getPools(): Promise<AmmPool[]> {
  const swap = await resolveContract('VaultSwapV2')
  const pc = await readKey(swap, 'pc')
  const count = Math.min(Number(pc ?? 0), 30)
  const keys: string[] = []
  for (let i = 0; i < count; i++) {
    const k = await readKey(swap, `pi${i}`, 30000)
    if (k) keys.push(String(k))
  }
  const pools = await Promise.all(keys.map((k) => readKey(swap, k, 10000)))
  return pools
    .map((p, i) => {
      if (!p || !Array.isArray(p) || p.length < 7) return null
      return {
        key: keys[i],
        assetA: String(p[0]),
        assetB: String(p[1]),
        reserveA: p[2] as bigint,
        reserveB: p[3] as bigint,
        isPsm: p[4] === true,
        lastPrice: p[5] as bigint,
        createdAt: Number(p[6]),
      }
    })
    .filter((p): p is AmmPool => !!p)
}

export async function getSwapConfig(): Promise<{ baseFeeBps: number; treasuryFeeBps: number; maxVolatilityBps: number; poolsCount: number }> {
  const swap = await resolveContract('VaultSwapV2')
  const [bf, tf, mv, pc] = await Promise.all([
    readKey(swap, 'bf'),
    readKey(swap, 'tf'),
    readKey(swap, 'mv'),
    readKey(swap, 'pc'),
  ])
  return {
    baseFeeBps: Number(bf ?? 30),
    treasuryFeeBps: Number(tf ?? 5),
    maxVolatilityBps: Number(mv ?? 1000),
    poolsCount: Number(pc ?? 0),
  }
}

/** AMM constant-product quote (before fees). */
export function quoteAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n
  return (amountIn * reserveOut) / (reserveIn + amountIn)
}

// ---------------------------------------------------------------------------
// PSM
// ---------------------------------------------------------------------------

export interface PsmInfo {
  xelReserve: bigint
  xusdReserve: bigint
  mintFeeBps: number
  redeemFeeBps: number
  dailyMintUsed: bigint
  dailyRedeemUsed: bigint
  paused: boolean
}

export async function getPsmInfo(): Promise<PsmInfo> {
  const psm = await resolveContract('PSM')
  const [mfb, rfb, dmu, dru, pz, xel, xusd] = await Promise.all([
    readKey(psm, 'mfb'),
    readKey(psm, 'rfb'),
    readKey(psm, 'dmu'),
    readKey(psm, 'dru'),
    readKey(psm, 'pz'),
    readContractBalance(psm, XEL_ASSET),
    readContractBalance(psm, XUSD_ASSET),
  ])
  return {
    xelReserve: xel,
    xusdReserve: xusd,
    mintFeeBps: Number(mfb ?? 50),
    redeemFeeBps: Number(rfb ?? 10),
    dailyMintUsed: (dmu ?? 0n) as bigint,
    dailyRedeemUsed: (dru ?? 0n) as bigint,
    paused: pz === true,
  }
}

// ---------------------------------------------------------------------------
// Savings
// ---------------------------------------------------------------------------

export async function getSavingsInfo(): Promise<{ totalDeposits: bigint; apyBps: number; xusdReserve: bigint }> {
  const sr = await resolveContract('SavingsRate')
  const [td, ab, bal] = await Promise.all([
    readKey(sr, 'td'),
    readKey(sr, 'ab'),
    readContractBalance(sr, XUSD_ASSET),
  ])
  return {
    totalDeposits: (td ?? 0n) as bigint,
    apyBps: Number(ab ?? 500),
    xusdReserve: bal,
  }
}

// ---------------------------------------------------------------------------
// Governance
// ---------------------------------------------------------------------------

export async function getGovernanceStats(): Promise<{ totalStaked: bigint; stakesCount: number; totalVotingPower: bigint }> {
  const gv = await resolveContract('GovernanceVault')
  const [ts, sc, tvp] = await Promise.all([
    readKey(gv, 'ts'),
    readKey(gv, 'sc'),
    readKey(gv, 'tvp'),
  ])
  return {
    totalStaked: (ts ?? 0n) as bigint,
    stakesCount: Number(sc ?? 0),
    totalVotingPower: (tvp ?? 0n) as bigint,
  }
}

export async function getProposalCount(): Promise<number> {
  const gov = await resolveContract('Governor')
  const c = await readKey(gov, 'pc')
  return Number(c ?? 0)
}

// ---------------------------------------------------------------------------
// Faucet
// ---------------------------------------------------------------------------

export async function getFaucetInfo(): Promise<{ xelPerClaim: bigint; vltPerClaim: bigint; cooldownBlocks: number; paused: boolean }> {
  const faucet = await resolveContract('FaucetContract')
  const [xa, va2, cd, pz] = await Promise.all([
    readKey(faucet, 'xa'),
    readKey(faucet, 'va2'),
    readKey(faucet, 'cd'),
    readKey(faucet, 'pz'),
  ])
  return {
    xelPerClaim: (xa ?? 0n) as bigint,
    vltPerClaim: (va2 ?? 0n) as bigint,
    cooldownBlocks: Number(cd ?? 17280),
    paused: pz === true,
  }
}

// ---------------------------------------------------------------------------
// PrivacyMixer v2 (note + nullifier + shared pool — v12R-7)
// Storage: pool_<asset> · tm_<asset> · tmc · nc · n_<asset>_<commitment>
// ---------------------------------------------------------------------------

export interface MixerInfo {
  poolXel: bigint
  totalMixedXel: bigint
  totalMixes: number
  noteCount: number
  paused: boolean
  adminFeeBps: number
  withdrawFeeBps: number
}

export async function getMixerInfo(): Promise<MixerInfo> {
  const mixer = await resolveContract('PrivacyMixer')
  const [pool, tm, tmc, nc, pz, afb, wfb] = await Promise.all([
    readKey(mixer, `pool_${XEL_ASSET}`, 15000),
    readKey(mixer, `tm_${XEL_ASSET}`, 15000),
    readKey(mixer, 'tmc', 15000),
    readKey(mixer, 'nc', 15000),
    readKey(mixer, 'pz', 15000),
    readKey(mixer, 'afb', 30000),
    readKey(mixer, 'wfb', 30000),
  ])
  return {
    poolXel: (pool ?? 0n) as bigint,
    totalMixedXel: (tm ?? 0n) as bigint,
    totalMixes: Number(tmc ?? 0),
    noteCount: Number(nc ?? 0),
    paused: pz === true,
    adminFeeBps: Number(afb ?? 10),
    withdrawFeeBps: Number(wfb ?? 0),
  }
}

/**
 * Remaining balance of a private note.
 * The commitment is computed locally: blake3(secret bytes) — the secret never
 * leaves the browser, only its hash goes into the read key.
 */
export async function getNoteBalance(asset: string, commitmentHex: string): Promise<bigint | null> {
  const mixer = await resolveContract('PrivacyMixer')
  const v = await readKey(mixer, `n_${asset}_${commitmentHex}`, 5000)
  if (v == null) return null
  return BigInt(v)
}

export async function getMixerPoolBalance(asset: string): Promise<bigint> {
  const mixer = await resolveContract('PrivacyMixer')
  const v = await readKey(mixer, `pool_${asset}`, 10000)
  return (v ?? 0n) as bigint
}

// ---------------------------------------------------------------------------
// Airdrop
// ---------------------------------------------------------------------------

export interface AirdropUserPoints {
  mining: number
  relayer: number
  governance: number
  chat: number
  liquidity: number
  bounty: number
  community: number
  totalRaw: number
  totalWithBonus: number
  daysActive: number
  qualified: boolean
  registered: boolean
}

export async function getAirdropGlobal(): Promise<{ users: number; totalPoints: number; qualified: number; frozen: boolean; leaderboard: number }> {
  const at = await resolveContract('AirdropTracker')
  const [uc, tp, qc, fz, lbc] = await Promise.all([
    readKey(at, 'uc'),
    readKey(at, 'tp'),
    readKey(at, 'qc'),
    readKey(at, 'fz'),
    readKey(at, 'lbc'),
  ])
  return {
    users: Number(uc ?? 0),
    totalPoints: Number(tp ?? 0),
    qualified: Number(qc ?? 0),
    frozen: fz === true,
    leaderboard: Number(lbc ?? 0),
  }
}

export async function getUserPoints(address: string): Promise<AirdropUserPoints | null> {
  const at = await resolveContract('AirdropTracker')
  const up = await readKey(at, `user_${address}`)
  if (!up || !Array.isArray(up) || up.length < 13) return null
  return {
    mining: Number(up[0]),
    relayer: Number(up[1]),
    governance: Number(up[2]),
    chat: Number(up[3]),
    liquidity: Number(up[4]),
    bounty: Number(up[5]),
    community: Number(up[6]),
    totalRaw: Number(up[7]),
    totalWithBonus: Number(up[8]),
    daysActive: Number(up[9]),
    qualified: up[12] === true,
    registered: up[13] === true,
  }
}

// ---------------------------------------------------------------------------
// VaultChat
// ---------------------------------------------------------------------------

export async function getChatStats(): Promise<{ groupsCount: number; sessions: number | null }> {
  const chat = await resolveContract('VaultChat')
  const [gc] = await Promise.all([readKey(chat, 'gc')])
  return {
    groupsCount: Number(gc ?? 0),
    sessions: null, // no global counter key published; sessions are per-address
  }
}

export async function hasChatSession(address: string): Promise<boolean> {
  const chat = await resolveContract('VaultChat')
  const s = await readKey(chat, `session_${address}`)
  return s != null && s !== false
}

// ---------------------------------------------------------------------------
// Aggregated dashboard
// ---------------------------------------------------------------------------

export interface ProtocolTVL {
  psmXel: bigint
  psmXusd: bigint
  vaultEngineXel: bigint
  swapXel: bigint
  swapXusd: bigint
  savingsXusd: bigint
  totalXel: bigint
  totalXusd: bigint
}

export async function getProtocolTVL(): Promise<ProtocolTVL> {
  const [psm, ve, swap, sr] = await Promise.all([
    resolveContract('PSM'),
    resolveContract('VaultEngineV3'),
    resolveContract('VaultSwapV2'),
    resolveContract('SavingsRate'),
  ])
  const [psmXel, psmXusd, veXel, swapXel, swapXusd, srXusd] = await Promise.all([
    readContractBalance(psm, XEL_ASSET),
    readContractBalance(psm, XUSD_ASSET),
    readContractBalance(ve, XEL_ASSET),
    readContractBalance(swap, XEL_ASSET),
    readContractBalance(swap, XUSD_ASSET),
    readContractBalance(sr, XUSD_ASSET),
  ])
  return {
    psmXel,
    psmXusd,
    vaultEngineXel: veXel,
    swapXel,
    swapXusd,
    savingsXusd: srXusd,
    totalXel: psmXel + veXel + swapXel,
    totalXusd: psmXusd + swapXusd + srXusd,
  }
}
