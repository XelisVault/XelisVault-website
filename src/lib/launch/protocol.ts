// VaultLaunch — MAINNET protocol bindings.
//
// VaultLaunch v4.2 + LaunchDEX v1.3 were deployed, configured and verified
// on the official XELIS mainnet on 23/09/2026 (block version V7). This
// module is the single source of truth for the on-chain identity of the
// protocol as seen by the website:
//   • the two contract hashes (pinned to each other on-chain)
//   • every entry id a transaction can invoke (from the SDK ABI tables)
//   • every storage key the reader polls (from LAUNCHPAD.md §7 / DEX.md)
//   • the mainnet configuration, as DEPLOYED (runbook 3, verified 16/16
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

/** LaunchDEX — the AMM for graduated tokens. */
export const DEX_CONTRACT =
  'bce37bde7ac8e0410656d5b67c398b172cbb6047f6b390041c9dbb3dbdeae11d'

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
