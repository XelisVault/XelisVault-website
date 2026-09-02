'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Activity, Pickaxe, Layers, Coins } from 'lucide-react'
import { getNetworkInfo } from '@/lib/xelis/rpc'
import { getOracleAggregate, getMinerStats } from '@/lib/xelis/reads'
import { useDemo } from '@/lib/demo-store'

/**
 * Live testnet strip for the landing hero — real on-chain numbers.
 * The protocol already runs on the public XELIS testnet before the official
 * launch: showing live numbers builds trust and bridges the landing to the app.
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
            staked: (miner?.totalStaked ?? 0n) / 100000000n,
          })
        }
      } catch { /* stay hidden until data arrives */ }
    }
    load()
    const id = setInterval(load, 20000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const items = [
    { icon: Activity, label: 'Topoheight', value: stats ? stats.topoheight.toLocaleString() : null },
    { icon: Coins, label: 'XEL/USD', value: stats ? `$${stats.price.toFixed(4)}` : null },
    { icon: Pickaxe, label: 'Miners', value: stats ? String(stats.miners) : null },
    { icon: Layers, label: 'VLT staked', value: stats ? `${Number(stats.staked).toLocaleString()}` : null },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 1.2 }}
      className="flex flex-col items-center gap-2.5"
    >
      <motion.button
        onClick={() => openApp('dashboard')}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="group flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 rounded-full border border-foreground/10 bg-card/70 backdrop-blur-sm px-5 py-2.5 max-w-xl mx-auto shadow-maison"
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
        <span className="w-px h-3.5 bg-foreground/10 hidden sm:block" />
        {items.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-muted-foreground/80 hidden sm:inline">
              {item.label}
            </span>
            <span className="text-[11px] font-mono font-semibold text-foreground tabular-nums">
              {item.value ?? '···'}
            </span>
          </span>
        ))}
        <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.14em] text-vault opacity-70 group-hover:opacity-100 transition-opacity">
          open
          <ArrowUpRight className="w-3 h-3" />
        </span>
      </motion.button>
      <a
        href="/explorer"
        className="group/obs inline-flex items-center gap-2 rounded-full border border-vault/25 bg-vault/6 hover:bg-vault/12 hover:border-vault/45 px-4 py-1.5 text-[9px] font-mono uppercase tracking-[0.16em] text-vault transition-all"
      >
        <span className="relative flex w-1.5 h-1.5">
          <span className="absolute inline-flex w-full h-full rounded-full bg-vault opacity-60 animate-ping" />
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-vault" />
        </span>
        New · The Observatory — live BlockDAG explorer
        <ArrowUpRight className="w-3 h-3 opacity-60 group-hover/obs:opacity-100 transition-opacity" />
      </a>
    </motion.div>
  )
}
