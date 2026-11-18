// Mainnet HQ — the content tree. Every status, figure and date here is
// the project's OWN public roadmap/truth (see the site's roadmap and
// protocol pages): what is LIVE (mainnet since 23.09.2026), what is
// audited (PrivacyMixer V4), what is building toward the full-protocol
// mainnet window (June–July 2027). No invented dates beyond the
// published window; the countdown targets the WINDOW OPENING.

import type { SpriteName } from './pixel-sprites'

// ── The countdown ───────────────────────────────────────────────────

/** The published mainnet window opens June 2027 (roadmap: "Full
 *  Protocol on Mainnet — Jun–Jul 2027"). We count to the first day of
 *  the window and say exactly that — the final date locks after the
 *  external audit (H1 2027). */
export const MAINNET_WINDOW_MS = Date.UTC(2027, 5, 1, 0, 0, 0) // 2027-06-01T00:00:00Z
export const MAINNET_WINDOW_LABEL = 'JUNE 2027'
export const MAINNET_WINDOW_SUB =
  'target window June–July 2027 · final date locks after the external audit'

// ── Types ───────────────────────────────────────────────────────────

export type LevelStatus = 'live' | 'audited' | 'building' | 'locked'

export interface Level {
  id: string
  name: string
  sprite: SpriteName
  status: LevelStatus
  /** one-line hook (the card subtitle) */
  hook: string
  /** 2–3 sentences, plain language */
  what: string
  /** concrete things the user will do on mainnet */
  youWill: string[]
  /** compact fact chips */
  facts: string[]
  /** 0..1 readiness for the progress bar (roadmap-derived) */
  progress: number
}

export interface World {
  id: string
  code: string
  name: string
  tagline: string
  sprite: SpriteName
  accent: 'gold' | 'teal' | 'emerald' | 'red' | 'violet'
  levels: Level[]
}

export const STATUS_META: Record<LevelStatus, { label: string; color: string; note: string }> = {
  live: { label: 'LIVE NOW', color: '#6ee7a0', note: 'playable on the XELIS mainnet today' },
  audited: { label: 'AUDITED', color: '#f0b35c', note: 'cleared by audit — first in the mainnet drop' },
  building: { label: 'BUILDING', color: '#5cc8d7', note: 'under construction for the mainnet window' },
  locked: { label: 'PHASE 2', color: '#8a93b0', note: 'lands after the core protocol' },
}

// ── The worlds ──────────────────────────────────────────────────────

export const WORLDS: World[] = [
  {
    id: 'vault',
    code: 'W-1',
    name: 'THE VAULT',
    tagline: 'Confidential finance, engine by engine',
    sprite: 'vault',
    accent: 'gold',
    levels: [
      {
        id: 'vault-engine',
        name: 'Vault Engine',
        sprite: 'gauge',
        status: 'building',
        progress: 0.85,
        hook: 'Overcollateralized loans with encrypted positions',
        what:
          'The heart of the protocol: deposit collateral, borrow against it, and every amount — your balance, your health factor, even your liquidation — stays encrypted on-chain. Nobody can see your position, copy your strategy, or front-run your liquidation.',
        youWill: [
          'Lock XEL or whitelisted assets as collateral',
          'Borrow xUSD against up to half the collateral\'s value (the 200% minimum ratio)',
          'Watch YOUR health factor privately — no one sees your position',
          'Get liquidated silently by keepers if the ratio falls below 200%',
        ],
        facts: ['200% MIN CR', 'INTEREST PER BLOCK', 'ENCRYPTED POSITIONS'],
      },
      {
        id: 'vaultswap',
        name: 'VaultSwap',
        sprite: 'swap',
        status: 'building',
        progress: 0.7,
        hook: 'The MEV-resistant AMM — swaps nobody can front-run',
        what:
          'An automated market maker where reserves and trade sizes are hidden. There is no mempool window to spy on, so sandwich bots and front-runners have nothing to attack — swaps settle privately with XELIS 5-second finality.',
        youWill: [
          'Swap any pair without exposing size or direction',
          'Provide liquidity and earn your share of the fees — anonymously',
          'Trade with 5-second finality on the XELIS BlockDAG',
        ],
        facts: ['ENCRYPTED RESERVES', 'NO MEV WINDOW', '5S FINALITY'],
      },
      {
        id: 'savings',
        name: 'Savings',
        sprite: 'coins',
        status: 'building',
        progress: 0.75,
        hook: 'Interest that accrues every block, privately',
        what:
          'A deposit account on-chain: park xUSD or XEL and interest accrues every single block — roughly every 5 seconds — with the balance readable only by you.',
        youWill: [
          'Deposit xUSD or XEL in one click',
          'Earn interest compounded per block',
          'Withdraw anytime — no lockups',
        ],
        facts: ['PER-BLOCK ACCRUAL', 'NO LOCKUP', 'PRIVATE BALANCE'],
      },
      {
        id: 'xusd',
        name: 'xUSD Stablecoin',
        sprite: 'bank',
        status: 'building',
        progress: 0.8,
        hook: 'The private dollar — minted 1:1, always $1',
        what:
          'A privacy-preserving stablecoin. Mint xUSD by depositing XEL through the Peg Stability Module at a strict 1:1 ratio, redeem it back anytime, and pay with it anywhere — without exposing your balance to anyone.',
        youWill: [
          'Mint xUSD 1:1 against XEL (0.5% module fee)',
          'Redeem back to XEL whenever you want',
          'Send and pay privately — the peg holds by construction',
        ],
        facts: ['$1.00 PEG', 'PSM 1:1', '0.5% FEE'],
      },
    ],
  },
  {
    id: 'shadows',
    code: 'W-2',
    name: 'THE SHADOWS',
    tagline: 'Privacy is the product, not a setting',
    sprite: 'mixer',
    accent: 'violet',
    levels: [
      {
        id: 'mixer',
        name: 'PrivacyMixer V4',
        sprite: 'mixer',
        status: 'audited',
        progress: 1,
        hook: 'The audited confidential mixer — first to land',
        what:
          'Deposits enter a shared pool, withdrawals leave from a fresh address with no on-chain link between them. This is the one contract already cleared by audit and mainnet-ready — expect it early in the drop.',
        youWill: [
          'Deposit XEL or xUSD in fixed denominations',
          'Withdraw to a fresh address — untraceable by design',
          'Prove pool membership without revealing which deposit is yours',
        ],
        facts: ['AUDITED ✓', 'FIXED DENOMS', '0 LINKABLE POINTS'],
      },
      {
        id: 'auctions',
        name: 'Sealed-Bid Auctions',
        sprite: 'auction',
        status: 'building',
        progress: 0.6,
        hook: 'Bids stay sealed until the hammer falls',
        what:
          'On-chain auctions where every bid is encrypted until the auction closes. No sniping, no bid-stealing, no information leakage to watchers — the highest sealed bid simply wins.',
        youWill: [
          'Bid on assets without revealing your price',
          'Sell knowing nobody could probe your reserve',
        ],
        facts: ['ENCRYPTED BIDS', 'NO SNIPING'],
      },
      {
        id: 'flash',
        name: 'Flash Loans',
        sprite: 'bolt',
        status: 'building',
        progress: 0.6,
        hook: 'Uncollateralized liquidity for one block, privately',
        what:
          'Borrow any amount for a single block to arbitrage, refinance, or self-liquidate — the loan repays itself atomically inside the same transaction or the whole thing reverts. Private by default.',
        youWill: [
          'Run arbitrage across VaultSwap and LaunchDEX',
          'Refinance your vault position in one atomic move',
        ],
        facts: ['ATOMIC', 'ZERO COLLATERAL'],
      },
      {
        id: 'compliance',
        name: 'Compliance Module',
        sprite: 'shield',
        status: 'building',
        progress: 0.55,
        hook: 'Prove what must be proven — reveal nothing else',
        what:
          'Zero-knowledge selective disclosure: prove you are jurisdiction-compliant, solvent, or the legitimate source of funds without opening your books. Built MiCA-ready, for a world where privacy and regulation must coexist.',
        youWill: [
          'Generate ZK proofs of solvency or source of funds',
          'Share exactly one fact with a verifier — nothing more',
        ],
        facts: ['ZK PROOFS', 'SELECTIVE DISCLOSURE', 'MiCA-READY'],
      },
    ],
  },
  {
    id: 'engine',
    code: 'W-3',
    name: 'THE ENGINE ROOM',
    tagline: 'The machinery of trust, on-chain',
    sprite: 'eye',
    accent: 'teal',
    levels: [
      {
        id: 'oracle',
        name: 'StakedOracle',
        sprite: 'eye',
        status: 'building',
        progress: 0.7,
        hook: 'A price feed with skin in the game',
        what:
          'Price data by median-of-stakers: providers stake 1,000 VLT to participate, answers aggregate to the median, and provably bad answers get slashed. Honest feeds pay, dishonest ones burn.',
        youWill: [
          'Stake 1,000 VLT and earn oracle rewards',
          'Feed prices from your own data sources',
          'Rely on the median — one liar cannot move it',
        ],
        facts: ['1,000 VLT STAKE', 'MEDIAN FEED', 'SLASHING'],
      },
      {
        id: 'governance',
        name: 'Governance',
        sprite: 'vote',
        status: 'building',
        progress: 0.65,
        hook: 'Private ballots, public outcomes',
        what:
          'On-chain proposals and voting weighted by VLT stake. Your ballot stays private; the result is public and binding. The protocol evolves without anyone seeing who voted which way.',
        youWill: [
          'Submit and vote on protocol proposals',
          'Vote with weight proportional to your VLT stake',
        ],
        facts: ['PRIVATE BALLOTS', 'STAKE-WEIGHTED'],
      },
      {
        id: 'mining',
        name: 'Mining & Delegation',
        sprite: 'pickaxe',
        status: 'building',
        progress: 0.7,
        hook: 'Reputation-tiered mining with honest rewards',
        what:
          'Mine XELIS yourself or delegate hashpower to reputation-ranked miners. Five reputation tiers multiply rewards from 0× to 1.5×, concentration is penalized, and misbehavior is slashed by severity.',
        youWill: [
          'Mine XELIS on the BlockDAG (already live)',
          'Delegate to reputation-tiered miners',
          'Earn up to 1.5× through honest reputation',
        ],
        facts: ['5 TIERS 0×–1.5×', 'ANTI-CONCENTRATION', 'SLASH TABLE'],
      },
      {
        id: 'rwa',
        name: 'RWA Tokenization',
        sprite: 'bank',
        status: 'locked',
        progress: 0.3,
        hook: 'Real-world assets as confidential instruments',
        what:
          'Phase two: real-world assets issued as private on-chain instruments — the same confidentiality guarantees, applied to things that exist off-chain.',
        youWill: [
          'Hold and trade tokenized assets privately (phase two)',
        ],
        facts: ['PHASE 2', 'POST-CORE'],
      },
    ],
  },
  {
    id: 'floor',
    code: 'W-4',
    name: 'THE LAUNCH FLOOR',
    tagline: 'Already live — play it today',
    sprite: 'rocket',
    accent: 'emerald',
    levels: [
      {
        id: 'launchpad',
        name: 'VaultLaunch',
        sprite: 'rocket',
        status: 'live',
        progress: 1,
        hook: 'The mainnet launchpad — live since 23.09.2026',
        what:
          'The serious track: propose projects for community validation, trade them on bonding curves, graduate at 2× the seed into permanent liquidity. Real XELIS mainnet contracts, live right now.',
        youWill: [
          'Propose a project (526 XEL minimum, ~1h validation)',
          'Buy and sell on bonding curves (0.50% fee)',
          'Watch projects graduate at 2× seed liquidity',
        ],
        facts: ['LIVE 23.09.2026', '526 XEL MIN', 'GRADUATE AT 2×'],
      },
      {
        id: 'dex',
        name: 'LaunchDEX',
        sprite: 'swap',
        status: 'live',
        progress: 1,
        hook: 'Permanent-liquidity pools for graduated tokens',
        what:
          'The AMM every graduated token lands on. Swaps at 0.30%, liquidity providers earn 50% of all fees, and the protocol-locked seed means no rug is even possible.',
        youWill: [
          'Swap graduated tokens at 0.30%',
          'Provide liquidity and claim your 50% fee share',
        ],
        facts: ['0.30% SWAPS', '50% TO LPs', 'LOCKED SEED'],
      },
      {
        id: 'community',
        name: 'Community Coins',
        sprite: 'people',
        status: 'live',
        progress: 1,
        hook: 'Launch a real asset for ~2 XEL — no validation',
        what:
          'The permissionless track: anyone launches a real XELIS asset in one transaction for about 2 XEL. It trades on a bonding curve from the first block and migrates to the DEX at 50 XEL of real depth.',
        youWill: [
          'Launch your own coin for ~2 XEL',
          'Trade new curves the moment they exist',
          'Graduate into a permanent DEX pool',
        ],
        facts: ['~2 XEL PER LAUNCH', 'NO VALIDATION', 'MIGRATE AT 50 XEL'],
      },
      {
        id: 'xvlt',
        name: 'XVLT — the official token',
        sprite: 'coins',
        status: 'live',
        progress: 1,
        hook: 'Fixed supply forever, protocol-locked liquidity',
        what:
          'The platform\'s own token: fixed supply, launched with team-funded liquidity, graduated into a permanent-liquidity pool with a protocol-locked seed. No founder liquidity to pull — verifiable on-chain.',
        youWill: [
          'Trade XVLT on its LaunchDEX pool right now',
          'Hold a fixed-supply asset with no rug path',
        ],
        facts: ['FIXED SUPPLY', 'LOCKED SEED', 'LIVE ON DEX'],
      },
    ],
  },
  {
    id: 'terminal',
    code: 'W-5',
    name: 'THE TERMINAL',
    tagline: 'Your access to everything',
    sprite: 'chat',
    accent: 'gold',
    levels: [
      {
        id: 'vaultchat',
        name: 'VaultChat',
        sprite: 'chat',
        status: 'building',
        progress: 0.6,
        hook: 'Encrypted wallet-to-wallet messaging',
        what:
          'Chat directly from wallet to wallet, end-to-end encrypted with keys derived from your wallet (HKDF-SHA256). No servers, no metadata — talk money with the wallet you already pay with.',
        youWill: [
          'Message any wallet address, encrypted end-to-end',
          'Send payments inside the conversation',
        ],
        facts: ['E2E ENCRYPTED', 'KEYS FROM WALLET'],
      },
      {
        id: 'wallets',
        name: 'Wallets & XSWD',
        sprite: 'wallet',
        status: 'live',
        progress: 1,
        hook: 'Genesix signs — the site never can',
        what:
          'Genesix desktop and mobile wallets hold your keys and sign every transaction locally through XSWD. XelisVault connects as a viewer: it can propose, you approve — it can never touch your funds.',
        youWill: [
          'Connect Genesix to the launchpad (already works)',
          'Approve every transaction on your own device',
        ],
        facts: ['XSWD', 'LOCAL SIGNING', 'LIVE'],
      },
      {
        id: 'sdk',
        name: 'Developer SDK',
        sprite: 'code',
        status: 'live',
        progress: 0.8,
        hook: 'Silex contracts, SDK and full docs',
        what:
          'Everything is open: the Silex contract source, the SDK, structured docs, and the on-chain explorer. Build on XelisVault without asking permission.',
        youWill: [
          'Read the contracts and audit reports',
          'Integrate the launchpad from your own app',
        ],
        facts: ['OPEN SOURCE', 'SDK + DOCS'],
      },
      {
        id: 'simulator',
        name: 'Vault Simulator',
        sprite: 'gamepad',
        status: 'live',
        progress: 1,
        hook: 'Practice the whole protocol before mainnet day',
        what:
          'The full protocol app running against the testnet: try vaults, swaps, the mixer and governance with zero risk, so mainnet day is just muscle memory.',
        youWill: [
          'Practice every module on testnet today',
          'Be ready the hour mainnet opens',
        ],
        facts: ['TESTNET', 'ZERO RISK'],
      },
    ],
  },
]

// ── The quest log (roadmap) ─────────────────────────────────────────

export interface Quest {
  id: string
  name: string
  date: string
  state: 'done' | 'active' | 'locked'
  note: string
}

export const QUESTS: Quest[] = [
  { id: 'q1', name: 'v11.5 core complete', date: 'Q1–Q2 2026', state: 'done', note: 'the 51-contract legacy core' },
  { id: 'q2', name: 'v5.0 audit remediation', date: 'Q2 2026', state: 'done', note: 'findings closed' },
  { id: 'q3', name: 'Testnet deployment', date: '30 AUG 2026 · 14:00 UTC', state: 'done', note: 'the vault opened' },
  { id: 'q4', name: 'v13→v18 consolidation', date: 'Q3 2026', state: 'done', note: 'legacy → protocol repo' },
  { id: 'q5', name: 'VaultLaunch + LaunchDEX on mainnet', date: '23 SEP 2026', state: 'done', note: 'live and trading' },
  { id: 'q6', name: 'External security audit', date: 'H1 2027', state: 'active', note: 'the gate before launch' },
  { id: 'q7', name: 'FULL PROTOCOL ON MAINNET', date: 'JUN–JUL 2027', state: 'locked', note: 'the mission' },
]

/** 5 of 7 milestones cleared. */
export const MISSION_PROGRESS = 5 / 7

// ── The marquee ─────────────────────────────────────────────────────

export const MARQUEE_ITEMS = [
  'FULL PROTOCOL MAINNET: JUNE 2027',
  'PRIVACYMIXER V4: AUDITED ✓',
  'VAULTLAUNCH: LIVE ON MAINNET SINCE 23.09.2026',
  'XVLT: FIXED SUPPLY · PROTOCOL-LOCKED LIQUIDITY',
  'EXTERNAL AUDIT: H1 2027',
  '5-SECOND FINALITY ON THE XELIS BLOCKDAG',
  '0 LINKABLE DATA POINTS',
]
