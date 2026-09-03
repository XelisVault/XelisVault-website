'use client'

// Shared UI primitives for the testnet app modules.
// Editorial language: hairline rules, mono small caps, serif numerals,
// sharp corners — a private-bank ledger, not a dashboard template.

import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, Loader2, Terminal, ExternalLink, ArrowRight } from 'lucide-react'
import { copyText, CLI_COMMANDS } from '@/lib/xelis/cli'
import { useWallet } from '@/lib/wallet-store'
import { EXPLORER_URL } from '@/lib/xelis/rpc'

// ---------------------------------------------------------------------------
// Stats & panels — ledger rows, not glass cards
// ---------------------------------------------------------------------------

const ACCENTS: Record<string, string> = {
  vault: 'text-vault',
  vlt: 'text-vlt',
  xusd: 'text-xusd',
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
}

export function StatCard({
  label, value, sub, accent = 'vault', loading, icon,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: 'vault' | 'vlt' | 'xusd' | 'emerald' | 'amber'
  loading?: boolean
  /** Deprecated — kept for call-site compatibility, deliberately not rendered. */
  icon?: ReactNode
}) {
  return (
    <div className="border-t border-border pt-3">
      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      {loading ? (
        <div className="mt-2 h-6 w-20 bg-muted animate-pulse" />
      ) : (
        <div className={`mt-1.5 font-display text-[26px] leading-none font-semibold tracking-[-0.01em] ${ACCENTS[accent]}`}>{value}</div>
      )}
      {sub && <div className="mt-2 text-[11px] font-mono text-muted-foreground">{sub}</div>}
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
    <section className={`border border-border bg-card ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            {title && <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>}
            {desc && <p className="mt-1 text-xs text-muted-foreground max-w-lg leading-relaxed">{desc}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Loading / empty / connect prompts
// ---------------------------------------------------------------------------

export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-0.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 border-b border-border/60 bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  )
}

export function ConnectPrompt({ note }: { note?: string }) {
  const { setShowConnectModal } = useWallet()
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center border border-border">
      <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">Wallet required</span>
      <p className="mt-3 text-sm text-muted-foreground max-w-xs leading-relaxed">
        {note ?? 'Connect your XELIS wallet to see your data and interact with the protocol.'}
      </p>
      <button
        onClick={() => setShowConnectModal(true)}
        className="mt-6 inline-flex items-center gap-2 border border-vault/50 px-5 py-2 text-sm font-semibold text-vault hover:bg-vault/10 transition-colors"
      >
        Connect Wallet <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inputs & buttons — sharp, calm, institutional
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
    <div className="flex items-center gap-2 border border-border bg-background px-3.5 py-2.5 focus-within:border-vault/50 transition-colors">
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
    primary: 'bg-vault text-background hover:bg-vault/90 disabled:bg-vault/30 disabled:text-background/60',
    xusd: 'bg-xusd text-background hover:bg-xusd/90 disabled:bg-xusd/30',
    ghost: 'border border-border bg-transparent hover:border-vault/40 hover:text-vault text-foreground',
    danger: 'border border-destructive/40 bg-destructive/10 text-red-300 hover:bg-destructive/20',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
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
    broadcast: 'border-vault/30 bg-vault/5 text-vault',
    success: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
    error: 'border-destructive/40 bg-destructive/5 text-red-300',
    idle: '',
  }[tx.state]
  const label = {
    broadcast: 'Broadcasting',
    success: 'Confirmed on-chain',
    error: 'Failed',
    idle: '',
  }[tx.state]
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border-l-2 border border-border pl-4 p-3 ${styles}`}
    >
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] shrink-0">{label}</div>
      <div className="mt-1 text-xs leading-relaxed break-all">
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
      className="group w-full flex items-center gap-3 border-b border-border/60 px-1 py-2.5 text-left hover:bg-vault/5 transition-colors"
    >
      {label && <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground shrink-0 w-24">{label}</span>}
      <code className="flex-1 truncate font-mono text-xs text-foreground/90"><span className="text-vault mr-2">$</span>{cmd}</code>
      <span className="shrink-0 text-muted-foreground group-hover:text-vault transition-colors">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </span>
    </button>
  )
}

export function CliFallback({ title = 'Prefer the command line?', commands, note }: { title?: string; commands: Array<{ label?: string; cmd: string }>; note?: string }) {
  return (
    <details className="group border-t border-border pt-3">
      <summary className="flex items-center gap-2.5 cursor-pointer select-none list-none">
        <Terminal className="w-3.5 h-3.5 text-vault shrink-0" />
        <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">{title}</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground/60 group-open:hidden">show</span>
        <span className="ml-auto hidden text-[10px] font-mono text-muted-foreground/60 group-open:inline">hide</span>
      </summary>
      <div className="pb-2 space-y-0.5">
        {note && <p className="text-[11px] text-muted-foreground leading-relaxed py-1">{note}</p>}
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
      title={`CLI alternative · ${group.title ?? action}`}
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

/** Flat mono small-caps tag — the editorial replacement for pill badges. */
export function Badge({ children, tone = 'vault' }: { children: ReactNode; tone?: 'vault' | 'vlt' | 'emerald' | 'amber' | 'red' | 'muted' | 'xusd' }) {
  const tones: Record<string, string> = {
    vault: 'text-vault',
    vlt: 'text-vlt',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    xusd: 'text-xusd',
    muted: 'text-muted-foreground',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.16em] ${tones[tone]}`}>
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
      <span className={`absolute inline-flex w-full h-full rounded-full${tones[tone]} opacity-60 animate-ping`} />
      <span className={`relative inline-flex w-2 h-2 rounded-full${tones[tone]}`} />
    </span>
  )
}
