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
      className="flex flex-col items-center gap-3"
    >
      <motion.button
        onClick={() => openApp('dashboard')}
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.985 }}
        className="group flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl glass-panel px-6 py-3.5 max-w-2xl mx-auto"
      >
        <span className="flex items-center gap-2 shrink-0">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-emerald-400">
            Live testnet
          </span>
        </span>
        {items.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <item.icon className="w-3 h-3 text-vault/70 shrink-0" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 hidden sm:inline">
              {item.label}
            </span>
            <span className="text-xs font-mono font-semibold text-foreground tabular-nums">
              {item.value ?? '···'}
            </span>
          </span>
        ))}
        <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-vault opacity-60 group-hover:opacity-100 transition-opacity">
          open
          <ArrowUpRight className="w-3 h-3" />
        </span>
      </motion.button>
      <a
        href="/explorer"
        className="group/obs inline-flex items-center gap-2 rounded-full border border-vault/25 bg-vault/5 hover:bg-vault/15 hover:border-vault/50 px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-vault/90 transition-all"
      >
        <span className="relative flex w-1.5 h-1.5">
          <span className="absolute inline-flex w-full h-full rounded-full bg-vault opacity-60 animate-ping" />
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-vault" />
        </span>
        New · The Observatory — live BlockDAG explorer
        <ArrowUpRight className="w-3 h-3 opacity-60 group-hover/obs:opacity-100 transition-opacity" />
      </a>
      <p className="text-[10px] font-mono text-muted-foreground/50">
        The protocol is already running — {stats ? 'numbers update live' : 'connecting to the public node'} · official launch August 30
      </p>
    </motion.div>
  )
}
