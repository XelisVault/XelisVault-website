// DEX view — LaunchDEX on MAINNET.
//
// Two modes, like the curve terminal:
//   • GRID (no focus): global stats + every migrated pool as a card.
//     Click → the pool's own page.
//   • POOL (focus): ONE pool — chart, swap widget with slippage-protected
//     min_out, the liquidity provider panel (add at the pool ratio /
//     remove pro-rata / claim fees — all real transactions), the
//     permanent seed floor.

'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useMainnet } from '@/lib/launch/mainnet-store'
import { useToast } from '@/hooks/use-toast'
import { useLaunchWallet } from '@/lib/launch/wallet'
import { useConnectModal } from '@/lib/launch/connect-modal'
import { fetchLpInfo } from '@/lib/launch/reader'
import {
  swapXelForTokenTx, swapTokenForXelTx, addLiquidityTx, removeLiquidityTx, claimLpFeesTx,
} from '@/lib/launch/tx'
import {
  dexXelToTokens, dexTokensToXel, liquidityFit, removeOuts, toAtomic, toHuman, withSlippage, fmtAtomic,
} from '@/lib/launch/chain-math'
import { Sparkline, AnimatedNumber, BracketButton, PanelHead, StatusTag, CHART_TEAL } from './shared'
import { ProjectLogo, PairLogo } from './logos'
import { PriceChart } from './chart'
import { fmtXel, fmtPrice, fmtPct } from '@/lib/launch/math'
import type { Project } from '@/lib/launch/types'
import { cn } from '@/lib/utils'
import type { AppView } from './launchpad-view'

// ─────────────────────────────────────────────────────────────────
// Live LP position (on-chain provider slots, polled)
// ─────────────────────────────────────────────────────────────────

function useLpInfo(asset: string | null, address: string | null) {
  const [lp, setLp] = useState<{ parts: bigint; withdrawable: bigint; claimableXel: bigint; claimableTokens: bigint } | null>(null)
  const refresh = useCallback(async () => {
    if (!asset || !address) { setLp(null); return }
    try {
      setLp(await fetchLpInfo(asset, address))
    } catch { /* node hiccup — keep the last value */ }
  }, [asset, address])
  useEffect(() => {
    void refresh()
    const t = setInterval(() => void refresh(), 30_000)
    return () => clearInterval(t)
  }, [refresh])
  return { lp, refreshLp: refresh }
}

// ─────────────────────────────────────────────────────────────────
// GRID MODE — all the pools
// ─────────────────────────────────────────────────────────────────

function PoolCard({ p, rank, onOpen }: { p: Project; rank: number; onOpen: () => void }) {
  const params = useMainnet((s) => s.params)
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
              <StatusTag status={p.pool.buysPaused ? 'untrusted' : p.status} />
              <span className="font-mono text-[10px] text-muted-foreground">fee {(params.dexSwapFeeBps / 100).toFixed(2)}%</span>
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
          ['VOLUME', fmtXel(p.pool.volume)],
          ['FEES', `${p.pool.fees.toFixed(1)}`],
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

const SLIPPAGE_CHOICES = [0.5, 1, 2]

function SwapWidget({ project }: { project: Project }) {
  const { toast } = useToast()
  const wallet = useLaunchWallet()
  const openConnect = useConnectModal((s) => s.show)
  const params = useMainnet((s) => s.params)
  const [direction, setDirection] = useState<'toToken' | 'toXel'>('toToken')
  const [amount, setAmount] = useState('10')
  const [slippagePct, setSlippagePct] = useState(1)
  const [busy, setBusy] = useState(false)
  const amt = Math.max(0, Number(amount) || 0)
  const pool = project.pool!
  const connected = wallet.state === 'connected'
  const ownedToken = project.asset ? (wallet.assetBalances[project.asset] ?? 0) : 0
  const xelBalance = wallet.xelBalance ?? 0

  useEffect(() => {
    if (connected && project.asset) void wallet.ensureAsset(project.asset)
  }, [connected, project.asset])

  // EXACT integer quotes (the contract's formulas)
  const xA = toAtomic(pool.xel)
  const yA = toAtomic(pool.token)
  const feeBps = params.dexSwapFeeBps
  const buyQuote = direction === 'toToken' && amt > 0
    ? dexXelToTokens(xA, yA, toAtomic(amt), feeBps)
    : null
  const sellQuote = direction === 'toXel' && amt > 0
    ? dexTokensToXel(xA, yA, toAtomic(amt), feeBps)
    : null
  const out = buyQuote ?? sellQuote ?? 0n
  const minOut = out > 0n ? withSlippage(out, Math.round(slippagePct * 100)) : 0n

  const insufficient = direction === 'toToken' ? amt > xelBalance : amt > ownedToken
  // not connected → opens the connect modal (no dead ends)
  const disabled = !connected ? false : busy || amt <= 0 || out <= 0n || insufficient

  async function execute() {
    setBusy(true)
    try {
      const res = direction === 'toToken'
        ? await swapXelForTokenTx(project.pool!.asset, toAtomic(amt), minOut)
        : await swapTokenForXelTx(project.pool!.asset, toAtomic(amt), minOut)
      toast({
        title: res.ok ? 'Swap broadcast' : 'Swap failed',
        description: res.message,
        variant: res.ok ? 'default' : 'destructive',
      })
      if (res.ok) setAmount('')
    } finally {
      setBusy(false)
    }
  }

  const fromLabel = direction === 'toToken' ? 'XEL' : project.ticker
  const toLabel = direction === 'toToken' ? project.ticker : 'XEL'
  const fromBalance = direction === 'toToken' ? xelBalance : ownedToken
  const outHuman = toHuman(out)

  return (
    <div className="border border-border/70 bg-card/50">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">swap</span>
        <span className="font-mono text-[10px] text-xusd">fee {(feeBps / 100).toFixed(2)}%</span>
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
              step="any"
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
            <span>you receive (est.)</span>
            <span>min {out > 0n ? fmtAtomic(minOut, 2) : '—'}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-xl font-semibold tabular-nums text-xusd">
              {out > 0n ? (outHuman >= 100 ? outHuman.toFixed(1) : outHuman.toFixed(4)) : '0.00'}
            </span>
            <span className="flex items-center gap-1.5 border border-border bg-card px-2.5 py-1.5 font-mono text-xs font-semibold">
              {toLabel === 'XEL'
                ? <ProjectLogo ticker="XEL" size="xs" className="h-5 w-5" />
                : <ProjectLogo ticker={project.ticker} size="xs" className="h-5 w-5" />}
              {toLabel}
            </span>
          </div>
        </div>

        {/* slippage */}
        <div className="mt-3 flex items-center justify-between border border-border/60 bg-background/40 px-3 py-2 font-mono text-[10px] text-muted-foreground">
          <span>slippage tolerance (min_out)</span>
          <div className="flex gap-1">
            {SLIPPAGE_CHOICES.map((s) => (
              <button
                key={s}
                onClick={() => setSlippagePct(s)}
                className={cn(
                  'border px-2 py-0.5 transition-colors',
                  slippagePct === s ? 'border-xusd/50 bg-xusd/10 text-xusd' : 'border-border hover:text-foreground',
                )}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>

        {amt > 0 && out > 0n && (
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px]">
            <div className="border border-border/60 bg-background/50 p-2.5">
              <div className="text-muted-foreground">PRICE</div>
              <div className="mt-0.5 tabular-nums text-foreground">{fmtPrice(direction === 'toToken' ? amt / outHuman : outHuman / amt)}</div>
            </div>
            <div className="border border-border/60 bg-background/50 p-2.5">
              <div className="text-muted-foreground">FEE</div>
              <div className="mt-0.5 tabular-nums text-foreground">
                {(toAtomic(amt) * BigInt(feeBps) / 10000n).toString() !== '0'
                  ? fmtAtomic(toAtomic(amt) * BigInt(feeBps) / 10000n, 4)
                  : '0'}
              </div>
            </div>
          </div>
        )}

        <BracketButton
          variant="teal"
          size="lg"
          className="mt-3 w-full"
          disabled={disabled}
          onClick={!connected ? openConnect : execute}
        >
          {!connected ? 'connect wallet to swap'
            : insufficient ? `insufficient ${fromLabel}`
            : busy ? 'signing…'
            : `Swap ${fromLabel} for ${toLabel}`}
        </BracketButton>

        {pool.buysPaused && (
          <div className="mt-2 border border-destructive/40 bg-destructive/10 p-2.5 font-mono text-[10px] leading-relaxed text-destructive">
            buys are paused on this pool (community trust) — sells, claims and removes stay open, always.
          </div>
        )}
      </div>
    </div>
  )
}

function LpPanel({ project }: { project: Project }) {
  const { toast } = useToast()
  const wallet = useLaunchWallet()
  const openConnect = useConnectModal((s) => s.show)
  const params = useMainnet((s) => s.params)
  const pool = project.pool!
  const connected = wallet.state === 'connected'
  const address = wallet.address
  const { lp, refreshLp } = useLpInfo(pool.asset, address ?? null)

  const [tab, setTab] = useState<'add' | 'position'>(lp ? 'position' : 'add')
  const [addAmount, setAddAmount] = useState('10')
  const [removePct, setRemovePct] = useState(50)
  const [busy, setBusy] = useState<string | null>(null)
  const addAmt = Math.max(0, Number(addAmount) || 0)
  const ownedToken = project.asset ? (wallet.assetBalances[project.asset] ?? 0) : 0

  // what add_liquidity would actually take at the pool's ratio (X7 fit)
  const fit = addAmt > 0
    ? liquidityFit(toAtomic(pool.xel), toAtomic(pool.token), toAtomic(addAmt), toAtomic(ownedToken))
    : null
  const addInvalid = !fit || fit.xelEff < 100_000_000n // 1 XEL LP floor
  const needTokens = fit ? toHuman(fit.tokEff) : 0
  const tokensInsufficient = fit ? fit.tokBack < 0n || toAtomic(ownedToken) < fit.tokEff : false

  // remove quote (X12 exact pro-rata)
  const withdrawable = lp?.withdrawable ?? 0n
  const partsToRemove = withdrawable > 0n ? (withdrawable * BigInt(Math.round(removePct))) / 100n : 0n
  const outs = partsToRemove > 0n
    ? removeOuts(toAtomic(pool.xel), toAtomic(pool.token), partsToRemove, toAtomic(pool.totalParts))
    : { xel: 0n, tokens: 0n }

  async function run(kind: string, fn: () => Promise<{ ok: boolean; message: string }>) {
    setBusy(kind)
    try {
      const res = await fn()
      toast({
        title: res.ok ? 'Transaction sent' : 'Transaction failed',
        description: res.message,
        variant: res.ok ? 'default' : 'destructive',
      })
      if (res.ok) {
        setTimeout(() => void refreshLp(), 4000)
        if (kind === 'add') setAddAmount('')
      }
    } finally {
      setBusy(null)
    }
  }

  const share = lp && pool.totalParts > 0 ? (toHuman(lp.parts) / pool.totalParts) * 100 : 0

  return (
    <div className="border border-border/70 bg-card/50">
      <div className="grid grid-cols-2 border-b border-border/60">
        {(['add', 'position'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'relative py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors',
              tab === t ? 'bg-xusd/12 text-xusd' : 'text-muted-foreground hover:text-foreground',
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
            <span>XEL side (the {project.ticker} side rides at the pool ratio)</span>
            <span className="text-foreground"><AnimatedNumber value={wallet.xelBalance ?? 0} format={(v) => fmtXel(v)} /> XEL</span>
          </div>
          <div className="relative">
            <input
              type="number" min={0} step="any" value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              aria-label="XEL to provide"
              className="h-11 w-full border border-border bg-background/70 pr-14 pl-4 text-right font-mono tabular-nums text-foreground focus:border-xusd/60 focus:outline-none"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">XEL</span>
          </div>
          <div className="flex gap-1.5">
            {[10, 50, 100, 500].map((q) => (
              <button key={q} onClick={() => setAddAmount(String(q))}
                className="flex-1 border border-border bg-background/50 py-1.5 font-mono text-[11px] text-muted-foreground hover:border-xusd/40 hover:text-xusd">
                {q.toLocaleString()}
              </button>
            ))}
          </div>

          {fit && addAmt > 0 && (
            <div className="border border-border/60 bg-background/40 p-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
              <div className="flex justify-between">
                <span>effective deposit</span>
                <span className="text-foreground">
                  {fmtAtomic(fit.xelEff, 2)} XEL + {fmtAtomic(fit.tokEff, 2)} {project.ticker}
                </span>
              </div>
              {(fit.xelBack > 0n || fit.tokBack > 0n) && (
                <div className="mt-1 flex justify-between">
                  <span>refunded excess (ratio fit)</span>
                  <span className="text-foreground">
                    {fmtAtomic(fit.xelBack, 2)} XEL{fit.tokBack > 0n ? ` + ${fmtAtomic(fit.tokBack, 2)} ${project.ticker}` : ''}
                  </span>
                </div>
              )}
              <div className="mt-1 flex justify-between">
                <span>your {project.ticker} balance</span>
                <span className={cn(tokensInsufficient ? 'text-destructive' : 'text-foreground')}>
                  {fmtXel(ownedToken)} {project.ticker}
                </span>
              </div>
            </div>
          )}

          <div className="border border-border/60 bg-background/40 p-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
            Price-neutral by construction (X7): a deposit can never move the price, the excess side is refunded.
            You mint WITHDRAWABLE parts and earn {(params.dexFeeSplitBps / 100).toFixed(0)}% of every fee, pro-rata of depth.
            Exit any time, both sides, even under an emergency pause. The protocol seed never competes — it never withdraws.
          </div>
          <BracketButton
            variant="teal"
            className="w-full"
            disabled={connected && (busy != null || addInvalid || tokensInsufficient)}
            onClick={!connected ? openConnect : () => run('add', () => addLiquidityTx(
              pool.asset,
              toAtomic(addAmt),
              toAtomic(ownedToken),
            ))}
          >
            {!connected ? 'connect wallet'
              : busy === 'add' ? 'signing…'
              : addInvalid ? 'min 1 XEL effective'
              : tokensInsufficient ? `need ≈ ${needTokens.toFixed(2)} ${project.ticker}`
              : 'Add liquidity'}
          </BracketButton>
        </div>
      )}

      {tab === 'position' && (
        <div className="space-y-3 p-4">
          {lp && (lp.parts > 0n || lp.withdrawable > 0n) ? (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  ['YOUR DEPTH', fmtAtomic(lp.parts, 2)],
                  ['POOL SHARE', `${share.toFixed(3)}%`],
                  ['WITHDRAWABLE', fmtAtomic(lp.withdrawable, 2)],
                  ['CLAIMABLE FEES', `${fmtAtomic(lp.claimableXel, 4)} XEL`],
                ].map(([k, v]) => (
                  <div key={k} className="border border-border/60 bg-background/50 p-2.5 text-center">
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{k}</div>
                    <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-xusd">{v}</div>
                  </div>
                ))}
              </div>

              <BracketButton
                variant="quiet"
                className="w-full"
                disabled={connected && (busy != null || lp.claimableXel <= 0n)}
                onClick={!connected ? openConnect : () => run('claim', () => claimLpFeesTx(pool.asset))}
              >
                {busy === 'claim' ? 'signing…' : !connected ? 'connect wallet' : 'Claim provider fees'}
              </BracketButton>

              <div>
                <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                  <span>remove pro-rata (withdrawable parts)</span>
                  <span className="text-foreground">{removePct}%</span>
                </div>
                <input
                  type="range" min={1} max={100} value={removePct}
                  onChange={(e) => setRemovePct(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--xusd)]"
                  aria-label="Remove percentage"
                />
                <div className="mt-2 border border-border/60 bg-background/50 p-2.5 text-center font-mono text-[11px]">
                  you receive ≈ <span className="font-semibold text-emerald-400">{fmtAtomic(outs.xel, 2)} XEL</span>
                  {' + '}<span className="font-semibold text-emerald-400">{fmtAtomic(outs.tokens, 0)} {project.ticker}</span>
                </div>
              </div>
              <BracketButton
                variant="quiet"
                className="w-full"
                disabled={connected && (busy != null || partsToRemove <= 0n)}
                onClick={!connected ? openConnect : () => run('remove', () => removeLiquidityTx(
                  pool.asset,
                  partsToRemove,
                  withSlippage(outs.xel, 100),
                  withSlippage(outs.tokens, 100),
                ))}
              >
                {busy === 'remove' ? 'signing…' : `Remove ${removePct}% of position`}
              </BracketButton>
            </>
          ) : (
            <div className="border border-dashed border-border py-8 text-center font-mono text-xs text-muted-foreground">
              {connected
                ? `no LP position in XEL/${project.ticker} yet · provide to earn ${(params.dexFeeSplitBps / 100).toFixed(0)}% of the fees`
                : 'connect your wallet to see your position'}
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
  const projects = useMainnet((s) => s.projects)
  const params = useMainnet((s) => s.params)
  const status = useMainnet((s) => s.status)
  const pools = projects.filter((p) => !!p.pool)

  // Derived selection: focused pool if it exists, else grid mode.
  const project = pools.find((p) => p.id === focusId && p.pool)

  // ── GRID MODE: global stats + every pool ──
  if (!focusId || !project || !project.pool) {
    const totalVol = pools.reduce((a, p) => a + (p.pool?.volume ?? 0), 0)
    const totalTvl = pools.reduce((a, p) => a + (p.pool?.xel ?? 0), 0)
    const totalFees = pools.reduce((a, p) => a + (p.pool?.fees ?? 0), 0)
    return (
      <div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { k: 'POOLS', v: pools.length.toString(), sub: 'seed floors locked' },
            { k: 'TOTAL TVL', v: fmtXel(totalTvl), sub: 'XEL' },
            { k: 'VOLUME', v: fmtXel(totalVol), sub: 'XEL · total' },
            { k: 'LIFETIME FEES', v: totalFees.toFixed(1), sub: `XEL · ${(params.dexFeeSplitBps / 100).toFixed(0)}% to LPs` },
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
            {status !== 'live'
              ? 'connecting to the XELIS mainnet…'
              : 'No pools on the DEX yet · projects graduate from the bonding curve.'}
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
  const seedShare = pool.xel > 0 ? (pool.seedLocked / pool.xel) * 100 : 0

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
                    <StatusTag status={pool.buysPaused ? 'untrusted' : project.status} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {project.name} · migrated · fee {(params.dexSwapFeeBps / 100).toFixed(2)}% · split {(params.dexFeeSplitBps / 100).toFixed(0)}/{100 - params.dexFeeSplitBps / 100}
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
              {pool.history.length >= 2 ? (
                <PriceChart
                  data={pool.history}
                  histStart={pool.histStart}
                  height={340}
                  color={CHART_TEAL}
                  defaultMode="candles"
                  accent="teal"
                  pointSeconds={pool.pointSeconds}
                />
              ) : (
                <div className="flex h-[340px] items-center justify-center border border-dashed border-border font-mono text-xs text-muted-foreground">
                  chart is warming up — samples arrive every ~30s from the chain
                </div>
              )}
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
                ['VOLUME', `${fmtXel(pool.volume)}`],
                ['LIFETIME FEES', `${pool.fees.toFixed(2)} XEL`],
                ['LP DEPTH', fmtXel(pool.totalParts)],
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
                <span>Providers exit pro-rata, both sides, price-neutral, ungated: even during an emergency pause. Sells are NEVER blocked either.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-0.5 shrink-0 font-mono text-xusd">◈</span>
                <span>Every swap pays {(params.dexSwapFeeBps / 100).toFixed(2)}%: half to the protocol, half to providers. Your share accrues live on your position.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
