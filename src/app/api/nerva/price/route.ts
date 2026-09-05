import { NextResponse } from 'next/server'

/**
 * GET /api/nerva/price — live XNV market price, aggregated server-side.
 *
 * Sources, in order:
 *   1. CoinGecko   — direct EUR/USD/BTC quotes for "nerva"
 *   2. CoinPaprika — USD quote, converted to EUR with the ECB reference
 *                    rate (frankfurter.dev, no key, no tracking)
 *
 * The result is cached in module memory for 60 s and served stale (up to
 * 30 min, flagged `stale: true`) when every source is unreachable — a POS
 * should keep working through an exchange outage. Nothing is persisted.
 */

export const dynamic = 'force-dynamic'

interface PriceBody {
  source: string
  eur: number
  usd: number | null
  btc: number | null
  updatedAt: number
  stale: boolean
}

const FRESH_MS = 60_000
const STALE_MS = 30 * 60_000
let cache: PriceBody | null = null
let fetchedAt = 0
let inflight: Promise<PriceBody> | null = null

async function fetchJson(url: string, timeoutMs = 5_000): Promise<Record<string, unknown>> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: 'application/json', 'user-agent': 'XelisVault/1.0 (+https://xelisvault.network)' },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as Record<string, unknown>
  } finally {
    clearTimeout(t)
  }
}

async function fromCoinGecko(): Promise<PriceBody> {
  const j = await fetchJson(
    'https://api.coingecko.com/api/v3/simple/price?ids=nerva&vs_currencies=eur,usd,btc',
  )
  const nerva = j.nerva as Record<string, unknown> | undefined
  const eur = Number(nerva?.eur)
  if (!Number.isFinite(eur) || eur <= 0) throw new Error('coingecko: no eur quote')
  const usd = Number(nerva?.usd)
  const btc = Number(nerva?.btc)
  return {
    source: 'CoinGecko',
    eur,
    usd: Number.isFinite(usd) && usd > 0 ? usd : null,
    btc: Number.isFinite(btc) && btc > 0 ? btc : null,
    updatedAt: Date.now(),
    stale: false,
  }
}

async function fromCoinPaprika(): Promise<PriceBody> {
  const [ticker, fx] = await Promise.all([
    fetchJson('https://api.coinpaprika.com/v1/tickers/xnv-nerva'),
    fetchJson('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR'),
  ])
  const usd = Number((ticker.quotes as Record<string, Record<string, unknown>> | undefined)?.USD?.price)
  const eurRate = Number((fx.rates as Record<string, unknown> | undefined)?.EUR)
  if (!Number.isFinite(usd) || usd <= 0) throw new Error('coinpaprika: no usd quote')
  if (!Number.isFinite(eurRate) || eurRate <= 0) throw new Error('no usd/eur fx rate')
  return {
    source: 'CoinPaprika · ECB rate',
    eur: usd * eurRate,
    usd,
    btc: null,
    updatedAt: Date.now(),
    stale: false,
  }
}

async function load(): Promise<PriceBody> {
  if (inflight) return inflight
  inflight = (async () => {
    for (const src of [fromCoinGecko, fromCoinPaprika]) {
      try {
        const body = await src()
        cache = body
        fetchedAt = Date.now()
        return body
      } catch {
        /* try the next source */
      }
    }
    if (cache && Date.now() - fetchedAt < STALE_MS) {
      return { ...cache, stale: true }
    }
    throw new Error('all price sources unreachable')
  })()
  try {
    return await inflight
  } finally {
    inflight = null
  }
}

export async function GET() {
  if (cache && Date.now() - fetchedAt < FRESH_MS) {
    return NextResponse.json(cache, {
      headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=60' },
    })
  }
  try {
    const body = await load()
    return NextResponse.json(body, {
      headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=60' },
    })
  } catch {
    return NextResponse.json(
      { error: 'price unavailable' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    )
  }
}
