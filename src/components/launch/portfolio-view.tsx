// Portfolio view — the demo fortune, live positions with P&L, LP earnings,
// and the full activity history.

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEngine } from '@/lib/launch/engine'
import { useLaunchWallet } from '@/lib/launch/wallet'
import { AnimatedNumber, Bar, BracketButton, Sparkline, SquareDot } from './shared'
import { ProjectLogo, PairLogo } from './logos'
import { fmtXel, fmtPrice, fmtPct } from '@/lib/launch/math'
import { cn } from '@/lib/utils'
import type { AppView } from './app-shell'

const KIND_MARKS: Record<string, { glyph: string; cls: string }> = {
  buy: { glyph: '▲', cls: 'text-emerald-400' },
  sell: { glyph: '▼', cls: 'text-destructive' },
  swap: { glyph: '⇄', cls: 'text-xusd' },
  vote: { glyph: '✓', cls: 'text-vault-soft' },
  graduation: { glyph: '✦', cls: 'text-vault' },
  migration: { glyph: '▣', cls: 'text-xusd' },
  lp: { glyph: '◈', cls: 'text-vault' },
  proposal: { glyph: '◆', cls: 'text-vault-soft' },
}

export function PortfolioView({ setView }: { setView: (v: AppView, id?: string) => void }) {
  const engine = useEngine()
  const walletMode = useLaunchWallet((s) => s.mode)

  const priceOf = (ticker: string): { price: number; history: number[]; stage: 'curve' | 'dex' } => {
    const p = engine.projects.find((x) => x.ticker === ticker)
    if (p?.curve) return { price: p.curve.reserves / p.curve.circulating, history: p.curve.history, stage: 'curve' }
    if (p?.pool) return { price: p.pool.xel / p.pool.token, history: p.pool.history, stage: 'dex' }
    return { price: 0, history: [], stage: 'dex' }
  }

  const holdings = [
    { ticker: 'XEL', balance: engine.xel, price: 1, history: [] as number[], stage: 'dex' as const },
    ...Object.entries(engine.tokens)
      .filter(([, bal]) => bal > 0.01)
      .map(([ticker, balance]) => ({ ticker, balance, ...priceOf(ticker) })),
  ].map((r) => ({ ...r, value: r.balance * r.price }))

  const totalValue = holdings.reduce((a, h) => a + h.value, 0)

  const bondingPositions = engine.positions.map((pos) => {
    const p = engine.projects.find((x) => x.id === pos.projectId)
    const price = p?.curve ? p.curve.reserves / p.curve.circulating : 0
    const value = pos.tokens * price
    const cost = pos.tokens * pos.avgPrice
    return { pos, project: p, price, value, pnl: value - cost, pnlPct: cost > 0 ? ((value - cost) / cost) * 100 : 0 }
  }).filter((b) => b.project)

  const lpPositions = engine.lps.map((lp) => {
    const p = engine.projects.find((x) => x.id === lp.poolId)
    return { lp, project: p }
  }).filter((l) => l.project?.pool)

  return (
    <div className="space-y-5">
      {/* The fortune */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden border border-border/70 bg-card/50 p-7"
        >
          {/* corner brackets: this panel is the account headline */}
          <span aria-hidden className="absolute left-0 top-0 h-3.5 w-3.5 border-l-2 border-t-2 border-vault" />
          <span aria-hidden className="absolute right-0 top-0 h-3.5 w-3.5 border-r-2 border-t-2 border-vault" />
          <span aria-hidden className="absolute bottom-0 left-0 h-3.5 w-3.5 border-b-2 border-l-2 border-vault" />
          <span aria-hidden className="absolute bottom-0 right-0 h-3.5 w-3.5 border-b-2 border-r-2 border-vault" />

          <div className="relative">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <span className="h-1.5 w-1.5 bg-vault" />
              {walletMode === 'demo' ? 'demo wallet · total value' : 'xswd wallet · demo market value'}
            </div>
            <div className="mt-4 font-display text-5xl font-semibold tabular-nums tracking-tight text-foreground sm:text-6xl">
              <AnimatedNumber value={totalValue} format={(v) => v.toLocaleString('en-US', { maximumFractionDigits: 0 })} />
              <span className="ml-3 font-mono text-xl text-muted-foreground">XEL</span>
            </div>
            <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              a treasury built for testing every animation · buy, sell, provide,
              graduate something, watch the fees accrue
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <BracketButton variant="primary" size="sm" onClick={() => setView('trading')}>Trade the curve</BracketButton>
              <BracketButton variant="teal" size="sm" onClick={() => setView('dex')}>Provide liquidity</BracketButton>
              <BracketButton variant="quiet" size="sm" onClick={() => setView('launchpad')}>Vote on proposals</BracketButton>
            </div>
          </div>
        </motion.div>

        {/* Holdings */}
        <div className="border border-border/70 bg-card/50 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">holdings</div>
          <div className="mt-3 divide-y divide-border/40">
            {holdings.map((h) => (
              <div key={h.ticker} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <ProjectLogo ticker={h.ticker} size="sm" />
                  <div>
                    <div className="text-sm font-semibold">{h.ticker}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {h.ticker === 'XEL' ? 'native' : h.stage === 'curve' ? 'bonding curve' : 'LaunchDEX'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {h.history.length > 2 && h.ticker !== 'XEL' && <Sparkline data={h.history.slice(-45)} width={70} height={22} />}
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold tabular-nums">
                      <AnimatedNumber value={h.balance} format={(v) => fmtXel(v)} />
                    </div>
                    {h.ticker !== 'XEL' && (
                      <div className="font-mono text-[10px] text-muted-foreground">
                        @ {fmtPrice(h.price)} · <span className="text-foreground">{fmtXel(h.value)} XEL</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Positions */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bonding positions */}
        <div className="border border-border/70 bg-card/50 p-5">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">bonding curve positions</div>
            <span className="font-mono text-[10px] text-vault">{bondingPositions.length} open</span>
          </div>
          <div className="mt-3 space-y-3">
            {bondingPositions.length === 0 && (
              <div className="border border-dashed border-border py-6 text-center font-mono text-xs text-muted-foreground">
                no curve positions · buy something on the Curve Trading tab
              </div>
            )}
            {bondingPositions.map(({ pos, project, price, value, pnl, pnlPct }) => (
              <div key={pos.projectId} className="border border-border/60 bg-background/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ProjectLogo ticker={project!.ticker} size="sm" />
                    <div>
                      <div className="text-sm font-semibold">{project!.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {fmtXel(pos.tokens)} {project!.ticker} @ avg {fmtPrice(pos.avgPrice)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold tabular-nums">{fmtXel(value)} XEL</div>
                    <div className={cn('font-mono text-[11px] font-semibold tabular-nums', pnl >= 0 ? 'text-emerald-400' : 'text-destructive')}>
                      {fmtPct(pnlPct, 1)} ({pnl >= 0 ? '+' : ''}{fmtXel(Math.abs(pnl))} XEL)
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                    <span>entry {fmtPrice(pos.avgPrice)} → now {fmtPrice(price)}</span>
                    <button onClick={() => setView('trading', pos.projectId)} className="text-vault hover:underline">
                      trade →
                    </button>
                  </div>
                  <Bar value={Math.min(1, Math.max(0, 0.5 + pnlPct / 100))} className="mt-1.5 h-[3px]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LP positions */}
        <div className="border border-border/70 bg-card/50 p-5">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">liquidity provided</div>
            <span className="font-mono text-[10px] text-xusd">{lpPositions.length} pools</span>
          </div>
          <div className="mt-3 space-y-3">
            {lpPositions.length === 0 && (
              <div className="border border-dashed border-border py-6 text-center font-mono text-xs text-muted-foreground">
                no LP positions · provide on the LaunchDEX tab and earn 50% of the fees
              </div>
            )}
            {lpPositions.map(({ lp, project }) => {
              const pool = project!.pool!
              const share = lp.parts / pool.totalParts
              const xelNow = share * pool.xel
              return (
                <div key={lp.poolId} className="border border-border/60 bg-background/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <PairLogo ticker={project!.ticker} size="sm" />
                      <div>
                        <div className="text-sm font-semibold">XEL / {project!.ticker}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {lp.parts.toFixed(0)} parts · {(share * 100).toFixed(3)}% of the pool
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold tabular-nums">{fmtXel(xelNow)} XEL</div>
                      <div className="font-mono text-[11px] font-semibold tabular-nums text-emerald-400">
                        +{lp.feesEarnedXel.toFixed(3)} XEL fees
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between font-mono text-[10px] text-muted-foreground">
                    <span>fees accrue live on every swap · 50% of the 0.30%</span>
                    <button onClick={() => setView('dex', lp.poolId)} className="text-xusd hover:underline">
                      manage →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Full activity */}
      <div className="border border-border/70 bg-card/50 p-5">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <SquareDot className="text-vault" /> your full activity
        </div>
        <div className="mt-3 max-h-80 divide-y divide-border/40 overflow-y-auto">
          {engine.activity.filter((a) => a.actor === 'you').length === 0 && (
            <div className="border border-dashed border-border py-6 text-center font-mono text-xs text-muted-foreground">
              nothing yet · your trades will appear here
            </div>
          )}
          <AnimatePresence initial={false}>
            {engine.activity.filter((a) => a.actor === 'you').map((a) => {
              const p = engine.projects.find((x) => x.id === a.projectId)
              const mark = KIND_MARKS[a.kind] ?? { glyph: '·', cls: 'text-muted-foreground' }
              return (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 py-2.5 font-mono text-xs"
                >
                  <span className={cn('text-sm', mark.cls)}>{mark.glyph}</span>
                  <span className="font-semibold">{p?.ticker ?? ''}</span>
                  <span className="text-muted-foreground">
                    {a.note ?? `${a.kind} ${a.amountXel != null ? fmtXel(a.amountXel) + ' XEL' : ''}`}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground/80">
                    {new Date(a.ts).toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
