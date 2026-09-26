// VaultLaunch — MAINNET protocol bindings.
//
// Generation 1 (VaultLaunch v4.2 + LaunchDEX v1.3) was deployed on the
// XELIS mainnet on 23/09/2026. On 25/09/2026 the v1.4.1 cut (RUNBOOK 3
// §1A) deployed a NEW DEX generation and repinned the launchpad to it:
//   • LaunchDEX v1.4.1 (D141) — serves BOTH tracks: the pinned
//     create_pool for projects, the open create_pool_open (chunk 33)
//     for community coins; also carries the second-migration fix
//   • CommunityLaunch v1.0.1 (C101) — the permissionless community
//     factory (the pump.fun track)
//   • the gen-1 DEX is orphaned — never served a pool, never will
//
// This module is the single source of truth for the on-chain identity of
// the protocol as seen by the website:
//   • the three contract hashes (pinned to each other on-chain)
//   • every entry id a transaction can invoke (from the SDK ABI tables)
//   • every storage key the reader polls (LAUNCHPAD.md §7 / DEX.md /
//     COMMUNITY_LAUNCH.md §8 + the .slx storage map)
//   • the mainnet configuration, as DEPLOYED (runbook 3, verified
//     storage reads on-chain) — used as defaults until the live values
//     are fetched from the chain.
//
// The chain is the backend: every value the app shows is a storage read
// or derived from one. No indexer, no database.

import { rpcCall } from '@/lib/xelis/rpc'
import { keyStr, parseCell, fromAtomic } from '@/lib/xelis/types'

// ── On-chain identity (mainnet, 23/09/2026) ──────────────────────────

/** VaultLaunch — the launchpad (deployment hash = contract address). */
export const VAULT_CONTRACT =
  '45baf014edd09f1f93a7746aa7d7c45f1dea01daa07b0bc438f2a0e80664cc54'

/** LaunchDEX v1.4.1 (D141, 25/09/2026) — the AMM for BOTH tracks.
 *  The gen-1 DEX (bce37bde…) is orphaned and never served a pool. */
export const DEX_CONTRACT =
  'f3c461afe698a2bdfc7e5d941e86300876ecf16ac33ea45d8c6ddd936f7e24ef'

/** CommunityLaunch v1.0.1 (C101, 25/09/2026) — the permissionless
 *  community-coin factory (the pump.fun track, ~2 XEL per launch). */
export const COMMUNITY_CONTRACT =
  '8252cf7b7157dd05daf2d4e3bad78009c155c67bb3c908d042c61484dd7e89b9'

/** The official deployer/admin wallet (the only one that can create pools). */
export const PROTOCOL_WALLET =
  'xel:sel92pcaegt0kenv3q35ycnzpd4xfl0md93usnkxq0rsjtha6cjsqe2xwch'

/** Native XEL asset (all zeroes on every XELIS network). */
export const XEL_ASSET = '0'.repeat(64)

/** XELIS mainnet public node (CORS *, verified live). */
export const MAINNET_HTTP = 'https://node.xelis.io/json_rpc'
export const EXPLORER_URL = 'https://explorer.xelis.io'

/** Average mainnet topo time (target 5s — the countdowns use this). */
export const TOPO_SECONDS = 5

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_URL}/?tab=tx#tx=${hash}`
}
export function explorerContractUrl(hash: string): string {
  return `${EXPLORER_URL}/?tab=contract#contract=${hash}`
}
export function explorerAddressUrl(addr: string): string {
  return `${EXPLORER_URL}/?tab=account#account=${addr}`
}

// ── Entry ids (SDK ABI tables — sdk/xvault/xvault/protocol.py) ───────

export const VAULT_ENTRIES = {
  propose: 20,
  support: 21,
  report: 22,
  finalize_validation: 23,
  buy: 24,
  sell: 25,
  claim_refund: 26,
  claim_vote_deposit: 27,
  request_revalidation: 28,
  update_project_info: 29,
  start_team_vesting: 30,
  claim_team_allocation: 31,
  migrate: 32,
  sync_trust_to_dex: 33,
} as const

export const DEX_ENTRIES = {
  swap_xel_for_token: 8,
  swap_token_for_xel: 9,
  add_liquidity: 10,
  set_fee_split: 29,
  claim_lp_fees: 30,
  remove_liquidity: 32,
} as const

// CommunityLaunch entry ids (abi/CommunityLaunch.abi.json v1.1.1)
export const COMMUNITY_ENTRIES = {
  launch_coin: 15,
  buy: 16,
  sell: 17,
  migrate: 18,
  claim_creator_allocation: 19,
  update_coin_info: 20,
} as const

// ── Storage keys (must match the contracts' key builders exactly) ────

/** `p:{pid}:{field}` — one project record field. */
export const projKey = (pid: number, field: string) => `p:${pid}:${field}`

/** `q:{asset}:{field}` — one DEX pool field. */
export const poolKey = (asset: string, field: string) => `q:${asset}:${field}`

/** `l:{asset}:{wallet}:{field}` — one provider slot in a pool. */
export const lpKey = (asset: string, wallet: string, field: string) =>
  `l:${asset}:${wallet}:${field}`

/** `v:{pid}:{round}:{addr}` — a vote slot (presence = voted). */
export const voteKey = (pid: number, round: number, addr: string) =>
  `v:${pid}:${round}:${addr}`

/** `a:{asset}` — D22 reverse bridge: asset hash → project id. */
export const assetLookupKey = (asset: string) => `a:${asset}`

/** `m:{rank}` — D22 migrated index: rank → project id. */
export const migratedIndexKey = (rank: number) => `m:${rank}`

/** `t:{symbol}` — ticker reservation registry. */
export const tickerKey = (symbol: string) => `t:${symbol}`

// Project fields (VaultLaunch)
export const PF = {
  creator: 'cr', status: 'st', name: 'nm', symbol: 'sy',
  description: 'ds', website: 'ws', logo: 'lg',
  twitter: 'tw', telegram: 'tg', discord: 'dc',
  supply: 'ts', teamBps: 'tb', liquidity: 'lq',
  reserves: 'rv', curve: 'cs', created: 'ct', deadline: 've',
  supports: 'sp', reports: 'rp', graduated: 'gr',
  refundClaimed: 'rc', round: 'rd', volume: 'vo',
  directListing: 'dl', bondingStart: 'bt',
  teamPaid: 'tp', vestingStart: 'vs', vestingDuration: 'vd',
  vestingPlan: 'vp',
  buyVolume: 'bv', sellVolume: 'sv', trades: 'tc', lastTrade: 'lt',
  marketCap: 'mc', marketCapHigh: 'mh', marketCapGrad: 'mg',
  asset: 'ah', budget: 'ab',
  migrated: 'mi', migratedAt: 'ma', migratedXel: 'mx', migratedTokens: 'mt',
  dexSynced: 'dsy',
} as const

// Pool fields (LaunchDEX)
export const QF = {
  xelReserve: 'xr', tokenReserve: 'yr', xelFees: 'xf', tokenFees: 'yf',
  buysPaused: 'bp', created: 'ct',
  buyVolume: 'bv', sellVolume: 'sv', trades: 'tc', lastTrade: 'lt',
  lifetimeFees: 'fl', lpCount: 'lp',
  lpPotXel: 'lx', lpPotTokens: 'ly',
  lpTotal: 'tl', lpAccXel: 'ax', lpAccTokens: 'ay',
  lpLocked: 'pl', // X11: the protocol-locked seed floor
} as const

// LP slot fields
export const LPF = {
  parts: 'x', snapXel: 'sx', snapTokens: 'sy',
  claimXel: 'cx', claimTokens: 'cy', withdrawable: 'w',
} as const

// Global keys — VaultLaunch
export const VG = {
  admin: 'adm', count: 'pc', submissionFee: 'sub', assetBudget: 'abd',
  minLiquidity: 'mnl', tradingFeeBps: 'tfe', graduatedFeeBps: 'gfe',
  migrationFeeBps: 'mgf', directListingThreshold: 'dlt',
  minParticipants: 'mnp', minApprovalBps: 'mab',
  validationDuration: 'vdt', graduationMultiplier: 'gmu',
  teamUnlockDelay: 'tdy', vestingMin: 'vmn', vestingMax: 'vmx',
  recoveryFee: 'rfe', recoveryMinParticipants: 'rmp',
  recoveryMinRatioBps: 'rmr', pendingFees: 'pfe',
  feesCollected: 'fcl', totalVolume: 'tvl', totalCurveXel: 'tcx',
  lockedRefunds: 'lrf', totalBuyVolume: 'tbv', totalSellVolume: 'tsv',
  totalTrades: 'ttc', totalBudgets: 'tbb', migratedCount: 'mgc',
  dexAddress: 'dxa', paused: 'pz', voteDeposit: 'vdp', votePots: 'tvp',
} as const

// Global keys — LaunchDEX
export const DG = {
  admin: 'adm', poolsCount: 'pc', swapFeeBps: 'sfe', launchpad: 'lpx',
  emergency: 'xpa', launchpadPinned: 'lpp', feeSplitBps: 'fsl',
} as const

// ── CommunityLaunch storage keys (CommunityLaunch.slx storage map) ───

/** `c:{cid}:{field}` — one community coin record field. */
export const coinKey = (cid: number, field: string) => `c:${cid}:${field}`

/** Coin field keys (c:{cid}:*) */
export const CF = {
  creator: 'cr', status: 'st', name: 'nm', symbol: 'sy',
  description: 'ds', website: 'ws', logo: 'lg',
  twitter: 'tw', telegram: 'tg', discord: 'dc',
  supply: 'ts', creatorBps: 'cb',
  xelReserve: 'xr', tokenInventory: 'yr', initialInventory: 'y0',
  virtualXel: 'vx', gradDepth: 'gx',
  created: 'ct', graduated: 'gr', graduatedAt: 'gt',
  migrated: 'mi', migratedAt: 'ma', migratedXel: 'mx', migratedTokens: 'mt',
  creatorPaid: 'cp', asset: 'ah',
  buyVolume: 'bv', sellVolume: 'sv', trades: 'tc', lastTrade: 'lt',
  volume: 'vo',
} as const

/** Global keys — CommunityLaunch */
export const CG = {
  admin: 'adm', count: 'pc', submissionFee: 'sub', assetBudget: 'abd',
  curveFeeBps: 'cfe', graduatedFeeBps: 'gfe', migrationFeeBps: 'mgf',
  graduationDepth: 'gdx', virtualXel: 'vxs', dexAddress: 'dxa',
  pendingFees: 'pfe', feesCollected: 'fcl', paused: 'pz',
  totalBuyVolume: 'tbv', totalSellVolume: 'tsv', totalTrades: 'ttc',
  totalVolume: 'tvl', migratedCount: 'mgc', totalCurveXel: 'tcx',
} as const

// ── Mainnet configuration as deployed (runbook 3, §2) ───────────────
// These are DEFAULTS — the live values are read from the chain at boot
// and after every slow refresh, so an admin tune shows up on its own.

export interface ProtocolParams {
  submissionFee: number        // XEL
  assetBudget: number          // XEL
  minLiquidity: number         // XEL — minimum seed liquidity
  minParticipants: number      // voters to pass validation
  minApprovalPct: number       // 0..1 — approval ratio to pass
  validationDuration: number   // topos
  graduationMultiplier: number // reserves ≥ liquidity × gmu → graduates
  directListingThreshold: number // XEL — direct listing, no bonding
  tradingFeeBps: number        // bonding fee
  graduatedFeeBps: number      // curve fee after graduation
  migrationFeeBps: number      // one-time at migration
  voteDeposit: number          // XEL (0 = free voting)
  teamUnlockDelay: number      // topos
  vestingMin: number           // topos
  vestingMax: number           // topos
  paused: boolean
  dexSwapFeeBps: number        // DEX swap fee
  dexFeeSplitBps: number       // LP share of the swap fee
  dexEmergency: boolean
}

export const MAINNET_PARAMS: ProtocolParams = {
  submissionFee: 25,
  assetBudget: 1,
  minLiquidity: 500,
  minParticipants: 1,
  minApprovalPct: 0.8,
  validationDuration: 720,       // ≈ 1h at 5s/topo
  graduationMultiplier: 2,       // 500 seed → graduates at 1000 XEL
  directListingThreshold: 2000,
  tradingFeeBps: 50,
  graduatedFeeBps: 25,
  migrationFeeBps: 50,
  voteDeposit: 0,
  teamUnlockDelay: 3_153_600,    // ~6 months
  vestingMin: 518_400,           // ~1 month
  vestingMax: 6_307_200,         // ~1 year
  paused: false,
  dexSwapFeeBps: 30,
  dexFeeSplitBps: 5000,          // 50/50 admin/LP
  dexEmergency: false,
}

/** Minimum XEL deposit at propose: fee + asset budget + seed liquidity. */
export function minProposeDeposit(p: ProtocolParams): number {
  return p.submissionFee + p.assetBudget + p.minLiquidity
}

// ── CommunityLaunch configuration as deployed (runbook 3 §1A) ────────
// C101 was deployed with contract defaults — nothing to set. Live values
// are read from the chain at boot and after every deep refresh.

export interface CommunityParams {
  submissionFee: number      // XEL (sub)
  assetBudget: number        // XEL (abd) — unused part refunded in-tx
  curveFeeBps: number        // cfe — live curve fee
  graduatedFeeBps: number    // gfe — post-graduation curve fee (≤ cfe)
  migrationFeeBps: number    // mgf — carved from the SEED at migration
  graduationDepth: number    // XEL (gdx) — demand-proof depth
  virtualXel: number         // XEL (vxs) — the curve's launch depth
  paused: boolean            // launches + buys only (sells never block)
  dexAddress: string | null  // the one-way DEX pin
  dexSwapFeeBps: number      // sfe on the pinned DEX — pool-era fee
  dexFeeSplitBps: number     // fsl on the pinned DEX — LP share of it
}

export const COMMUNITY_PARAMS: CommunityParams = {
  submissionFee: 1,
  assetBudget: 1,
  curveFeeBps: 100,          // 1% live
  graduatedFeeBps: 50,       // 0.5% graduated
  migrationFeeBps: 50,       // 0.5% from the seed
  graduationDepth: 50,       // XEL of real depth to graduate
  virtualXel: 100,           // XEL of launch depth
  paused: false,
  dexAddress: DEX_CONTRACT,
  dexSwapFeeBps: 30,         // D141 default — live value read below
  dexFeeSplitBps: 5000,      // 50/50 default — live value read below
}

/** The launch_coin deposit: submission fee + asset budget (unused
 *  part of the budget is refunded in the same transaction). */
export function launchCoinDeposit(p: CommunityParams): number {
  return p.submissionFee + p.assetBudget
}

// ── Storage read (mainnet node, string key → parsed value) ───────────

/**
 * Read one string-keyed storage cell of a contract on mainnet.
 * Returns null when the key was never written (XELIS daemon answers
 * "No data found with requested key").
 */
export async function readStorage(
  contract: string,
  key: string,
  ttlMs = 6000,
): Promise<any> {
  try {
    const res = await rpcCall<any>(
      'get_contract_data',
      { contract, key: keyStr(key) },
      { retries: 3, cacheTtlMs: ttlMs, network: 'mainnet' },
    )
    if (!res?.data) return null
    return parseCell(res.data)
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.includes('No data found') || msg.includes('not found')) return null
    throw e
  }
}

/** Read the live community factory configuration from the chain. */
export async function fetchCommunityParams(): Promise<CommunityParams> {
  const c = (k: string) => readStorage(COMMUNITY_CONTRACT, k, 30000)
  const [sub, abd, cfe, gfe, mgf, gdx, vxs, pz, dxa] = await Promise.all([
    c(CG.submissionFee), c(CG.assetBudget), c(CG.curveFeeBps),
    c(CG.graduatedFeeBps), c(CG.migrationFeeBps), c(CG.graduationDepth),
    c(CG.virtualXel), c(CG.paused), c(CG.dexAddress),
  ])
  // DEX fees follow the factory's pin: read sfe/fsl from the DEX the
  // coins actually migrate to (dxa), falling back to the known D141.
  const pinned = dxa == null ? DEX_CONTRACT : String(dxa)
  const d = (k: string) => readStorage(pinned, k, 30000)
  const [sfe, fsl] = await Promise.all([d(DG.swapFeeBps), d(DG.feeSplitBps)])
  const num = (x: any, dflt: number) => (x == null ? dflt : fromAtomic(x))
  const small = (x: any, dflt: number) => (x == null ? dflt : Number(x))
  return {
    submissionFee: num(sub, COMMUNITY_PARAMS.submissionFee),
    assetBudget: num(abd, COMMUNITY_PARAMS.assetBudget),
    curveFeeBps: small(cfe, COMMUNITY_PARAMS.curveFeeBps),
    graduatedFeeBps: small(gfe, COMMUNITY_PARAMS.graduatedFeeBps),
    migrationFeeBps: small(mgf, COMMUNITY_PARAMS.migrationFeeBps),
    graduationDepth: num(gdx, COMMUNITY_PARAMS.graduationDepth),
    virtualXel: num(vxs, COMMUNITY_PARAMS.virtualXel),
    paused: pz === true,
    dexAddress: pinned,
    dexSwapFeeBps: small(sfe, COMMUNITY_PARAMS.dexSwapFeeBps),
    dexFeeSplitBps: small(fsl, COMMUNITY_PARAMS.dexFeeSplitBps),
  }
}

/** Read the live protocol configuration from both contracts. */
export async function fetchProtocolParams(): Promise<ProtocolParams> {
  const v = (k: string) => readStorage(VAULT_CONTRACT, k, 30000)
  const d = (k: string) => readStorage(DEX_CONTRACT, k, 30000)
  const [
    sub, abd, mnl, mnp, mab, vdt, gmu, dlt, tfe, gfe, mgf, vdp,
    tdy, vmn, vmx, pz, sfe, fsl, xpa,
  ] = await Promise.all([
    v(VG.submissionFee), v(VG.assetBudget), v(VG.minLiquidity),
    v(VG.minParticipants), v(VG.minApprovalBps), v(VG.validationDuration),
    v(VG.graduationMultiplier), v(VG.directListingThreshold),
    v(VG.tradingFeeBps), v(VG.graduatedFeeBps), v(VG.migrationFeeBps),
    v(VG.voteDeposit), v(VG.teamUnlockDelay), v(VG.vestingMin),
    v(VG.vestingMax), v(VG.paused),
    d(DG.swapFeeBps), d(DG.feeSplitBps), d(DG.emergency),
  ])
  const num = (x: any, dflt: number) => (x == null ? dflt : fromAtomic(x))
  const small = (x: any, dflt: number) => (x == null ? dflt : Number(x))
  return {
    submissionFee: num(sub, MAINNET_PARAMS.submissionFee),
    assetBudget: num(abd, MAINNET_PARAMS.assetBudget),
    minLiquidity: num(mnl, MAINNET_PARAMS.minLiquidity),
    minParticipants: small(mnp, MAINNET_PARAMS.minParticipants),
    minApprovalPct: small(mab, 8000) / 10000,
    validationDuration: small(vdt, MAINNET_PARAMS.validationDuration),
    graduationMultiplier: small(gmu, MAINNET_PARAMS.graduationMultiplier),
    directListingThreshold: num(dlt, MAINNET_PARAMS.directListingThreshold),
    tradingFeeBps: small(tfe, MAINNET_PARAMS.tradingFeeBps),
    graduatedFeeBps: small(gfe, MAINNET_PARAMS.graduatedFeeBps),
    migrationFeeBps: small(mgf, MAINNET_PARAMS.migrationFeeBps),
    voteDeposit: num(vdp, MAINNET_PARAMS.voteDeposit),
    teamUnlockDelay: small(tdy, MAINNET_PARAMS.teamUnlockDelay),
    vestingMin: small(vmn, MAINNET_PARAMS.vestingMin),
    vestingMax: small(vmx, MAINNET_PARAMS.vestingMax),
    paused: pz === true,
    dexSwapFeeBps: small(sfe, MAINNET_PARAMS.dexSwapFeeBps),
    dexFeeSplitBps: small(fsl, MAINNET_PARAMS.dexFeeSplitBps),
    dexEmergency: xpa === true,
  }
}
