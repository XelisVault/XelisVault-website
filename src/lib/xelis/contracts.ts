// XELIS Vault — Contract addresses (TESTNET v12R, live deployment)
//
// The v12R deployment is the CANONICAL live deployment (post-fork rollback of
// 2026-08-22; v11/v12/v12.1 are dead). Hashes below come from the protocol
// repo docs/deployment_state.json (v12R, 2026-08-24) and were verified live.
//
// Resolution order (mirrors the CLI's Protocol.resolve()):
//   1. on-chain ContractRegistry key `cur_<Name>`  (authoritative, live)
//   2. static fallback table below (V12R)
//
// The registry itself cannot move: it is deployed once per network.

import { rpcCall } from './rpc'
import { keyStr, parseCell, valHash } from './types'

export const REGISTRY_HASH = '19161543b9e5aef00c5a3e226058b946d847c78941f0c89e9b996c6332204970'

// Native XEL asset is all zeroes (convention on every XELIS network)
export const XEL_ASSET = '0'.repeat(64)
export const VLT_ASSET = '3f1f9a3c0a90a0a548670a069e8edad5c0c20914b20b289426b2857c6715f58f'
export const XUSD_ASSET = 'be39794c4a32f231d410c8be3a4d9e80455c667d902c5edf8527dea52533356e'

export const ASSETS = {
  XEL: { hash: XEL_ASSET, ticker: 'XEL', name: 'XELIS', decimals: 8 },
  VLT: { hash: VLT_ASSET, ticker: 'VLT', name: 'XELIS Vault', decimals: 8 },
  xUSD: { hash: XUSD_ASSET, ticker: 'xUSD', name: 'XELIS USD', decimals: 8 },
} as const

// Static fallback — v12R deployment (verified live 2026-08-27)
export const V12R_CONTRACTS: Record<string, string> = {
  ContractRegistry: REGISTRY_HASH,
  ComplianceModule: '1c0f143207c24d3b3e7fd04000cd1425e498505171de45ca980238e9f71c7f4a',
  VLTToken: '020f228fbd61e3a6cd2d570083e14c02f7073f293c79ee4059359b896e217d84',
  xUSD: '4836190ca2f2278cfc3e8ad8c7e05bbd0070de253c64615f6eea2c19885063a1',
  FaucetContract: 'ed6e2f58c9a98bd098534efce6f430a3b2abb77cf015e5e5b193c4f37d7e16a4',
  XelisVaultMiner: '6c70647e233dd634aa05cd6bdca06b521947c4c682d7decac0700d8a79d4b024',
  StakedOracle: 'e89bc25043c320fdac9c2030bc99e4b5bd94c9e0043132d10f66cd93576fa515',
  MinerPool: 'de744e0ccf45252070eb8fe83d0d16d36736ab7af1014a69405f358fb63c439b',
  InterestRateModel: 'e9f716b07628fb8793adf3e20142348082a5021d671f316dad1e02cfb70f9c6d',
  VaultEngineV3: 'dcefbd7bd5de056247b3e4195d52df42b32fa510361cd1dc31ed115d65450e48',
  SavingsRate: '69d719949fd8f25fc33c8d4e8d9da6d8cb30f63a0163e39e1c9de79129d86f27',
  FlashCallback: 'a84fc6d305b4ed1a6e15c310461799172272ec1cabf209316e724c3ede420f40',
  FlashLoan: '3e3ae983175a1f97013963803d977dd39a3b525c1778cb4cd4e3c4858e2b5ef8',
  VaultSwapV2: '5defc37154200f1cabb5b5fa43510565ab791e34b20f2cf4132ec7d9ac4e2041',
  PSM: '977ddf73305dd21c29ffbe69dc2bdb29a12a62f4ff8bbc3140cafd4b51d5c2e1',
  LendingMarket: 'cb8f489382368b2f1b27bffcba346ede50aa180ebefac89ac444995bc95255bc',
  PeerLoan: 'ee27ecae9d8bb9b600026e883506eac39d81e5c908cca9dfeb6d96b529117568',
  SyndicatePool: 'e1622bb0c1dace2c0b008a8448f2ade7df7eeb898410aa7f3355bf57bb48a0ae',
  SealedBidAuction: '105bb6ccdb14f8cd34da78b85ed36790b29b2625d168297aa4294d3a557c46eb',
  // v12R-7 (2026-08-27): PrivacyMixer v2 — note + nullifier + shared pool.
  // Replaces r5 (d384649c…) where v1 funds are orphaned (testnet, negligible).
  PrivacyMixer: 'ffd504e24caad25b8f74e512318a66c45229dc2702dec0ecf66540065690d2d5',
  AssetVault: 'e65d593b5818af605caffbc5c56dbf2ee966b8b7baad18e165a6012b7f7343df',
  TreasuryVault: 'c50042aa59703bb1c73ffa0ffcb01f23b8ae8419d1e23b2892b9dcf9dde0a886',
  RevenueShare: '49c363dae4d32473d6d3c26ce0482cf735f7d656c665094002c1d21a6978c94b',
  Payroll: '44ce12fb3d143f360c84664fe4849f01fb31ce5b45aebda38b037c70b4079b30',
  GovernanceVault: '1e0408c02b99eeca65399033d16330e0af936525dd41fd860980e214f59d5da5',
  Timelock: 'b925d8e30ccd7bcffdc1376a6aecd8daaaa71603a3d0a4c9413d9e4a8ed11082',
  GuardianMultisig: '9792a5894877a5982c9efdfb91f94c1536fe5f21c017a56c59691776413e4929',
  Governor: 'eb7a1aea5518ddeff6ab7379d9abe854969b690928124314ba378e5073c154b9',
  OracleGovernance: 'bab86ca4a01c3250ce90b5c5d569b87ab221a212321848e104eb89500c28c953',
  VaultChat: '54fbd12e40b5e039b9a1c7c0b9475cebc0fd77ec72cbf35a9551712a59ea0bbd',
  FounderVesting: 'fa07e6f5b5273c6d48994e846a05363099366661c4128f76b1fe41d15d1055a4',
  FeeDistributor: 'c7e23f4cbe34ecb411811e7edbdbd55e428f2884b36d067be94ca4ca425491f7',
  MinerDelegation: '5eb34079fd84ee3626e410c0e9cbf5d568c76cabeaf36c0d00b5e21693033685',
  AirdropTracker: 'ef896baa1c88d64462500b48c8a6d0fb47b92b46718d1949c79d8d0268769dca',
}

// Display metadata for the 51 contracts of the protocol (v11.5 source).
// `deployed` = part of the 34-contract core deployed on testnet v12R.
export interface ContractMeta {
  name: string
  category: string
  desc: string
  deployed: boolean
}

export const PROTOCOL_CONTRACTS: ContractMeta[] = [
  { name: 'ContractRegistry', category: 'proxy', desc: 'Name → hash resolution and upgradability (cur_/prev_ history)', deployed: true },
  { name: 'ComplianceModule', category: 'compliance', desc: 'Regulatory module hooks (optional compliance layer)', deployed: true },
  { name: 'VLTToken', category: 'token', desc: 'VLT fixed-supply token, 10M cap, mintable by miner rewards', deployed: true },
  { name: 'xUSD', category: 'usd', desc: 'xUSD stablecoin with split mint (treasury fee routing)', deployed: true },
  { name: 'FaucetContract', category: 'faucet', desc: 'Testnet faucet: admin distribute, cooldown + lifetime caps', deployed: true },
  { name: 'XelisVaultMiner', category: 'miner', desc: 'Unified miner layer: stake, reputation, rewards, halving emission', deployed: true },
  { name: 'StakedOracle', category: 'oracle', desc: 'Stake-secured median oracle with slashing and circuit breaker', deployed: true },
  { name: 'MinerPool', category: 'miner', desc: 'Miner pool accounting (aggregated stakes)', deployed: true },
  { name: 'InterestRateModel', category: 'interest', desc: 'Kinked interest rate curve for lending markets', deployed: true },
  { name: 'VaultEngineV3', category: 'vault', desc: 'CDP engine: deposit XEL collateral, borrow xUSD (200% CR)', deployed: true },
  { name: 'SavingsRate', category: 'savings', desc: 'xUSD savings with adjustable APY (default 5%)', deployed: true },
  { name: 'FlashCallback', category: 'flashloan', desc: 'Flash loan callback receiver verification', deployed: true },
  { name: 'FlashLoan', category: 'flashloan', desc: 'Uncollateralized flash loans (9 bps fee)', deployed: true },
  { name: 'VaultSwapV2', category: 'amm', desc: 'Confidential AMM + embedded PSM, MEV-resistant (TWAP breaker)', deployed: true },
  { name: 'PSM', category: 'amm', desc: 'Peg Stability Module: XEL ↔ xUSD at oracle price', deployed: true },
  { name: 'LendingMarket', category: 'lending', desc: 'Multi-asset lending market with reserve factor', deployed: true },
  { name: 'PeerLoan', category: 'lending', desc: 'Peer-to-peer loan offers with negotiation', deployed: true },
  { name: 'SyndicatePool', category: 'lending', desc: 'Syndicated loans (group underwriting)', deployed: true },
  { name: 'SealedBidAuction', category: 'auction', desc: 'Sealed-bid auctions with commit/reveal', deployed: true },
  { name: 'PrivacyMixer', category: 'privacy', desc: 'Note + nullifier mixer with shared pool — mix XEL, xUSD or VLT', deployed: true },
  { name: 'AssetVault', category: 'treasury', desc: 'RWA asset tokenization vault', deployed: true },
  { name: 'TreasuryVault', category: 'treasury', desc: 'Governance-controlled treasury (multisig spending)', deployed: true },
  { name: 'RevenueShare', category: 'revenue', desc: 'Protocol revenue distribution to stakers', deployed: true },
  { name: 'Payroll', category: 'payroll', desc: 'On-chain recurring payroll streams', deployed: true },
  { name: 'GovernanceVault', category: 'governance', desc: 'VLT staking with boost (up to 2×) and rewards', deployed: true },
  { name: 'Timelock', category: 'governance', desc: 'Timelock for governance executions (min delay 144 blocks)', deployed: true },
  { name: 'GuardianMultisig', category: 'governance', desc: 'Guardian multisig for emergency actions', deployed: true },
  { name: 'Governor', category: 'governance', desc: 'Proposals, voting (10% quorum), queueing', deployed: true },
  { name: 'OracleGovernance', category: 'governance', desc: 'Oracle parameter governance', deployed: true },
  { name: 'VaultChat', category: 'chat', desc: 'E2E encrypted messaging with on-chain anchoring', deployed: true },
  { name: 'FounderVesting', category: 'founder', desc: 'Founder vesting instances (4y cliff + 10y ongoing)', deployed: true },
  { name: 'FeeDistributor', category: 'revenue', desc: 'Protocol fees: 50% burn / 40% treasury / 10% founder', deployed: true },
  { name: 'MinerDelegation', category: 'miner', desc: 'Delegation to miners (commission 0–20%, 500 delegators max)', deployed: true },
  { name: 'AirdropTracker', category: 'airdrop', desc: 'Testnet contribution points across 7 categories', deployed: true },
  // Phase 5+ brainstorming (NOT deployed — 13 contracts)
  { name: 'NotificationCenter', category: 'notifications', desc: 'Phase 5+: on-chain notification center', deployed: false },
  { name: 'CreditScore', category: 'credit', desc: 'Phase 5+: confidential credit scoring', deployed: false },
  { name: 'EmergencyShutdown', category: 'safety', desc: 'Phase 5+: graceful protocol shutdown', deployed: false },
  { name: 'GovernanceDelegation', category: 'governance', desc: 'Phase 5+: vote delegation', deployed: false },
  { name: 'VaultInsurance', category: 'insurance', desc: 'Phase 5+: vault insurance pool', deployed: false },
  { name: 'AnalyticsCollector', category: 'analytics', desc: 'Phase 5+: anonymous analytics', deployed: false },
  { name: 'LiquidationMarket', category: 'liquidation', desc: 'Phase 5+: liquidation auction market', deployed: false },
  { name: 'VaultBounties', category: 'nft', desc: 'Phase 5+: bounty NFTs', deployed: false },
  { name: 'SocialTrading', category: 'social', desc: 'Phase 5+: copy trading', deployed: false },
  { name: 'YieldOptimizer', category: 'rwa', desc: 'Phase 5+: auto yield strategies', deployed: false },
  { name: 'VaultTemplates', category: 'vault', desc: 'Phase 5+: user-defined vault templates', deployed: false },
  { name: 'MultiCollateralVault', category: 'vault', desc: 'Phase 5+: multi-collateral vaults', deployed: false },
  { name: 'VaultNFT', category: 'nft', desc: 'Phase 5+: vault position NFTs', deployed: false },
]

// ---- Dynamic resolution via on-chain registry ----

const resolveCache = new Map<string, { hash: string; expires: number }>()

export function invalidateResolutionCache() {
  resolveCache.clear()
}

/**
 * Resolve a contract name to its current hash.
 * Priority: on-chain registry `cur_<Name>` → static v12R table.
 */
export async function resolveContract(name: string): Promise<string> {
  const cached = resolveCache.get(name)
  if (cached && cached.expires > Date.now()) return cached.hash

  let hash: string | null = null
  try {
    const res = await rpcCall<any>(
      'get_contract_data',
      { contract: REGISTRY_HASH, key: keyStr(`cur_${name}`) },
      { retries: 2, cacheTtlMs: 60_000 }
    )
    if (res?.data) {
      const parsed = parseCell(res.data)
      if (typeof parsed === 'string' && parsed.length === 64) hash = parsed
    }
  } catch {
    // key missing → fall through to static table
  }

  if (!hash) hash = V12R_CONTRACTS[name] ?? null
  if (!hash) throw new Error(`Unknown contract: ${name}`)

  resolveCache.set(name, { hash, expires: Date.now() + 60_000 })
  return hash
}

/** Static lookup (no network) — v12R fallback table. */
export function staticContract(name: string): string {
  const h = V12R_CONTRACTS[name]
  if (!h) throw new Error(`Unknown contract: ${name}`)
  return h
}
