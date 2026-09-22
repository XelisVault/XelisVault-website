// VaultLaunch — integer-exact bonding curve & LaunchDEX math.
// Mirrors the on-chain formulas from LAUNCHPAD.md / DEX.md:
//
//   BUY :  fee = X * fee_bps / 10000 ; net = X - fee
//          out  = C * net / (R + net)                    (C = circulating, R = reserves)
//   SELL :  gross = R * T / (C + T)
//          fee   = gross * fee_bps / 10000 ; out = gross - fee
//   PRICE:  R / C   (the seed sets the initial price)
//   GRADUATION: reserves ≥ seed × 4  →  migrate() seeds a LaunchDEX pool
//
// The on-chain contracts compute in u128 integer arithmetic; the demo uses
// floats but keeps the exact same functional shapes so quotes match the real
// curve to sub-0.1%.

import { PROTOCOL } from './types'

export interface BuyQuote {
  /** Fee in XEL. */
  fee: number
  /** XEL actually entering the curve. */
  net: number
  /** Tokens received. */
  out: number
  /** Price after the buy. */
  priceAfter: number
  /** Average execution price. */
  avgPrice: number
  /** Price impact in %. */
  impactPct: number
}

export interface SellQuote {
  /** Gross XEL out before fee. */
  gross: number
  fee: number
  /** XEL received. */
  out: number
  priceAfter: number
  avgPrice: number
  impactPct: number
}

export function curvePrice(reserves: number, circulating: number): number {
  if (circulating <= 0) return 0
  return reserves / circulating
}

export function quoteBuy(xelIn: number, reserves: number, circulating: number, feeBps: number = PROTOCOL.tradingFeeBps): BuyQuote {
  const fee = (xelIn * feeBps) / 10_000
  const net = xelIn - fee
  const out = (circulating * net) / (reserves + net)
  const priceBefore = curvePrice(reserves, circulating)
  const priceAfter = curvePrice(reserves + net, circulating - out)
  return {
    fee,
    net,
    out,
    priceAfter,
    avgPrice: out > 0 ? xelIn / out : 0,
    impactPct: priceBefore > 0 ? ((priceAfter - priceBefore) / priceBefore) * 100 : 0,
  }
}

export function quoteSell(tokensIn: number, reserves: number, circulating: number, feeBps: number = PROTOCOL.tradingFeeBps): SellQuote {
  const gross = (reserves * tokensIn) / (circulating + tokensIn)
  const fee = (gross * feeBps) / 10_000
  const out = gross - fee
  const priceBefore = curvePrice(reserves, circulating)
  const priceAfter = curvePrice(reserves - gross, circulating + tokensIn)
  return {
    gross,
    fee,
    out,
    priceAfter,
    avgPrice: tokensIn > 0 ? out / tokensIn : 0,
    impactPct: priceBefore > 0 ? ((priceAfter - priceBefore) / priceBefore) * 100 : 0,
  }
}

/** Apply a buy to curve state (mutation-free). */
export function applyBuy(state: { reserves: number; circulating: number }, xelIn: number, feeBps: number = PROTOCOL.tradingFeeBps) {
  const q = quoteBuy(xelIn, state.reserves, state.circulating, feeBps)
  return {
    reserves: state.reserves + q.net,
    circulating: state.circulating - q.out,
    quote: q,
  }
}

/** Apply a sell to curve state (mutation-free). */
export function applySell(state: { reserves: number; circulating: number }, tokensIn: number, feeBps: number = PROTOCOL.tradingFeeBps) {
  const q = quoteSell(tokensIn, state.reserves, state.circulating, feeBps)
  return {
    reserves: state.reserves - q.gross,
    circulating: state.circulating + tokensIn,
    quote: q,
  }
}

/** Graduation check: reserves ≥ seed × multiplier (default ×4). */
export function isGraduated(reserves: number, seed: number, multiplier: number = PROTOCOL.graduationMultiplier): boolean {
  return reserves >= seed * multiplier
}

/** Progress 0..1 toward graduation. */
export function graduationProgress(reserves: number, seed: number, multiplier: number = PROTOCOL.graduationMultiplier): number {
  const target = seed * multiplier
  return Math.max(0, Math.min(1, reserves / target))
}

/** Vote passes: ≥ quorum voters AND ≥ approval%. */
export function votePasses(voters: number, approval: number): boolean {
  return voters >= PROTOCOL.voteQuorum && approval >= PROTOCOL.voteApproval
}

// ─── LaunchDEX (constant-product AMM, 30 bps) ─────────────────────

export function poolPrice(pool: { xel: number; token: number }): number {
  if (pool.token <= 0) return 0
  return pool.xel / pool.token
}

export function quoteDexSwap(xelIn: number, pool: { xel: number; token: number }, feeBps: number = PROTOCOL.dexFeeBps) {
  const fee = (xelIn * feeBps) / 10_000
  const net = xelIn - fee
  const out = (pool.token * net) / (pool.xel + net)
  const priceBefore = poolPrice(pool)
  const priceAfter = poolPrice({ xel: pool.xel + net, token: pool.token - out })
  return {
    fee, net, out,
    priceAfter,
    impactPct: priceBefore > 0 ? ((priceAfter - priceBefore) / priceBefore) * 100 : 0,
  }
}

export function quoteDexSwapToXel(tokensIn: number, pool: { xel: number; token: number }, feeBps: number = PROTOCOL.dexFeeBps) {
  const gross = (pool.xel * tokensIn) / (pool.token + tokensIn)
  const fee = (gross * feeBps) / 10_000
  const out = gross - fee
  return { gross, fee, out }
}

// ─── Formatting helpers ───────────────────────────────────────────

export function fmtXel(n: number, maxDecimals = 2): string {
  if (!isFinite(n)) return '0'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 10_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('en-US', { maximumFractionDigits: maxDecimals })
}

export function fmtPrice(n: number): string {
  if (!isFinite(n) || n === 0) return '0.00'
  if (n < 0.001) return n.toExponential(2)
  if (n < 1) return n.toFixed(5)
  return n.toFixed(3)
}

export function fmtPct(n: number, digits = 2): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`
}

export function shortAddr(addr: string): string {
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-5)}`
}
