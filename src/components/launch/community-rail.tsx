// Community rail — the community track, impossible to miss.
//
// Rendered at the very top of the Launchpad (the ARRIVAL view): the
// latest community launches as a horizontal live strip in the bordeaux
// accent, before any project content. A coin can launch while the user
// reads another view — the rail, the nav badge and the launch toast
// (app-shell) make sure it never goes unnoticed again.
//
// The chain is the backend: every card is a storage read away, kept
// fresh by the community poller (15s fast / 60s deep + post-tx force).

'use client'

import { motion } from 'framer-motion'
import { useCommunity } from '@/lib/launch/community-store'
import { useMainnet } from '@/lib/launch/mainnet-store'
import { TOPO_SECONDS } from '@/lib/launch/protocol'
import { fmtXel, fmtPrice, fmtPct } from '@/lib/launch/math'
import { Bar, BracketButton, Sparkline, SquareDot } from './shared'
import { ProjectLogo } from './logos'
import type { CommunityCoin } from '@/lib/launch/types'
import type { AppView } from './launchpad-view'
import { cn } from '@/lib/utils'

/** A coin counts as NEW during its first hour on chain (720 topos). */
export const NEW_TOPOS = Math.floor(3600 / TOPO_SECONDS)

/** True while the coin is less than an hour old (the NEW chip + pulse). */
export function isFreshLaunch(c: CommunityCoin, topoheight: number): boolean {
  return topoheight > 0 && c.createdTopo > 0 && topoheight - c.createdTopo < NEW_TOPOS
}

function agoOf(createdTopo: number, topoheight: number): string {
  if (!createdTopo || !topoheight) return ''
  const s = Math.max(0, (topoheight - createdTopo) * TOPO_SECONDS)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ─────────────────────────────────────────────────────────────────
// Rail card — one community coin, compact and clickable
// ─────────────────────────────────────────────────────────────────

function RailCard({ c, rank, onOpen }: { c: CommunityCoin; rank: number; onOpen: () => void }) {
  const topoheight = useMainnet((s) => s.topoheight)
  const fresh = isFreshLaunch(c, topoheight)
  const series = c.curve ?? c.pool
  const chg = series && series.history.length >= 2 && series.history[0] > 0
    ? ((c.price - series.history[0]) / series.history[0]) * 100
    : 0

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: Math.min(rank * 0.05, 0.3) }}
      onClick={onOpen}
      className={cn(
        'group relative w-[212px] shrink-0 border bg-card/60 p-3.5 text-left transition-colors',
        fresh
          ? 'border-vlt/60 bg-vlt/[0.05]'
          : 'border-vlt/25 hover:border-vlt/60 hover:bg-vlt/[0.06]',
      )}
    >
      {/* fresh-launch pulse: a bordeaux edge on the left while NEW */}
      {fresh && (
        <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-vlt">
          <span className="absolute inset-0 animate-ping bg-vlt opacity-60" />
        </span>
      )}

      <div className="flex items-center gap-2.5">
        <ProjectLogo ticker={c.ticker} size="sm" className="h-8 w-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold tracking-tight">{c.name}</span>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">${c.ticker}</div>
        </div>
        {fresh ? (
          <span className="shrink-0 border border-vlt/60 bg-vlt/15 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] text-vlt">
            new
          </span>
        ) : (
          <Sparkline data={series?.history.slice(-24) ?? []} width={44} height={18} />
        )}
      </div>

      <div className="mt-2.5 flex items-end justify-between">
        <div>
          <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {fmtPrice(c.price)}
          </div>
          <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">XEL</div>
        </div>
        <div className="text-right">
          <div className={cn('font-mono text-[11px] font-semibold tabular-nums', chg >= 0 ? 'text-emerald-400' : 'text-destructive')}>
            {fmtPct(chg, 1)}
          </div>
          <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
            mcap {fmtXel(c.marketCap)}
          </div>
        </div>
      </div>

      {/* graduation progress (curve era) or pool depth (migrated) */}
      {c.curve ? (
        <div className="mt-2.5">
          <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em]">
            <span className="text-muted-foreground">
              graduation <span className="text-foreground">{(c.progress * 100).toFixed(0)}%</span>
            </span>
            <span className="text-muted-foreground">{c.curve.trades} trades</span>
          </div>
          <Bar value={c.progress} className="mt-1.5" barClassName="bg-vlt" />
        </div>
      ) : c.pool ? (
        <div className="mt-2.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em]">
          <span className="text-xusd">DEX pool</span>
          <span className="text-foreground">{fmtXel(c.pool.xel)} XEL depth</span>
        </div>
      ) : null}

      <div className="mt-2.5 border-t border-vlt/15 pt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        launched {agoOf(c.createdTopo, topoheight) || '—'} · {c.status === 'migrated' ? 'migrated' : 'no validation'}
      </div>
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────────
// The rail — rendered at the top of the Launchpad view
// ─────────────────────────────────────────────────────────────────

export function CommunityRail({ setView }: { setView: (v: AppView, id?: string) => void }) {
  const allCoins = useCommunity((s) => s.coins)
  const status = useCommunity((s) => s.status)

  // the community track ONLY: the platform's official tokens live on the
  // project side (Launchpad banner), not on this rail.
  const coins = allCoins.filter((c) => !c.official)

  // don't reserve layout while the chain is still answering
  if (coins.length === 0 && status !== 'live') return null

  const shown = coins.slice(0, 12) // newest first already
  const liveCount = coins.filter((c) => c.status !== 'migrated').length

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="border border-vlt/30 bg-vlt/[0.035] p-3.5 sm:p-4"
    >
      {/* header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2.5">
          <SquareDot className="text-vlt" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-vlt">
            Community launches
          </span>
          {coins.length > 0 && (
            <span className="border border-vlt/40 bg-vlt/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums text-vlt">
              {coins.length} launched{liveCount > 0 ? ` · ${liveCount} live` : ''}
            </span>
          )}
        </div>
        <span className="hidden font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground sm:block">
          the pump.fun track · no validation · one transaction, ≈ 2 XEL
        </span>
        <div className="ml-auto flex items-center gap-2">
          <BracketButton variant="vlt" size="sm" onClick={() => setView('community')}>
            open the board →
          </BracketButton>
          <BracketButton variant="strong" size="sm" className="hidden sm:inline-flex" onClick={() => setView('coin-launch')}>
            + launch a coin
          </BracketButton>
        </div>
      </div>

      {/* the strip */}
      {shown.length > 0 ? (
        <div className="mt-3.5 flex gap-2.5 overflow-x-auto pb-1.5 [scrollbar-width:thin]">
          {shown.map((c, i) => (
            <RailCard key={c.id} c={c} rank={i} onOpen={() => setView('community', c.id)} />
          ))}
          {coins.length > shown.length && (
            <button
              type="button"
              onClick={() => setView('community')}
              className="flex w-[130px] shrink-0 flex-col items-center justify-center gap-1.5 border border-dashed border-vlt/30 text-vlt transition-colors hover:border-vlt/60 hover:bg-vlt/[0.06]"
            >
              <span className="font-mono text-lg font-semibold">+{coins.length - shown.length}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em]">see all coins</span>
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border border-dashed border-vlt/25 p-4">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            The community board is open and no one has launched yet — be the first: a real XELIS
            asset, born on a bonding curve, in one transaction.
          </p>
          <BracketButton variant="vlt" size="sm" onClick={() => setView('coin-launch')}>
            launch the first coin · ≈ 2 XEL
          </BracketButton>
        </div>
      )}
    </motion.section>
  )
}
