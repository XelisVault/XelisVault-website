// Trading view — the bonding-curve terminal (MAINNET).
//
// Two modes, pump.fun-style:
//   • GRID (no focus): every live curve as a rich card — price, change,
//     graduation progress, sparkline. Click → the asset's own page.
//   • ASSET (focus): ONE curve only — big chart with intervals, buy/sell
//     with EXACT integer curve quotes and slippage-protected min_out,
//     graduation strip, on-chain scoreboard.
//
// XELIS balances are confidential: the "your balance" panel reads the
// connected wallet (the only possible source) — there is no on-chain
// ledger of who owns what.

'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useMainnet, graduationOf } from '@/lib/launch/mainnet-store'
import { useToast } from '@/hooks/use-toast'
import { useLaunchWallet } from '@/lib/launch/wallet'
import { buyCurveTx, sellCurveTx } from '@/lib/launch/tx'
import {
  curveBuyQuote, curveSellQuote, toAtomic, withSlippage, fmtAtomic, toHuman,
} from '@/lib/launch/chain-math'
import { AnimatedNumber, Bar, BracketButton, SquareDot, Sparkline, StatusTag } from './shared'
import { ProjectLogo } from './logos'
import { PriceChart } from './chart'
import { fmtXel, fmtPrice, fmtPct } from '@/lib/launch/math'
import type { Project } from '@/lib/launch/types'
import { cn } from '@/lib/utils'
import type { AppView } from './launchpad-view'

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
  const params = useMainnet((s) => s.params)
  if (!p.curve) return null
  const price = p.curve.reserves / p.curve.circulating
  const chg = curveChange(p)
  const progress = graduationOf(p, params)
  const target = p.curve.seed * params.graduationMultiplier
  const etaXel = Math.max(0, target - p.curve.reserves)
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
            graduation <span className="text-foreground">{fmtXel(p.curve.reserves)} / {fmtXel(target)} XEL</span>
          </span>
          <span className="font-bold tabular-nums text-xusd">{(progress * 100).toFixed(1)}%</span>
        </div>
        <Bar value={progress} className="mt-2" barClassName="bg-xusd" />
        <div className="mt-2 flex items-center justify-between font-mono text-[10px]">
          <span className="text-foreground">{fmtXel(etaXel)} XEL of buys to go</span>
          <span className="text-foreground">{p.curve.trades} trades</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ['VOLUME', `${fmtXel(p.curve.volume)}`],
          ['TRADES', p.curve.trades.toString()],
          ['TEAM', `${(p.curve.teamBps / 100).toFixed(0)}%`],
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
              : 'text-muted-foreground hover:text-foreground',
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

const SLIPPAGE_CHOICES = [0.5, 1, 2]

function TradePanel({ project }: { project: Project }) {
  const { toast } = useToast()
  const wallet = useLaunchWallet()
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [buyAmount, setBuyAmount] = useState('10')
  const [sellAmount, setSellAmount] = useState('100')
  const [slippagePct, setSlippagePct] = useState(1)
  const [busy, setBusy] = useState(false)

  const curve = project.curve
  const connected = wallet.state === 'connected' && !!wallet.address
  const owned = project.asset ? (wallet.assetBalances[project.asset] ?? 0) : 0
  const xelBalance = wallet.xelBalance ?? 0

  // make sure the wallet tracks this project's asset (to read the balance)
  useEffect(() => {
    if (connected && project.asset) void wallet.ensureAsset(project.asset)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, project.asset])

  const buyAmt = Math.max(0, Number(buyAmount) || 0)
  const sellAmt = Math.max(0, Number(sellAmount) || 0)

  // EXACT integer quotes (the same formulas the contract runs)
  const reservesA = curve ? toAtomic(curve.reserves) : 0n
  const curveA = curve ? toAtomic(curve.circulating) : 0n
  const buyQuote = curve && buyAmt > 0
    ? curveBuyQuote(reservesA, curveA, toAtomic(buyAmt), curve.feeBps)
    : null
  const sellQuote = curve && sellAmt > 0
    ? curveSellQuote(reservesA, curveA, toAtomic(sellAmt), curve.feeBps)
    : null
  const buyFee = curve && buyAmt > 0 ? toAtomic(buyAmt) * BigInt(curve.feeBps) / 10000n : 0n

  const minOut = buyQuote ? withSlippage(buyQuote, Math.round(slippagePct * 100)) : 0n

  async function execute() {
    if (!curve) return
    setBusy(true)
    try {
      const res = side === 'buy'
        ? await buyCurveTx(project.pid, toAtomic(buyAmt), minOut)
        : await sellCurveTx(project.pid, project.asset!, toAtomic(sellAmt))
      toast({
        title: res.ok ? (side === 'buy' ? 'Buy broadcast' : 'Sell broadcast') : 'Transaction failed',
        description: res.message,
        variant: res.ok ? 'default' : 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const insufficient = side === 'buy' ? buyAmt > xelBalance : sellAmt > owned
  const amountInvalid = side === 'buy' ? buyAmt <= 0 : sellAmt <= 0
  const disabled = !connected || busy || amountInvalid || insufficient

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
                <><AnimatedNumber value={xelBalance} format={(v) => fmtXel(v)} /> XEL</>
              ) : (
                <><AnimatedNumber value={owned} format={(v) => fmtXel(v)} /> {project.ticker}</>
              )}
            </span>
          </div>
          <div className="relative mt-1.5">
            <input
              type="number"
              min={0}
              step="any"
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
              ? [1, 5, 10, 50].map((q) => (
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
                    onClick={() => setSellAmount(String(owned * pct / 100))}
                    className="flex-1 border border-border bg-background/50 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                  >
                    {pct}%
                  </button>
                ))}
            <button
              onClick={() => side === 'buy' ? setBuyAmount(String(Math.floor(xelBalance * 100) / 100)) : setSellAmount(String(owned))}
              className="flex-1 border border-border bg-background/50 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-vault/40 hover:text-vault"
            >
              MAX
            </button>
          </div>
        </div>

        {/* slippage (buy side — min_out protection) */}
        {side === 'buy' && (
          <div className="flex items-center justify-between border border-border/60 bg-background/40 px-3 py-2 font-mono text-[10px] text-muted-foreground">
            <span>slippage tolerance</span>
            <div className="flex gap-1">
              {SLIPPAGE_CHOICES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippagePct(s)}
                  className={cn(
                    'border px-2 py-0.5 transition-colors',
                    slippagePct === s
                      ? 'border-vault/50 bg-vault/10 text-vault'
                      : 'border-border hover:text-foreground',
                  )}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* quote */}
        {side === 'buy' && buyQuote && buyAmt > 0 && (
          <div className="space-y-2.5 border border-vault/25 bg-vault/5 p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] text-muted-foreground">you receive (est.)</span>
              <span className="font-mono text-lg font-bold tabular-nums text-vault">
                {toHuman(buyQuote).toLocaleString('en-US', { maximumFractionDigits: 2 })} <span className="text-xs">{project.ticker}</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-vault/15 pt-2.5 font-mono text-[10px]">
              <div>
                <div className="text-muted-foreground">MIN OUT</div>
                <div className="mt-0.5 tabular-nums text-foreground">{toHuman(minOut).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">FEE {curve ? (curve.feeBps / 100).toFixed(2) : 0.5}%</div>
                <div className="mt-0.5 tabular-nums text-foreground">{toHuman(buyFee).toFixed(3)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">AVG PRICE</div>
                <div className="mt-0.5 tabular-nums text-foreground">
                  {fmtPrice(buyAmt / Math.max(1e-9, toHuman(buyQuote)))}
                </div>
              </div>
            </div>
          </div>
        )}
        {side === 'sell' && sellQuote && sellAmt > 0 && (
          <div className="space-y-2.5 border border-destructive/25 bg-destructive/5 p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] text-muted-foreground">you receive (est.)</span>
              <span className="font-mono text-lg font-bold tabular-nums text-emerald-400">
                {fmtAtomic(sellQuote, 4)} <span className="text-xs">XEL</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-destructive/15 pt-2.5 font-mono text-[10px]">
              <div>
                <div className="text-muted-foreground">FEE {curve ? (curve.feeBps / 100).toFixed(2) : 0.5}%</div>
                <div className="mt-0.5 tabular-nums text-foreground">
                  included
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">AVG PRICE</div>
                <div className="mt-0.5 tabular-nums text-foreground">
                  {fmtPrice(toHuman(sellQuote) / Math.max(1e-9, sellAmt))}
                </div>
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
          {!connected
            ? 'connect wallet to trade'
            : insufficient
              ? `insufficient ${side === 'buy' ? 'XEL' : project.ticker}`
              : side === 'buy' ? `Buy ${project.ticker}` : `Sell ${project.ticker}`}
        </BracketButton>

        <div className="border border-border/60 bg-background/40 p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
          {side === 'buy'
            ? `out = C·net/(R+net), the exact on-chain formula (u128, integer-exact). Your buy pays the ${(curve ? curve.feeBps / 100 : 0.5).toFixed(2)}% curve fee and pushes the price up the curve. min_out = quote − ${slippagePct}% slippage.`
            : 'Sells are ALWAYS open: even if the project turns untrusted, even under a pause. The WHOLE attached deposit is sold (D14). No lockups on the curve, ever.'}
        </div>
      </div>

      {/* wallet balance of this token */}
      {connected && (
        <div className="border-t border-border/60 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">your wallet</div>
          <div className="mt-2 flex items-center justify-between font-mono text-xs">
            <span className="tabular-nums text-foreground">
              {fmtXel(owned)} {project.ticker}
            </span>
            <span className="tabular-nums text-muted-foreground">
              ≈ {fmtXel(owned * (curve ? curve.reserves / curve.circulating : 0))} XEL
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/** On-chain scoreboard + team panel (replaces the simulated live feed). */
function ChainScoreboard({ project }: { project: Project }) {
  const rows: [string, string][] = [
    ['BUY VOLUME', `${fmtXel(project.curve?.volume ?? 0)} XEL`],
    ['TRADES', (project.curve?.trades ?? 0).toString()],
    ['MARKET CAP', `${fmtXel(project.curve?.marketCap ?? 0)} XEL`],
    ['ATH MARKET CAP', `${fmtXel(project.curve?.marketCapHigh ?? 0)} XEL`],
    ['TRUST FOR / AGAINST', `${project.trust.up} / ${project.trust.down}`],
    ['TEAM ALLOCATION', `${(project.teamBps / 100).toFixed(1)}%`],
    ['VESTING PLAN', project.vestingPlanTopos > 0 ? 'linear · declared' : 'claim at graduation'],
    ['SUPPLY', project.totalSupply.toLocaleString('en-US')],
  ]
  return (
    <div className="flex h-full flex-col border border-border/70 bg-card/50">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <SquareDot className="text-vault" /> on-chain scoreboard
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">kept by the contract</span>
      </div>
      <div className="flex-1 p-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-2.5 py-2 font-mono text-[11px] hover:bg-card/70">
            <span className="text-muted-foreground">{k}</span>
            <span className="tabular-nums text-foreground">{v}</span>
          </div>
        ))}
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
  const projects = useMainnet((s) => s.projects)
  const params = useMainnet((s) => s.params)
  const status = useMainnet((s) => s.status)

  // live curves: bonding + graduated-but-not-yet-migrated (the curve
  // keeps trading at the graduated fee until the pool exists)
  const bonding = projects.filter(
    (p) => p.curve && (p.status === 'bonding' || ((p.status === 'graduated' || p.status === 'trusted' || p.status === 'untrusted' || p.status === 'recovery') && !p.migrated)),
  )

  const focused = projects.find((p) => p.id === focusId)
  // the asset is tradeable on the curve while it has one
  const project = focused?.curve ? focused : null

  // a migrated project with focus → point to the DEX
  if (focusId && focused && !focused.curve && focused.pool) {
    return (
      <div className="mt-14 border border-dashed border-border p-10 text-center">
        <div className="font-display text-xl font-semibold">{focused.name} has migrated</div>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          The bonding curve closed — trading continues on the permanent LaunchDEX pool.
        </p>
        <BracketButton variant="teal" className="mt-6" onClick={() => setView('dex', focused.id)}>
          Trade on LaunchDEX →
        </BracketButton>
      </div>
    )
  }

  // ── GRID MODE: every live curve ──
  if (!focusId || !project || !project.curve) {
    const totalVol = bonding.reduce((a, p) => a + (p.curve?.volume ?? 0), 0)
    return (
      <div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { k: 'ON THE CURVE', v: bonding.length.toString(), sub: bonding.map((p) => p.ticker).join(' · ') || 'none' },
            { k: 'CURVE VOLUME', v: fmtXel(totalVol), sub: 'XEL · total' },
            { k: 'GRADUATION', v: `${params.graduationMultiplier}× seed`, sub: 'migrate() is permissionless' },
            { k: 'CURVE FEE', v: `${(params.tradingFeeBps / 100).toFixed(2)}%`, sub: 'both sides, always' },
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
          <h2 className="font-display text-base font-semibold tracking-tight">Bonding curves · mainnet</h2>
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
            {status !== 'live'
              ? 'connecting to the XELIS mainnet…'
              : 'No projects on the bonding curve right now. Validate a proposal to open one.'}
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
  const progress = graduationOf(project, params)
  const target = curve.seed * params.graduationMultiplier

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
                      bonding curve · fee {(curve.feeBps / 100).toFixed(2)}% · team {(curve.teamBps / 100).toFixed(0)}%
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
              {curve.history.length >= 2 ? (
                <PriceChart
                  data={curve.history}
                  histStart={curve.histStart}
                  height={360}
                  defaultMode="candles"
                  pointSeconds={curve.pointSeconds}
                />
              ) : (
                <div className="flex h-[360px] items-center justify-center border border-dashed border-border font-mono text-xs text-muted-foreground">
                  chart is warming up — samples arrive every ~30s from the chain
                </div>
              )}
            </div>

            {/* graduation strip */}
            <div className="mt-4 border border-xusd/25 bg-xusd/5 p-3.5">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-muted-foreground">
                  graduation at <span className="text-foreground">{fmtXel(target)} XEL</span> reserves
                  <span className="text-foreground"> · {fmtXel(curve.reserves)} now</span>
                </span>
                <span className="font-bold tabular-nums text-xusd">{(progress * 100).toFixed(1)}%</span>
              </div>
              <Bar value={progress} className="mt-2" barClassName="bg-xusd" />
              <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>migrate() is permissionless and atomic · anyone can trigger it at {params.graduationMultiplier}×</span>
                <span className="text-foreground">{fmtXel(Math.max(0, target - curve.reserves))} XEL of buys to go</span>
              </div>
            </div>

            {/* stats row */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                ['VOLUME', `${fmtXel(curve.volume)} XEL`],
                ['TRADES', curve.trades.toString()],
                ['MARKET CAP', `${fmtXel(curve.marketCap)} XEL`],
                ['CURVE INVENTORY', fmtXel(curve.circulating)],
              ].map(([k, v]) => (
                <div key={k} className="border border-border/70 bg-background/50 p-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{k}</div>
                  <div className="mt-1.5 font-mono text-sm font-semibold tabular-nums text-foreground">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <ChainScoreboard project={project} />
        </div>

        {/* Trade panel */}
        <div className="min-w-0">
          <TradePanel project={project} />
        </div>
      </div>
    </div>
  )
}
