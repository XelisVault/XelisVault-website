// Coin launch view — the COMMUNITY track's one-transaction launch.
//
// The real launch_coin transaction (entry 15): ten typed parameters plus
// the ~2 XEL deposit (submission fee + asset budget — the unused part
// of the budget is refunded in the same transaction). No vote, no
// founder liquidity: the coin is born as a REAL XELIS confidential
// asset and the virtual-reserve curve prices it from the first second.
//
// Everything the contract enforces is validated client-side first with
// the exact on-chain rules (name/symbol/description caps, the ticker
// registry, supply bounds, the 5% creator cap), then sent through XSWD.
//
// This is the pump.fun track — the view says so honestly: NOT a quality
// filter, scams WILL launch here, the design bounds what a scam can DO.

'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useCommunity } from '@/lib/launch/community-store'
import { useLaunchWallet } from '@/lib/launch/wallet'
import { launchCoinTx } from '@/lib/launch/tx'
import { fetchCoinTickerTaken } from '@/lib/launch/community-reader'
import { toAtomic, fmtAtomic } from '@/lib/launch/chain-math'
import { coinLaunchFdv, COIN_MAX_TEAM_BPS } from '@/lib/launch/community-math'
import { launchCoinDeposit, explorerTxUrl } from '@/lib/launch/protocol'
import { useToast } from '@/hooks/use-toast'
import { BracketButton, SquareDot } from './shared'
import { fmtXel } from '@/lib/launch/math'
import { cn } from '@/lib/utils'
import type { AppView } from './launchpad-view'

// Exact on-chain caps (CommunityLaunch.slx)
const MAX_NAME = 64
const MAX_SYMBOL = 16
const MAX_DESC = 512
const MAX_URL = 256
const MIN_SUPPLY_WHOLE = 1_000_000        // 1M whole tokens
const MAX_SUPPLY_WHOLE = 10_000_000_000   // 10B whole tokens

interface FormState {
  name: string
  symbol: string
  description: string
  website: string
  logo: string
  twitter: string
  telegram: string
  discord: string
  totalSupply: string
  teamPct: string
}

const INITIAL: FormState = {
  name: '',
  symbol: '',
  description: '',
  website: '',
  logo: '',
  twitter: '',
  telegram: '',
  discord: '',
  totalSupply: '1000000000',
  teamPct: '0',
}

function Field({ label, hint, children, error }: {
  label: string
  hint?: string
  children: React.ReactNode
  error?: string | null
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </label>
        {hint && <span className="font-mono text-[9px] text-muted-foreground/70">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 font-mono text-[10px] text-destructive">{error}</p>}
    </div>
  )
}

const inputCls =
  'h-11 w-full border border-border bg-background/70 px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-vlt/60 focus:outline-none'

export function CoinLaunchView({ setView }: { setView: (v: AppView, id?: string) => void }) {
  const cParams = useCommunity((s) => s.cParams)
  const wallet = useLaunchWallet()
  const { toast } = useToast()

  const [form, setForm] = useState<FormState>(INITIAL)
  const [busy, setBusy] = useState(false)
  const [tickerCheck, setTickerCheck] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle')
  const [lastTx, setLastTx] = useState<string | null>(null)

  const connected = wallet.state === 'connected' && !!wallet.address
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const supply = Math.max(0, Number(form.totalSupply) || 0)
  const teamBps = Math.max(0, Math.round((Number(form.teamPct) || 0) * 100))
  const depositXel = launchCoinDeposit(cParams)

  // the virtual curve's birth numbers (same math as the contract)
  const birthFdv = useMemo(() => {
    const supplyA = toAtomic(supply)
    const vx = toAtomic(cParams.virtualXel)
    const y0 = supplyA - (supplyA * BigInt(teamBps)) / 10000n
    return coinLaunchFdv(vx, y0, supplyA)
  }, [supply, teamBps, cParams.virtualXel])

  // client-side validation (mirrors the contract's requires)
  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (form.name.length < 1 || form.name.length > MAX_NAME) e.name = `1–${MAX_NAME} characters (contract: badname)`
    if (form.symbol.length < 1 || form.symbol.length > MAX_SYMBOL) e.symbol = `1–${MAX_SYMBOL} characters (contract: badsym)`
    else if (!/^[A-Za-z0-9]+$/.test(form.symbol)) e.symbol = 'alphanumeric only'
    else if (tickerCheck === 'taken') e.symbol = 'ticker already registered on-chain (contract: tick)'
    if (form.description.length > MAX_DESC) e.description = `max ${MAX_DESC} characters (contract: baddesc)`
    if (form.website.length > MAX_URL) e.website = `max ${MAX_URL} characters`
    if (form.logo.length > MAX_URL) e.logo = `max ${MAX_URL} characters`
    if (form.twitter.length > MAX_URL) e.twitter = `max ${MAX_URL} characters`
    if (form.telegram.length > MAX_URL) e.telegram = `max ${MAX_URL} characters`
    if (form.discord.length > MAX_URL) e.discord = `max ${MAX_URL} characters`
    if (supply < MIN_SUPPLY_WHOLE || supply > MAX_SUPPLY_WHOLE) {
      e.totalSupply = 'between 1M and 10B whole tokens (contract: badsupply)'
    }
    if (teamBps > COIN_MAX_TEAM_BPS) e.teamPct = 'max 5% (contract: badteam)'
    return e
  }, [form, supply, teamBps, tickerCheck])

  const valid = Object.keys(errors).length === 0

  // ticker availability (debounced on-chain check on the factory)
  async function checkTicker() {
    if (!form.symbol || errors.symbol) return
    setTickerCheck('checking')
    try {
      const taken = await fetchCoinTickerTaken(form.symbol)
      setTickerCheck(taken ? 'taken' : 'free')
    } catch {
      setTickerCheck('idle')
    }
  }

  async function submit() {
    if (!valid || !connected) return
    setBusy(true)
    try {
      const res = await launchCoinTx({
        name: form.name,
        symbol: form.symbol.toUpperCase(),
        description: form.description,
        website: form.website,
        logo: form.logo,
        twitter: form.twitter,
        telegram: form.telegram,
        discord: form.discord,
        totalSupplyAtomic: toAtomic(supply),
        teamBps,
        depositAtomic: toAtomic(depositXel),
      })
      toast({
        title: res.ok ? 'Coin launched' : 'Launch failed',
        description: res.message,
        variant: res.ok ? 'default' : 'destructive',
      })
      if (res.ok && res.hash) {
        setLastTx(res.hash)
        setForm(INITIAL)
        setTickerCheck('idle')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* header */}
      <div className="mb-6 border border-border/70 bg-card/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Launch a community coin
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              One transaction. No vote, no validation, no founder liquidity. Your coin is born
              as a <span className="text-foreground">real confidential XELIS asset</span> —
              fixed supply enforced by the protocol itself — priced from its first second on
              a <span className="text-foreground">virtual-reserve bonding curve</span> that
              simulates book depth with zero capital.
            </p>
          </div>
          <div className="border border-vlt/40 bg-vlt/5 px-4 py-3 text-center">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">total cost</div>
            <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-vlt">
              ≈ {fmtXel(depositXel)} XEL
            </div>
            <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">
              {cParams.submissionFee} fee + {cParams.assetBudget} asset budget (unused refunded)
            </div>
          </div>
        </div>
      </div>

      {/* honesty banner — the spec demands it be loud */}
      <div className="mb-6 border border-vlt/30 bg-vlt/[0.06] p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-semibold uppercase tracking-[0.18em] text-vlt">Community track — not a quality filter.</span>{' '}
        Anyone can launch anything here. The contract bounds what a scam can <span className="text-foreground">DO</span> —
        fixed supply, no founder liquidity to pull, a protocol-locked pool seed, sells that can never be blocked —
        not what a coin <span className="text-foreground">IS</span>. Do your own research.
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* ── form ── */}
        <div className="space-y-5">
          <section className="border border-border/70 bg-card/50 p-5">
            <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <SquareDot className="text-vlt" /> identity
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Coin name" hint={`${form.name.length}/${MAX_NAME}`} error={errors.name}>
                <input
                  className={inputCls}
                  value={form.name}
                  maxLength={MAX_NAME}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Moon Cat Coin"
                />
              </Field>
              <Field
                label="Ticker"
                hint={`${form.symbol.length}/${MAX_SYMBOL}`}
                error={errors.symbol}
              >
                <input
                  className={cn(inputCls, 'uppercase')}
                  value={form.symbol}
                  maxLength={MAX_SYMBOL}
                  onChange={(e) => { set('symbol', e.target.value.toUpperCase()); setTickerCheck('idle') }}
                  onBlur={checkTicker}
                  placeholder="MCAT"
                />
                {tickerCheck === 'checking' && !errors.symbol && (
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">checking the on-chain registry…</p>
                )}
                {tickerCheck === 'free' && !errors.symbol && (
                  <p className="mt-1 font-mono text-[10px] text-emerald-400">ticker is free ✓</p>
                )}
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Description" hint={`${form.description.length}/${MAX_DESC}`} error={errors.description}>
                <textarea
                  className={cn(inputCls, 'h-24 py-2.5 resize-none')}
                  value={form.description}
                  maxLength={MAX_DESC}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="One line. The degens read fast."
                />
              </Field>
            </div>
          </section>

          <section className="border border-border/70 bg-card/50 p-5">
            <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <SquareDot className="text-vlt" /> links (optional)
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Website" error={errors.website}>
                <input className={inputCls} value={form.website} maxLength={MAX_URL} onChange={(e) => set('website', e.target.value)} placeholder="https://…" />
              </Field>
              <Field label="Logo URL" error={errors.logo}>
                <input className={inputCls} value={form.logo} maxLength={MAX_URL} onChange={(e) => set('logo', e.target.value)} placeholder="https://…/logo.png" />
              </Field>
              <Field label="Twitter / X" error={errors.twitter}>
                <input className={inputCls} value={form.twitter} maxLength={MAX_URL} onChange={(e) => set('twitter', e.target.value)} placeholder="https://x.com/…" />
              </Field>
              <Field label="Telegram" error={errors.telegram}>
                <input className={inputCls} value={form.telegram} maxLength={MAX_URL} onChange={(e) => set('telegram', e.target.value)} placeholder="https://t.me/…" />
              </Field>
              <Field label="Discord" error={errors.discord}>
                <input className={inputCls} value={form.discord} maxLength={MAX_URL} onChange={(e) => set('discord', e.target.value)} placeholder="https://discord.gg/…" />
              </Field>
            </div>
          </section>

          <section className="border border-border/70 bg-card/50 p-5">
            <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <SquareDot className="text-vlt" /> tokenomics
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Total supply (whole tokens)" hint="1M – 10B" error={errors.totalSupply}>
                <input
                  type="number" min={0} step="any"
                  className={inputCls}
                  value={form.totalSupply}
                  onChange={(e) => set('totalSupply', e.target.value)}
                />
              </Field>
              <Field label="Creator allocation" hint="max 5%" error={errors.teamPct}>
                <div className="relative">
                  <input
                    type="number" min={0} max={5} step="any"
                    className={cn(inputCls, 'pr-12')}
                    value={form.teamPct}
                    onChange={(e) => set('teamPct', e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">%</span>
                </div>
              </Field>
            </div>
            <p className="mt-4 border border-border/60 bg-background/40 p-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
              The creator allocation is reserved <span className="text-foreground">OFF the curve</span> and
              claimable <span className="text-foreground">ONLY after migration</span> — a coin that never
              graduates pays its creator nothing, forever. No vesting on this track: the 5% cap and the
              post-migration gate ARE the protection.
            </p>
          </section>
        </div>

        {/* ── summary + submit ── */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="border border-vlt/40 bg-vlt/5 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">your deposit</div>
            <div className="mt-2 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between text-muted-foreground">
                <span>submission fee</span>
                <span className="text-foreground">{cParams.submissionFee} XEL</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>asset budget (refundable)</span>
                <span className="text-foreground">{cParams.assetBudget} XEL</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-vlt/20 pt-2 text-sm font-semibold">
                <span>total</span>
                <span className="tabular-nums text-vlt">{fmtXel(depositXel)} XEL</span>
              </div>
            </div>
            {connected && wallet.xelBalance != null && wallet.xelBalance < depositXel && (
              <p className="mt-2 font-mono text-[10px] text-destructive">
                wallet balance: {fmtXel(wallet.xelBalance)} XEL — not enough
              </p>
            )}
          </div>

          <div className="border border-border/70 bg-card/50 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              the birth numbers
            </div>
            <div className="mt-3 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between text-muted-foreground">
                <span>birth FDV</span>
                <span className="tabular-nums text-foreground">≈ {fmtAtomic(birthFdv, 2)} XEL</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>virtual depth</span>
                <span className="tabular-nums text-foreground">{fmtXel(cParams.virtualXel)} XEL</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>graduation depth</span>
                <span className="tabular-nums text-foreground">{fmtXel(cParams.graduationDepth)} XEL</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>live fee → graduated</span>
                <span className="tabular-nums text-foreground">
                  {(cParams.curveFeeBps / 100).toFixed(2)}% → {(cParams.graduatedFeeBps / 100).toFixed(2)}%
                </span>
              </div>
            </div>
            <p className="mt-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
              The curve is born with {fmtXel(cParams.virtualXel)} XEL of VIRTUAL depth: your coin has
              a price, an order book feel and slippage from the first buy — with zero founder capital.
            </p>
          </div>

          <div className="border border-border/70 bg-card/50 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">what happens next</div>
            <ol className="mt-3 space-y-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
              <li>
                <span className="text-foreground">01 · born live</span> — the asset is created and the
                virtual curve opens in the same transaction. Buys and sells at{' '}
                {(cParams.curveFeeBps / 100).toFixed(2)}% from the first block.
              </li>
              <li>
                <span className="text-foreground">02 · graduation = demand proof</span> — the coin
                graduates when the community&apos;s OWN money fills the curve:{' '}
                {fmtXel(cParams.graduationDepth)} XEL of real depth AND price continuity (the pool
                opens at or above spot — no graduation dump).
              </li>
              <li>
                <span className="text-foreground">03 · permissionless migration</span> — anyone
                triggers it. The real reserves + inventory seed a permanent LaunchDEX pool; the{' '}
                {(cParams.migrationFeeBps / 100).toFixed(2)}% fee is carved from the SEED, never the
                live curve. The buyers&apos; own money becomes the protocol-locked anti-rug floor.
              </li>
            </ol>
          </div>

          <BracketButton
            variant="vlt"
            size="lg"
            className="w-full border-vlt bg-vlt text-[oklch(0.155_0.01_80)]"
            disabled={!valid || !connected || busy || (wallet.xelBalance != null && wallet.xelBalance < depositXel)}
            onClick={submit}
          >
            {!connected
              ? 'connect your wallet'
              : !valid
                ? 'fix the fields above'
                : busy
                  ? 'signing in wallet…'
                  : `Launch coin · ${fmtXel(depositXel)} XEL`}
          </BracketButton>

          {lastTx && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-emerald-500/30 bg-emerald-500/5 p-3 text-center font-mono text-[10px] leading-relaxed"
            >
              coin launched ✓<br />
              <a href={explorerTxUrl(lastTx)} target="_blank" rel="noreferrer" className="text-vault hover:underline">
                view on explorer ↗
              </a>
              <br />
              <button onClick={() => setView('community')} className="mt-1 text-vlt hover:underline">
                watch it on the board →
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
