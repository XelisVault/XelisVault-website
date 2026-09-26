// Propose view — create a coin on the XELIS mainnet.
//
// The real propose transaction (entry 20): eleven typed parameters plus
// the XEL deposit (submission fee + asset budget + seed liquidity).
// Everything the contract enforces is validated client-side first with
// the exact on-chain rules (name/symbol/description caps, supply bounds,
// team bps, vesting window, deposit floor), then sent through XSWD.
//
// The side panel shows what the community will vote on — the deposit
// split, the graduation path (bonding at ×2 vs direct listing at the
// threshold), and the vesting plan binding.

'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useMainnet } from '@/lib/launch/mainnet-store'
import { useLaunchWallet } from '@/lib/launch/wallet'
import { useConnectModal } from '@/lib/launch/connect-modal'
import { proposeTx } from '@/lib/launch/tx'
import { fetchTickerTaken } from '@/lib/launch/reader'
import { toAtomic } from '@/lib/launch/chain-math'
import { explorerTxUrl } from '@/lib/launch/protocol'
import { useToast } from '@/hooks/use-toast'
import { BracketButton, SquareDot } from './shared'
import { fmtXel } from '@/lib/launch/math'
import { cn } from '@/lib/utils'
import type { AppView } from './launchpad-view'

// Exact on-chain caps (VaultLaunch.slx)
const MAX_NAME = 64
const MAX_SYMBOL = 16
const MAX_DESC = 512
const MAX_URL = 256
const MIN_SUPPLY = 1              // whole tokens (1e8 atomic)
const MAX_SUPPLY_WHOLE = 100_000_000 // 1e16 atomic = 1e8 whole tokens
const MAX_TEAM_BPS = 2000

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
  teamBps: string
  vestingMonths: number   // 0 = claim at graduation
  liquidity: string
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
  teamBps: '500',
  vestingMonths: 0,
  liquidity: '500',
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
  'h-11 w-full border border-border bg-background/70 px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-vault/60 focus:outline-none'

export function ProposeView({ setView }: { setView: (v: AppView, id?: string) => void }) {
  const params = useMainnet((s) => s.params)
  const topoheight = useMainnet((s) => s.topoheight)
  const wallet = useLaunchWallet()
  const openConnect = useConnectModal((s) => s.show)
  const { toast } = useToast()

  const [form, setForm] = useState<FormState>(INITIAL)
  const [busy, setBusy] = useState(false)
  const [tickerCheck, setTickerCheck] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle')
  const [lastTx, setLastTx] = useState<string | null>(null)

  const connected = wallet.state === 'connected'
  const set = (k: keyof FormState, v: string | number) => setForm((f) => ({ ...f, [k]: v }))

  const supply = Math.max(0, Number(form.totalSupply) || 0)
  const teamBps = Math.max(0, Number(form.teamBps) || 0)
  const liquidity = Math.max(0, Number(form.liquidity) || 0)

  const depositXel = params.submissionFee + params.assetBudget + liquidity
  const directListing = liquidity >= params.directListingThreshold
  const graduationTarget = liquidity * params.graduationMultiplier

  // vesting in topos (months → 5s topos, ~525960/mo)
  const vestingTopos = form.vestingMonths === 0 ? 0 : Math.round(form.vestingMonths * 525_960)
  const vestingValid = vestingTopos === 0
    || (vestingTopos >= params.vestingMin && vestingTopos <= params.vestingMax)

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
    if (supply < MIN_SUPPLY || supply > MAX_SUPPLY_WHOLE) e.totalSupply = 'between 1 and 100,000,000 whole tokens (contract: badsupply)'
    if (teamBps > MAX_TEAM_BPS) e.teamBps = 'max 20% (contract: badteam)'
    if (!vestingValid) {
      const minMo = (params.vestingMin / 525_960).toFixed(1)
      const maxMo = (params.vestingMax / 525_960).toFixed(1)
      e.vesting = `0 (claim at graduation) or between ${minMo} and ${maxMo} months (contract: badplan)`
    }
    if (liquidity < params.minLiquidity) e.liquidity = `min ${params.minLiquidity} XEL seed (contract: needliq)`
    return e
  }, [form, supply, teamBps, liquidity, vestingValid, params, tickerCheck])

  const valid = Object.keys(errors).length === 0

  // ticker availability (debounced on-chain check)
  async function checkTicker() {
    if (!form.symbol || errors.symbol) return
    setTickerCheck('checking')
    try {
      const taken = await fetchTickerTaken(form.symbol)
      setTickerCheck(taken ? 'taken' : 'free')
    } catch {
      setTickerCheck('idle')
    }
  }

  async function submit() {
    if (!valid || !connected) return
    setBusy(true)
    try {
      const res = await proposeTx({
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
        vestingDurationTopos: vestingTopos,
        depositAtomic: toAtomic(depositXel),
      })
      toast({
        title: res.ok ? 'Proposal broadcast' : 'Proposal failed',
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
              Launch a coin on XELIS
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Your token will be a <span className="text-foreground">real confidential XELIS asset</span> —
              fixed max supply enforced by the protocol itself, held in your buyers&apos; own wallets
              from the first second. The community validates the launch, the bonding curve prices it,
              graduation locks liquidity forever.
            </p>
          </div>
          <div className="border border-vault/30 bg-vault/5 px-4 py-3 text-center">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">minimum deposit</div>
            <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-vault">
              {fmtXel(params.submissionFee + params.assetBudget + params.minLiquidity)} XEL
            </div>
            <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">
              {params.submissionFee} fee + {params.assetBudget} asset budget + {params.minLiquidity} seed
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* ── form ── */}
        <div className="space-y-5">
          <section className="border border-border/70 bg-card/50 p-5">
            <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <SquareDot className="text-vault" /> identity
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project name" hint={`${form.name.length}/${MAX_NAME}`} error={errors.name}>
                <input
                  className={inputCls}
                  value={form.name}
                  maxLength={MAX_NAME}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Nova Privacy"
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
                  placeholder="NOVA"
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
                  placeholder="What is this project? The community votes on exactly what you write here."
                />
              </Field>
            </div>
          </section>

          <section className="border border-border/70 bg-card/50 p-5">
            <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <SquareDot className="text-vault" /> links (optional)
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
              <SquareDot className="text-vault" /> tokenomics — what the community votes on
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Total supply (whole tokens)" error={errors.totalSupply}>
                <input
                  type="number" min={0} step="any"
                  className={inputCls}
                  value={form.totalSupply}
                  onChange={(e) => set('totalSupply', e.target.value)}
                />
              </Field>
              <Field label="Team allocation" hint="max 20%" error={errors.teamBps}>
                <div className="relative">
                  <input
                    type="number" min={0} max={MAX_TEAM_BPS / 100} step="any"
                    className={cn(inputCls, 'pr-12')}
                    value={(teamBps / 100).toString()}
                    onChange={(e) => set('teamBps', String(Math.round((Number(e.target.value) || 0) * 100)))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">%</span>
                </div>
              </Field>
              <Field label="Team vesting plan" hint={form.vestingMonths === 0 ? 'claim at graduation' : 'linear, binding'} error={errors.vesting}>
                <select
                  className={cn(inputCls, 'appearance-none')}
                  value={form.vestingMonths}
                  onChange={(e) => set('vestingMonths', Number(e.target.value))}
                >
                  <option value={0}>No vesting — team claims at graduation</option>
                  <option value={1}>Linear vesting — 1 month</option>
                  <option value={3}>Linear vesting — 3 months</option>
                  <option value={6}>Linear vesting — 6 months</option>
                  <option value={12}>Linear vesting — 12 months</option>
                </select>
              </Field>
              <Field label="Seed liquidity" hint={`min ${params.minLiquidity} XEL`} error={errors.liquidity}>
                <div className="relative">
                  <input
                    type="number" min={0} step="any"
                    className={cn(inputCls, 'pr-12')}
                    value={form.liquidity}
                    onChange={(e) => set('liquidity', e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">XEL</span>
                </div>
              </Field>
            </div>
            <p className="mt-4 border border-border/60 bg-background/40 p-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
              The vesting plan is declared here and BOUND by the contract at graduation — the community
              votes on the exact unlock schedule, not a promise. Everything above the minimum seed
              becomes extra liquidity on the curve.
            </p>
          </section>
        </div>

        {/* ── summary + submit ── */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="border border-vault/30 bg-vault/5 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">your deposit</div>
            <div className="mt-2 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between text-muted-foreground">
                <span>submission fee</span>
                <span className="text-foreground">{params.submissionFee} XEL</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>asset budget (refundable)</span>
                <span className="text-foreground">{params.assetBudget} XEL</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>seed liquidity</span>
                <span className="text-foreground">{fmtXel(liquidity)} XEL</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-vault/20 pt-2 text-sm font-semibold">
                <span>total</span>
                <span className="tabular-nums text-vault">{fmtXel(depositXel)} XEL</span>
              </div>
            </div>
            {connected && wallet.xelBalance != null && wallet.xelBalance < depositXel && (
              <p className="mt-2 font-mono text-[10px] text-destructive">
                wallet balance: {fmtXel(wallet.xelBalance)} XEL — not enough
              </p>
            )}
          </div>

          <div className="border border-border/70 bg-card/50 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">what happens next</div>
            <ol className="mt-3 space-y-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
              <li>
                <span className="text-foreground">01 · validation (~1h)</span> — the community votes.
                Rejected → 100% of your funds are refunded.
              </li>
              <li>
                <span className="text-foreground">02 · {directListing ? 'direct listing' : 'bonding curve'}</span> —{' '}
                {directListing
                  ? `your ${fmtXel(liquidity)} XEL seed is at/above the ${fmtXel(params.directListingThreshold)} XEL threshold: the project graduates the moment validation passes.`
                  : `price discovery on the curve; graduation at ${fmtXel(graduationTarget)} XEL of reserves (${params.graduationMultiplier}× your seed).`}
              </li>
              <li>
                <span className="text-foreground">03 · graduation</span> — trading fee drops to{' '}
                {(params.graduatedFeeBps / 100).toFixed(2)}%, the seed migrates into a permanent
                LaunchDEX pool, locked forever.
              </li>
            </ol>
          </div>

          <BracketButton
            variant="strong"
            size="lg"
            className="w-full"
            disabled={connected && (!valid || busy || (wallet.xelBalance != null && wallet.xelBalance < depositXel))}
            onClick={!connected ? openConnect : submit}
          >
            {!connected
              ? 'connect your wallet'
              : !valid
                ? 'fix the fields above'
                : busy
                  ? 'signing in wallet…'
                  : `Propose · deposit ${fmtXel(depositXel)} XEL`}
          </BracketButton>

          {lastTx && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-emerald-500/30 bg-emerald-500/5 p-3 text-center font-mono text-[10px] leading-relaxed"
            >
              proposal broadcast ✓<br />
              <a href={explorerTxUrl(lastTx)} target="_blank" rel="noreferrer" className="text-vault hover:underline">
                view on explorer ↗
              </a>
              <br />
              <button onClick={() => setView('launchpad')} className="mt-1 text-vault-soft hover:underline">
                watch the validation →
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
