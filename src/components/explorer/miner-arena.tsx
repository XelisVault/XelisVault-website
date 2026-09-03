'use client'

// Miner Arena — who is building the chain right now.
// Aggregates the live block window (bootstrap 120 + WS pushes) by miner:
// blocks found, rewards earned, last seen. Bars race live as blocks land.

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Crown, Pickaxe } from 'lucide-react'
import { XelisBlock, fmtXEL, shortHash } from '@/lib/xelis/explorer'
import { Identicon, Odometer } from './fx'

const RANK_STYLES = [
  { medal: 'text-amber-300', bar: 'from-amber-400/80 to-amber-200' },
  { medal: 'text-slate-300', bar: 'from-slate-400/70 to-slate-200' },
  { medal: 'text-orange-400', bar: 'from-orange-500/60 to-orange-300' },
]

export function MinerArena({
  blocks,
  onSelectAccount,
}: {
  blocks: XelisBlock[]
  onSelectAccount: (address: string) => void
}) {
  const { rows, others, unique, totalBlocks, totalReward } = useMemo(() => {
    const byMiner = new Map<string, { count: number; reward: number; lastTopo: number; lastAt: number }>()
    for (const b of blocks) {
      const rec = byMiner.get(b.miner) ?? { count: 0, reward: 0, lastTopo: 0, lastAt: 0 }
      rec.count++
      rec.reward += b.miner_reward ?? 0
      if (b.topoheight > rec.lastTopo) {
        rec.lastTopo = b.topoheight
        rec.lastAt = b.timestamp
      }
      byMiner.set(b.miner, rec)
    }
    const sorted = [...byMiner.entries()].sort((a, b) => b[1].count - a[1].count)
    const top = sorted.slice(0, 6)
    const rest = sorted.slice(6)
    const othersAgg = rest.reduce(
      (acc, [, r]) => ({ count: acc.count + r.count, reward: acc.reward + r.reward }),
      { count: 0, reward: 0 }
    )
    const total = blocks.length || 1
    const sumReward = blocks.reduce((s, b) => s + (b.miner_reward ?? 0), 0)
    return {
      rows: top.map(([miner, r]) => ({ miner, ...r, share: (r.count / total) * 100 })),
      others: { ...othersAgg, count: rest.length },
      unique: sorted.length,
      totalBlocks: blocks.length,
      totalReward: sumReward,
    }
  }, [blocks])

  const freshThreshold = Date.now() - 60_000

  return (
    <div className="rounded-2xl glass-panel p-4 md:p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          <Pickaxe className="w-3.5 h-3.5 text-vault/80" />
          Miner Arena
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/60">
          {unique} mining · last {totalBlocks} blocks
        </span>
      </div>

      <div className="space-y-1.5 flex-1">
        {rows.length === 0 && (
          <div className="flex items-center justify-center h-32 text-[11px] font-mono text-muted-foreground/60">
            waiting for blocks…
          </div>
        )}
        {rows.map((r, i) => {
          const style = RANK_STYLES[i] ?? { medal: 'text-muted-foreground', bar: 'from-vault/50 to-vault/25' }
          const isFresh = r.lastAt > freshThreshold
          return (
            <motion.button
              key={r.miner}
              layout
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 26 }}
              onClick={() => onSelectAccount(r.miner)}
              className="w-full text-left rounded-xl border border-border/60 bg-card/40 hover:bg-card/80 hover:border-vault/40 transition-colors px-3 py-2 group"
              title={`Inspect ${shortHash(r.miner, 16, 10)}, rewards are public, balances stay sealed`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-4 text-center font-mono text-[11px] font-bold ${style.medal}`}>
                  {i === 0 ? <Crown className="w-3.5 h-3.5 inline" /> : i + 1}
                </span>
                <Identicon seed={r.miner} size={24} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-semibold truncate">{shortHash(r.miner, 10, 6)}</span>
                    {isFresh && (
                      <motion.span
                        animate={{ opacity: [0.35, 1, 0.35] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                        className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                        title={`found #${r.lastTopo}`}
                      />
                    )}
                  </div>
                  {/* racing bar */}
                  <div className="mt-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${style.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${r.share}%` }}
                      transition={{ type: 'spring', stiffness: 90, damping: 20 }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-[12px] font-bold text-vault leading-none">
                    <Odometer value={r.count} />
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground/70 mt-0.5">{r.share.toFixed(0)}%</div>
                </div>
                <div className="text-right shrink-0 hidden sm:block w-[86px]">
                  <div className="font-mono text-[11px] text-foreground/85 leading-none">+{fmtXEL(r.reward, { trim: true })}</div>
                  <div className="font-mono text-[9px] text-muted-foreground/70 mt-0.5">XET earned</div>
                </div>
              </div>
            </motion.button>
          )
        })}
        {others.count > 0 && (
          <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-mono text-muted-foreground/70">
            <span>+ {others.count} more miners</span>
            <span>{fmtXEL(totalReward, { trim: true })} XET rewards in window</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-[9px] font-mono text-muted-foreground/60">
        <span>rewards are public · balances stay sealed</span>
        <span>click a miner to inspect</span>
      </div>
    </div>
  )
}
