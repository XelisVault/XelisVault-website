// Trading view — the bonding-curve terminal.
//
// Two modes, pump.fun-style:
//   • GRID (no focus): every live curve as a rich card — price, change,
//     graduation progress, sparkline. Click → the asset's own page.
//   • ASSET (focus): ONE curve only — big chart with intervals, buy/sell
//     with exact curve quotes, graduation strip, stats, live feed.
//     No other assets on screen: the asset IS the page.

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useEngine } from '@/lib/launch/engine'
import { useToast } from '@/hooks/use-toast'
import { useLaunchWallet } from '@/lib/launch/wallet'
import { AnimatedNumber, Bar, BracketButton, SquareDot, Sparkline, StatusTag } from './shared'
import { ProjectLogo } from './logos'
import { PriceChart } from './chart'
import { quoteBuy, quoteSell, fmtXel, fmtPrice, fmtPct } from '@/lib/launch/math'
import type { Project } from '@/lib/launch/types'
import { cn } from '@/lib/utils'
import type { AppView } from './app-shell'

// ─────────────────────────────────────────────────────────────────
// GRID MODE — all the curves at a glance
// ─────────────────────────────────────────────────────────────────

function curveChange(p: Project): number {
  if (!p.curve) return 0
  const price = p.curve.reserves / p.curve.circulating
  const first = p.curve.history[0] ?? price
  return first > 0 ? ((price - first) / first) * 100 : 0
}

function CurveCard({ p, rank, onOpen }: { p: Project; rank: number; onOpen: () => void }) {
  if (!p.curve) return null
  const price = p.curve.reserves / p.curve.circulating
  const chg = curveChange(p)
  const progress = p.curve.reserves / (p.curve.seed * 4)
  const etaXel = p.curve.seed * 4 - p.curve.reserves
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, delay: rank * 0.04 }}
      onClick={onOpen}
      className="group relative flex flex-col border border-border/80 bg-card/50 p-5 text-left transition-colors hover:border-vault/40 hover:bg-card/80"
    >
      <span className="absolute right-4 top-4 font-mono text-[9px] text-muted-foreground" aria-hidden>
        {String(rank + 1).padStart(2, '0')}
      </span>

      <div className="flex items-start justify-between gap-3 pr-6">
        <div className="flex items-center gap-3">
          <ProjectLogo ticker={p.ticker} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight">{p.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">${p.ticker}</span>
            </div>
            <div className="mt-1.5"><StatusTag status={p.status} /></div>
          </div>
        </div>
        <Sparkline data={p.curve.history.slice(-48)} width={78} height={26} />
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

      {/* graduation strip */}
      <div className="mt-4 border border-xusd/25 bg-xusd/5 p-3">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span className="text-muted-foreground">
            graduation <span className="text-foreground">{fmtXel(p.curve.reserves)} / {fmtXel(p.curve.seed * 4)} XEL</span>
          </span>
          <span className="font-bold tabular-nums text-xusd">{(progress * 100).toFixed(1)}%</span>
        </div>
        <Bar value={progress} className="mt-2" barClassName="bg-xusd" />
        <div className="mt-2 flex items-center justify-between font-mono text-[10px]">
          <span className="text-foreground">{fmtXel(etaXel)} XEL of buys to go</span>
          <span className="text-foreground">{p.curve.holders} holders</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ['VOL 24H', `${fmtXel(p.curve.volume24h)}`],
          ['HOLDERS', p.curve.holders.toString()],
          ['TEAM', `≤ ${(p.curve.teamBps / 100).toFixed(0)}%`],
        ].map(([k, v]) => (
          <div key={k} className="border border-border/70 bg-background/50 p-2.5 text-center">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</div>
            <div className="mt-1 font-mono text-xs font-semibold tabular-nums text-foreground">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 font-mono text-[10px] uppercase tracking-[0.16em]">
        <span className="text-muted-foreground">fee {(p.curve.feeBps / 100).toFixed(2)}% · seed {fmtXel(p.curve.seed)} XEL</span>
        <span className="text-vault opacity-0 transition-opacity group-hover:opacity-100">open chart →</span>
      </div>
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────────
// ASSET MODE — one curve, the full terminal
// ─────────────────────────────────────────────────────────────────

/** Square side-switch for the trade panel: BUY | SELL. */
function SideSwitch({ side, onChange }: { side: 'buy' | 'sell'; onChange: (s: 'buy' | 'sell') => void }) {
  return (
    <div className="grid grid-cols-2 border border-border">
      {(['buy', 'sell'] as const).map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={cn(
            'relative py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors',
            side === s
              ? s === 'buy' ? 'bg-vault/12 text-vault' : 'bg-destructive/12 text-destructive'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {s === 'buy' ? '▲ Buy' : '▼ Sell'}
          {side === s && (
            <motion.span
              layoutId="side-switch-marker"
              className={cn('absolute inset-x-0 bottom-0 h-[2px]', s === 'buy' ? 'bg-vault' : 'bg-destructive')}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
        </button>
      ))}
    </div>
  )
}

function TradePanel({ project }: { project: Project }) {
  const engine = useEngine()
  const { toast } = useToast()
  const walletMode = useLaunchWallet((s) => s.mode)
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [buyAmount, setBuyAmount] = useState('100')
  const [sellAmount, setSellAmount] = useState('1000')
  const [busy, setBusy] = useState(false)

  const curve = project.curve
  const buyAmt = Math.max(0, Number(buyAmount) || 0)
  const sellAmt = Math.max(0, Number(sellAmount) || 0)

  const buyQ = curve ? quoteBuy(buyAmt, curve.reserves, curve.circulating, curve.feeBps) : null
  const sellQ = curve ? quoteSell(sellAmt, curve.reserves, curve.circulating, curve.feeBps) : null

  const owned = engine.tokens[project.ticker] ?? 0
  const position = engine.positions.find((p) => p.projectId === project.id)

  async function execute() {
    setBusy(true)
    try {
      const res = side === 'buy' ? engine.buy(project.id, buyAmt) : engine.sell(project.id, sellAmt)
      toast({
        title: res.ok ? (side === 'buy' ? 'Buy executed' : 'Sell executed') : 'Order rejected',
        description: res.message,
        variant: res.ok ? 'default' : 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const insufficient = side === 'buy' ? buyAmt > engine.xel : sellAmt > owned
  const amountInvalid = side === 'buy' ? buyAmt <= 0 : sellAmt <= 0
  const disabled = walletMode !== 'demo' || busy || amountInvalid || insufficient

  return (
    <div className="flex h-full flex-col border border-border/70 bg-card/50">
      <div className="border-b border-border/60 p-3">
        <SideSwitch side={side} onChange={setSide} />
      </div>

      <div className="flex-1 space-y-4 p-4">
        <div>
          <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span>{side === 'buy' ? 'you pay' : 'you sell'}</span>
            <span className={cn(side === 'sell' && owned > 0 && 'text-foreground')}>
              {side === 'buy' ? (
                <><AnimatedNumber value={engine.xel} format={(v) => fmtXel(v)} /> XEL</>
              ) : (
                <><AnimatedNumber value={owned} format={(v) => fmtXel(v)} /> {project.ticker}</>
              )}
            </span>
          </div>
          <div className="relative mt-1.5">
            <input
              type="number"
              min={0}
              value={side === 'buy' ? buyAmount : sellAmount}
              onChange={(e) => side === 'buy' ? setBuyAmount(e.target.value) : setSellAmount(e.target.value)}
              aria-label={side === 'buy' ? 'XEL amount to buy' : 'Token amount to sell'}
              className="h-12 w-full border border-border bg-background/70 pr-16 pl-4 text-right font-mono text-lg tabular-nums text-foreground focus:border-vault/60 focus:outline-none"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
              {side === 'buy' ? 'XEL' : project.ticker}
            </span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {side === 'buy'
              ? [25, 100, 250, 500].map((q) => (
                  <button
                    key={q}
                    onClick={() => setBuyAmount(String(q))}
                    className="flex-1 border border-border bg-background/50 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-vault/40 hover:text-vault"
                  >
                    {q}
                  </button>
                ))
              : [25, 50, 75].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setSellAmount(String(Math.floor(owned * pct / 100)))}
                    className="flex-1 border border-border bg-background/50 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                  >
                    {pct}%
                  </button>
                ))}
            <button
              onClick={() => side === 'buy' ? setBuyAmount(String(Math.floor(engine.xel))) : setSellAmount(String(Math.floor(owned)))}
              className="flex-1 border border-border bg-background/50 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-vault/40 hover:text-vault"
            >
              MAX
            </button>
          </div>
        </div>

        {/* quote */}
        {side === 'buy' && buyQ && buyAmt > 0 && (
          <div className="space-y-2.5 border border-vault/25 bg-vault/5 p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] text-muted-foreground">you receive</span>
              <span className="font-mono text-lg font-bold tabular-nums text-vault">
                {buyQ.out.toFixed(2)} <span className="text-xs">{project.ticker}</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-vault/15 pt-2.5 font-mono text-[10px]">
              <div>
                <div className="text-muted-foreground">AVG PRICE</div>
                <div className="mt-0.5 tabular-nums text-foreground">{fmtPrice(buyQ.avgPrice)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">FEE {curve ? (curve.feeBps / 100).toFixed(2) : 0.5}%</div>
                <div className="mt-0.5 tabular-nums text-foreground">{buyQ.fee.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">IMPACT</div>
                <div className={cn('mt-0.5 tabular-nums', buyQ.impactPct > 15 ? 'text-vault-soft' : 'text-emerald-400')}>
                  {buyQ.impactPct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}
        {side === 'sell' && sellQ && sellAmt > 0 && (
          <div className="space-y-2.5 border border-destructive/25 bg-destructive/5 p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] text-muted-foreground">you receive</span>
              <span className="font-mono text-lg font-bold tabular-nums text-emerald-400">
                {sellQ.out.toFixed(4)} <span className="text-xs">XEL</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-destructive/15 pt-2.5 font-mono text-[10px]">
              <div>
                <div className="text-muted-foreground">AVG PRICE</div>
                <div className="mt-0.5 tabular-nums text-foreground">{fmtPrice(sellQ.avgPrice)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">FEE</div>
                <div className="mt-0.5 tabular-nums text-foreground">{sellQ.fee.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">IMPACT</div>
                <div className="mt-0.5 tabular-nums text-destructive">{sellQ.impactPct.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        )}

        <BracketButton
          variant={side === 'buy' ? 'strong' : 'danger'}
          size="lg"
          className="w-full"
          disabled={disabled}
          onClick={execute}
        >
          {walletMode !== 'demo'
            ? 'demo wallet required'
            : insufficient
              ? `insufficient ${side === 'buy' ? 'XEL' : project.ticker}`
              : side === 'buy' ? `Buy ${project.ticker}` : `Sell ${project.ticker}`}
        </BracketButton>

        <div className="border border-border/60 bg-background/40 p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
          {side === 'buy'
            ? 'out = C·net/(R+net), the exact on-chain formula, integer-exact in the contract. Your buy pays the 0.50% curve fee and pushes the price up the curve.'
            : 'Sells are ALWAYS open: even if the project turns untrusted, even under a pause. gross = R·T/(C+T) minus the 0.50% fee. No lockups on the curve, ever.'}
        </div>
      </div>

      {/* Your position */}
      {position && position.tokens > 0 && curve && (
        <div className="border-t border-border/60 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">your position</div>
          <div className="mt-2 flex items-center justify-between font-mono text-xs">
            <span className="tabular-nums text-foreground">{fmtXel(position.tokens)} {project.ticker}</span>
            <span className="tabular-nums text-muted-foreground">avg <span className="text-foreground">{fmtPrice(position.avgPrice)}</span></span>
          </div>
          {(() => {
            const cur = curve.reserves / curve.circulating
            const pnl = (cur - position.avgPrice) / position.avgPrice * 100
            return (
              <div className="mt-1.5 flex items-center justify-between font-mono text-xs">
                <span className="text-muted-foreground">unrealized P&amp;L</span>
                <span className={cn('font-semibold tabular-nums', pnl >= 0 ? 'text-emerald-400' : 'text-destructive')}>{fmtPct(pnl, 1)}</span>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

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

function ActivityFeed({ projectId, all }: { projectId?: string; all?: boolean }) {
  const activity = useEngine((s) => s.activity)
  const projects = useEngine((s) => s.projects)
  const items = (all ? activity : activity.filter((a) => a.projectId === projectId)).slice(0, 14)

  return (
    <div className="flex h-full flex-col border border-border/70 bg-card/50">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <SquareDot className="text-vault" /> live activity
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{all ? 'all stages' : 'this curve'}</span>
      </div>
      <div className="max-h-72 flex-1 overflow-y-auto p-2">
        <AnimatePresence initial={false}>
          {items.map((a) => {
            const p = projects.find((x) => x.id === a.projectId)
            const mark = KIND_MARKS[a.kind] ?? { glyph: '·', cls: 'text-muted-foreground' }
            return (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2.5 px-2.5 py-2 font-mono text-[11px] hover:bg-card/70"
              >
                <span className={cn('shrink-0 text-[10px]', mark.cls)}>{mark.glyph}</span>
                <span className={cn('shrink-0 font-semibold', a.actor === 'you' ? 'text-vault' : 'text-foreground')}>
                  {a.actor === 'you' ? 'YOU' : a.actor}
                </span>
                <span className="truncate text-muted-foreground">
                  {a.kind === 'buy' && a.amountXel != null && `bought ${fmtXel(a.amountXel)} XEL${a.price ? ` @ ${fmtPrice(a.price)}` : ''}`}
                  {a.kind === 'sell' && a.amountXel != null && `sold ${fmtXel(a.tokens ?? 0)} ${p?.ticker ?? ''} @ ${fmtPrice(a.price ?? 0)}`}
                  {a.kind === 'swap' && a.amountXel != null && `swapped ${fmtXel(a.amountXel)} XEL${a.price ? ` @ ${fmtPrice(a.price)}` : ''}`}
                  {a.kind !== 'buy' && a.kind !== 'sell' && a.kind !== 'swap' && a.note}
                </span>
                <span className="ml-auto shrink-0 text-[9px] text-muted-foreground">
                  {p?.ticker ?? ''}
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// The view
// ─────────────────────────────────────────────────────────────────

export function TradingView({ setView, focusId }: {
  setView: (v: AppView, id?: string) => void
  focusId?: string | null
}) {
  const projects = useEngine((s) => s.projects)
  const bonding = projects.filter((p) => p.status === 'bonding' && p.curve)

  // The focused project if it is STILL on a curve (a graduated project
  // falls back to the grid — the migration overlay handles navigation).
  const project = bonding.find((p) => p.id === focusId)

  // ── GRID MODE: every live curve ──
  if (!focusId || !project || !project.curve) {
    const totalVol = bonding.reduce((a, p) => a + (p.curve?.volume24h ?? 0), 0)
    return (
      <div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { k: 'ON THE CURVE', v: bonding.length.toString(), sub: bonding.map((p) => p.ticker).join(' · ') || 'none' },
            { k: 'CURVE VOLUME 24H', v: fmtXel(totalVol), sub: 'XEL' },
            { k: 'GRADUATION', v: '4× seed', sub: 'migrate() is permissionless' },
            { k: 'CURVE FEE', v: '0.50%', sub: 'both sides, always' },
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

        <div className="mt-5 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold tracking-tight">Bonding curves · live</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            click an asset to open its terminal
          </span>
        </div>

        {bonding.length > 0 ? (
          <motion.div layout className="mt-4 grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {bonding.map((p, i) => (
                <CurveCard key={p.id} p={p} rank={i} onOpen={() => setView('trading', p.id)} />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="mt-8 border border-dashed border-border p-10 text-center font-mono text-sm text-muted-foreground">
            No projects on the bonding curve right now.
          </div>
        )}
      </div>
    )
  }

  // ── ASSET MODE: one curve, the full terminal ──
  const curve = project.curve
  const price = curve.reserves / curve.circulating
  const first = curve.history[0] ?? price
  const change = first > 0 ? ((price - first) / first) * 100 : 0
  const progress = curve.reserves / (curve.seed * 4)

  return (
    <div>
      {/* back to all curves */}
      <button
        onClick={() => setView('trading', '')}
        className="group mb-4 inline-flex items-center gap-2 border border-border bg-card/50 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-vault/40 hover:text-vault"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        all curves
      </button>

      <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
        {/* Chart + data */}
        <div className="min-w-0 space-y-4">
          <div className="border border-border/70 bg-card/50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <ProjectLogo ticker={project.ticker} size="lg" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight">{project.name}</h2>
                      <span className="font-mono text-xs text-muted-foreground">${project.ticker}</span>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      bonding curve · fee {(curve.feeBps / 100).toFixed(2)}% · team ≤ {(curve.teamBps / 100).toFixed(0)}%
                    </div>
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
                data={curve.history}
                histStart={curve.histStart}
                height={360}
                defaultMode="candles"
              />
            </div>

            {/* graduation strip */}
            <div className="mt-4 border border-xusd/25 bg-xusd/5 p-3.5">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-muted-foreground">
                  graduation at <span className="text-foreground">{fmtXel(curve.seed * 4)} XEL</span> reserves
                  <span className="text-foreground"> · {fmtXel(curve.reserves)} now</span>
                </span>
                <span className="font-bold tabular-nums text-xusd">{(progress * 100).toFixed(1)}%</span>
              </div>
              <Bar value={progress} className="mt-2" barClassName="bg-xusd" />
              <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>migrate() is permissionless and atomic · anyone can trigger it at 4×</span>
                <span className="text-foreground">{fmtXel(curve.seed * 4 - curve.reserves)} XEL of buys to go</span>
              </div>
            </div>

            {/* stats row */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                ['VOLUME 24H', `${fmtXel(curve.volume24h)} XEL`],
                ['HOLDERS', curve.holders.toString()],
                ['MARKET CAP', `${fmtXel(curve.reserves)} XEL`],
                ['CURVE INVENTORY', fmtXel(curve.circulating)],
              ].map(([k, v]) => (
                <div key={k} className="border border-border/70 bg-background/50 p-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{k}</div>
                  <div className="mt-1.5 font-mono text-sm font-semibold tabular-nums text-foreground">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <ActivityFeed projectId={project.id} />
        </div>

        {/* Trade panel */}
        <div className="min-w-0">
          <TradePanel project={project} />
        </div>
      </div>
    </div>
  )
}
