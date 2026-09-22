// Launchpad view — every proposal, every lifecycle stage, voting with live
// countdowns. The KLEOS card is the drama: 19/20 voters, 89%, minutes left.

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useEngine, graduationOf } from '@/lib/launch/engine'
import { useToast } from '@/hooks/use-toast'
import { useLaunchWallet } from '@/lib/launch/wallet'
import {
  AnimatedNumber, Bar, BracketButton, Countdown, StatusTag, Sparkline, SquareDot, pad2,
} from './shared'
import { ProjectLogo } from './logos'
import { fmtXel } from '@/lib/launch/math'
import type { Project } from '@/lib/launch/types'
import { cn } from '@/lib/utils'
import type { AppView } from './app-shell'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'validating', label: 'Validating' },
  { id: 'bonding', label: 'Bonding' },
  { id: 'migrated', label: 'On DEX' },
  { id: 'rejected', label: 'Rejected' },
] as const

function VoteBar({ p }: { p: Project }) {
  if (!p.vote) return null
  const voters = p.vote.supporters + p.vote.reporters
  const approval = voters > 0 ? p.vote.supporters / voters : 0
  const passes = voters >= p.vote.quorum && approval >= p.vote.approvalThreshold
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between font-mono text-[11px]">
        <span className="text-muted-foreground">
          <AnimatedNumber value={voters} format={(v) => Math.round(v).toString()} />
          <span className="text-foreground">/{p.vote.quorum}</span> voters ·{' '}
          <span className={passes ? 'text-emerald-400' : 'text-destructive'}>
            <AnimatedNumber value={approval * 100} format={(v) => `${v.toFixed(0)}%`} /> approval
          </span>
        </span>
        <Countdown deadlineTopo={p.vote.deadlineTopo} className={cn(p.id === 'kleos' ? 'text-vault-soft' : 'text-muted-foreground')} />
      </div>
      <div className="flex gap-1.5">
        <div className="h-[3px] flex-1 bg-foreground/10">
          <motion.div
            className="h-full bg-vault"
            animate={{ width: `${Math.min(100, (voters / p.vote.quorum) * 100)}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 18 }}
          />
        </div>
        <div className="h-[3px] w-16 bg-foreground/10">
          <motion.div
            className="h-full bg-xusd"
            animate={{ width: `${approval * 100}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 18 }}
          />
        </div>
      </div>
    </div>
  )
}

function ProjectCard({ p, rank, onOpen, onTrade }: { p: Project; rank: number; onOpen: () => void; onTrade: () => void }) {
  const isDex = !!p.pool
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'group relative flex flex-col border bg-card/50 p-5 transition-colors',
        p.status === 'validating' && p.id === 'kleos'
          ? 'border-vault-soft/50 shadow-[0_0_36px_-14px_var(--vault)]'
          : 'border-border/80 hover:border-vault/30'
      )}
    >
      {/* ledger index */}
      <span className="absolute right-4 top-4 font-mono text-[9px] text-muted-foreground/70" aria-hidden>
        {pad2(rank)}
      </span>

      <div className="flex items-start justify-between gap-3 pr-6">
        <div className="flex items-center gap-3">
          <ProjectLogo ticker={p.ticker} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight">{p.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">${p.ticker}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {p.tags.slice(0, 2).map((t) => (
                <span key={t} className="border border-border/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <StatusTag status={p.status} />
      </div>

      <p className="mt-3.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{p.description}</p>

      {/* Stage-specific strip */}
      <div className="mt-4 flex-1">
        {p.status === 'validating' && p.vote && (
          <div className="border border-vault-soft/30 bg-vault-soft/5 p-3">
            <VoteBar p={p} />
            {p.id === 'kleos' && (
              <div className="mt-2.5 flex items-center justify-center gap-2 border border-vault-soft/30 bg-vault-soft/10 px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-vault-soft">
                <SquareDot /> decision imminent · about to pass
              </div>
            )}
          </div>
        )}
        {p.status === 'bonding' && p.curve && (
          <div className="border border-vault/25 bg-vault/5 p-3">
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-muted-foreground">
                curve · <span className="text-foreground">{fmtXel(p.curve.reserves)} / {fmtXel(p.curve.seed * 4)} XEL</span>
              </span>
              <span className="font-semibold text-vault">{(graduationOf(p) * 100).toFixed(1)}%</span>
            </div>
            <Bar value={graduationOf(p)} className="mt-2" />
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">
                price {(p.curve.reserves / p.curve.circulating).toFixed(5)} XEL
              </span>
              <Sparkline data={p.curve.history.slice(-40)} width={72} height={20} />
            </div>
          </div>
        )}
        {isDex && p.pool && (
          <div className="border border-xusd/25 bg-xusd/5 p-3">
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
              <div>
                <div className="text-muted-foreground">PRICE</div>
                <div className="mt-0.5 text-xs font-semibold">{(p.pool.xel / p.pool.token).toFixed(4)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">TVL</div>
                <div className="mt-0.5 text-xs font-semibold">{fmtXel(p.pool.xel)} XEL</div>
              </div>
              <div>
                <div className="text-muted-foreground">VOL 24H</div>
                <div className="mt-0.5 text-xs font-semibold">{fmtXel(p.pool.volume24h)}</div>
              </div>
            </div>
            <div className="mt-2 text-center font-mono text-[10px] text-xusd">
              ▣ {fmtXel(p.pool.seedLocked)} XEL seed locked forever
            </div>
          </div>
        )}
        {p.status === 'rejected' && (
          <div className="border border-destructive/25 bg-destructive/5 p-3 text-center font-mono text-[11px] text-destructive/90">
            rejected by {p.trust.up + p.trust.down} voters · liquidity 100% refunded
          </div>
        )}
      </div>

      <div className="mt-4 flex items-stretch gap-2">
        <BracketButton variant="quiet" size="sm" className="flex-1" onClick={onOpen}>
          Details
        </BracketButton>
        {(p.status === 'bonding' || isDex) && (
          <BracketButton variant={p.status === 'bonding' ? 'primary' : 'teal'} size="sm" className="flex-1" onClick={onTrade}>
            {p.status === 'bonding' ? 'Trade' : 'DEX'}
          </BracketButton>
        )}
      </div>
    </motion.article>
  )
}

function ProjectDialog({ p, open, onClose, onTrade }: {
  p: Project | null
  open: boolean
  onClose: () => void
  onTrade: (p: Project) => void
}) {
  const vote = useEngine((s) => s.vote)
  const userVote = useEngine((s) => (p ? s.votes[p.id] : undefined))
  const { toast } = useToast()

  if (!p) return null

  function doVote(side: 'support' | 'report') {
    if (!p) return
    const res = vote(p.id, side)
    toast({
      title: res.ok ? 'Vote recorded' : 'Cannot vote',
      description: res.message,
      variant: res.ok ? 'default' : 'destructive',
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span aria-hidden className="absolute -left-px -top-px z-10 h-3 w-3 border-l-2 border-t-2 border-vault" />
            <span aria-hidden className="absolute -right-px -top-px z-10 h-3 w-3 border-r-2 border-t-2 border-vault" />
            <span aria-hidden className="absolute -bottom-px -left-px z-10 h-3 w-3 border-b-2 border-l-2 border-vault" />
            <span aria-hidden className="absolute -bottom-px -right-px z-10 h-3 w-3 border-b-2 border-r-2 border-vault" />

            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-vault/40 hover:text-vault"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="border-b border-border px-6 py-5">
              <div className="flex items-center gap-4 pr-8">
                <ProjectLogo ticker={p.ticker} size="xl" />
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-display text-2xl font-semibold tracking-tight">{p.name}</h3>
                    <span className="font-mono text-sm text-muted-foreground">${p.ticker}</span>
                    <StatusTag status={p.status} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                    <span>by {p.creator}</span>
                    {p.website && (
                      <a href={p.website} target="_blank" rel="noreferrer" className="text-vault hover:underline">
                        website ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm leading-relaxed text-muted-foreground">{p.longDescription}</p>

              {/* vote panel */}
              {p.status === 'validating' && p.vote && (
                <div className="mt-5 border border-vault-soft/30 bg-vault-soft/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <SquareDot className="text-vault-soft" /> Community validation
                    </div>
                    <span className="font-mono text-xs text-vault-soft">
                      <Countdown deadlineTopo={p.vote.deadlineTopo} /> left
                    </span>
                  </div>
                  <div className="mt-3"><VoteBar p={p} /></div>
                  <div className="mt-4 flex items-stretch gap-2">
                    <BracketButton variant="primary" className="flex-1" disabled={!!userVote} onClick={() => doVote('support')}>
                      Support
                    </BracketButton>
                    <BracketButton variant="danger" className="flex-1" disabled={!!userVote} onClick={() => doVote('report')}>
                      Report
                    </BracketButton>
                  </div>
                  <p className="mt-3 text-center font-mono text-[10px] leading-relaxed text-muted-foreground">
                    {userVote
                      ? `you voted ${userVote.toUpperCase()} · 1 address = 1 vote · 0.5 XEL refundable deposit`
                      : '1 address = 1 vote · 0.5 XEL refundable deposit · 20 voters and 80% approval to pass'}
                  </p>
                </div>
              )}

              {/* stats grid */}
              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {([
                  p.curve && ['RESERVES', `${fmtXel(p.curve.reserves)} XEL`],
                  p.curve && ['HOLDERS', p.curve.holders.toString()],
                  p.pool && ['TVL', `${fmtXel(p.pool.xel)} XEL`],
                  p.pool && ['VOL 24H', `${fmtXel(p.pool.volume24h)} XEL`],
                  p.trust.up > 0 && ['TRUST FOR', p.trust.up.toString()],
                  p.trust.down > 0 && ['TRUST AGAINST', p.trust.down.toString()],
                  ['TEAM', p.curve ? `≤ ${(p.curve.teamBps / 100).toFixed(0)}%` : 'n/a'],
                  ['SEED', p.curve ? `${fmtXel(p.curve.seed)} XEL` : p.pool ? `${fmtXel(p.pool.seedLocked)} XEL ▣` : 'n/a'],
                ].filter(Boolean) as [string, string][]).map(([k, v]) => (
                  <div key={k} className="border border-border/70 bg-background/50 p-2.5 text-center">
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{k}</div>
                    <div className="mt-1 font-mono text-xs font-semibold tabular-nums">{v}</div>
                  </div>
                ))}
              </div>

              {(p.status === 'bonding' || !!p.pool) && (
                <BracketButton
                  variant={p.status === 'bonding' ? 'primary' : 'teal'}
                  size="lg"
                  className="mt-5 w-full"
                  onClick={() => { onClose(); onTrade(p) }}
                >
                  {p.status === 'bonding' ? `Trade ${p.ticker} on the bonding curve` : `Trade ${p.ticker} on LaunchDEX`}
                </BracketButton>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function LaunchpadView({ setView }: { setView: (v: AppView, id?: string) => void }) {
  const projects = useEngine((s) => s.projects)
  const isDemo = useLaunchWallet((s) => s.mode === 'demo')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const [selected, setSelected] = useState<Project | null>(null)

  // Keep the dialog project in sync with engine updates
  const liveSelected = selected ? projects.find((p) => p.id === selected.id) ?? selected : null

  const visible = projects.filter((p) => {
    if (filter === 'all') return true
    if (filter === 'migrated') return !!p.pool
    return p.status === filter
  })

  const validating = projects.filter((p) => p.status === 'validating')
  const bonding = projects.filter((p) => p.status === 'bonding')
  const dexCount = projects.filter((p) => !!p.pool).length
  const totalVol = projects.reduce((acc, p) => acc + (p.curve?.volume24h ?? p.pool?.volume24h ?? 0), 0)

  return (
    <div>
      {/* Header stats: the ledger band */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { k: 'IN VALIDATION', v: validating.length.toString(), sub: validating.map((p) => p.ticker).join(' · ') || 'none' },
          { k: 'ON CURVE', v: bonding.length.toString(), sub: bonding.map((p) => p.ticker).join(' · ') || 'none' },
          { k: 'ON THE DEX', v: dexCount.toString(), sub: 'seed floors locked' },
          { k: '24H VOLUME', v: fmtXel(totalVol), sub: 'XEL across stages' },
        ].map((s, i) => (
          <motion.div
            key={s.k}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="border border-border/70 bg-card/50 p-4"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s.k}</div>
            <div className="mt-2 font-display text-2xl font-semibold tabular-nums">{s.v}</div>
            <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{s.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-7 flex items-center gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'shrink-0 border px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors',
              filter === f.id
                ? 'border-vault/50 bg-vault/10 text-vault'
                : 'border-border text-muted-foreground hover:border-vault/30 hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto hidden shrink-0 font-mono text-[10px] text-muted-foreground sm:block">
          lifecycle: validation → bonding → graduation → dex
        </span>
      </div>

      {/* Cards */}
      <motion.div layout className="mt-5 grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {visible.map((p, i) => (
            <ProjectCard
              key={p.id}
              p={p}
              rank={i}
              onOpen={() => setSelected(p)}
              onTrade={() => p.pool ? setView('dex', p.id) : setView('trading', p.id)}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {visible.length === 0 && (
        <div className="mt-16 border border-dashed border-border p-10 text-center font-mono text-sm text-muted-foreground">
          nothing at this stage right now
        </div>
      )}

      {!isDemo && (
        <p className="mt-6 text-center font-mono text-[10px] leading-relaxed text-muted-foreground">
          XSWD wallet connected · contracts deploy at the mainnet launch, trading runs on demo data
        </p>
      )}

      <ProjectDialog
        p={liveSelected}
        open={!!liveSelected}
        onClose={() => setSelected(null)}
        onTrade={(p) => p.pool ? setView('dex', p.id) : setView('trading', p.id)}
      />
    </div>
  )
}
