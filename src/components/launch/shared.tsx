// VaultLaunch shared UI primitives — the launchpad's own visual vocabulary.
//
// Design language (deliberately NOT the generic AI look):
//   • square corners everywhere, hairline borders, ledger typography
//   • the signature bracket button: four corner marks that expand on hover
//   • champagne gold (vault), teal (xusd), bordeaux accents on warm ink
//   • square pulse dots, typographic avatars, numbered indexes
// All colors come from the .app-dark palette in globals.css.

'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useMainnet } from '@/lib/launch/mainnet-store'
import { TOPO_SECONDS } from '@/lib/launch/protocol'

// ─────────────────────────────────────────────────────────────────
// BracketButton — the signature action: hairline frame with four
// corner brackets that extend toward each other on hover.
// ─────────────────────────────────────────────────────────────────
type BracketVariant = 'primary' | 'strong' | 'quiet' | 'danger' | 'teal' | 'vlt'

const BRACKET_VARIANTS: Record<BracketVariant, { frame: string; label: string; bracket: string; fill: string }> = {
  primary: {
    frame: 'border-vault/45 text-vault',
    label: 'text-vault group-hover:text-vault',
    bracket: 'bg-vault',
    fill: 'group-hover:bg-vault/10',
  },
  strong: {
    frame: 'border-vault bg-vault text-[oklch(0.155_0.01_80)]',
    label: 'text-[oklch(0.155_0.01_80)]',
    bracket: 'bg-vault',
    fill: 'group-hover:bg-[oklch(0.88_0.1_80)]',
  },
  quiet: {
    frame: 'border-border text-muted-foreground',
    label: 'group-hover:text-foreground',
    bracket: 'bg-foreground/70',
    fill: 'group-hover:bg-foreground/5',
  },
  danger: {
    frame: 'border-destructive/50 text-destructive',
    label: 'text-destructive group-hover:text-destructive',
    bracket: 'bg-destructive',
    fill: 'group-hover:bg-destructive/10',
  },
  teal: {
    frame: 'border-xusd/50 text-xusd',
    label: 'text-xusd group-hover:text-xusd',
    bracket: 'bg-xusd',
    fill: 'group-hover:bg-xusd/10',
  },
  vlt: {
    frame: 'border-vlt/60 text-vlt',
    label: 'text-vlt group-hover:text-vlt',
    bracket: 'bg-vlt',
    fill: 'group-hover:bg-vlt/10',
  },
}

export function BracketButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  title,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: BracketVariant
  size?: 'sm' | 'md' | 'lg'
  className?: string
  type?: 'button' | 'submit'
  title?: string
}) {
  const v = BRACKET_VARIANTS[variant]
  const pad = size === 'sm' ? 'px-3.5 py-1.5 text-[10px]' : size === 'lg' ? 'px-6 py-3.5 text-[13px]' : 'px-5 py-2.5 text-[11px]'
  const bracketSize = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'group relative inline-flex select-none items-center justify-center gap-2 border font-mono font-semibold uppercase tracking-[0.18em] transition-colors duration-200',
        'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-vault',
        'disabled:pointer-events-none disabled:opacity-40',
        v.frame, v.fill, pad, className
      )}
    >
      {/* corner brackets */}
      <span aria-hidden className={cn('pointer-events-none absolute left-0 top-0', bracketSize, v.bracket, 'transition-all duration-200 group-hover:h-3 group-hover:w-[3px]')} />
      <span aria-hidden className={cn('pointer-events-none absolute right-0 top-0', bracketSize, v.bracket, 'transition-all duration-200 group-hover:h-[3px] group-hover:w-3')} />
      <span aria-hidden className={cn('pointer-events-none absolute bottom-0 left-0', bracketSize, v.bracket, 'transition-all duration-200 group-hover:h-[3px] group-hover:w-3')} />
      <span aria-hidden className={cn('pointer-events-none absolute bottom-0 right-0', bracketSize, v.bracket, 'transition-all duration-200 group-hover:h-3 group-hover:w-[3px]')} />
      <span className={cn('relative transition-colors', v.label)}>{children}</span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────
// StatusTag — lifecycle state, ledger style (square, mono, hairline)
// ─────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { cls: string; label: string; live?: boolean }> = {
  validating: { cls: 'border-vault-soft/50 text-vault-soft', label: 'VALIDATING', live: true },
  rejected: { cls: 'border-destructive/50 text-destructive', label: 'REJECTED' },
  bonding: { cls: 'border-vault/50 text-vault', label: 'BONDING CURVE', live: true },
  graduated: { cls: 'border-xusd/50 text-xusd', label: 'GRADUATED · DEX' },
  trusted: { cls: 'border-xusd/60 text-xusd', label: 'TRUSTED · DEX' },
  untrusted: { cls: 'border-destructive/50 text-destructive', label: 'UNTRUSTED' },
  recovery: { cls: 'border-vault-soft/50 text-vault-soft', label: 'RECOVERY', live: true },
}

export function StatusTag({ status, className }: { status: string; className?: string }) {
  const s = STATUS_STYLES[status] ?? { cls: 'border-border text-muted-foreground', label: status.toUpperCase() }
  return (
    <span className={cn('inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em]', s.cls, className)}>
      {s.live && <SquareDot />}
      {s.label}
    </span>
  )
}

/** Square pulse dot — the launchpad's live marker (not a circle). */
export function SquareDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-block h-1.5 w-1.5 bg-current', className)}>
      <span className="absolute inset-0 animate-ping bg-current opacity-60" />
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────
// PanelHead — micro-headline for panels: mono, hairline underneath
// ─────────────────────────────────────────────────────────────────
export function PanelHead({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-border px-4 py-3', className)}>
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{children}</span>
      {right != null && <span className="font-mono text-[10px] text-muted-foreground/80">{right}</span>}
    </div>
  )
}

/** Numbered index (01, 02 …) used across the ledger UI. */
export const pad2 = (n: number) => String(n + 1).padStart(2, '0')

// ─────────────────────────────────────────────────────────────────
// Bar — hairline progress track, solid fill, spring animated
// ─────────────────────────────────────────────────────────────────
export function Bar({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  return (
    <div className={cn('relative h-[3px] w-full bg-foreground/10', className)}>
      <motion.div
        className={cn('h-full bg-vault', barClassName)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
        transition={{ type: 'spring', stiffness: 60, damping: 18 }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// AnimatedNumber — spring-driven live value (odometer feel)
// ─────────────────────────────────────────────────────────────────
export function AnimatedNumber({
  value,
  format = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 2 }),
  className,
}: {
  value: number
  format?: (v: number) => string
  className?: string
}) {
  const spring = useSpring(value, { stiffness: 90, damping: 22, mass: 0.8 })
  spring.set(value)
  const display = useTransform(spring, (v) => format(v))
  return <motion.span className={cn('tabular-nums', className)}>{display}</motion.span>
}

// ─────────────────────────────────────────────────────────────────
// Countdown — MAINNET-time countdown driven by the node's topoheight
// (1 topo = 5s on mainnet). Renders a placeholder until mounted (SSR-safe).
// ─────────────────────────────────────────────────────────────────
function useSimRemaining(deadlineTopo: number | undefined): number | null {
  const topoheight = useMainnet((s) => s.topoheight)
  const [, setDrift] = useState(0) // re-render every 500ms for smooth seconds
  useEffect(() => {
    const t = setInterval(() => setDrift((d) => d + 1), 500)
    return () => clearInterval(t)
  }, [])
  if (deadlineTopo == null || !topoheight) return null
  return Math.max(0, (deadlineTopo - topoheight) * TOPO_SECONDS * 1000)
}

function fmtCountdown(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function Countdown({
  deadlineTopo,
  className,
  urgentBelowMs = 5 * 60 * 1000,
}: {
  deadlineTopo?: number
  className?: string
  urgentBelowMs?: number
}) {
  const remaining = useSimRemaining(deadlineTopo)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted || remaining == null) {
    return <span className={cn('font-mono tabular-nums', className)}>--:--</span>
  }
  const urgent = remaining > 0 && remaining < urgentBelowMs
  return (
    <span
      className={cn(
        'font-mono tabular-nums transition-colors',
        urgent && 'animate-pulse text-destructive',
        remaining === 0 && 'text-muted-foreground',
        className
      )}
    >
      {remaining === 0 ? 'window closed' : fmtCountdown(remaining)}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────
// Chart colors (the chart itself lives in ./chart.tsx)
// ─────────────────────────────────────────────────────────────────
export const CHART_UP = 'var(--vault)'
export const CHART_DOWN = 'var(--destructive)'
export const CHART_TEAL = 'var(--xusd)'

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length < 3) return `M ${pts.map((p) => `${p.x},${p.y}`).join(' L ')}`
  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}

/** Mini sparkline for cards and tables. */
export function Sparkline({
  data,
  width = 96,
  height = 30,
  color = 'auto',
  className,
}: {
  data: number[]
  width?: number
  height?: number
  color?: 'auto' | string
  className?: string
}) {
  if (!data || data.length < 2) return <div style={{ width, height }} className={className} />
  const stroke = color === 'auto' ? (data[data.length - 1] < data[0] ? CHART_DOWN : CHART_UP) : color
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - 2 - ((v - min) / range) * (height - 4),
  }))
  const line = smoothPath(pts)
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <path d={`${line} L ${width},${height} L 0,${height} Z`} fill={stroke} opacity={0.08} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  )
}
