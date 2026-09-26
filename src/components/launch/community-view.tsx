// Community view — the pump.fun board + the coin terminal (MAINNET, C101).
//
// Two modes, mirroring the trading view:
//   • GRID (no focus): every community coin as a rich card — price,
//     change, graduation progress (the demand proof), sparkline. The
//     community track is marked loudly (bordeaux) and separated from
//     the project track: NO validation happens here.
//   • COIN (focus): ONE coin — big chart, buy/sell with EXACT integer
//     quotes on the bonding curve (or against the pool once
//     migrated), the dual-condition graduation strip, the permissionless
//     migrate button, and the creator's post-migration claim.
//
// XELIS balances are confidential: "your balance" reads the connected
// wallet — the only possible source.

'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Share2, Check } from 'lucide-react'
import { useCommunity } from '@/lib/launch/community-store'
import { useMainnet } from '@/lib/launch/mainnet-store'
import { useToast } from '@/hooks/use-toast'
import { useLaunchWallet } from '@/lib/launch/wallet'
import { copyText } from '@/lib/clipboard'
import { coinSharePath, officialInfoOf } from '@/lib/launch/official'
import { useConnectModal } from '@/lib/launch/connect-modal'
import {
  buyCoinTx, sellCoinTx, migrateCoinTx, claimCreatorAllocationTx,
  swapXelForTokenTx, swapTokenForXelTx,
} from '@/lib/launch/tx'
import {
  coinBuyQuote, coinSellQuote, COIN_MIN_BUY, COIN_MAX_TRADE,
} from '@/lib/launch/community-math'
import {
  toAtomic, toHuman, withSlippage, fmtAtomic, dexXelToTokens, dexTokensToXel,
} from '@/lib/launch/chain-math'
import { AnimatedNumber, Bar, BracketButton, SquareDot, Sparkline } from './shared'
import { ProjectLogo } from './logos'
import { PriceChart } from './chart'
import { fmtXel, fmtPrice, fmtPct, shortAddr } from '@/lib/launch/math'
import { explorerAddressUrl, type CommunityParams } from '@/lib/launch/protocol'
import type { CommunityCoin } from '@/lib/launch/types'
import { cn } from '@/lib/utils'
import type { AppView } from './launchpad-view'

// ─────────────────────────────────────────────────────────────────
// Coin status chip — bordeaux track, loud and separate
// ─────────────────────────────────────────────────────────────────

const COIN_STATUS: Record<string, { cls: string; label: string; live?: boolean }> = {
  live: { cls: 'border-vlt/60 text-vlt', label: 'LIVE · BONDING CURVE', live: true },
  graduated: { cls: 'border-xusd/50 text-xusd', label: 'GRADUATED · READY TO MIGRATE', live: true },
  migrated: { cls: 'border-emerald-400/50 text-emerald-400', label: 'MIGRATED · DEX POOL' },
}

function CoinStatusTag({ status }: { status: string }) {
  const s = COIN_STATUS[status] ?? { cls: 'border-border text-muted-foreground', label: status.toUpperCase() }
  return (
    <span className={cn('inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em]', s.cls)}>
      {s.live && <SquareDot />}
      {s.label}
    </span>
  )
}

/** The loud, permanent community marker (spec: label it everywhere). */
function NoValidationChip({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 border border-vlt/40 bg-vlt/[0.07] px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-vlt', className)}>
      community · no validation
    </span>
  )
}

/** The platform's own tokens — gold house presentation. */
function OfficialChip({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 border border-vault/60 bg-vault/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-vault', className)}>
      official
    </span>
  )
}

function TrustedChip({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 border border-emerald-400/50 bg-emerald-400/5 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-400', className)}>
      trusted
    </span>
  )
}

/** Copy the trade page's share link — the URL opens THIS coin directly. */
export function ShareCoinButton({ coin, size = 'sm' }: { coin: CommunityCoin; size?: 'sm' | 'md' }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  async function share() {
    const path = coinSharePath(coin.ticker, coin.id, !!coin.official)
    const url = `${window.location.origin}${path}`
    const ok = await copyText(url)
    setCopied(ok)
    if (ok) setTimeout(() => setCopied(false), 2000)
    toast({
      title: ok ? 'Link copied' : 'Copy failed',
      description: ok ? url : 'Select and copy the address bar URL instead.',
    })
  }
  return (
    <button
      type="button"
      onClick={share}
      className={cn(
        'inline-flex items-center gap-2 border font-mono font-semibold uppercase tracking-[0.16em] transition-colors',
        coin.official
          ? 'border-vault/50 bg-vault/[0.06] text-vault hover:border-vault hover:bg-vault/15'
          : 'border-border bg-card/50 text-muted-foreground hover:border-vlt/40 hover:text-vlt',
        size === 'sm' ? 'px-3 py-1.5 text-[10px]' : 'px-4 py-2 text-[11px]',
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? 'copied' : 'share'}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────
// GRID MODE — the board
// ─────────────────────────────────────────────────────────────────

function coinChange(c: CommunityCoin): number {
  const series = c.curve ?? c.pool
  if (!series || series.history.length < 2) return 0
  const first = series.history[0]
  return first > 0 ? ((c.price - first) / first) * 100 : 0
}

function CoinCard({ c, rank, onOpen, params }: { c: CommunityCoin; rank: number; onOpen: () => void; params: CommunityParams }) {
  const chg = coinChange(c)
  const onCurve = c.status !== 'migrated'
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, delay: rank * 0.04 }}
      onClick={onOpen}
      className="group relative flex flex-col border border-border/80 bg-card/50 p-5 text-left transition-colors hover:border-vlt/50 hover:bg-card/80"
    >
      <span className="absolute right-4 top-4 font-mono text-[9px] text-muted-foreground" aria-hidden>
        {String(rank + 1).padStart(2, '0')}
      </span>

      <div className="flex items-start justify-between gap-3 pr-6">
        <div className="flex items-center gap-3">
          <ProjectLogo ticker={c.ticker} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight">{c.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">${c.ticker}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <CoinStatusTag status={c.status} />
              <NoValidationChip />
            </div>
          </div>
        </div>
        <Sparkline
          data={(c.curve ?? c.pool)?.history.slice(-48) ?? []}
          width={78}
          height={26}
        />
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="font-display text-2xl font-semibold tabular-nums">{fmtPrice(c.price)}</div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">XEL per {c.ticker}</div>
        </div>
        <div className="text-right">
          <div className={cn('font-mono text-sm font-semibold tabular-nums', chg >= 0 ? 'text-emerald-400' : 'text-destructive')}>
            {fmtPct(chg, 1)}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            mcap {fmtXel(c.marketCap)} XEL
          </div>
        </div>
      </div>

      {/* graduation strip (curve era) or pool depth (migrated) */}
      {onCurve && c.curve ? (
        <div className="mt-4 border border-xusd/25 bg-xusd/5 p-3">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-muted-foreground">
              graduation <span className="text-foreground">{fmtXel(c.curve.reserves)} / {fmtXel(c.curve.gradDepth)} XEL</span>
            </span>
            <span className="flex items-center gap-2">
              <span className={cn('font-mono text-[9px] uppercase tracking-[0.12em]', c.continuity ? 'text-emerald-400' : 'text-muted-foreground/60')}>
                {c.continuity ? 'continuity ✓' : 'continuity…'}
              </span>
              <span className="font-bold tabular-nums text-xusd">{(c.progress * 100).toFixed(1)}%</span>
            </span>
          </div>
          <Bar value={c.progress} className="mt-2" barClassName="bg-xusd" />
          <div className="mt-2 flex items-center justify-between font-mono text-[10px]">
            <span className="text-foreground">{fmtXel(Math.max(0, c.curve.gradDepth - c.curve.reserves))} XEL of buys to go</span>
            <span className="text-foreground">{c.curve.trades} trades</span>
          </div>
        </div>
      ) : c.pool ? (
        <div className="mt-4 border border-emerald-400/25 bg-emerald-400/5 p-3 font-mono text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">pool depth</span>
            <span className="text-foreground">{fmtXel(c.pool.xel)} XEL</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-muted-foreground">locked seed (anti-rug floor)</span>
            <span className="text-emerald-400">{fmtXel(c.pool.seedLocked)} XEL</span>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ['VOLUME', fmtXel(c.curve?.volume ?? c.pool?.volume ?? 0)],
          ['TRADES', String(c.curve?.trades ?? c.pool?.trades ?? 0)],
          ['CREATOR', `${(c.teamBps / 100).toFixed(1)}%`],
        ].map(([k, v]) => (
          <div key={k} className="border border-border/70 bg-background/50 p-2.5 text-center">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{k}</div>
            <div className="mt-1 font-mono text-xs font-semibold tabular-nums text-foreground">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 font-mono text-[10px] uppercase tracking-[0.16em]">
        <span className="text-muted-foreground">
          fee {((c.curve?.feeBps ?? c.pool?.feeBps ?? params.curveFeeBps) / 100).toFixed(2)}% · {c.status === 'migrated' ? 'DEX pool' : 'bonding curve'}
        </span>
        <span className="text-vlt opacity-0 transition-opacity group-hover:opacity-100">open coin →</span>
      </div>
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────────
// COIN MODE — trade panels
// ─────────────────────────────────────────────────────────────────

/** Square side-switch: BUY | SELL — exchange colors: green buys,
 *  red sells. */
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
              ? s === 'buy' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-destructive/12 text-destructive'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {s === 'buy' ? '▲ Buy' : '▼ Sell'}
          {side === s && (
            <motion.span
              layoutId="coin-side-marker"
              className={cn('absolute inset-x-0 bottom-0 h-[2px]', s === 'buy' ? 'bg-emerald-400' : 'bg-destructive')}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
        </button>
      ))}
    </div>
  )
}

const SLIPPAGE_CHOICES = [0.5, 1, 2, 5]

/** Curve-era trade panel: exact integer quotes on the curve. */
function CoinTradePanel({ coin }: { coin: CommunityCoin }) {
  const { toast } = useToast()
  const wallet = useLaunchWallet()
  const openConnect = useConnectModal((s) => s.show)
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [buyAmount, setBuyAmount] = useState('5')
  const [sellAmount, setSellAmount] = useState('1000')
  const [slippagePct, setSlippagePct] = useState(2)
  const [busy, setBusy] = useState(false)

  const curve = coin.curve
  // the XSWD session is what matters for signing — the address is
  // best-effort enrichment and must never block a trade
  const connected = wallet.state === 'connected'
  const owned = coin.asset ? (wallet.assetBalances[coin.asset] ?? 0) : 0
  const xelBalance = wallet.xelBalance ?? 0

  useEffect(() => {
    if (connected && coin.asset) void wallet.ensureAsset(coin.asset)
  }, [connected, coin.asset])

  const buyAmt = Math.max(0, Number(buyAmount) || 0)
  const sellAmt = Math.max(0, Number(sellAmount) || 0)

  // EXACT integer quotes — the same formulas the contract runs, on the
  // curve pair (x = xr + vx, y = yr + y0)
  const xr = curve ? toAtomic(curve.reserves) : 0n
  const yr = curve ? toAtomic(curve.inventory) : 0n
  const y0 = curve ? toAtomic(curve.initialInventory) : 0n
  const vx = curve ? toAtomic(curve.virtualXel) : 0n

  const buyQuote = curve && buyAmt > 0
    ? coinBuyQuote(xr, yr, y0, vx, toAtomic(buyAmt), curve.feeBps)
    : null
  const sellQuote = curve && sellAmt > 0
    ? coinSellQuote(xr, yr, y0, vx, toAtomic(sellAmt), curve.feeBps)
    : null
  const buyFee = curve && buyAmt > 0 ? (toAtomic(buyAmt) * BigInt(curve.feeBps)) / 10000n : 0n

  // the whale guard: a single buy can never exceed the REAL inventory
  const whale = buyQuote != null && buyQuote > yr
  const tooSmall = buyAmt > 0 && toAtomic(buyAmt) < COIN_MIN_BUY
  const tooBig = buyAmt > 0 && toAtomic(buyAmt) > COIN_MAX_TRADE

  const minTokensOut = buyQuote ? withSlippage(buyQuote, Math.round(slippagePct * 100)) : 0n
  const minXelOut = sellQuote ? withSlippage(sellQuote, Math.round(slippagePct * 100)) : 0n

  async function execute() {
    if (!curve || !coin.asset) return
    setBusy(true)
    try {
      const res = side === 'buy'
        ? await buyCoinTx(coin.cid, toAtomic(buyAmt), minTokensOut)
        : await sellCoinTx(coin.cid, coin.asset, toAtomic(sellAmt), minXelOut)
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
  // NOT connected → the button stays clickable and opens the connect
  // modal (never a dead end)
  const disabled = !connected ? false : busy || amountInvalid || insufficient || whale || tooSmall || tooBig

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
                <><AnimatedNumber value={owned} format={(v) => fmtXel(v)} /> {coin.ticker}</>
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
              className="h-12 w-full border border-border bg-background/70 pr-16 pl-4 text-right font-mono text-lg tabular-nums text-foreground focus:border-vlt/60 focus:outline-none"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
              {side === 'buy' ? 'XEL' : coin.ticker}
            </span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {side === 'buy'
              ? [1, 5, 10, 50].map((q) => (
                  <button
                    key={q}
                    onClick={() => setBuyAmount(String(q))}
                    className="flex-1 border border-border bg-background/50 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-vlt/40 hover:text-vlt"
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
              className="flex-1 border border-border bg-background/50 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-vlt/40 hover:text-vlt"
            >
              MAX
            </button>
          </div>
        </div>

        {/* slippage (min_out protection on both sides) */}
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
                    ? 'border-vlt/50 bg-vlt/10 text-vlt'
                    : 'border-border hover:text-foreground',
                )}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>

        {/* quote */}
        {side === 'buy' && buyQuote && buyAmt > 0 && (
          <div className="space-y-2.5 border border-vlt/25 bg-vlt/5 p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] text-muted-foreground">you receive (est.)</span>
              <span className="font-mono text-lg font-bold tabular-nums text-vlt">
                {toHuman(buyQuote).toLocaleString('en-US', { maximumFractionDigits: 2 })} <span className="text-xs">{coin.ticker}</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-vlt/15 pt-2.5 font-mono text-[10px]">
              <div>
                <div className="text-muted-foreground">MIN OUT</div>
                <div className="mt-0.5 tabular-nums text-foreground">{toHuman(minTokensOut).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">FEE {curve ? (curve.feeBps / 100).toFixed(2) : 1}%</div>
                <div className="mt-0.5 tabular-nums text-foreground">{toHuman(buyFee).toFixed(3)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">AVG PRICE</div>
                <div className="mt-0.5 tabular-nums text-foreground">
                  {fmtPrice(buyAmt / Math.max(1e-12, toHuman(buyQuote)))}
                </div>
              </div>
            </div>
            {whale && (
              <p className="font-mono text-[10px] text-destructive">
                exceeds the curve&apos;s real inventory ({fmtXel(curve?.inventory ?? 0)} {coin.ticker}) — the whale guard will revert it (curverr)
              </p>
            )}
            {tooSmall && <p className="font-mono text-[10px] text-destructive">minimum buy 0.01 XEL (tiny)</p>}
            {tooBig && <p className="font-mono text-[10px] text-destructive">maximum 100 000 XEL per buy (toobig)</p>}
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
                <div className="text-muted-foreground">FEE {curve ? (curve.feeBps / 100).toFixed(2) : 1}%</div>
                <div className="mt-0.5 text-foreground">included</div>
              </div>
              <div>
                <div className="text-muted-foreground">MIN OUT</div>
                <div className="mt-0.5 tabular-nums text-foreground">{toHuman(minXelOut).toFixed(4)}</div>
              </div>
            </div>
          </div>
        )}

        <BracketButton
          variant={side === 'buy' ? 'strong' : 'danger'}
          size="lg"
          className={cn(
            'w-full',
            // exchange-green buy button — near-black label from the
            // strong variant, champagne brackets, readable everywhere
            side === 'buy' && 'border-emerald-500 bg-emerald-500',
          )}
          disabled={disabled}
          onClick={!connected ? openConnect : execute}
        >
          {!connected
            ? 'connect wallet to trade'
            : insufficient
              ? `insufficient ${side === 'buy' ? 'XEL' : coin.ticker}`
              : whale
                ? 'too big for the curve'
                : side === 'buy' ? `Buy ${coin.ticker}` : `Sell ${coin.ticker}`}
        </BracketButton>

        <div className="border border-border/60 bg-background/40 p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
          {side === 'buy'
            ? `out = (yr+y0)·net / ((xr+vx)+net) — the exact on-chain formula (u128, integer-exact). Your buy pays the ${(curve ? curve.feeBps / 100 : 1).toFixed(2)}% curve fee, pushes the price up the curve and counts toward the ${fmtXel(curve?.gradDepth ?? 50)} XEL graduation depth. If the trade crosses BOTH conditions, graduation fires inside your transaction.`
            : 'Sells are NEVER blockable — no pause, no trust gate, nothing. The WHOLE attached deposit is sold and paid from the live reserves, instantly, in full.'}
        </div>
      </div>

      {connected && (
        <div className="border-t border-border/60 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">your wallet</div>
          <div className="mt-2 flex items-center justify-between font-mono text-xs">
            <span className="tabular-nums text-foreground">
              {fmtXel(owned)} {coin.ticker}
            </span>
            <span className="tabular-nums text-muted-foreground">
              ≈ {fmtXel(owned * coin.price)} XEL
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/** Pool-era swap panel (migrated coins trade on LaunchDEX). */
function CoinSwapPanel({ coin }: { coin: CommunityCoin }) {
  const { toast } = useToast()
  const wallet = useLaunchWallet()
  const openConnect = useConnectModal((s) => s.show)
  const params = useMainnet((s) => s.params)
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [buyAmount, setBuyAmount] = useState('5')
  const [sellAmount, setSellAmount] = useState('1000')
  const [slippagePct, setSlippagePct] = useState(1)
  const [busy, setBusy] = useState(false)

  const pool = coin.pool
  const feeBps = params.dexSwapFeeBps
  const connected = wallet.state === 'connected'
  const owned = coin.asset ? (wallet.assetBalances[coin.asset] ?? 0) : 0
  const xelBalance = wallet.xelBalance ?? 0

  useEffect(() => {
    if (connected && coin.asset) void wallet.ensureAsset(coin.asset)
  }, [connected, coin.asset])

  const buyAmt = Math.max(0, Number(buyAmount) || 0)
  const sellAmt = Math.max(0, Number(sellAmount) || 0)
  const x = pool ? toAtomic(pool.xel) : 0n
  const y = pool ? toAtomic(pool.token) : 0n

  const buyQuote = pool && buyAmt > 0 ? dexXelToTokens(x, y, toAtomic(buyAmt), feeBps) : null
  const sellQuote = pool && sellAmt > 0 ? dexTokensToXel(x, y, toAtomic(sellAmt), feeBps) : null
  const minTokensOut = buyQuote ? withSlippage(buyQuote, Math.round(slippagePct * 100)) : 0n
  const minXelOut = sellQuote ? withSlippage(sellQuote, Math.round(slippagePct * 100)) : 0n

  async function execute() {
    if (!coin.asset) return
    setBusy(true)
    try {
      const res = side === 'buy'
        ? await swapXelForTokenTx(coin.asset, toAtomic(buyAmt), minTokensOut)
        : await swapTokenForXelTx(coin.asset, toAtomic(sellAmt), minXelOut)
      toast({
        title: res.ok ? (side === 'buy' ? 'Swap broadcast' : 'Swap broadcast') : 'Swap failed',
        description: res.message,
        variant: res.ok ? 'default' : 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const insufficient = side === 'buy' ? buyAmt > xelBalance : sellAmt > owned
  // not connected → the button opens the connect modal instead of
  // being a disabled dead end
  const disabled = !connected ? false : busy || (side === 'buy' ? buyAmt <= 0 : sellAmt <= 0) || insufficient

  return (
    <div className="flex h-full flex-col border border-border/70 bg-card/50">
      <div className="border-b border-border/60 p-3">
        <SideSwitch side={side} onChange={setSide} />
      </div>
      <div className="flex-1 space-y-4 p-4">
        <div className="border border-emerald-400/25 bg-emerald-400/5 p-3 font-mono text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">permanent pool</span>
            <span className="text-foreground">{fmtXel(pool?.xel ?? 0)} XEL ↔ {fmtXel(pool?.token ?? 0)} {coin.ticker}</span>
          </div>
          <div className="mt-1.5 flex justify-between">
            <span className="text-muted-foreground">anti-rug floor (locked seed)</span>
            <span className="text-emerald-400">{fmtXel(pool?.seedLocked ?? 0)} XEL</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span>{side === 'buy' ? 'you pay' : 'you sell'}</span>
            <span>
              {side === 'buy' ? (
                <><AnimatedNumber value={xelBalance} format={(v) => fmtXel(v)} /> XEL</>
              ) : (
                <><AnimatedNumber value={owned} format={(v) => fmtXel(v)} /> {coin.ticker}</>
              )}
            </span>
          </div>
          <div className="relative mt-1.5">
            <input
              type="number" min={0} step="any"
              value={side === 'buy' ? buyAmount : sellAmount}
              onChange={(e) => side === 'buy' ? setBuyAmount(e.target.value) : setSellAmount(e.target.value)}
              className="h-12 w-full border border-border bg-background/70 pr-16 pl-4 text-right font-mono text-lg tabular-nums text-foreground focus:border-vlt/60 focus:outline-none"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
              {side === 'buy' ? 'XEL' : coin.ticker}
            </span>
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={() => side === 'buy' ? setBuyAmount(String(Math.floor(xelBalance * 100) / 100)) : setSellAmount(String(owned))}
              className="flex-1 border border-border bg-background/50 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-vlt/40 hover:text-vlt"
            >
              MAX
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border border-border/60 bg-background/40 px-3 py-2 font-mono text-[10px] text-muted-foreground">
          <span>slippage tolerance</span>
          <div className="flex gap-1">
            {SLIPPAGE_CHOICES.map((s) => (
              <button
                key={s}
                onClick={() => setSlippagePct(s)}
                className={cn(
                  'border px-2 py-0.5 transition-colors',
                  slippagePct === s ? 'border-vlt/50 bg-vlt/10 text-vlt' : 'border-border hover:text-foreground',
                )}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>

        {side === 'buy' && buyQuote && buyAmt > 0 && (
          <div className="space-y-2.5 border border-vlt/25 bg-vlt/5 p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] text-muted-foreground">you receive (est.)</span>
              <span className="font-mono text-lg font-bold tabular-nums text-vlt">
                {toHuman(buyQuote).toLocaleString('en-US', { maximumFractionDigits: 2 })} <span className="text-xs">{coin.ticker}</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-vlt/15 pt-2.5 font-mono text-[10px]">
              <div>
                <div className="text-muted-foreground">MIN OUT</div>
                <div className="mt-0.5 tabular-nums text-foreground">{toHuman(minTokensOut).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">FEE {(feeBps / 100).toFixed(2)}%</div>
                <div className="mt-0.5 text-foreground">included</div>
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
          </div>
        )}

        <BracketButton
          variant={side === 'buy' ? 'strong' : 'danger'}
          size="lg"
          className={cn(
            'w-full',
            side === 'buy' && 'border-emerald-500 bg-emerald-500',
          )}
          disabled={disabled}
          onClick={!connected ? openConnect : execute}
        >
          {!connected
            ? 'connect wallet to swap'
            : insufficient
              ? `insufficient ${side === 'buy' ? 'XEL' : coin.ticker}`
              : side === 'buy' ? `Buy ${coin.ticker}` : `Sell ${coin.ticker}`}
        </BracketButton>

        <div className="border border-border/60 bg-background/40 p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
          The curve is closed forever — the permanent LaunchDEX pool owns this market now. Swaps at{' '}
          {(feeBps / 100).toFixed(2)}%, split 50/50 between the protocol and liquidity providers; the
          seed floor is protocol-locked and can never be pulled.
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// COIN MODE — actions (migrate + creator claim)
// ─────────────────────────────────────────────────────────────────

function CoinActions({ coin }: { coin: CommunityCoin }) {
  const { toast } = useToast()
  const wallet = useLaunchWallet()
  const openConnect = useConnectModal((s) => s.show)
  const [busy, setBusy] = useState<string | null>(null)
  // the session is what signs; the address only refines the creator
  // check (the claim stays safe on-chain regardless)
  const connected = wallet.state === 'connected'
  const isCreator = !!wallet.address && coin.creator === wallet.address

  async function run(kind: string, fn: () => Promise<{ ok: boolean; message: string }>) {
    setBusy(kind)
    try {
      const res = await fn()
      toast({
        title: res.ok ? 'Broadcast' : 'Failed',
        description: res.message,
        variant: res.ok ? 'default' : 'destructive',
      })
    } finally {
      setBusy(null)
    }
  }

  // nothing to do once migrated and claimed
  const showMigrate = coin.status === 'graduated'
  const showClaim = coin.status === 'migrated' && isCreator && !coin.creatorPaid
  if (!showMigrate && !showClaim) return null

  return (
    <div className="space-y-3 border border-xusd/25 bg-xusd/5 p-4">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <SquareDot className="text-xusd" /> the next step is permissionless
      </div>
      {showMigrate && (
        <>
          <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
            The demand proof is done. Anyone — you, the last buyer, a keeper bot — can trigger the
            atomic migration: the real reserves + inventory seed a permanent LaunchDEX pool, the{' '}
            fee is carved from the SEED (never the live curve), and the buyers&apos; own money
            becomes the protocol-locked anti-rug floor.
          </p>
          <BracketButton
            variant="teal"
            className="w-full"
            disabled={busy != null}
            onClick={connected ? () => run('migrate', () => migrateCoinTx(coin.cid)) : openConnect}
          >
            {busy === 'migrate' ? 'signing…' : !connected ? 'connect wallet to migrate' : 'Migrate to LaunchDEX'}
          </BracketButton>
        </>
      )}
      {showClaim && (
        <>
          <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
            You created this coin. Your {(coin.teamBps / 100).toFixed(1)}% allocation — reserved off
            the curve since launch — is claimable now that the coin has graduated AND migrated.
            Paid exactly once, privately.
          </p>
          <BracketButton
            variant="vlt"
            className="w-full"
            disabled={busy != null}
            onClick={connected ? () => run('claim', () => claimCreatorAllocationTx(coin.cid)) : openConnect}
          >
            {busy === 'claim' ? 'signing…' : !connected ? 'connect wallet to claim' : 'Claim creator allocation'}
          </BracketButton>
        </>
      )}
    </div>
  )
}

/** On-chain scoreboard. */
function CoinScoreboard({ coin }: { coin: CommunityCoin }) {
  const creatorLink = (
    <a
      href={explorerAddressUrl(coin.creator)}
      target="_blank"
      rel="noreferrer"
      className="text-foreground hover:text-vlt hover:underline"
    >
      {shortAddr(coin.creator)} ↗
    </a>
  )
  const rows: [string, React.ReactNode][] = [
    ['CREATOR', creatorLink],
    ['STATUS', coin.status.toUpperCase()],
    ['SUPPLY (fixed forever)', coin.totalSupply.toLocaleString('en-US')],
    ['CREATOR ALLOCATION', `${(coin.teamBps / 100).toFixed(1)}%${coin.creatorPaid ? ' · claimed' : coin.status === 'migrated' ? ' · unclaimed' : ' · post-migration'}`],
    ...(coin.curve ? ([
      ['REAL RESERVES', `${fmtXel(coin.curve.reserves)} XEL`],
      ['CURVE INVENTORY', `${fmtXel(coin.curve.inventory)} ${coin.ticker}`],
      ['VIRTUAL DEPTH', `${fmtXel(coin.curve.virtualXel)} XEL (never moves)`],
      ['GRADUATION DEPTH', `${fmtXel(coin.curve.gradDepth)} XEL`],
      ['BUY / SELL VOLUME', `${fmtXel(coin.curve.volume)} XEL · ${coin.curve.trades} trades`],
    ] as [string, string][]) : []),
    ...(coin.pool ? ([
      ['POOL DEPTH', `${fmtXel(coin.pool.xel)} XEL ↔ ${fmtXel(coin.pool.token)} ${coin.ticker}`],
      ['LOCKED SEED', `${fmtXel(coin.pool.seedLocked)} XEL (never leaves)`],
      ['POOL VOLUME', `${fmtXel(coin.pool.volume)} XEL · ${coin.pool.trades} swaps`],
    ] as [string, string][]) : []),
    ['ASSET', coin.asset ? `${coin.asset.slice(0, 10)}…${coin.asset.slice(-6)}` : '—'],
  ]
  return (
    <div className="flex h-full flex-col border border-border/70 bg-card/50">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <SquareDot className="text-vlt" /> on-chain record
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">kept by the factory</span>
      </div>
      <div className="flex-1 p-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 px-2.5 py-2 font-mono text-[11px] hover:bg-card/70">
            <span className="shrink-0 text-muted-foreground">{k}</span>
            <span className="truncate text-right tabular-nums text-foreground">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// The view
// ─────────────────────────────────────────────────────────────────

type Filter = 'all' | 'live' | 'graduated' | 'migrated'

/** Fires the on-chain history backfill once for the focused coin — a
 *  brand-new visitor gets the FULL chart (rebuilt from the factory's
 *  public transactions), not a blank one. */
function CoinHistoryEnsurer({ cid }: { cid: number }) {
  const ensureCoinHistory = useCommunity((s) => s.ensureCoinHistory)
  useEffect(() => {
    void ensureCoinHistory(cid)
  }, [cid, ensureCoinHistory])
  return null
}

export function CommunityView({ setView, focusId }: {
  setView: (v: AppView, id?: string) => void
  focusId?: string | null
}) {
  const coins = useCommunity((s) => s.coins)
  const cParams = useCommunity((s) => s.cParams)
  const status = useCommunity((s) => s.status)
  const [filter, setFilter] = useState<Filter>('all')

  // focus resolves by cid OR by ticker — the share links of official
  // coins carry the readable ticker (?focus=XVLT)
  const focused = coins.find((c) => c.id === focusId
    || (focusId != null && c.ticker.toUpperCase() === focusId.toUpperCase())) ?? null

  // deep link still resolving (store loading) or pointing at nothing —
  // never flash the board before the terminal settles
  if (focusId && !focused) {
    return (
      <div className="mt-14 border border-dashed border-border p-10 text-center font-mono text-sm text-muted-foreground">
        {status !== 'live'
          ? 'connecting to the XELIS mainnet…'
          : 'this token does not exist or is not available on this board'}
      </div>
    )
  }

  // ── COIN MODE: one coin, the full terminal ──
  if (focusId && focused) {
    const coin = focused
    const series = coin.curve ?? coin.pool
    const history = series?.history ?? []
    const change = coinChange(coin)
    const official = coin.official ? officialInfoOf(coin.ticker) : null

    return (
      <div>
        <CoinHistoryEnsurer cid={coin.cid} />
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            onClick={() => coin.official ? setView('launchpad') : setView('community', '')}
            className="group inline-flex items-center gap-2 border border-border bg-card/50 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-vlt/40 hover:text-vlt"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            {coin.official ? 'projects' : 'all coins'}
          </button>
          <ShareCoinButton coin={coin} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
          {/* Chart + data */}
          <div className="min-w-0 space-y-4">
            <div className="border border-border/70 bg-card/50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <ProjectLogo ticker={coin.ticker} size="lg" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold tracking-tight">{coin.name}</h2>
                        <span className="font-mono text-xs text-muted-foreground">${coin.ticker}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {coin.official ? (
                          <>
                            <OfficialChip />
                            <TrustedChip />
                            <CoinStatusTag status={coin.status} />
                          </>
                        ) : (
                          <>
                            <CoinStatusTag status={coin.status} />
                            <NoValidationChip />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-semibold tabular-nums">{fmtPrice(coin.price)}</div>
                  <div className={cn('font-mono text-xs font-semibold tabular-nums', change >= 0 ? 'text-emerald-400' : 'text-destructive')}>
                    {fmtPct(change, 1)} · XEL
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    mcap {fmtXel(coin.marketCap)} XEL
                  </div>
                </div>
              </div>

              {/* description + official links */}
              {(coin.description || coin.website || coin.twitter || coin.telegram || coin.discord || official?.github) && (
                <div className={cn('mt-4 p-3.5', coin.official
                  ? 'border border-vault/30 bg-vault/[0.04]'
                  : 'border border-border/60 bg-background/40')}>
                  {coin.description && (
                    <p className="text-[13px] leading-relaxed text-muted-foreground">{coin.description}</p>
                  )}
                  {(coin.website || coin.twitter || coin.telegram || coin.discord || official?.github) && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px]">
                      {coin.website && (
                        <a href={coin.website} target="_blank" rel="noreferrer" className="text-vault hover:underline">website ↗</a>
                      )}
                      {coin.twitter && (
                        <a href={coin.twitter} target="_blank" rel="noreferrer" className="text-vault hover:underline">X ↗</a>
                      )}
                      {coin.telegram && (
                        <a href={coin.telegram} target="_blank" rel="noreferrer" className="text-vault hover:underline">telegram ↗</a>
                      )}
                      {coin.discord && (
                        <a href={coin.discord} target="_blank" rel="noreferrer" className="text-vault hover:underline">discord ↗</a>
                      )}
                      {official?.github && (
                        <a href={official.github} target="_blank" rel="noreferrer" className="text-vault hover:underline">source ↗</a>
                      )}
                      {coin.asset && (
                        <a
                          href={explorerAddressUrl(coin.asset)}
                          target="_blank"
                          rel="noreferrer"
                          title={`Asset ${coin.asset}`}
                          className="text-muted-foreground hover:text-vault"
                        >
                          asset ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4">
                {history.length >= 2 ? (
                  <PriceChart
                    data={history}
                    histStart={series?.histStart ?? 0}
                    height={360}
                    defaultMode="candles"
                    pointSeconds={series?.pointSeconds ?? 30}
                  />
                ) : (
                  <div className="flex h-[360px] items-center justify-center border border-dashed border-border font-mono text-xs text-muted-foreground">
                    loading price history — rebuilding it from the chain…
                  </div>
                )}
              </div>

              {/* graduation strip — the dual demand proof (curve era) */}
              {coin.curve && coin.status !== 'migrated' && (
                <div className="mt-4 border border-xusd/25 bg-xusd/5 p-3.5">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-muted-foreground">
                      graduation at <span className="text-foreground">{fmtXel(coin.curve.gradDepth)} XEL</span> real depth
                      <span className="text-foreground"> · {fmtXel(coin.curve.reserves)} now</span>
                    </span>
                    <span className="font-bold tabular-nums text-xusd">{(coin.progress * 100).toFixed(1)}%</span>
                  </div>
                  <Bar value={coin.progress} className="mt-2" barClassName="bg-xusd" />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
                    <span className={cn(coin.continuity ? 'text-emerald-400' : 'text-muted-foreground')}>
                      price continuity {coin.continuity ? '✓ met — the pool will open at or above spot' : '… pending (xr·y0 ≥ yr·vx)'}
                    </span>
                    <span className="text-foreground">{fmtXel(Math.max(0, coin.curve.gradDepth - coin.curve.reserves))} XEL of buys to go</span>
                  </div>
                </div>
              )}

              {/* stats row */}
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  ['VOLUME', `${fmtXel(coin.curve?.volume ?? coin.pool?.volume ?? 0)} XEL`],
                  ['TRADES', String(coin.curve?.trades ?? coin.pool?.trades ?? 0)],
                  ['MARKET CAP', `${fmtXel(coin.marketCap)} XEL`],
                  [coin.status === 'migrated' ? 'POOL DEPTH' : 'CURVE INVENTORY',
                    coin.status === 'migrated'
                      ? fmtXel(coin.pool?.xel ?? 0)
                      : fmtXel(coin.curve?.inventory ?? 0)],
                ].map(([k, v]) => (
                  <div key={k} className="border border-border/70 bg-background/50 p-3">
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{k}</div>
                    <div className="mt-1.5 font-mono text-sm font-semibold tabular-nums text-foreground">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <CoinScoreboard coin={coin} />
          </div>

          {/* Trade + actions */}
          <div className="min-w-0 space-y-4">
            {coin.curve && <CoinTradePanel coin={coin} />}
            {!coin.curve && coin.pool && <CoinSwapPanel coin={coin} />}
            <CoinActions coin={coin} />
          </div>
        </div>
      </div>
    )
  }

  // ── GRID MODE: the board ──
  // official tokens are NOT community coins — they live on the project
  // side (the Launchpad flagship banner). This board shows the pure
  // community track only.
  const boardCoins = coins.filter((c) => !c.official)
  const filtered = filter === 'all' ? boardCoins : boardCoins.filter((c) => c.status === filter)
  const liveCount = boardCoins.filter((c) => c.status === 'live').length
  const graduatedCount = boardCoins.filter((c) => c.status === 'graduated').length
  const migratedCount = boardCoins.filter((c) => c.status === 'migrated').length
  const totalVol = boardCoins.reduce((a, c) => a + (c.curve?.volume ?? c.pool?.volume ?? 0), 0)

  return (
    <div>
      {/* stats */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { k: 'COINS LAUNCHED', v: String(boardCoins.length), sub: `${liveCount} live · ${graduatedCount} graduated · ${migratedCount} migrated` },
          { k: 'TRACK VOLUME', v: fmtXel(totalVol), sub: 'XEL · all community coins' },
          { k: 'LAUNCH COST', v: `≈ ${fmtXel(cParams.submissionFee + cParams.assetBudget)} XEL`, sub: 'one transaction, no vote' },
          { k: 'GRADUATION', v: `${fmtXel(cParams.graduationDepth)} XEL`, sub: 'real depth + price continuity' },
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

      {/* honesty banner */}
      <div className="mt-5 border border-vlt/30 bg-vlt/[0.06] p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-semibold uppercase tracking-[0.18em] text-vlt">The community track — the casino next to the serious shelf.</span>{' '}
        No vote, no validation, ~2 XEL per launch. What the contract GUARANTEES: fixed supply, no
        founder liquidity to pull, a protocol-locked pool seed, sells that can never be blocked,
        no honeypot surface. What it does NOT: tell you which coin is worth anything. DYOR.
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold tracking-tight">Community coins · mainnet</h2>
        <div className="flex items-center gap-1.5">
          {(['all', 'live', 'graduated', 'migrated'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors',
                filter === f
                  ? 'border-vlt/60 bg-vlt/10 text-vlt'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <motion.div layout className="mt-4 grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((c, i) => (
              <CoinCard key={c.id} c={c} rank={i} params={cParams} onOpen={() => setView('community', c.id)} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="mt-8 border border-dashed border-border p-10 text-center">
          <div className="font-mono text-sm text-muted-foreground">
            {status !== 'live'
              ? 'connecting to the XELIS mainnet…'
              : boardCoins.length === 0
                ? 'No community coins yet — the factory is live, the board is empty.'
                : `no ${filter} coins right now`}
          </div>
          {status === 'live' && boardCoins.length === 0 && (
            <BracketButton variant="vlt" className="mt-6" onClick={() => setView('coin-launch')}>
              Launch the first coin · ≈ {fmtXel(cParams.submissionFee + cParams.assetBudget)} XEL
            </BracketButton>
          )}
        </div>
      )}
    </div>
  )
}
