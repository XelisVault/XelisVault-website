// VaultLaunch demo dataset — deterministic (seeded PRNG) so SSR and client
// render identically. The engine then evolves this state live after mount.
//
// Projects showcase EVERY lifecycle stage:
//   XelisVault (VLT) — ON THE CURVE at ~93%, about to graduate and migrate
//                      (the live flagship story: watch it cross 4× live)
//   XPay (XPAY)      — graduated, migrated (the LaunchDEX pool)
//   NovaPrivacy(NOVA)— bonding, 68% to graduation
//   CypherDAO (CYPH) — bonding, early days (second curve)
//   Kleos (KLEOS)    — validating, 19/20 voters, 89% — about to be ACCEPTED
//   Obsidian (OBS)   — validating, early
//   MemeX (MEMEX)    — rejected — 100% refunded, the anti-rug path shown

import type { Project, ActivityItem } from './types'
import { PROTOCOL } from './types'

// ─── Seeded PRNG (mulberry32) — deterministic demo data ──────────
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic random-walk price history ending at `endPrice`. */
export function walkHistory(endPrice: number, points: number, vol: number, seed: number, drift = 0): number[] {
  const rnd = mulberry32(seed)
  const out: number[] = [endPrice]
  let p = endPrice
  for (let i = 1; i < points; i++) {
    // walk backwards from the end price
    const shock = (rnd() - 0.5) * 2 * vol * p - drift * p
    p = Math.max(p - shock, p * 0.2)
    out.push(p)
  }
  return out.reverse()
}

/** Initial price histories for bonding curves (per-project seeds).
 *  histStart is NEGATIVE: the pre-seeded walk represents points emitted
 *  before t0, so live points start at absolute index 0 and closed candles
 *  stay anchored forever. */
function curveHistory(reserves: number, circulating: number, seed: number, points = 110): { history: number[]; histStart: number; points: number } {
  return {
    history: walkHistory(reserves / circulating, points, 0.035, seed, 0.0008),
    histStart: -points,
    points: 0,
  }
}

const MIN = 60_000
const HOUR = 60 * MIN

export function buildInitialProjects(startTopo: number, nowMs: number): Project[] {
  return [
    // ── Flagship: XelisVault — ON THE CURVE, ~93% to graduation. The live
    //    story: watch VLT cross 4× (2,000 XEL) and migrate to LaunchDEX. ──
    {
      id: 'vlt',
      name: 'XelisVault',
      ticker: 'VLT',
      description: 'The confidential finance platform itself: vaults, xUSD, VaultSwap. On its bonding curve at 93% — graduation to LaunchDEX is imminent, watch it live.',
      longDescription:
        'XelisVault is the privacy-native financial platform of the XELIS ecosystem: confidential vaults, the xUSD stablecoin through the PSM, private swaps on VaultSwap and on-chain governance. Its community validation passed with 31 voters at 90% approval, and the bonding curve has been climbing ever since: 1,855 XEL of reserves against a 500 XEL seed, 93% of the way to graduation. When reserves cross 2,000 XEL (4× the seed), anyone can trigger the atomic migration to LaunchDEX — the seed becomes permanent protocol liquidity and every swap pays 0.30%, half to liquidity providers, pro-rata, exitable at any time. You can be the trade that graduates it.',
      creator: 'xelisvault',
      creatorAddress: 'xel1qvaultlaunch0seed00000000000000000000000000000000000000',
      website: 'https://xelisvault.xyz',
      hue: 38,
      avatar: '◆',
      status: 'bonding',
      directListing: false,
      proposedAt: nowMs - 12 * 24 * HOUR,
      curve: {
        reserves: 1_855,
        circulating: 26_000,
        seed: 500,
        feeBps: PROTOCOL.tradingFeeBps,
        teamBps: 1_200,
        ...curveHistory(1_855, 26_000, 42, 130),
        volume24h: 89_400,
        holders: 385,
      },
      trust: { up: 31, down: 3 },
      tags: ['DeFi', 'Privacy', 'Flagship'],
    },

    // ── Graduated + migrated: XPay — the LaunchDEX pool ──
    {
      id: 'xpay',
      name: 'XPay',
      ticker: 'XPAY',
      description: 'Confidential payment rails for the XELIS ecosystem: request XEL privately, settle instantly, no exposure of amounts.',
      longDescription:
        'XPay builds merchant-side payment rails on XELIS confidential transactions: invoices that never reveal amounts, streaming payments with per-block settlement, and a public payment-request registry. It graduated from the bonding curve eleven days ago after a 41-hour community vote (27 voters, 88% approval) and now trades on LaunchDEX. Its migration seed of 1,840 XEL is protocol-locked; providers have since deepened the pool to over 21,000 XEL. Every exit is ungated: providers can leave pro-rata at any time, even under an emergency pause.',
      creator: 'xpay_labs',
      creatorAddress: 'xel1qxpaylabs00000000000000000000000000000000000000000000',
      website: 'https://xpay.example',
      hue: 195,
      avatar: '⬡',
      status: 'graduated',
      directListing: false,
      proposedAt: nowMs - 24 * 24 * HOUR,
      pool: {
        id: 'xpay',
        xel: 21_300,
        token: 96_500,
        feeBps: PROTOCOL.dexFeeBps,
        adminSplitBps: PROTOCOL.dexAdminSplitBps,
        seedLocked: 1_840,
        totalParts: 21_300,
        withdrawableParts: 19_460,
        history: walkHistory(21_300 / 96_500, 110, 0.04, 77, 0.0009),
        histStart: -110,
        points: 0,
        volume24h: 12_400,
        fees24h: 37.2,
      },
      trust: { up: 118, down: 6 },
      tags: ['Payments', 'Privacy'],
    },

    // ── Bonding, deep: NovaPrivacy — the live trading demo ──
    {
      id: 'nova',
      name: 'NovaPrivacy',
      ticker: 'NOVA',
      description: 'Zero-metadata messaging and private identity proofs on XELIS. Curve is live: 500 XEL seed, graduation at 2,000 XEL.',
      longDescription:
        'NovaPrivacy ships zero-metadata messaging: sender-agnostic inboxes built on XELIS confidential transfers, private identity proofs with selective-disclosure credentials minted on-chain, and a dead-drop inbox primitive that never exposes the recipient. The project passed community validation with 23 voters at 87% approval, and its bonding curve has been live ever since. Trading fee is 0.50% on both sides; the team allocation is capped at 15% and vests linearly after graduation. When the curve reserves reach 2,000 XEL (4× the seed), anyone can trigger the atomic migration to LaunchDEX and the seed becomes permanent protocol liquidity.',
      creator: 'nova_core',
      creatorAddress: 'xel1qnovacore0000000000000000000000000000000000000000000000',
      website: 'https://nova.example',
      hue: 150,
      avatar: '✦',
      status: 'bonding',
      directListing: false,
      proposedAt: nowMs - 9 * 24 * HOUR,
      curve: {
        reserves: 1_362,
        circulating: 18_400,
        seed: 500,
        feeBps: PROTOCOL.tradingFeeBps,
        teamBps: 1_500,
        ...curveHistory(1_362, 18_400, 7),
        volume24h: 6_240,
        holders: 214,
      },
      trust: { up: 23, down: 3 },
      tags: ['Messaging', 'Identity', 'Privacy'],
    },

    // ── Bonding, early: CypherDAO ──
    {
      id: 'cyph',
      name: 'CypherDAO',
      ticker: 'CYPH',
      description: 'A private treasury and collective governance engine: pooled funds, confidential ballots, on-chain execution.',
      longDescription:
        'CypherDAO is a coordination layer for private collectives: pooled treasuries with per-member confidentiality, weighted voting that never reveals individual ballots, and on-chain execution of passed proposals. It cleared validation two days ago (21 voters, 81%) and is in the early phase of its bonding curve. The 500 XEL seed prices CYPH at 0.027 XEL; every trade pays the standard 0.50% curve fee, and graduation triggers at 2,000 XEL of reserves.',
      creator: 'cypherdao',
      creatorAddress: 'xel1qcypherdao000000000000000000000000000000000000000000000',
      hue: 95,
      avatar: '⬢',
      status: 'bonding',
      directListing: false,
      proposedAt: nowMs - 2 * 24 * HOUR,
      curve: {
        reserves: 812,
        circulating: 27_900,
        seed: 500,
        feeBps: PROTOCOL.tradingFeeBps,
        teamBps: 1_000,
        ...curveHistory(812, 27_900, 13),
        volume24h: 1_840,
        holders: 96,
      },
      trust: { up: 21, down: 4 },
      tags: ['DAO', 'Governance'],
    },

    // ── Validating, nearly accepted: Kleos — the countdown drama ──
    {
      id: 'kleos',
      name: 'Kleos',
      ticker: 'KLEOS',
      description: 'On-chain reputation that follows you across every XELIS dApp: sybil-proof, privacy-preserving, community-attested.',
      longDescription:
        'Kleos is a reputation layer for the XELIS ecosystem: sybil-proof attestations anchored to wallet history, privately provable (reveal your score to one dApp without exposing anything else), and portable across every application that opts in. Its validation window is about to close: 19 voters have weighed in so far, 17 support and 2 report, for 89% approval with a quorum of 20 required. If the final votes land well, KLEOS goes live on the bonding curve with a 500 XEL seed and a 12% team allocation vesting over 6 months.',
      creator: 'kleos_team',
      creatorAddress: 'xel1qkleosteam0000000000000000000000000000000000000000000000',
      hue: 45,
      avatar: '◈',
      status: 'validating',
      directListing: false,
      proposedAt: nowMs - 26 * HOUR,
      vote: {
        supporters: 17,
        reporters: 2,
        quorum: PROTOCOL.voteQuorum,
        approvalThreshold: PROTOCOL.voteApproval,
        deadlineTopo: startTopo + 124, // ≈ 4 minutes of demo time at 1×
        deadlineMs: 0, // engine sets this on start
        userVoted: null,
      },
      trust: { up: 0, down: 0 },
      tags: ['Reputation', 'Infrastructure'],
    },

    // ── Validating, early: Obsidian ──
    {
      id: 'obs',
      name: 'Obsidian',
      ticker: 'OBS',
      description: 'NFTs with encrypted payloads: private art, gated content, confidential provenance on XELIS.',
      longDescription:
        'Obsidian extends the XELIS confidential asset model to NFTs: encrypted payloads only the owner can open, transferable access keys, and provenance chains that stay private until their owner chooses to reveal them. The proposal is early in its validation window with 8 voters so far, 5 supporting. The community has plenty of time left on the clock (about 14 hours) to reach the 20-voter quorum at 80% approval.',
      creator: 'obsidian_art',
      creatorAddress: 'xel1qobsidianart00000000000000000000000000000000000000000000',
      hue: 268,
      avatar: '◇',
      status: 'validating',
      directListing: false,
      proposedAt: nowMs - 15 * HOUR,
      vote: {
        supporters: 5,
        reporters: 3,
        quorum: PROTOCOL.voteQuorum,
        approvalThreshold: PROTOCOL.voteApproval,
        deadlineTopo: startTopo + 25_200, // ≈ 14h of simulated time
        deadlineMs: 0,
        userVoted: null,
      },
      trust: { up: 0, down: 0 },
      tags: ['NFT', 'Content'],
    },

    // ── Rejected: MemeX — the refund path, shown honestly ──
    {
      id: 'memex',
      name: 'MemeX',
      ticker: 'MEMEX',
      description: 'REJECTED by the community at 34% approval. Liquidity 100% refunded, no asset created. This is the anti-rug filter working.',
      longDescription:
        'MemeX proposed itself as "the memecoin supercycle on XELIS". The community disagreed: 29 voters showed up, 19 reported it, and the proposal closed at 34% approval, far below the 80% bar. Every XEL of liquidity was refunded in full and no asset was ever created, exactly as designed. VaultLaunch does not host pre-mines, hidden team allocations or anonymous rugs: proposals that fail validation never touch a bonding curve.',
      creator: 'memex_dev',
      creatorAddress: 'xel1qmemexdev0000000000000000000000000000000000000000000000',
      hue: 15,
      avatar: '✕',
      status: 'rejected',
      directListing: false,
      proposedAt: nowMs - 5 * 24 * HOUR,
      trust: { up: 10, down: 19 },
      tags: ['Rejected', 'Case study'],
    },
  ]
}

/** Pre-seeded activity feed (most recent first). */
export function buildInitialActivity(nowMs: number): ActivityItem[] {
  const mk = (id: string, secsAgo: number, item: Omit<ActivityItem, 'id' | 'ts'>): ActivityItem => ({
    id,
    ts: nowMs - secsAgo * 1000,
    ...item,
  })
  return [
    mk('a1', 8, { kind: 'buy', projectId: 'vlt', actor: 'xel1q…7f2a', amountXel: 42, price: 0.0712 }),
    mk('a2', 34, { kind: 'swap', projectId: 'xpay', actor: 'xel1q…9c11', amountXel: 850, price: 0.2207 }),
    mk('a3', 61, { kind: 'buy', projectId: 'cyph', actor: 'xel1q…22b0', amountXel: 18, price: 0.0291 }),
    mk('a4', 97, { kind: 'vote', projectId: 'kleos', actor: 'xel1q…84de', note: 'voted SUPPORT · 17/2 (89%)' }),
    mk('a5', 142, { kind: 'sell', projectId: 'vlt', actor: 'xel1q…5fa3', amountXel: 21.5, price: 0.0715 }),
    mk('a6', 188, { kind: 'swap', projectId: 'xpay', actor: 'xel1q…01bb', amountXel: 120, price: 0.2201 }),
    mk('a7', 240, { kind: 'buy', projectId: 'vlt', actor: 'xel1q…cc77', amountXel: 96, price: 0.0709 }),
    mk('a8', 310, { kind: 'buy', projectId: 'vlt', actor: 'xel1q…d4e9', amountXel: 130, note: undefined, price: 0.0705 }),
    mk('a9', 420, { kind: 'sell', projectId: 'cyph', actor: 'xel1q…aa18', amountXel: 9.2, price: 0.0293 }),
    mk('a10', 505, { kind: 'buy', projectId: 'nova', actor: 'xel1q…3e60', amountXel: 130, price: 0.0733 }),
  ]
}

/** Demo actors for the simulated live feed. */
export const ACTORS = [
  'xel1q…7f2a', 'xel1q…9c11', 'xel1q…22b0', 'xel1q…84de', 'xel1q…5fa3',
  'xel1q…01bb', 'xel1q…cc77', 'xel1q…d4e9', 'xel1q…aa18', 'xel1q…3e60',
  'xel1q…b7c2', 'xel1q…e0f4', 'xel1q…48a1', 'xel1q…92d5', 'xel1q…6b38',
]
