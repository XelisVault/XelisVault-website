'use client'

// Shared UI primitives for the testnet app modules.

import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, Loader2, Terminal, ExternalLink, ArrowRight, Wallet, ShieldAlert } from 'lucide-react'
import { copyText, CLI_COMMANDS } from '@/lib/xelis/cli'
import { useWallet } from '@/lib/wallet-store'
import { EXPLORER_URL } from '@/lib/xelis/rpc'

// ---------------------------------------------------------------------------
// Cards & stats
// ---------------------------------------------------------------------------

export function StatCard({
  label, value, sub, icon, accent = 'vault', loading,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  accent?: 'vault' | 'vlt' | 'xusd' | 'emerald' | 'amber'
  loading?: boolean
}) {
  const accents: Record<string, string> = {
    vault: 'text-vault',
    vlt: 'text-vlt',
    xusd: 'text-xusd',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
  }
  return (
    <div className="rounded-xl border border-border bg-card/40 backdrop-blur p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        {icon && <span className={accents[accent]}>{icon}</span>}
      </div>
      {loading ? (
        <div className="h-7 w-24 rounded bg-muted animate-pulse" />
      ) : (
        <div className={`font-mono text-xl font-semibold ${accents[accent]} leading-tight`}>{value}</div>
      )}
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

export function Panel({
  title, desc, children, actions, className = '',
}: {
  title?: string
  desc?: string
  children: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-border bg-card/30 backdrop-blur p-5 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            {title && <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>}
            {desc && <p className="mt-0.5 text-xs text-muted-foreground max-w-lg">{desc}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Loading / empty / connect prompts
// ---------------------------------------------------------------------------

export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-lg bg-muted/60 animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  )
}

export function ConnectPrompt({ note }: { note?: string }) {
  const { setShowConnectModal } = useWallet()
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-vault/10 border border-vault/30 flex items-center justify-center mb-4">
        <Wallet className="w-5 h-5 text-vault" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs mb-4">
        {note ?? 'Connect your XELIS wallet to see your data and interact with the protocol.'}
      </p>
      <button
        onClick={() => setShowConnectModal(true)}
        className="inline-flex items-center gap-2 rounded-full bg-vault px-5 py-2 text-sm font-semibold text-white hover:bg-vault/85 transition-all"
      >
        Connect Wallet <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

export function ViewOnlyNotice({ what }: { what: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5">
      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <p className="text-xs text-amber-200/80 leading-relaxed">
        You are in view-only mode: balances are private by design on XELIS, so {what} is only visible
        with a connected wallet. Interactions require XSWD or the CLI.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inputs & buttons
// ---------------------------------------------------------------------------

export function AmountInput({
  value, onChange, max, symbol, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  max?: number
  symbol?: string
  placeholder?: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3.5 py-2.5 focus-within:border-vault/50 transition-colors">
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        value={value}
        placeholder={placeholder ?? '0.00'}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent outline-none font-mono text-sm w-full min-w-0"
      />
      {symbol && <span className="text-xs font-mono text-muted-foreground shrink-0">{symbol}</span>}
      {max != null && max > 0 && (
        <button
          onClick={() => onChange(String(Math.floor(max * 100) / 100))}
          className="text-[10px] font-semibold uppercase tracking-wider text-vault hover:text-vault/80 shrink-0"
        >
          Max
        </button>
      )}
    </div>
  )
}

export function ActionButton({
  onClick, disabled, loading, children, variant = 'primary', className = '',
}: {
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'xusd' | 'danger'
  className?: string
}) {
  const variants: Record<string, string> = {
    primary: 'bg-vault text-white hover:bg-vault/85 disabled:bg-vault/30',
    xusd: 'bg-xusd/90 text-black hover:bg-xusd disabled:bg-xusd/30',
    ghost: 'border border-border bg-card/40 hover:bg-card/70 text-foreground',
    danger: 'bg-red-500/90 text-white hover:bg-red-500 disabled:bg-red-500/30',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Transaction feedback
// ---------------------------------------------------------------------------

export interface TxFeedback {
  state: 'idle' | 'broadcast' | 'success' | 'error'
  message?: string
  hash?: string
}

export function TxStatusBanner({ tx }: { tx: TxFeedback }) {
  if (tx.state === 'idle') return null
  const styles = {
    broadcast: 'border-vault/30 bg-vault/10 text-vault',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    error: 'border-red-500/30 bg-red-500/10 text-red-300',
    idle: '',
  }[tx.state]
  const label = {
    broadcast: 'Broadcasting…',
    success: 'Confirmed on-chain',
    error: 'Failed',
    idle: '',
  }[tx.state]
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-3 flex items-start gap-2.5 ${styles}`}
    >
      <div className="text-xs font-semibold uppercase tracking-wider shrink-0">{label}</div>
      <div className="text-xs leading-relaxed flex-1 break-all">
        {tx.message}
        {tx.hash && (
          <a
            href={`${EXPLORER_URL}/?tab=tx#tx=${tx.hash}`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 ml-1 underline underline-offset-2 opacity-80 hover:opacity-100"
          >
            view tx <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// CLI fallback block
// ---------------------------------------------------------------------------

export function CliRow({ cmd, label }: { cmd: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        if (await copyText(cmd)) {
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        }
      }}
      className="group w-full flex items-center gap-3 rounded-lg border border-border bg-background/80 px-3 py-2.5 text-left hover:border-vault/40 transition-colors"
    >
      <span className="text-vault shrink-0"><Terminal className="w-3.5 h-3.5" /></span>
      {label && <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground shrink-0">{label}</span>}
      <code className="flex-1 truncate font-mono text-xs text-foreground/90">{cmd}</code>
      <span className="shrink-0 text-muted-foreground group-hover:text-vault transition-colors">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </span>
    </button>
  )
}

export function CliFallback({ title = 'Prefer the command line?', commands, note }: { title?: string; commands: Array<{ label?: string; cmd: string }>; note?: string }) {
  return (
    <details className="group rounded-xl border border-border bg-card/30 overflow-hidden">
      <summary className="flex items-center gap-2.5 px-4 py-3 cursor-pointer select-none list-none">
        <Terminal className="w-4 h-4 text-vault shrink-0" />
        <span className="text-xs font-medium">{title}</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground group-open:hidden">show commands</span>
        <span className="ml-auto hidden text-[10px] font-mono text-muted-foreground group-open:inline">hide</span>
      </summary>
      <div className="px-4 pb-4 space-y-2">
        {note && <p className="text-[11px] text-muted-foreground leading-relaxed pb-1">{note}</p>}
        {commands.map((c, i) => (
          <CliRow key={i} cmd={c.cmd} label={c.label} />
        ))}
      </div>
    </details>
  )
}

/** Standard CLI fallback block for any module action. */
export function ActionCliFallback({ action }: { action: keyof typeof CLI_COMMANDS }) {
  const group = CLI_COMMANDS[action] as Record<string, string> & { title?: string; hint?: string }
  const rows: Array<{ label?: string; cmd: string }> = []
  for (const [k, v] of Object.entries(group)) {
    if (k === 'title' || k === 'hint') continue
    rows.push({ label: k, cmd: v })
  }
  return (
    <CliFallback
      title={`CLI alternative — ${group.title ?? action}`}
      commands={rows}
      note={group.hint}
    />
  )
}

// ---------------------------------------------------------------------------
// Data rows
// ---------------------------------------------------------------------------

export function DataRow({ label, value, mono = true, accent }: { label: string; value: ReactNode; mono?: boolean; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-xs ${mono ? 'font-mono' : ''} text-right break-all ${accent ?? 'text-foreground'}`}>{value}</span>
    </div>
  )
}

export function HashLink({ hash, type = 'contract' }: { hash: string; type?: 'contract' | 'tx' | 'account' }) {
  const base = type === 'tx' ? `${EXPLORER_URL}/?tab=tx#tx=` : type === 'account' ? `${EXPLORER_URL}/?tab=account#account=` : `${EXPLORER_URL}/?tab=contract#contract=`
  return (
    <a
      href={`${base}${hash}`}
      target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-vault hover:underline underline-offset-2"
    >
      {hash.slice(0, 10)}…{hash.slice(-6)}
      <ExternalLink className="w-3 h-3 opacity-60" />
    </a>
  )
}

export function Badge({ children, tone = 'vault' }: { children: ReactNode; tone?: 'vault' | 'vlt' | 'emerald' | 'amber' | 'red' | 'muted' | 'xusd' }) {
  const tones: Record<string, string> = {
    vault: 'bg-vault/15 text-vault border-vault/30',
    vlt: 'bg-vlt/15 text-vlt border-vlt/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    red: 'bg-red-500/15 text-red-300 border-red-500/30',
    xusd: 'bg-xusd/15 text-xusd border-xusd/30',
    muted: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  )
}

/** Live dot + label for statuses. */
export function LiveDot({ tone = 'emerald' }: { tone?: 'emerald' | 'amber' | 'red' | 'vault' }) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    red: 'bg-red-400',
    vault: 'bg-vault',
  }
  return (
    <span className="relative flex w-2 h-2 shrink-0">
      <span className={`absolute inline-flex w-full h-full rounded-full ${tones[tone]} opacity-60 animate-ping`} />
      <span className={`relative inline-flex w-2 h-2 rounded-full ${tones[tone]}`} />
    </span>
  )
}
