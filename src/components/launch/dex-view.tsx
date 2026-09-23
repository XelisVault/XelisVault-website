// DEX view — LaunchDEX.
//
// Two modes, like the curve terminal:
//   • GRID (no focus): global stats + every pool as a rich card.
//     Click → the pool's own page.
//   • POOL (focus): ONE pool — chart with intervals, swap widget, the
//     liquidity provider panel (add / remove pro-rata, fee earnings),
//     the permanent seed floor. No other pools on screen.

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useEngine } from '@/lib/launch/engine'
import { useToast } from '@/hooks/use-toast'
import { useLaunchWallet } from '@/lib/launch/wallet'
import { Sparkline, AnimatedNumber, BracketButton, PanelHead, StatusTag, CHART_TEAL } from './shared'
import { ProjectLogo, PairLogo } from './logos'
import { PriceChart } from './chart'
import { quoteDexSwap, quoteDexSwapToXel, fmtXel, fmtPrice, fmtPct } from '@/lib/launch/math'
import type { Project } from '@/lib/launch/types'
import { cn } from '@/lib/utils'
import type { AppView } from './app-shell'

// ─────────────────────────────────────────────────────────────────
// GRID MODE — all the pools
// ─────────────────────────────────────────────────────────────────

function PoolCard({ p, rank, onOpen }: { p: Project; rank: number; onOpen: () => void }) {
  if (!p.pool) return null
  const price = p.pool.xel / p.pool.token
  const first = p.pool.history[0] ?? price
  const chg = first > 0 ? ((price - first) / first) * 100 : 0
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.04 }}
      onClick={onOpen}
      className="group relative flex flex-col border border-border/80 bg-card/50 p-5 text-left transition-colors hover:border-xusd/40 hover:bg-card/80"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <PairLogo ticker={p.ticker} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight">XEL / {p.ticker}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <StatusTag status={p.status} />
              <span className="font-mono text-[10px] text-muted-foreground">fee 0.30%</span>
            </div>
          </div>
        </div>
        <Sparkline data={p.pool.history.slice(-48)} width={78} height={26} color={CHART_TEAL} />
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="font-display text-2xl font-semibold tabular-nums">{fmtPrice(price)}</div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">XEL per {p.ticker}</div>
        </div>
        <div className={cn('font-mono text-sm font-semibold tabular-nums', chg >= 0 ? 'text-emerald-400' : 'text-destructive')}>
          {fmtPct(chg, 1)}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ['TVL', `${fmtXel(p.pool.xel)} XEL`],
          ['VOL 24H', fmtXel(p.pool.volume24h)],
          ['FEES 24H', `${p.pool.fees24h.toFixed(1)}`],
        ].map(([k, v]) => (
          <div key={k} className="border border-border/70 bg-background/50 p-2.5 text-center">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</div>
            <div className="mt-1 font-mono text-xs font-semibold tabular-nums text-foreground">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-center font-mono text-[10px] text-xusd">
        ▣ {fmtXel(p.pool.seedLocked)} XEL seed locked forever
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 font-mono text-[10px] uppercase tracking-[0.16em]">
        <span className="text-muted-foreground">split 50/50 · exit any time</span>
        <span className="text-xusd opacity-0 transition-opacity group-hover:opacity-100">open pool →</span>
      </div>
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────────
// POOL MODE components
// ─────────────────────────────────────────────────────────────────

function SwapWidget({ project }: { project: Project }) {
  const engine = useEngine()
  const { toast } = useToast()
  const walletMode = useLaunchWallet((s) => s.mode)
  const [direction, setDirection] = useState<'toToken' | 'toXel'>('toToken')
  const [amount, setAmount] = useState('100')
  const amt = Math.max(0, Number(amount) || 0)
  const pool = project.pool!
  const ownedToken = engine.tokens[project.ticker] ?? 0

  const buyQuote = direction === 'toToken' ? quoteDexSwap(amt, pool, pool.feeBps) : null
  const sellQuote = direction === 'toXel' ? quoteDexSwapToXel(amt, pool, pool.feeBps) : null
  const q = { out: buyQuote ? buyQuote.out : (sellQuote?.out ?? 0) }
  const impactPct = buyQuote ? buyQuote.impactPct : null

  const insufficient = direction === 'toToken' ? amt > engine.xel : amt > ownedToken
  const disabled = walletMode !== 'demo' || amt <= 0 || insufficient || q.out <= 0

  function execute() {
    const res = direction === 'toToken'
      ? engine.swapToToken(project.id, amt)
      : engine.swapToXel(project.id, amt)
    toast({
      title: res.ok ? 'Swap executed' : 'Swap failed',
      description: res.message,
      variant: res.ok ? 'default' : 'destructive',
    })
    if (res.ok) setAmount('')
  }

  const fromLabel = direction === 'toToken' ? 'XEL' : project.ticker
  const toLabel = direction === 'toToken' ? project.ticker : 'XEL'
  const fromBalance = direction === 'toToken' ? engine.xel : ownedToken

  return (
    <div className="border border-border/70 bg-card/50">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">swap</span>
        <span className="font-mono text-[10px] text-xusd">fee {(pool.feeBps / 100).toFixed(2)}%</span>
      </div>

      <div className="p-4">
        {/* From */}
        <div className="border border-border bg-background/60 p-3.5">
          <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
            <span>you pay</span>
            <span><AnimatedNumber value={fromBalance} format={(v) => fmtXel(v)} /> {fromLabel}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              aria-label="Swap from amount"
              className="h-10 w-full border-0 bg-transparent px-0 font-mono text-xl tabular-nums text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
            <span className="flex items-center gap-1.5 border border-border bg-card px-2.5 py-1.5 font-mono text-xs font-semibold">
              {fromLabel === 'XEL'
                ? <ProjectLogo ticker="XEL" size="xs" className="h-5 w-5" />
                : <ProjectLogo ticker={project.ticker} size="xs" className="h-5 w-5" />}
              {fromLabel}
            </span>
          </div>
        </div>

        {/* Flip */}
        <div className="relative z-10 -my-2 flex justify-center">
          <button
            onClick={() => { setDirection(d => d === 'toToken' ? 'toXel' : 'toToken'); setAmount('') }}
            aria-label="Flip direction"
            className="border border-border bg-card px-3 py-1.5 font-mono text-sm text-muted-foreground transition-all hover:rotate-180 hover:border-xusd/50 hover:text-xusd"
          >
            ⇅
          </button>
        </div>

        {/* To */}
        <div className="border border-border bg-background/60 p-3.5">
          <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
            <span>you receive</span>
            <span>≈</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-xl font-semibold tabular-nums text-xusd">
              {q.out > 0 ? (q.out >= 100 ? q.out.toFixed(1) : q.out.toFixed(4)) : '0.00'}
            </span>
            <span className="flex items-center gap-1.5 border border-border bg-card px-2.5 py-1.5 font-mono text-xs font-semibold">
              {toLabel === 'XEL'
                ? <ProjectLogo ticker="XEL" size="xs" className="h-5 w-5" />
                : <ProjectLogo ticker={project.ticker} size="xs" className="h-5 w-5" />}
              {toLabel}
            </span>
          </div>
        </div>

        {amt > 0 && q.out > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px]">
            <div className="border border-border/60 bg-background/50 p-2.5">
              <div className="text-muted-foreground">PRICE</div>
              <div className="mt-0.5 tabular-nums text-foreground">{fmtPrice(direction === 'toToken' ? amt / q.out : q.out / amt)}</div>
            </div>
            <div className="border border-border/60 bg-background/50 p-2.5">
              <div className="text-muted-foreground">IMPACT</div>
              <div className={cn('mt-0.5 tabular-nums', impactPct != null && impactPct > 5 ? 'text-vault-soft' : 'text-emerald-400')}>
                {impactPct != null ? `${impactPct.toFixed(2)}%` : '0.00%'}
              </div>
            </div>
          </div>
        )}

        <BracketButton
          variant="teal"
          size="lg"
          className="mt-3 w-full"
          disabled={disabled}
          onClick={execute}
        >
          {walletMode !== 'demo' ? 'demo wallet required'
            : insufficient ? `insufficient ${fromLabel}`
            : `Swap ${fromLabel} for ${toLabel}`}
        </BracketButton>
      </div>
    </div>
  )
}

function LpPanel({ project }: { project: Project }) {
  const engine = useEngine()
  const { toast } = useToast()
  const walletMode = useLaunchWallet((s) => s.mode)
  const pool = project.pool!
  const lp = engine.lps.find((l) => l.poolId === project.id)

  const [tab, setTab] = useState<'add' | 'position'>(lp ? 'position' : 'add')
  const [addAmount, setAddAmount] = useState('100')
  const [removePct, setRemovePct] = useState(50)
  const addAmt = Math.max(0, Number(addAmount) || 0)
  const partsToRemove = lp ? lp.parts * (removePct / 100) : 0
  const xelOut = (partsToRemove * pool.xel) / Math.max(pool.totalParts, 1)
  const tokenOut = (partsToRemove * pool.token) / Math.max(pool.totalParts, 1)

  function add() {
    const res = engine.addLiquidity(project.id, addAmt)
    toast({ title: res.ok ? 'Liquidity added' : 'Cannot add', description: res.message, variant: res.ok ? 'default' : 'destructive' })
    if (res.ok) setAddAmount('')
  }
  function remove() {
    const res = engine.removeLiquidity(project.id, partsToRemove)
    toast({ title: res.ok ? 'Liquidity removed' : 'Cannot remove', description: res.message, variant: res.ok ? 'default' : 'destructive' })
  }

  const share = lp ? (lp.parts / Math.max(pool.totalParts, 1)) * 100 : 0

  return (
    <div className="border border-border/70 bg-card/50">
      <div className="grid grid-cols-2 border-b border-border/60">
        {(['add', 'position'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'relative py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors',
              tab === t ? 'bg-xusd/12 text-xusd' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'add' ? 'Provide' : 'Position'}
            {tab === t && (
              <motion.span layoutId={`lp-tab-marker-${project.id}`} className="absolute inset-x-0 bottom-0 h-[2px] bg-xusd" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
            )}
          </button>
        ))}
      </div>

      {tab === 'add' && (
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span>XEL side (adds the {project.ticker} side at ratio)</span>
            <span className="text-foreground"><AnimatedNumber value={engine.xel} format={(v) => fmtXel(v)} /> XEL</span>
          </div>
          <div className="relative">
            <input
              type="number" min={0} value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              aria-label="XEL to provide"
              className="h-11 w-full border border-border bg-background/70 pr-14 pl-4 text-right font-mono tabular-nums text-foreground focus:border-xusd/60 focus:outline-none"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">XEL</span>
          </div>
          <div className="flex gap-1.5">
            {[100, 500, 1000, 5000].map((q) => (
              <button key={q} onClick={() => setAddAmount(String(q))}
                className="flex-1 border border-border bg-background/50 py-1.5 font-mono text-[11px] text-muted-foreground hover:border-xusd/40 hover:text-xusd">
                {q.toLocaleString()}
              </button>
            ))}
          </div>
          <div className="border border-border/60 bg-background/40 p-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
            You mint LP parts pro-rata (min 1 XEL). Exit any time, pro-rata both
            sides, price-neutral: it works even under an emergency pause. The
            protocol seed cannot compete with you, it never withdraws.
          </div>
          <BracketButton variant="teal" className="w-full" disabled={walletMode !== 'demo' || addAmt < 1} onClick={add}>
            Add liquidity
          </BracketButton>
        </div>
      )}

      {tab === 'position' && (
        <div className="space-y-3 p-4">
          {lp ? (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  ['YOUR PARTS', lp.parts.toFixed(2)],
                  ['POOL SHARE', `${share.toFixed(3)}%`],
                  ['XEL PROVIDED', fmtXel(lp.xelProvided)],
                  ['FEES EARNED', `${lp.feesEarnedXel.toFixed(3)} XEL`],
                ].map(([k, v]) => (
                  <div key={k} className="border border-border/60 bg-background/50 p-2.5 text-center">
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{k}</div>
                    <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-xusd">{v}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                  <span>remove pro-rata</span>
                  <span className="text-foreground">{removePct}%</span>
                </div>
                <input
                  type="range" min={1} max={100} value={removePct}
                  onChange={(e) => setRemovePct(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--xusd)]"
                  aria-label="Remove percentage"
                />
                <div className="mt-2 border border-border/60 bg-background/50 p-2.5 text-center font-mono text-[11px]">
                  you receive ≈ <span className="font-semibold text-emerald-400">{xelOut.toFixed(2)} XEL</span>
                  {' + '}<span className="font-semibold text-emerald-400">{tokenOut.toFixed(0)} {project.ticker}</span>
                </div>
              </div>
              <BracketButton variant="quiet" className="w-full" disabled={walletMode !== 'demo'} onClick={remove}>
                Remove {removePct}% of position
              </BracketButton>
            </>
          ) : (
            <div className="border border-dashed border-border py-8 text-center font-mono text-xs text-muted-foreground">
              no LP position in XEL/{project.ticker} yet · provide to earn 50% of the fees
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// The view
// ─────────────────────────────────────────────────────────────────

export function DexView({ setView, focusId }: {
  setView: (v: AppView, id?: string) => void
  focusId?: string | null
}) {
  const projects = useEngine((s) => s.projects)
  const pools = projects.filter((p) => !!p.pool)

  // Derived selection: focused pool if it exists, else grid mode.
  const project = pools.find((p) => p.id === focusId && p.pool)

  // ── GRID MODE: global stats + every pool ──
  if (!focusId || !project || !project.pool) {
    const totalVol = pools.reduce((a, p) => a + (p.pool?.volume24h ?? 0), 0)
    const totalTvl = pools.reduce((a, p) => a + (p.pool?.xel ?? 0), 0)
    const totalFees = pools.reduce((a, p) => a + (p.pool?.fees24h ?? 0), 0)
    return (
      <div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { k: 'POOLS', v: pools.length.toString(), sub: 'seed floors locked' },
            { k: 'TOTAL TVL', v: fmtXel(totalTvl), sub: 'XEL' },
            { k: 'VOLUME 24H', v: fmtXel(totalVol), sub: 'XEL' },
            { k: 'FEES 24H', v: totalFees.toFixed(1), sub: 'XEL · 50% to LPs' },
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
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">{s.sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold tracking-tight">Permanent-liquidity pools</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            click a pool to open its terminal
          </span>
        </div>

        {pools.length > 0 ? (
          <motion.div layout className="mt-4 grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {pools.map((p, i) => (
              <PoolCard key={p.id} p={p} rank={i} onOpen={() => setView('dex', p.id)} />
            ))}
          </motion.div>
        ) : (
          <div className="mt-8 border border-dashed border-border p-10 text-center font-mono text-sm text-muted-foreground">
            No pools on the DEX yet · projects graduate from the bonding curve.
          </div>
        )}
      </div>
    )
  }

  // ── POOL MODE: one pool, the full terminal ──
  const pool = project.pool
  const price = pool.xel / pool.token
  const first = pool.history[0] ?? price
  const change = first > 0 ? ((price - first) / first) * 100 : 0
  const seedShare = (pool.seedLocked / pool.xel) * 100

  return (
    <div>
      {/* back to all pools */}
      <button
        onClick={() => setView('dex', '')}
        className="group mb-4 inline-flex items-center gap-2 border border-border bg-card/50 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-xusd/40 hover:text-xusd"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        all pools
      </button>

      <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
        {/* Chart + pool data */}
        <div className="min-w-0 space-y-4">
          <div className="border border-border/70 bg-card/50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <PairLogo ticker={project.ticker} size="md" />
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">XEL / {project.ticker}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusTag status={project.status} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {project.name} · migrated · fee 0.30% · split 50/50
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl font-semibold tabular-nums">{fmtPrice(price)}</div>
                <div className={cn('font-mono text-xs font-semibold tabular-nums', change >= 0 ? 'text-emerald-400' : 'text-destructive')}>
                  {fmtPct(change, 1)} · XEL
                </div>
              </div>
            </div>

            <div className="mt-4">
              <PriceChart
                data={pool.history}
                histStart={pool.histStart}
                height={340}
                color={CHART_TEAL}
                defaultMode="candles"
                accent="teal"
              />
            </div>

            {/* The seed floor */}
            <div className="mt-4 border border-vault/25 bg-vault/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-vault">
                  ▣ the permanent floor
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  <span className="text-foreground">{fmtXel(pool.seedLocked)}</span> / <span className="text-foreground">{fmtXel(pool.xel)} XEL</span> = <span className="text-vault">{seedShare.toFixed(1)}%</span> of depth
                </span>
              </div>
              <div className="mt-2.5 flex h-3.5 overflow-hidden border border-border/60">
                <motion.div
                  className="h-full bg-vault"
                  animate={{ width: `${seedShare}%` }}
                  transition={{ type: 'spring', stiffness: 50, damping: 16 }}
                />
                <motion.div className="h-full bg-foreground/15" animate={{ width: `${100 - seedShare}%` }} />
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px]">
                <span className="text-vault">▣ protocol-locked · can never be withdrawn</span>
                <span className="text-muted-foreground">provider liquidity · exitable pro-rata any time</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                ['TVL', `${fmtXel(pool.xel)} XEL`],
                ['VOL 24H', `${fmtXel(pool.volume24h)}`],
                ['FEES 24H', `${pool.fees24h.toFixed(1)} XEL`],
                ['TOTAL PARTS', fmtXel(pool.totalParts)],
              ].map(([k, v]) => (
                <div key={k} className="border border-border/70 bg-background/50 p-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{k}</div>
                  <div className="mt-1.5 font-mono text-sm font-semibold tabular-nums text-foreground">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <LpPanel project={project} />
        </div>

        {/* Swap + why */}
        <div className="min-w-0 space-y-4">
          <SwapWidget project={project} />
          <div className="border border-border/70 bg-card/50 p-4">
            <PanelHead className="border-b-0 px-0 py-0" right="">why this pool is different</PanelHead>
            <ul className="mt-3 space-y-3 text-[11px] leading-relaxed text-muted-foreground">
              <li className="flex gap-2.5">
                <span className="mt-0.5 shrink-0 font-mono text-vault">▣</span>
                <span>The migration seed of {fmtXel(pool.seedLocked)} XEL is protocol-locked forever. No rug is possible, mathematically.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-0.5 shrink-0 font-mono text-xusd">⇄</span>
                <span>Providers exit pro-rata, both sides, price-neutral, ungated: even during an emergency pause.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-0.5 shrink-0 font-mono text-xusd">◈</span>
                <span>Every swap pays 0.30%: half to the protocol, half to providers. Your share accrues live on your position.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
