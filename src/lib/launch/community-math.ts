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
