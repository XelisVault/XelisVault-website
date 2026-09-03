'use client'

import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight } from 'lucide-react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border border-border bg-card ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 p-5 md:p-6 border-b border-border">
      <div>
        <h3 className="font-display text-base md:text-lg font-semibold tracking-tight">{title}</h3>
        {desc && <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{desc}</p>}
      </div>
      {action}
    </div>
  )
}

export function Stat({ label, value, sub, accent = 'default' }: { label: string; value: ReactNode; sub?: string; accent?: 'default' | 'vault' | 'xusd' | 'vlt' | 'emerald' | 'red' }) {
  const colors: Record<string, string> = {
    default: 'text-foreground',
    vault: 'text-vault',
    xusd: 'text-xusd',
    vlt: 'text-vlt',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
  }
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className={`mt-1.5 font-display text-xl md:text-2xl font-semibold tracking-[-0.01em] ${colors[accent]}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground font-mono mt-0.5">{sub}</div>}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  className = '',
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}) {
  const variants: Record<string, string> = {
    primary: 'bg-vault text-background hover:bg-vault/90',
    secondary: 'border border-border hover:border-vault/40 hover:text-vault',
    ghost: 'hover:bg-card/60 text-muted-foreground hover:text-foreground',
    danger: 'border border-destructive/40 bg-destructive/10 text-red-300 hover:bg-destructive/20',
  }
  const sizes: Record<string, string> = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  }
  return (
    <motion.button
      type={type}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </motion.button>
  )
}

export function Input({
  value,
  onChange,
  placeholder,
  type = 'number',
  suffix,
  max,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'number' | 'text'
  suffix?: string
  max?: () => void
}) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 border border-border bg-background px-4 pr-24 text-lg font-mono focus:outline-none focus:border-vault/40 transition-colors"
      />
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {max && (
            <button
              onClick={max}
              className="text-[10px] font-mono uppercase tracking-wider text-vault hover:text-vault/80 transition-colors"
            >
              Max
            </button>
          )}
          <span className="text-xs font-mono font-bold text-muted-foreground">{suffix}</span>
        </div>
      )}
    </div>
  )
}

export function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 border border-emerald-500/40 bg-card px-5 py-3"
    >
      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      <span className="text-sm font-medium text-emerald-100">{message}</span>
      <button onClick={onClose} className="ml-2 text-emerald-400/60 hover:text-emerald-300 text-xs">
        ✕
      </button>
    </motion.div>
  )
}

export function Pill({ children, color = 'vault' }: { children: ReactNode; color?: 'vault' | 'xusd' | 'vlt' | 'emerald' | 'red' | 'amber' | 'muted' }) {
  const colors: Record<string, string> = {
    vault: 'text-vault',
    xusd: 'text-xusd',
    vlt: 'text-vlt',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
    muted: 'text-muted-foreground',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] ${colors[color]}`}>
      {children}
    </span>
  )
}

export function ActionLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-semibold text-vault hover:gap-2 transition-all"
    >
      {children}
      <ArrowRight className="w-3 h-3" />
    </button>
  )
}
