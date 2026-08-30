'use client'

// Block Stream — live feed of arriving blocks.
// Each card slides in when the WebSocket pushes a new_block event.

import { AnimatePresence, motion } from 'framer-motion'
import { Flame, Zap, Radio } from 'lucide-react'
import { XelisBlock, fmtXEL, fmtAge, shortHash } from '@/lib/xelis/explorer'
import { Identicon } from './fx'

const TYPE_STYLE: Record<string, string> = {
  Normal: 'text-vault bg-vault/10 border-vault/30',
  Sync: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/30',
  Side: 'text-amber-300 bg-amber-400/10 border-amber-400/30',
  Orphaned: 'text-red-300 bg-red-400/10 border-red-400/30',
}

export function BlockFeed({
  blocks,
  onSelect,
  witnessed,
}: {
  blocks: XelisBlock[]
  onSelect: (b: XelisBlock) => void
  witnessed: number
}) {
  const visible = blocks.slice(0, 11)

  return (
    <div className="rounded-2xl glass-panel flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between px-4 md:px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">Block Stream</span>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          {witnessed} witnessed
        </span>
      </div>

      <div className="flex-1 overflow-hidden relative px-2.5 md:px-3 pb-3 space-y-1.5">
        <AnimatePresence initial={false}>
          {visible.map((b) => {
            const txs = b.txs_hashes?.length ?? 0
            const burned = b.total_fees_burned ?? 0
            return (
              <motion.button
                key={b.hash}
                layout
                initial={{ opacity: 0, y: -26, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                onClick={() => onSelect(b)}
                className="w-full text-left rounded-xl border border-border/70 bg-card/50 hover:bg-card/90 hover:border-vault/40 transition-colors px-3 py-2.5 group"
              >
                <div className="flex items-center gap-3">
                  <Identicon seed={b.miner} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-semibold text-vault">
                        {b.topoheight >= 0 ? `#${b.topoheight}` : '#orph.'}
                      </span>
                      <span
                        className={`px-1.5 py-px rounded text-[9px] font-mono uppercase tracking-wider border ${TYPE_STYLE[b.block_type] ?? TYPE_STYLE.Normal}`}
                      >
                        {b.block_type}
                      </span>
                      <span className="ml-auto text-[10px] font-mono text-muted-foreground/80">{fmtAge(b.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-muted-foreground">
                      <span className="truncate">{shortHash(b.miner, 10, 6)}</span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Zap className="w-3 h-3 text-vault/70" />
                        {fmtXEL(b.reward)} XET
                      </span>
                      <span className={`shrink-0 ${txs > 0 ? 'text-emerald-400' : 'text-muted-foreground/60'}`}>{txs} tx</span>
                      {burned > 0 && (
                        <span className="flex items-center gap-0.5 shrink-0 text-orange-400">
                          <Flame className="w-3 h-3" />
                          {fmtXEL(burned)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>

        {visible.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-mono text-muted-foreground">
            <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity }}>
              waiting for the next block…
            </motion.span>
          </div>
        )}
      </div>
    </div>
  )
}
