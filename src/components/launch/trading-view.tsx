// Trading view — the bonding-curve terminal: live chart, buy/sell with exact
// curve quotes, graduation progress, and the live activity feed.

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEngine } from '@/lib/launch/engine'
import { useToast } from '@/hooks/use-toast'
import { useLaunchWallet } from '@/lib/launch/wallet'
import { LiveChart, AnimatedNumber, Bar, BracketButton, AvatarMark, PanelHead, SquareDot } from './shared'
import { quoteBuy, quoteSell, fmtXel, fmtPrice, fmtPct } from '@/lib/launch/math'
import type { Project } from '@/lib/launch/types'
import { cn } from '@/lib/utils'
import type { AppView } from './app-shell'

function ProjectList({ projects, selectedId, onSelect }: {
  projects: Project[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex h-full flex-col border border-border/70 bg-card/50">
      <PanelHead right={`${projects.length} live`}>on the curve</PanelHead>
      <div className="max-h-[560px] flex-1 overflow-y-auto p-2">
        {projects.map((p) => {
          const price = p.curve ? p.curve.reserves / p.curve.circulating : 0
          const first = p.curve?.history[0] ?? price
          const chg = first > 0 ? ((price - first) / first) * 100 : 0
          const prog = p.curve ? p.curve.reserves / (p.curve.seed * 4) : 0
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={cn(
                'mb-1.5 w-full border p-3 text-left transition-colors',
                selectedId === p.id ? 'border-vault/50 bg-vault/10' : 'border-transparent hover:border-border hover:bg-card/70'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center border text-xs font-semibold"
                    style={{ borderColor: `hsl(${p.hue} 60% 60% / 0.45)`, backgroundColor: `hsl(${p.hue} 60% 50% / 0.12)`, color: `hsl(${p.hue} 65% 72%)` }}
                  >
                    {p.avatar}
                  </span>
                  <span className="text-sm font-semibold">{p.ticker}</span>
                </div>
                <span className={cn('font-mono text-xs font-semibold tabular-nums', chg >= 0 ? 'text-emerald-400' : 'text-destructive')}>
                  {fmtPct(chg, 1)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[11px]">
                <span className="tabular-nums text-foreground">{fmtPrice(price)} XEL</span>
                <span className="text-muted-foreground">{fmtXel(p.curve?.reserves ?? 0)}/{fmtXel((p.curve?.seed ?? 500) * 4)}</span>
              </div>
              <Bar value={prog} className="mt-1.5" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

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
                <div className="mt-0.5 tabular-nums">{fmtPrice(buyQ.avgPrice)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">FEE {curve ? (curve.feeBps / 100).toFixed(2) : 0.5}%</div>
                <div className="mt-0.5 tabular-nums">{buyQ.fee.toFixed(3)}</div>
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
                <div className="mt-0.5 tabular-nums">{fmtPrice(sellQ.avgPrice)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">FEE</div>
                <div className="mt-0.5 tabular-nums">{sellQ.fee.toFixed(3)}</div>
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
            <span className="tabular-nums">{fmtXel(position.tokens)} {project.ticker}</span>
            <span className="tabular-nums text-muted-foreground">avg {fmtPrice(position.avgPrice)}</span>
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
                <span className={cn('shrink-0 font-semibold', a.actor === 'you' ? 'text-vault' : 'text-foreground/85')}>
                  {a.actor === 'you' ? 'YOU' : a.actor}
                </span>
                <span className="truncate text-muted-foreground">
                  {a.kind === 'buy' && a.amountXel != null && `bought ${fmtXel(a.amountXel)} XEL${a.price ? ` @ ${fmtPrice(a.price)}` : ''}`}
                  {a.kind === 'sell' && a.amountXel != null && `sold ${fmtXel(a.tokens ?? 0)} ${p?.ticker ?? ''} @ ${fmtPrice(a.price ?? 0)}`}
                  {a.kind === 'swap' && a.amountXel != null && `swapped ${fmtXel(a.amountXel)} XEL${a.price ? ` @ ${fmtPrice(a.price)}` : ''}`}
                  {a.kind !== 'buy' && a.kind !== 'sell' && a.kind !== 'swap' && a.note}
                </span>
                <span className="ml-auto shrink-0 text-[9px] text-muted-foreground/60">
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

export function TradingView({ setView, focusId }: {
  setView: (v: AppView, id?: string) => void
  focusId?: string | null
}) {
  const projects = useEngine((s) => s.projects)
  const bonding = projects.filter((p) => p.status === 'bonding' && p.curve)

  // Selection is fully DERIVED (no sync effects): the focused project if it
  // is still on a curve, else the first live curve. A graduated project
  // falls back gracefully; the celebration overlay navigates to the DEX.
  const project = bonding.find((p) => p.id === focusId) ?? bonding[0]

  if (!project || !project.curve) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 text-center">
        <div className="font-mono text-sm text-muted-foreground">
          No projects on the bonding curve right now.
        </div>
        <BracketButton variant="quiet" onClick={() => setView('launchpad')}>
          Back to the launchpad
        </BracketButton>
      </div>
    )
  }

  const curve = project.curve
  const price = curve.reserves / curve.circulating
  const first = curve.history[0] ?? price
  const change = first > 0 ? ((price - first) / first) * 100 : 0
  const progress = curve.reserves / (curve.seed * 4)

  return (
    <div className="grid gap-4 xl:grid-cols-[260px_1fr_320px]">
      {/* Project list */}
      <div className="order-2 xl:order-1">
        <ProjectList projects={bonding} selectedId={project.id} onSelect={(id) => setView('trading', id)} />
      </div>

      {/* Chart + stats */}
      <div className="order-1 space-y-4 xl:order-2">
        <div className="border border-border/70 bg-card/50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <AvatarMark glyph={project.avatar} hue={project.hue} />
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
              <div className={cn('font-mono text-xs tabular-nums', change >= 0 ? 'text-emerald-400' : 'text-destructive')}>
                {fmtPct(change, 1)} · XEL
              </div>
            </div>
          </div>

          <div className="mt-4">
            <LiveChart data={curve.history} height={280} showGrid />
          </div>

          {/* graduation strip */}
          <div className="mt-4 border border-xusd/25 bg-xusd/5 p-3.5">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-muted-foreground">
                graduation at {fmtXel(curve.seed * 4)} XEL reserves
                <span className="text-foreground"> · {fmtXel(curve.reserves)} now</span>
              </span>
              <span className="font-bold tabular-nums text-xusd">{(progress * 100).toFixed(1)}%</span>
            </div>
            <Bar value={progress} className="mt-2" barClassName="bg-xusd" />
            <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>migrate() is permissionless and atomic · anyone can trigger it at 4×</span>
              <span>{fmtXel(curve.seed * 4 - curve.reserves)} XEL of buys to go</span>
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
                <div className="mt-1.5 font-mono text-sm font-semibold tabular-nums">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <ActivityFeed projectId={project.id} />
      </div>

      {/* Trade panel */}
      <div className="order-3">
        <TradePanel project={project} />
      </div>
    </div>
  )
}
