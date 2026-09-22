// VaultLaunch — domain types for the launchpad, bonding curve and DEX demo.
// Mirrors the on-chain lifecycle of the VaultLaunch v4.2 + LaunchDEX v1.3
// contracts (xelis-vault repo). All PROTOCOL numbers below are the real
// on-chain defaults, verified against the contracts:
//   VaultLaunch.slx  DEFAULT_SUBMISSION_FEE 10 XEL · DEFAULT_ASSET_BUDGET 10 XEL
//                    DEFAULT_TRADING_FEE_BPS 50 · DEFAULT_GRADUATED_FEE_BPS 25
//                    DEFAULT_MIGRATION_FEE_BPS 50 · DEFAULT_MIN_APPROVAL_BPS 8000
//                    DEFAULT_VOTE_DEPOSIT 0.5 XEL · graduation_multiplier 4
//   LaunchDEX.slx    DEFAULT_SWAP_FEE_BPS 30 · DEFAULT_LP_SHARE_BPS 5000 (50/50)
//                    MIN_LP_ADD_XEL 1 XEL

// ─── Lifecycle (on-chain status codes) ───────────────────────────
// 0 validation → 1 rejected | 2 bonding → 3 graduated → 4 trusted / 5 untrusted → 6 recovery
export type ProjectStatus =
  | 'validating'    // 0 — community vote window open
  | 'rejected'      // 1 — failed validation, 100% refunded
  | 'bonding'       // 2 — live on the bonding curve
  | 'graduated'     // 3 — crossed 4x seed, migrated to LaunchDEX
  | 'trusted'       // 4 — graduated + community trust badge
  | 'untrusted'     // 5 — sells open, buys blocked
  | 'recovery'      // 6 — revalidation round

export interface VoteState {
  supporters: number
  reporters: number
  /** Minimum voters required (20). */
  quorum: number
  /** Approval required (80%). */
  approvalThreshold: number
  /** Topoheight when the window closes. */
  deadlineTopo: number
  /** Milliseconds timestamp the UI counts down to (demo). */
  deadlineMs: number
  /** Has the connected wallet voted this round? */
  userVoted: 'support' | 'report' | null
}

export interface CurveState {
  /** XEL reserves held by the curve (atomic → whole XEL in demo). */
  reserves: number
  /** Token circulating supply on the curve. */
  circulating: number
  /** Seed liquidity (min 500 XEL) — graduation = reserves ≥ seed × 4. */
  seed: number
  /** Trading fee in basis points (50 = 0.50%). */
  feeBps: number
  /** Team allocation in bps (≤ 20%). */
  teamBps: number
  /** Historical price points (XEL per token) for the chart. */
  history: number[]
  /** 24h volume in XEL. */
  volume24h: number
  /** Unique holders (demo counter). */
  holders: number
}

export interface DexPool {
  /** Pool id (= project id). */
  id: string
  /** XEL side of the pool. */
  xel: number
  /** Token side of the pool. */
  token: number
  /** Swap fee (30 bps). */
  feeBps: number
  /** Admin/LP fee split (5000 bps = 50/50). */
  adminSplitBps: number
  /** Protocol-locked seed depth (XEL) — permanent liquidity, cannot be removed. */
  seedLocked: number
  /** Total LP parts. */
  totalParts: number
  /** Withdrawable parts (all parts minus the protocol seed). */
  withdrawableParts: number
  /** Historical pool price points. */
  history: number[]
  volume24h: number
  fees24h: number
}

export interface Project {
  id: string
  name: string
  ticker: string
  description: string
  longDescription: string
  creator: string
  /** Genesis-style address (display only). */
  creatorAddress: string
  website?: string
  /** Letter avatar + brand hue (0-360). */
  hue: number
  avatar: string
  status: ProjectStatus
  /** Direct-listing snapshot at propose (≥ 2000 XEL → instant graduation). */
  directListing: boolean
  proposedAt: number
  vote?: VoteState
  curve?: CurveState
  pool?: DexPool
  /** Trust tallies (lifetime). */
  trust: { up: number; down: number }
  tags: string[]
}

// ─── Portfolio ────────────────────────────────────────────────────
export interface BondingPosition {
  projectId: string
  tokens: number
  /** Average XEL paid per token. */
  avgPrice: number
}

export interface LpPosition {
  poolId: string
  parts: number
  /** XEL provided when entering. */
  xelProvided: number
  feesEarnedXel: number
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
  note?: string
}

// ─── Protocol constants (from LAUNCHPAD.md / DEX.md specs) ───────
export const PROTOCOL = {
  submissionFee: 10,        // XEL
  assetBudget: 10,          // XEL (refundable)
  minLiquidity: 500,        // XEL seed
  graduationMultiplier: 4,  // reserves ≥ seed × 4
  directListingThreshold: 2000, // XEL snapshot at propose
  tradingFeeBps: 50,        // 0.50% bonding curve
  graduatedFeeBps: 25,      // 0.25% after graduation (irreversible discount)
  migrationFeeBps: 50,      // 0.5% one-time at graduation
  dexFeeBps: 30,            // 0.30% LaunchDEX
  dexAdminSplitBps: 5000,   // 50/50 LP/admin
  voteQuorum: 20,           // minimum voters
  voteApproval: 0.80,       // 80% approval
  voteDeposit: 0.5,         // XEL refundable
  voteWindowTopos: 51_840,  // ≈ 29h at ~2s/topo
  teamMaxBps: 2000,         // ≤ 20%
  maxProjects: 8192,
} as const
