// VaultLaunch — EXACT on-chain math (u128-safe bigint port).
//
// Byte-identical port of the reference implementations
// (sdk/xvault/xvault/launchpad.py + dex.py), which are themselves
// CI-asserted against the contracts. All amounts are ATOMIC integers
// (8 decimals: 1 XEL = 1 token = 100_000_000). Every division floors,
// exactly like the contract — the quotes the UI shows are the quotes
// the chain will pay (before the live price moves).

export const ATOMIC = 100_000_000n

/** Fee on `amount` at `bps`, floored in favour of the contract. */
export function feeTake(amount: bigint, bps: number): bigint {
  return (amount * BigInt(bps)) / 10000n
}

// ── Bonding curve (VaultLaunch) ──────────────────────────────────────

/** tokens_out = C · net / (R + net), floored. */
export function buyTokensOut(reserves: bigint, curveSupply: bigint, netXel: bigint): bigint {
  if (netXel <= 0n || curveSupply <= 0n) return 0n
  return (curveSupply * netXel) / (reserves + netXel)
}

/** gross = R · T / (C + T), floored (before fee). */
export function sellXelOut(reserves: bigint, curveSupply: bigint, tokens: bigint): bigint {
  if (tokens <= 0n || curveSupply <= 0n) return 0n
  return (reserves * tokens) / (curveSupply + tokens)
}

/** Tokens received for an attached XEL amount (fee included). */
export function curveBuyQuote(reserves: bigint, curveSupply: bigint, xelAmount: bigint, feeBps: number): bigint {
  const net = xelAmount - feeTake(xelAmount, feeBps)
  return buyTokensOut(reserves, curveSupply, net)
}

/** XEL received (net of fee) for selling tokens. */
export function curveSellQuote(reserves: bigint, curveSupply: bigint, tokens: bigint, feeBps: number): bigint {
  const gross = sellXelOut(reserves, curveSupply, tokens)
  return gross - feeTake(gross, feeBps)
}

/** Spot price in ATOMIC XEL per 1 whole token: R · 1e8 / C. */
export function curveSpotPrice(reserves: bigint, curveSupply: bigint): bigint {
  if (curveSupply <= 0n) return 0n
  return (reserves * ATOMIC) / curveSupply
}

/** Team allocation of a supply at bps. */
export function teamAllocOf(totalSupply: bigint, teamBps: number): bigint {
  return (totalSupply * BigInt(teamBps)) / 10000n
}

/** Effective curve fee: graduated rate once graduated (≤ bonding rate). */
export function currentFeeBps(graduated: boolean, bondingBps: number, graduatedBps: number): number {
  return graduated ? Math.min(graduatedBps, bondingBps) : bondingBps
}

/**
 * Market cap in atomic XEL: R · circulating / C where circulating
 * excludes the curve inventory and the unpaid team escrow.
 */
export function curveMarketCap(
  reserves: bigint, curveSupply: bigint, totalSupply: bigint,
  teamBps: number, teamPaid: bigint,
): bigint {
  if (curveSupply <= 0n) return 0n
  const teamRem = teamAllocOf(totalSupply, teamBps) - teamPaid
  const circulating = totalSupply - curveSupply - teamRem
  if (circulating <= 0n) return 0n
  return (reserves * circulating) / curveSupply
}

// ── LaunchDEX (constant-product AMM) ─────────────────────────────────

/** Buy quote: out = y · net / (x + net), floored. */
export function dexXelToTokens(xelReserve: bigint, tokenReserve: bigint, xelIn: bigint, feeBps: number): bigint {
  const net = xelIn - feeTake(xelIn, feeBps)
  if (net <= 0n || tokenReserve <= 0n) return 0n
  return (tokenReserve * net) / (xelReserve + net)
}

/** Sell quote: out = x · net / (y + net), floored. */
export function dexTokensToXel(xelReserve: bigint, tokenReserve: bigint, tokensIn: bigint, feeBps: number): bigint {
  const net = tokensIn - feeTake(tokensIn, feeBps)
  if (net <= 0n || xelReserve <= 0n) return 0n
  return (xelReserve * net) / (tokenReserve + net)
}

/** Spot price in atomic XEL per 1 whole token: x · 1e8 / y. */
export function dexSpotPrice(xelReserve: bigint, tokenReserve: bigint): bigint {
  if (tokenReserve <= 0n) return 0n
  return (xelReserve * ATOMIC) / tokenReserve
}

/** Post-migration market cap: (x / y) · circulating, atomic XEL. */
export function dexMarketCap(
  xelReserve: bigint, tokenReserve: bigint,
  totalSupply: bigint, teamRemaining: bigint,
): bigint {
  if (tokenReserve <= 0n) return 0n
  const circulating = totalSupply - tokenReserve - teamRemaining
  if (circulating <= 0n) return 0n
  return (xelReserve * circulating) / tokenReserve
}

/** X7 price-neutral fit: what add_liquidity takes and what it refunds. */
export function liquidityFit(
  xelReserve: bigint, tokenReserve: bigint, xelIn: bigint, tokIn: bigint,
): { xelEff: bigint; tokEff: bigint; xelBack: bigint; tokBack: bigint } {
  const needTok = (tokenReserve * xelIn) / xelReserve
  let xelEff: bigint, tokEff: bigint
  if (tokIn >= needTok) {
    xelEff = xelIn
    tokEff = needTok
  } else {
    const needXel = (xelReserve * tokIn) / tokenReserve
    xelEff = needXel
    tokEff = tokIn
  }
  return { xelEff, tokEff, xelBack: xelIn - xelEff, tokBack: tokIn - tokEff }
}

/** X12 pro-rata exit quote: parts · reserve / totalDepth, floored both sides. */
export function removeOuts(
  xelReserve: bigint, tokenReserve: bigint, parts: bigint, totalDepth: bigint,
): { xel: bigint; tokens: bigint } {
  if (totalDepth <= 0n || parts <= 0n) return { xel: 0n, tokens: 0n }
  return {
    xel: (parts * xelReserve) / totalDepth,
    tokens: (parts * tokenReserve) / totalDepth,
  }
}

/** Apply a slippage tolerance to a quote (min_out value). */
export function withSlippage(out: bigint, slippageBps: number): bigint {
  return out - (out * BigInt(slippageBps)) / 10000n
}

/** Human-readable float from atomic bigint. */
export function toHuman(atomic: bigint | null | undefined): number {
  if (atomic == null) return 0
  return Number(atomic) / Number(ATOMIC)
}

/** Atomic bigint from a human amount (float-safe: via string). */
export function toAtomic(human: number | string): bigint {
  const s = typeof human === 'number' ? human.toFixed(8) : human
  const neg = s.startsWith('-')
  const clean = neg ? s.slice(1) : s
  const [int, frac = ''] = clean.split('.')
  const fracPadded = (frac + '0'.repeat(8)).slice(0, 8)
  const v = BigInt((int || '0') + fracPadded)
  return neg ? -v : v
}

/** Format an atomic bigint with fixed decimals, trimming zeros. */
export function fmtAtomic(atomic: bigint, maxFrac = 8): string {
  const neg = atomic < 0n
  const abs = neg ? -atomic : atomic
  const int = abs / ATOMIC
  const frac = (abs % ATOMIC).toString().padStart(8, '0').slice(0, maxFrac)
  const fracTrimmed = frac.replace(/0+$/, '')
  return `${neg ? '-' : ''}${int.toString()}${fracTrimmed ? '.' + fracTrimmed : ''}`
}
