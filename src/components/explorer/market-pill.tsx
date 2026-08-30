'use client'

// Market Pulse — optional CoinGecko price feed for XEL.
// The blockchain data on this page needs no API key; this is the single
// external call, and it degrades gracefully when CoinGecko rate-limits us.

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, LineChart } from 'lucide-react'

interface MarketData {
  price: number
  change24h: number | null
  marketCap: number | null
}

const URL = 'https://api.coingecko.com/api/v3/simple/price?ids=xelis&vs_currencies=usd&include_24hr_change=true&include_market_cap=true'
const REFRESH_MS = 90_000

export function MarketPulse() {
  const [data, setData] = useState<MarketData | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'offline'>('loading')

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const fetchPrice = async () => {
      try {
        const res = await fetch(URL, { signal: AbortSignal.timeout(8000) })
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        const p = json?.xelis
        if (cancelled) return
        if (p?.usd !== undefined) {
          setData({ price: p.usd, change24h: p.usd_24h_change ?? null, marketCap: p.usd_market_cap ?? null })
          setState('ok')
        } else {
          throw new Error('no data')
        }
      } catch {
        if (!cancelled) setState((s) => (s === 'ok' ? 'ok' : 'offline'))
      } finally {
        if (!cancelled) timer = setTimeout(fetchPrice, REFRESH_MS)
      }
    }
    fetchPrice()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  if (state === 'offline') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-3 py-1 text-[10px] font-mono text-muted-foreground/70"
        title="CoinGecko feed unavailable — blockchain data below is unaffected (direct node access)"
      >
        <LineChart className="w-3 h-3" />
        market feed offline · chain data unaffected
      </span>
    )
  }

  if (state === 'loading' || !data) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-3 py-1 text-[10px] font-mono text-muted-foreground/60">
        <span className="w-3 h-3 rounded-full border-2 border-vault/40 border-t-vault animate-spin" />
        fetching XEL market…
      </span>
    )
  }

  const up = (data.change24h ?? 0) >= 0
  const capLabel =
    data.marketCap && data.marketCap > 0
      ? `market cap $${data.marketCap >= 1e6 ? `${(data.marketCap / 1e6).toFixed(2)}M` : `${(data.marketCap / 1e3).toFixed(1)}K`}`
      : null

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-vault/30 bg-vault/10 px-3 py-1 text-[10px] font-mono"
      title={`XEL/USD via CoinGecko${capLabel ? ` · ${capLabel}` : ''}`}
    >
      <span className="text-vault font-semibold">XEL</span>
      <span className="text-foreground/90">${data.price < 1 ? data.price.toFixed(4) : data.price.toFixed(2)}</span>
      {data.change24h !== null && (
        <span className={`flex items-center gap-0.5 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {up ? '+' : ''}
          {data.change24h.toFixed(1)}%
        </span>
      )}
    </span>
  )
}
