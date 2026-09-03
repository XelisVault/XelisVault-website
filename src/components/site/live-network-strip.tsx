'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getNetworkInfo } from '@/lib/xelis/rpc'
import { getOracleAggregate, getMinerStats } from '@/lib/xelis/reads'
import { useDemo } from '@/lib/demo-store'

/**
 * Live testnet figures for the landing hero.
 * Rendered as a discreet editorial ticker line (mono small caps, hairline
 * separators) rather than a boxed pill: the numbers speak for themselves.
 */
export function LiveNetworkStrip() {
  const openApp = useDemo((s) => s.openApp)
  const [stats, setStats] = useState<{
    topoheight: number
    price: number
    miners: number
    staked: number
  } | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const [net, oracle, miner] = await Promise.all([
          getNetworkInfo().catch(() => null),
          getOracleAggregate(0).catch(() => null),
          getMinerStats().catch(() => null),
        ])
        if (!alive) return
        if (net || oracle || miner) {
          setStats({
            topoheight: net?.topoheight ?? 0,
            price: oracle?.priceUsd ?? 0,
            miners: miner?.count ?? 0,
            staked: Number((miner?.totalStaked ?? 0n) / 100000000n),
          })
        }
      } catch { /* stay hidden until data arrives */ }
    }
    load()
    const id = setInterval(load, 20000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const fmt = (v: number | null, f: (n: number) => string) =>
    v === null ? '' : f(v)

  const parts = [
    stats && { label: 'Topoheight', value: stats.topoheight.toLocaleString() },
    stats && stats.price > 0 && { label: 'XEL/USD', value: `$${stats.price.toFixed(4)}` },
    stats && { label: 'Miners', value: String(stats.miners) },
    stats && { label: 'VLT staked', value: Number(stats.staked).toLocaleString() },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 1.2 }}
      className="flex flex-col items-center gap-2.5"
    >
      {/* The ticker line: live dot + mono figures, hairline separators */}
      <button
        onClick={() => openApp('dashboard')}
        className="group flex flex-wrap items-center justify-center gap-x-3 gap-y-1 max-w-xl"
        aria-label="Open the live dashboard"
      >
        <span className="flex items-center gap-2 shrink-0">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Live testnet
          </span>
        </span>
        {parts.map((p, i) => (
          <span key={p.label} className="flex items-center gap-3">
            {i > 0 && <span className="w-px h-3 bg-foreground/15 hidden sm:block" />}
            <span className="flex items-baseline gap-1.5">
              <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-muted-foreground/80 hidden sm:inline">
                {p.label}
              </span>
              <span className="text-[11px] font-mono font-semibold text-foreground/90 tabular-nums">
                {p.value}
              </span>
            </span>
          </span>
        ))}
      </button>

      {/* The Observatory: a quiet small-caps editorial link */}
      <a
        href="/explorer"
        className="group/obs inline-flex items-baseline gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground/80 hover:text-vault transition-colors"
      >
        <span className="border-b border-foreground/15 group-hover/obs:border-vault/60 pb-0.5 transition-colors">
          The Observatory · live BlockDAG explorer
        </span>
      </a>
    </motion.div>
  )
}
