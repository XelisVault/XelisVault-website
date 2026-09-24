// Launchpad view — every project on the XELIS mainnet, every lifecycle
// stage, voting with live countdowns, permissionless finalize/migrate
// buttons. All data is on-chain; every action is a real transaction.

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useMainnet, graduationOf } from '@/lib/launch/mainnet-store'
import { useLaunchWallet } from '@/lib/launch/wallet'
import { supportTx, reportTx, finalizeValidationTx, migrateTx, claimRefundTx } from '@/lib/launch/tx'
import { shortenAddress } from '@/lib/xelis/types'
import { explorerContractUrl } from '@/lib/launch/protocol'
import { useToast } from '@/hooks/use-toast'
import {
  AnimatedNumber, Bar, BracketButton, Countdown, StatusTag, Sparkline, SquareDot, pad2,
} from './shared'
import { ProjectLogo } from './logos'
import { fmtXel, fmtPrice } from '@/lib/launch/math'
import type { Project } from '@/lib/launch/types'
import { cn } from '@/lib/utils'

export type AppView = 'launchpad' | 'trading' | 'dex' | 'create' | 'portfolio' | 'guide'

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
          <span className="font-semibold text-foreground">
            <AnimatedNumber value={voters} format={(v) => Math.round(v).toString()} />
          </span>
          <span className="text-foreground">/{p.vote.quorum || '—'} voters ·{' '}</span>
          <span className={cn('font-semibold', passes ? 'text-emerald-400' : 'text-destructive')}>
            <AnimatedNumber value={approval * 100} format={(v) => `${v.toFixed(0)}%`} /> approval
          </span>
        </span>
        <Countdown deadlineTopo={p.vote.deadlineTopo} className="text-foreground" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-[3px] flex-1 bg-foreground/10">
          <motion.div
            className="h-full bg-vault"
            animate={{ width: `${Math.min(100, p.vote.quorum > 0 ? (voters / p.vote.quorum) * 100 : 100)}%` }}
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
  const params = useMainnet((s) => s.params)
  const topoheight = useMainnet((s) => s.topoheight)
  const isDex = !!p.pool
  const windowClosed = p.vote != null && topoheight > 0 && p.vote.deadlineTopo > 0 && topoheight >= p.vote.deadlineTopo
  const awaitingMigration = p.graduated && !p.migrated

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'group relative flex flex-col border bg-card/50 p-5 transition-colors',
        p.status === 'validating'
          ? 'border-vault-soft/50 hover:border-vault-soft'
          : 'border-border/80 hover:border-vault/30',
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

      <p className="mt-3.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{p.description || 'No description provided.'}</p>

      {/* Stage-specific strip */}
      <div className="mt-4 flex-1">
        {p.status === 'validating' && p.vote && (
          <div className="border border-vault-soft/30 bg-vault-soft/5 p-3">
            <VoteBar p={p} />
            {windowClosed && (
              <div className="mt-2.5 flex items-center justify-center gap-2 border border-vault-soft/30 bg-vault-soft/10 px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-vault-soft">
                <SquareDot /> window closed · anyone can finalize
              </div>
            )}
          </div>
        )}
        {(p.status === 'bonding' || (p.graduated && !p.migrated)) && p.curve && (
          <div className="border border-vault/25 bg-vault/5 p-3">
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-muted-foreground">
                curve · <span className="font-semibold text-foreground">{fmtXel(p.curve.reserves)} / {fmtXel(p.curve.seed * params.graduationMultiplier)} XEL</span>
              </span>
              <span className="font-semibold text-vault">{(graduationOf(p, params) * 100).toFixed(1)}%</span>
            </div>
            <Bar value={graduationOf(p, params)} className="mt-2" />
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-[10px] text-foreground">
                price <span className="font-semibold">{fmtPrice(p.curve.reserves / p.curve.circulating)}</span> XEL
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
                <div className="mt-0.5 text-xs font-semibold text-foreground">{fmtPrice(p.pool.xel / p.pool.token)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">TVL</div>
                <div className="mt-0.5 text-xs font-semibold text-foreground">{fmtXel(p.pool.xel)} XEL</div>
              </div>
              <div>
                <div className="text-muted-foreground">VOLUME</div>
                <div className="mt-0.5 text-xs font-semibold text-foreground">{fmtXel(p.pool.volume)}</div>
              </div>
            </div>
            <div className="mt-2 text-center font-mono text-[10px] text-xusd">
              ▣ {fmtXel(p.pool.seedLocked)} XEL seed locked forever
            </div>
          </div>
        )}
        {p.status === 'rejected' && (
          <div className="border border-destructive/25 bg-destructive/5 p-3 text-center font-mono text-[11px] text-destructive/90">
            rejected · {p.trust.up + p.trust.down} voters · liquidity 100% refundable
          </div>
        )}
        {awaitingMigration && (
          <div className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-vault">
            graduated · migrate() is permissionless
          </div>
        )}
      </div>

      <div className="mt-4 flex items-stretch gap-2">
        <BracketButton variant="quiet" size="sm" className="flex-1" onClick={onOpen}>
          Details
        </BracketButton>
        {(p.status === 'bonding' || isDex || (p.graduated && !p.migrated)) && (
          <BracketButton variant={isDex ? 'teal' : 'primary'} size="sm" className="flex-1" onClick={onTrade}>
            {isDex ? 'DEX' : 'Trade'}
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
  const { toast } = useToast()
  const wallet = useLaunchWallet()
  const params = useMainnet((s) => s.params)
  const topoheight = useMainnet((s) => s.topoheight)
  const [busy, setBusy] = useState<string | null>(null)

  if (!p) return null

  const connected = wallet.state === 'connected' && !!wallet.address
  const windowClosed = p.vote != null && topoheight > 0 && p.vote.deadlineTopo > 0 && topoheight >= p.vote.deadlineTopo
  const userVoted = p.vote?.userVoted ?? false

  async function run(kind: string, fn: () => Promise<{ ok: boolean; message: string }>) {
    setBusy(kind)
    try {
      const res = await fn()
      toast({
        title: res.ok ? 'Transaction sent' : 'Transaction failed',
        description: res.message,
        variant: res.ok ? 'default' : 'destructive',
      })
    } finally {
      setBusy(null)
    }
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
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-display text-2xl font-semibold tracking-tight">{p.name}</h3>
                    <span className="font-mono text-sm text-muted-foreground">${p.ticker}</span>
                    <StatusTag status={p.status} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted-foreground">
                    <span title={p.creatorAddress}>by {p.creatorAddress ? shortenAddress(p.creatorAddress) : 'unknown'}</span>
                    {p.website && (
                      <a href={p.website} target="_blank" rel="noreferrer" className="text-vault hover:underline">
                        website ↗
                      </a>
                    )}
                    {p.twitter && (
                      <a href={p.twitter} target="_blank" rel="noreferrer" className="text-vault hover:underline">X ↗</a>
                    )}
                    {p.telegram && (
                      <a href={p.telegram} target="_blank" rel="noreferrer" className="text-vault hover:underline">telegram ↗</a>
                    )}
                    {p.discord && (
                      <a href={p.discord} target="_blank" rel="noreferrer" className="text-vault hover:underline">discord ↗</a>
                    )}
                    {p.asset && (
                      <a
                        href={explorerContractUrl(p.asset)}
                        target="_blank"
                        rel="noreferrer"
                        title={`Asset ${p.asset}`}
                        className="text-muted-foreground hover:text-vault"
                      >
                        asset ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm leading-relaxed text-muted-foreground">{p.longDescription}</p>

              {/* vote panel */}
              {(p.status === 'validating' || p.status === 'recovery') && p.vote && (
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
                    <BracketButton
                      variant="primary"
                      className="flex-1"
                      disabled={!connected || !!userVoted || busy != null}
                      onClick={() => run('support', () => supportTx(p.pid))}
                    >
                      {busy === 'support' ? 'signing…' : userVoted ? 'voted' : 'Support'}
                    </BracketButton>
                    <BracketButton
                      variant="danger"
                      className="flex-1"
                      disabled={!connected || !!userVoted || busy != null}
                      onClick={() => run('report', () => reportTx(p.pid))}
                    >
                      {busy === 'report' ? 'signing…' : 'Report'}
                    </BracketButton>
                  </div>
                  <p className="mt-3 text-center font-mono text-[10px] leading-relaxed text-muted-foreground">
                    {userVoted
                      ? 'you already voted this round · 1 address = 1 vote'
                      : params.voteDeposit > 0
                        ? `1 address = 1 vote · ${params.voteDeposit} XEL refundable deposit · ${p.vote.quorum} voter(s) and ${(p.vote.approvalThreshold * 100).toFixed(0)}% approval to pass`
                        : `voting is FREE (deposit dial = 0) · 1 address = 1 vote · ${p.vote.quorum} voter(s) and ${(p.vote.approvalThreshold * 100).toFixed(0)}% approval to pass`}
                    {!connected && ' · connect your wallet to vote'}
                  </p>
                  {windowClosed && (
                    <BracketButton
                      variant="strong"
                      className="mt-3 w-full"
                      disabled={!connected || busy != null}
                      onClick={() => run('finalize', () => finalizeValidationTx(p.pid))}
                    >
                      {busy === 'finalize' ? 'signing…' : 'Finalize validation — open the bonding curve'}
                    </BracketButton>
                  )}
                </div>
              )}

              {/* graduated, awaiting migration — permissionless */}
              {p.graduated && !p.migrated && (
                <div className="mt-5 border border-vault/30 bg-vault/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">Graduated — awaiting DEX migration</div>
                    <BracketButton
                      variant="strong"
                      size="sm"
                      disabled={!connected || busy != null}
                      onClick={() => run('migrate', () => migrateTx(p.pid))}
                    >
                      {busy === 'migrate' ? 'signing…' : 'migrate()'}
                    </BracketButton>
                  </div>
                  <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                    Anyone can call migrate() — the curve&apos;s reserves and inventory move atomically into a permanent
                    LaunchDEX pool. The curve keeps trading at the graduated fee ({(params.graduatedFeeBps / 100).toFixed(2)}%) until then.
                  </p>
                </div>
              )}

              {/* rejected — refund */}
              {p.status === 'rejected' && (
                <div className="mt-5 border border-border bg-foreground/[0.02] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-muted-foreground">Rejected — creator funds are refundable</div>
                    <BracketButton
                      variant="quiet"
                      size="sm"
                      disabled={!connected || busy != null}
                      onClick={() => run('refund', () => claimRefundTx(p.pid))}
                    >
                      {busy === 'refund' ? 'signing…' : 'claim refund'}
                    </BracketButton>
                  </div>
                </div>
              )}

              {/* stats grid */}
              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {([
                  p.curve && ['RESERVES', `${fmtXel(p.curve.reserves)} XEL`],
                  p.curve && ['TRADES', p.curve.trades.toString()],
                  p.curve && ['MARKET CAP', `${fmtXel(p.curve.marketCap)} XEL`],
                  p.curve && ['ATH CAP', `${fmtXel(p.curve.marketCapHigh)} XEL`],
                  p.pool && ['TVL', `${fmtXel(p.pool.xel)} XEL`],
                  p.pool && ['VOLUME', `${fmtXel(p.pool.volume)} XEL`],
                  p.pool && ['LIFETIME FEES', `${fmtXel(p.pool.fees)} XEL`],
                  p.pool && ['SWAPS', p.pool.trades.toString()],
                  p.trust.up > 0 && ['TRUST FOR', p.trust.up.toString()],
                  p.trust.down > 0 && ['TRUST AGAINST', p.trust.down.toString()],
                  ['TEAM', `${(p.teamBps / 100).toFixed(0)}%${p.vestingPlanTopos > 0 ? ' · vesting' : ''}`],
                  ['SUPPLY', p.totalSupply.toLocaleString('en-US')],
                  ['SEED', p.curve ? `${fmtXel(p.curve.seed)} XEL` : p.pool ? `${fmtXel(p.pool.seedLocked)} XEL ▣` : 'n/a'],
                ].filter(Boolean) as [string, string][]).map(([k, v]) => (
                  <div key={k} className="border border-border/70 bg-background/50 p-2.5 text-center">
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{k}</div>
                    <div className="mt-1 font-mono text-xs font-semibold tabular-nums">{v}</div>
                  </div>
                ))}
              </div>

              {(p.status === 'bonding' || !!p.pool || (p.graduated && !p.migrated)) && (
                <BracketButton
                  variant={p.pool ? 'teal' : 'primary'}
                  size="lg"
                  className="mt-5 w-full"
                  onClick={() => { onClose(); onTrade(p) }}
                >
                  {p.pool
                    ? `Trade ${p.ticker} on LaunchDEX`
                    : `Trade ${p.ticker} on the bonding curve`}
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
  const projects = useMainnet((s) => s.projects)
  const stats = useMainnet((s) => s.stats)
  const status = useMainnet((s) => s.status)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const [selected, setSelected] = useState<Project | null>(null)

  // Keep the dialog project in sync with on-chain updates
  const liveSelected = selected ? projects.find((p) => p.id === selected.id) ?? selected : null

  const visible = projects.filter((p) => {
    if (filter === 'all') return true
    if (filter === 'migrated') return !!p.pool
    return p.status === filter
  })

  const validating = projects.filter((p) => p.status === 'validating')
  const bonding = projects.filter((p) => p.status === 'bonding' || (p.graduated && !p.migrated))
  const dexCount = projects.filter((p) => !!p.pool).length
  const totalVol = stats?.totalVolume != null
    ? Number(stats.totalVolume) / 1e8
    : projects.reduce((acc, p) => acc + (p.curve?.volume ?? p.pool?.volume ?? 0), 0)

  return (
    <div>
      {/* Header stats: the ledger band */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { k: 'IN VALIDATION', v: validating.length.toString(), sub: validating.map((p) => p.ticker).join(' · ') || 'none' },
          { k: 'ON CURVE', v: bonding.length.toString(), sub: bonding.map((p) => p.ticker).join(' · ') || 'none' },
          { k: 'ON THE DEX', v: dexCount.toString(), sub: 'seed floors locked' },
          { k: 'TOTAL VOLUME', v: fmtXel(totalVol), sub: 'XEL · on-chain scoreboard' },
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
                : 'border-border text-muted-foreground hover:border-vault/30 hover:text-foreground',
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

      {visible.length === 0 && projects.length === 0 && status === 'live' && (
        <div className="mt-14 border border-dashed border-border p-10 text-center">
          <div className="font-display text-2xl font-semibold text-foreground">
            The community creates the coins.
          </div>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Nothing has been proposed yet — the launchpad is live on the XELIS mainnet and waiting
            for its first project. 526 XEL minimum, ~1 hour of community validation, and your coin
            is a real confidential XELIS asset.
          </p>
          <BracketButton variant="strong" className="mt-6" onClick={() => setView('create')}>
            Launch the first coin
          </BracketButton>
        </div>
      )}

      {visible.length === 0 && projects.length > 0 && (
        <div className="mt-16 border border-dashed border-border p-10 text-center font-mono text-sm text-muted-foreground">
          nothing at this stage right now
        </div>
      )}

      {status !== 'live' && (
        <div className="mt-14 border border-dashed border-border p-10 text-center font-mono text-sm text-muted-foreground">
          connecting to the XELIS mainnet…
        </div>
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
