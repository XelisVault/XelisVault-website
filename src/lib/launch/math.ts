// VaultLaunch — formatting & display helpers.
//
// The QUOTES now live in chain-math.ts (bigint, integer-exact — the same
// formulas the contracts run). This module keeps the pure display
// helpers every view uses.

export function curvePrice(reserves: number, circulating: number): number {
  if (circulating <= 0) return 0
  return reserves / circulating
}

export function poolPrice(pool: { xel: number; token: number }): number {
  if (pool.token <= 0) return 0
  return pool.xel / pool.token
}

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
