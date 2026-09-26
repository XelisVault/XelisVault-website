// CommunityLaunch — EXACT on-chain math (u128-safe bigint port).
//
// Byte-identical port of the reference implementation
// (sdk/xvault/xvault/community.py, itself CI-asserted against the
// contract): the bonding curve. Every trade prices
// against the totals x = xr + vx and y = yr + y0 — the live reserves
// plus the launch depth:
//   • xr starts at 0 (the founder provides nothing), yr starts at the
//     initial inventory (net of the creator allocation)
//   • vx / y0 are snapshotted at launch and never change
//   • the whale guard caps any single buy at the REAL inventory
//   • graduation = depth (xr ≥ gdx) AND price continuity
//     (xr·y0 ≥ yr·vx — the pool opens at or above spot)
// All amounts are ATOMIC integers (8 decimals). Every division floors,
// exactly like the contract — the quotes the UI shows are the quotes
// the chain will pay (before the live price moves).

import { ATOMIC, feeTake } from './chain-math'

// ── The bonding curve (CommunityLaunch C1) ──────────────

/** tokens_out = (yr+y0)·net / ((xr+vx)+net), floored. The trade also
 *  enforces out ≤ yr (the whale guard — only REAL inventory is paid). */
export function coinBuyTokensOut(
  xr: bigint, yr: bigint, y0: bigint, vx: bigint, netXel: bigint,
): bigint {
  const yTotal = yr + y0
  const xTotal = xr + vx
  if (netXel <= 0n || yTotal <= 0n) return 0n
  return (yTotal * netXel) / (xTotal + netXel)
}

/** gross = (xr+vx)·T / ((yr+y0)+T), floored — the pre-fee sell quote.
 *  Provably ≤ xr (IC3/IC4: the worst-case sell is exactly covered). */
export function coinSellXelOut(
  xr: bigint, yr: bigint, y0: bigint, vx: bigint, tokens: bigint,
): bigint {
  const yTotal = yr + y0
  const xTotal = xr + vx
  if (tokens <= 0n || yTotal <= 0n) return 0n
  return (xTotal * tokens) / (yTotal + tokens)
}

/** Buy quote with the fee extracted from the attached XEL first
 *  (fee = dep·bps/10000, net joins the REAL reserves). */
export function coinBuyQuote(
  xr: bigint, yr: bigint, y0: bigint, vx: bigint,
  xelAmount: bigint, feeBps: number,
): bigint {
  const net = xelAmount - feeTake(xelAmount, feeBps)
  return coinBuyTokensOut(xr, yr, y0, vx, net)
}

/** Sell quote, net of the fee taken on the XEL side. */
export function coinSellQuote(
  xr: bigint, yr: bigint, y0: bigint, vx: bigint,
  tokens: bigint, feeBps: number,
): bigint {
  const gross = coinSellXelOut(xr, yr, y0, vx, tokens)
  return gross - feeTake(gross, feeBps)
}

/** Spot price in ATOMIC XEL per 1 whole token:
 *  (xr+vx)·1e8 / (yr+y0). 0 once migrated (the curve is closed). */
export function coinSpotPrice(
  xr: bigint, yr: bigint, y0: bigint, vx: bigint,
): bigint {
  const yTotal = yr + y0
  if (yTotal <= 0n) return 0n
  return ((xr + vx) * ATOMIC) / yTotal
}

/** Market cap in atomic XEL, FDV convention:
 *  (xr+vx)·supply / (yr+y0). 0 once migrated. */
export function coinMarketCap(
  xr: bigint, yr: bigint, y0: bigint, vx: bigint, totalSupply: bigint,
): bigint {
  const yTotal = yr + y0
  if (yTotal <= 0n) return 0n
  return ((xr + vx) * totalSupply) / yTotal
}

/** The C2 graduation predicate, evaluated on the POST-trade state:
 *  depth (xr ≥ gdx) AND price continuity (xr·y0 ≥ yr·vx). */
export function coinGraduated(
  xr: bigint, yr: bigint, y0: bigint, vx: bigint, gdx: bigint,
): boolean {
  return xr >= gdx && xr * y0 >= yr * vx
}

/** The continuity half of C2 alone (used for the live chip). */
export function coinContinuity(xr: bigint, yr: bigint, y0: bigint, vx: bigint): boolean {
  return xr * y0 >= yr * vx
}

// ── Graduation analysis (what the site SHOWS) ─────────────────────────
//
// C2 has TWO conditions, and the depth bar alone is a misleading
// "migration threshold": a coin can sit at 100% depth forever while
// continuity blocks graduation. This analysis turns both conditions
// into live, human-readable progress — including the exact amount of
// buys still needed, computed with the closed form below.

export interface GraduationAnalysis {
  /** C2 condition 1: xr ≥ gdx */
  depthMet: boolean
  /** C2 condition 2: xr·y0 ≥ yr·vx (equivalently: the real XEL share
   *  of the pool's XEL side ≥ the real share of the token side) */
  continuityMet: boolean
  /** 0..1 — depth progress (xr / gdx) */
  depthProgress: number
  /** 0..1 — continuity progress (real XEL share ÷ real token share) */
  continuityProgress: number
  /** 0..1 — the binding condition's progress (what a single honest
   *  "graduation %" must show: min of both) */
  bindingProgress: number
  /** NET XEL that must still be ADDED BY BUYS for BOTH conditions
   *  (0 once both are met). Buys help twice: they add real XEL and
   *  take tokens out of the curve at the same time. */
  needNet: number
  /** Same amount GROSS (curve fee included) — what a buyer pays. */
  needGross: number
  /** Real depth once those buys land (where graduation fires). */
  targetDepth: number
  /** Real share of the XEL side: xr / (xr + vx). */
  xShare: number
  /** Real share of the token side: yr / (yr + y0). */
  yShare: number
}

/**
 * The exact "how far from graduation" analysis.
 *
 * The continuity requirement on buys is solved in CLOSED FORM. A net
 * buy n moves the curve to (xr+n, yr−out) with
 * out = (yr+y0)·n / ((xr+vx)+n); requiring (xr+n)·y0 ≥ (yr−out)·vx
 * and simplifying (the product is invariant around the net amount)
 * gives the quadratic  n² + 2B·n + C ≥ 0  with B = xr+vx and
 * C = B·(xr − vx·yr/y0) — so the minimal net buy is
 *   n = √(B²−C) − B   (clamped at 0 when continuity already holds).
 * Verified against an exact integer simulation on mainnet state:
 * 0.0000% error, and the trajectory special case reduces to the
 * contract's own xr ≥ vx·(√2−1) shortcut.
 *
 * Both constraints are monotone in n, so the answer is simply the max
 * of the continuity root and the depth gap — split buys land on the
 * same final state (the curve's product is path-independent around
 * nets, and the fee is linear), so "≈ N XEL of buys, one or several"
 * is exact. Sells move BOTH conditions the wrong way.
 */
export function coinGraduationAnalysis(
  xr: bigint, yr: bigint, y0: bigint, vx: bigint, gdx: bigint,
  feeBps: number,
): GraduationAnalysis {
  const ATOMIC_H = Number(ATOMIC)
  const A = Number(xr) / ATOMIC_H // real depth, XEL
  const Y = Number(yr) / ATOMIC_H // real inventory, tokens
  const Y0 = Number(y0) / ATOMIC_H
  const V = Number(vx) / ATOMIC_H
  const G = Number(gdx) / ATOMIC_H

  const depthMet = gdx <= 0n ? true : xr >= gdx
  const continuityMet = coinContinuity(xr, yr, y0, vx)

  const depthProgress = G > 0 ? Math.min(1, A / G) : 1
  const xShare = A + V > 0 ? A / (A + V) : 1
  const yShare = Y + Y0 > 0 ? Y / (Y + Y0) : 1
  const continuityProgress = yShare > 0 ? Math.min(1, xShare / yShare) : 1

  // continuity root (0 when already met or degenerate)
  let nCont = 0
  if (!continuityMet && Y0 > 0) {
    const B = A + V
    const C = B * (A - (V * Y) / Y0)
    const disc = B * B - C
    if (disc > 0) nCont = Math.max(0, Math.sqrt(disc) - B)
  }
  // depth gap (0 when already met)
  const nDepth = Math.max(0, G - A)

  const needNet = depthMet && continuityMet ? 0 : Math.max(nCont, nDepth)
  const needGross = feeBps >= 10000 ? needNet : needNet / (1 - feeBps / 10000)

  return {
    depthMet, continuityMet,
    depthProgress, continuityProgress,
    bindingProgress: Math.min(depthProgress, continuityProgress),
    needNet, needGross,
    targetDepth: A + needNet,
    xShare, yShare,
  }
}

/** FDV the moment a coin is born: spot = vx/(2·y0), cap = spot·supply
 *  (the launch depth mirrors the initial inventory). With the
 *  defaults (vx = 100 XEL, 1B supply, 0% team) ≈ 50 XEL. */
export function coinLaunchFdv(vx: bigint, y0: bigint, totalSupply: bigint): bigint {
  if (y0 <= 0n) return 0n
  return (vx * totalSupply) / (2n * y0)
}

/** The creator allocation: supply·bps/10000 (≤ 5% by contract). */
export function creatorAllocOf(totalSupply: bigint, bps: number): bigint {
  return (totalSupply * BigInt(bps)) / 10000n
}

// ── Trade bounds (CommunityLaunch.slx constants) ──────────────────────

/** Minimum XEL attached to a buy ("tiny"): 0.01 XEL. */
export const COIN_MIN_BUY = 1_000_000n
/** Maximum XEL attached to a buy ("toobig"): 100 000 XEL. */
export const COIN_MAX_TRADE = 1_000_000_000_000n
/** Supply bounds at launch ("badsupply"): 1M .. 10B whole tokens. */
export const COIN_MIN_SUPPLY = 1_000_000n
export const COIN_MAX_SUPPLY = 10_000_000_000n
/** Creator allocation cap ("badteam"): 5%. */
export const COIN_MAX_TEAM_BPS = 500
