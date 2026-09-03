'use client'

// Asset Registry — every token living on XELIS, live from the node.
// On mainnet that's the real ecosystem (XEL + community-issued assets).

import { motion } from 'framer-motion'
import { Coins, ExternalLink, Infinity as InfinityIcon } from 'lucide-react'
import { AssetInfo, XEL_ASSET, fmtNum } from '@/lib/xelis/explorer'
import { networkConfig } from '@/lib/xelis/networks'
import { Identicon, Odometer } from './fx'

function maxSupplyLabel(a: AssetInfo): string {
  const s = a.max_supply as any
  if (s === 'none' || s === undefined) return 'uncapped'
  if (typeof s === 'string') return s
  if ('fixed' in s) return `${fmtNum(s.fixed / 1e8)} fixed`
  if ('mintable' in s) return `${fmtNum(s.mintable / 1e8)} mintable`
  return '—'
}

export function AssetRegistry({ assets }: { assets: AssetInfo[] }) {
  if (assets.length === 0) return null
  const sorted = [...assets].sort((a, b) => {
    if (a.asset === XEL_ASSET) return -1
    if (b.asset === XEL_ASSET) return 1
    return a.topoheight - b.topoheight
  })
  const explorer = networkConfig().explorer

  return (
    <div className="rounded-2xl glass-panel p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          <Coins className="w-3.5 h-3.5 text-vault/80" />
          Asset Registry
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/60">
          <Odometer value={assets.length} /> assets live · click to open
        </span>
      </div>

      <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5 [scrollbar-width:thin]">
        {sorted.map((a, i) => {
          const native = a.asset === XEL_ASSET
          return (
            <motion.a
              key={a.asset}
              href={`${explorer}/asset/${a.asset}`}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5) }}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 hover:bg-card/80 hover:border-vault/40 transition-colors px-3 py-2 group"
              title={`${a.name}, open in official explorer`}
            >
              <Identicon seed={a.asset} size={26} />
              <span className={`font-mono text-[12px] font-bold w-14 shrink-0 ${native ? 'text-vault' : 'text-foreground/90'}`}>
                {a.ticker}
              </span>
              <span className="text-[11px] text-muted-foreground truncate flex-1 min-w-0">{a.name}</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-mono rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-muted-foreground/80 shrink-0">
                {a.max_supply && typeof a.max_supply === 'object' && 'mintable' in (a.max_supply as any) && <InfinityIcon className="w-2.5 h-2.5" />}
                {maxSupplyLabel(a)}
              </span>
              {native && (
                <span className="text-[9px] font-mono uppercase tracking-wider rounded-full bg-vault/15 text-vault px-2 py-0.5 border border-vault/30 shrink-0">
                  native
                </span>
              )}
              <span className="text-[9px] font-mono text-muted-foreground/50 w-[92px] text-right hidden md:block shrink-0">
                @ topo {fmtNum(a.topoheight)}
              </span>
              <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-vault transition-colors shrink-0" />
            </motion.a>
          )
        })}
      </div>
    </div>
  )
}
