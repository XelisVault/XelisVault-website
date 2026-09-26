// VaultLaunch — domain types (MAINNET).
//
// Mirrors the on-chain lifecycle of VaultLaunch v4.2 + LaunchDEX v1.3
// as deployed on the XELIS mainnet (23/09/2026). The store maps raw
// storage cells (reader.ts) into these display-oriented shapes; all
// amounts are human-readable floats (converted from atomic bigint),
// EXCEPT where a transaction needs exactness — quotes and min_outs go
// through chain-math.ts in atomic bigint.

// ─── Lifecycle (on-chain status codes) ───────────────────────────────
// 0 validation → 1 rejected | 2 bonding → 3 graduated → 4 trusted / 5 untrusted → 6 recovery
export type ProjectStatus =
  | 'validating'    // 0 — community vote window open
  | 'rejected'      // 1 — failed validation, 100% refunded
  | 'bonding'       // 2 — live on the bonding curve
  | 'graduated'     // 3 — crossed liquidity × gmu, awaiting/after migration
  | 'trusted'       // 4 — graduated + community trust badge
  | 'untrusted'     // 5 — sells open, buys blocked
  | 'recovery'      // 6 — revalidation round

export interface VoteState {
  supporters: number
  reporters: number
  /** Minimum voters required (on-chain `mnp`). */
  quorum: number
  /** Approval required (on-chain `mab`, 0..1). */
  approvalThreshold: number
  /** Topoheight when the window closes (on-chain `ve`). */
  deadlineTopo: number
  /** Milliseconds timestamp the UI counts down to (derived from topo). */
  deadlineMs: number
  /** Vote round (on-chain `rd`). */
  round: number
  /** Has the connected wallet voted this round? (the on-chain slot only
   *  records THAT you voted — the side is private.) */
  userVoted: boolean
}

export interface CurveState {
  /** XEL reserves held by the curve (human XEL). */
  reserves: number
  /** Token inventory still on the curve (human tokens). */
  circulating: number
  /** Seed liquidity (human XEL) — graduation = reserves ≥ seed × gmu. */
  seed: number
  /** Effective trading fee in basis points (50 bonding / 25 graduated). */
  feeBps: number
  /** Team allocation in bps (≤ 20%). */
  teamBps: number
  /** Historical price points (XEL per token) — persisted locally. */
  history: number[]
  /** Absolute index of history[0] — anchors candle buckets so CLOSED
   *  candles NEVER move, even when the capped array slides. */
  histStart: number
  /** Total price points ever emitted (histStart + history.length). */
  points: number
  /** Seconds between points (drives the chart's time axis). */
  pointSeconds: number
  /** Total volume traded on the curve (human XEL). */
  volume: number
  /** Total trades on the curve. */
  trades: number
  /** Live market cap (human XEL). */
  marketCap: number
  /** All-time-high market cap (human XEL). */
  marketCapHigh: number
}

export interface PoolState {
  /** Project id owning the pool's asset. */
  id: string
  /** Real XELIS asset hash traded in this pool. */
  asset: string
  /** XEL side of the pool (human). */
  xel: number
  /** Token side of the pool (human). */
  token: number
  /** Swap fee (30 bps default). */
  feeBps: number
  /** LP share of the fee (5000 bps = 50/50). */
  adminSplitBps: number
  /** Protocol-locked seed depth (human XEL) — permanent liquidity floor. */
  seedLocked: number
  /** Total LP depth (human XEL). */
  totalParts: number
  /** Historical pool price points — persisted locally. */
  history: number[]
  /** Absolute index of history[0] (candle anchoring — see CurveState). */
  histStart: number
  /** Total price points ever emitted. */
  points: number
  /** Seconds between points (drives the chart's time axis). */
  pointSeconds: number
  /** Total swap volume (human XEL). */
  volume: number
  /** Lifetime fees collected (human XEL). */
  fees: number
  /** Total swaps. */
  trades: number
  /** Trust-synced buys pause (D17). */
  buysPaused: boolean
}

export interface Project {
  /** Project id (pid as string — the on-chain index). */
  id: string
  /** Numeric pid. */
  pid: number
  name: string
  ticker: string
  description: string
  longDescription: string
  /** Creator address (xel:…). */
  creator: string
  creatorAddress: string
  website?: string
  logo?: string
  twitter?: string
  telegram?: string
  discord?: string
  /** Letter avatar + brand hue (0-360). */
  hue: number
  avatar: string
  status: ProjectStatus
  /** Direct-listing snapshot at propose (≥ dlt XEL → instant graduation). */
  directListing: boolean
  graduated: boolean
  migrated: boolean
  /** The REAL XELIS asset hash of the token (null until validation passes). */
  asset: string | null
  proposedAtTopo: number
  vote?: VoteState
  curve?: CurveState
  pool?: PoolState
  /** Trust tallies (lifetime, on-chain sp/rp). */
  trust: { up: number; down: number }
  tags: string[]
  /** Declared team vesting plan in topos (0 = claim at graduation). */
  vestingPlanTopos: number
  teamBps: number
  /** Total supply (human tokens). */
  totalSupply: number
  /** Trust mirrored to the DEX pool (D17). */
  dexSynced: boolean
  /** Creator already claimed the rejection refund. */
  refundClaimed: boolean
}

// ─── Community track (CommunityLaunch v1.0.1 — C101) ─────────────────
// 0 live → 1 graduated → 2 migrated (terminal; the pool owns the market)
export type CoinStatus = 'live' | 'graduated' | 'migrated'

/** The bonding curve of one community coin. */
export interface CoinCurve {
  /** Real XEL in the curve (human XEL) — starts at 0, grows with buys. */
  reserves: number
  /** Real token inventory still on the curve (human tokens). */
  inventory: number
  /** Initial inventory snapshot (human tokens) — together with vx it
   *  prices the coin at birth. */
  initialInventory: number
  /** Launch-depth snapshot (human XEL) — the curve's pricing depth. */
  virtualXel: number
  /** Graduation depth snapshot (human XEL) — the demand proof. */
  gradDepth: number
  /** Effective fee: 1% live, 0.5% once graduated. */
  feeBps: number
  /** Historical price points (XEL per token) — persisted locally. */
  history: number[]
  histStart: number
  points: number
  pointSeconds: number
  /** Total volume traded on the curve (human XEL). */
  volume: number
  trades: number
}

export interface CommunityCoin {
  /** Coin id (cid — the on-chain index, 0-based). */
  cid: number
  id: string
  creator: string
  status: CoinStatus
  name: string
  ticker: string
  description: string
  website?: string
  logo?: string
  twitter?: string
  telegram?: string
  discord?: string
  hue: number
  avatar: string
  /** TRUE for the platform's own tokens (official.ts registry): they
   *  leave the community boards and surface as flagship project tokens
   *  with OFFICIAL · TRUSTED presentation. */
  official?: boolean
  /** The REAL XELIS asset hash of the coin (set at launch). */
  asset: string | null
  /** Total supply (human tokens) — fixed forever at launch. */
  totalSupply: number
  /** Creator allocation in bps (≤ 5%, off-curve, post-migration only). */
  teamBps: number
  /** Creator already claimed the allocation. */
  creatorPaid: boolean
  createdTopo: number
  graduatedTopo: number
  migratedTopo: number
  migratedXel: number
  migratedTokens: number
  /** Curve era (live + graduated — the curve keeps trading until the
   *  pool exists; migrated coins have NO curve). */
  curve?: CoinCurve
  /** Pool era (migrated — the LaunchDEX pool owns the market). */
  pool?: PoolState
  /** Live spot price in XEL per token (0 once migrated). */
  price: number
  /** Live market cap in XEL, FDV convention (0 once migrated). */
  marketCap: number
  /** 0..1 — progress of the demand-proof depth (xr / gdx). */
  progress: number
  /** The C2 price-continuity condition (xr·y0 ≥ yr·vx). */
  continuity: boolean
  tags: string[]
}

// ─── Wallet positions (XELIS balances are confidential: the wallet
//      itself is the only source — no on-chain ledger exists) ────────

export interface LpPosition {
  poolId: string
  asset: string
  /** XEL depth provided (parts). */
  parts: number
  /** Withdrawable parts (X12). */
  withdrawable: number
  /** Crystallised claimable fees (human). */
  claimableXel: number
  claimableTokens: number
}

export interface ActivityItem {
  id: string
  ts: number
  kind: 'buy' | 'sell' | 'vote' | 'proposal' | 'graduation' | 'migration' | 'lp' | 'swap'
  projectId: string
  actor: string
  amountXel?: number
  tokens?: number
  price?: number
  txHash?: string
  note?: string
}
