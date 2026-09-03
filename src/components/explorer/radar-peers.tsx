'use client'

// Mempool Radar + Peer Constellation + "Sealed by Design" panels.

import { AnimatePresence, motion } from 'framer-motion'
import { Eye, EyeOff, Radar, Satellite } from 'lucide-react'
import { PeerInfo } from '@/lib/xelis/explorer'
import { feeRateToXelPerKb } from '@/lib/xelis/explorer'

// ---- Mempool Radar ------------------------------------------------------

export function MempoolRadar({
  total,
  feeRates,
  blips,
}: {
  total: number | null
  feeRates: { low: number; medium: number; high: number; default: number } | null
  blips: { id: number; at: number }[]
}) {
  const maxRate = feeRates ? Math.max(feeRates.low, feeRates.medium, feeRates.high, 1) : 1
  const bars: { label: string; v: number }[] = feeRates
    ? [
        { label: 'low', v: feeRates.low },
        { label: 'medium', v: feeRates.medium },
        { label: 'high', v: feeRates.high },
      ]
    : []

  return (
    <div className="rounded-2xl glass-panel p-4 md:p-5 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          <Radar className="w-3.5 h-3.5 text-cyan-300/80" />
          Mempool Radar
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/60">tx queue</span>
      </div>

      {/* Radar scope */}
      <div className="relative mx-auto w-40 h-40 md:w-44 md:h-44">
        <div className="absolute inset-0 rounded-full border border-cyan-400/20" />
        <div className="absolute inset-[18%] rounded-full border border-cyan-400/15" />
        <div className="absolute inset-[36%] rounded-full border border-cyan-400/10" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-cyan-400/10" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-cyan-400/10" />
        {/* sweep */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, rgba(103,232,249,0.28), transparent 70deg)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
        />
        {/* center count */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-bold text-cyan-200 tabular-nums">{total ?? '—'}</span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">in mempool</span>
        </div>
        {/* blips */}
        <AnimatePresence>
          {blips.slice(-6).map((b) => {
            const angle = (b.id * 77) % 360
            const dist = 28 + ((b.id * 37) % 20)
            return (
              <motion.span
                key={b.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 1, 0], scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.4, times: [0, 0.1, 0.7, 1] }}
                className="absolute w-2 h-2 rounded-full bg-cyan-300"
                style={{
                  left: `calc(50% + ${Math.cos((angle * Math.PI) / 180) * dist}px - 4px)`,
                  top: `calc(50% + ${Math.sin((angle * Math.PI) / 180) * dist}px - 4px)`,
                  boxShadow: '0 0 12px rgba(103,232,249,0.9)',
                }}
              />
            )
          })}
        </AnimatePresence>
      </div>

      {/* Fee rates */}
      <div className="mt-4 space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">estimated fee rates</div>
        {bars.length > 0 ? (
          bars.map((b) => (
            <div key={b.label} className="flex items-center gap-2">
              <span className="w-12 text-[10px] font-mono text-muted-foreground">{b.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(b.v / maxRate) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500/70 to-cyan-300"
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{b.v}</span>
            </div>
          ))
        ) : (
          <div className="text-[10px] font-mono text-muted-foreground/60">loading…</div>
        )}
        {feeRates && (
          <div className="text-[9px] font-mono text-muted-foreground/70">
            atomic/byte · ≈ {feeRateToXelPerKb(feeRates.default)} XET per KB
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Peer Constellation --------------------------------------------------

export function PeersPanel({
  peers,
  nodeVersion,
}: {
  peers: { peers: PeerInfo[]; total_peers: number; hidden_peers: number } | null
  nodeVersion: string | null
}) {
  const list = peers?.peers ?? []
  const total = peers?.total_peers ?? 0
  const byVersion = new Map<string, number>()
  for (const p of list) byVersion.set(p.version, (byVersion.get(p.version) ?? 0) + 1)
  const versions = [...byVersion.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <div className="rounded-2xl glass-panel p-4 md:p-5 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          <Satellite className="w-3.5 h-3.5 text-vault/80" />
          Peer Constellation
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/60">p2p mesh</span>
      </div>

      {/* Constellation */}
      <div className="relative mx-auto w-40 h-40 md:w-44 md:h-44">
        <div className="absolute inset-0 rounded-full border border-vault/15" />
        <div className="absolute inset-[22%] rounded-full border border-vault/10" />
        {/* center: the vantage node */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-3 h-3 rounded-full bg-vault" style={{ boxShadow: '0 0 16px var(--vault)' }} />
          <div className="absolute inset-0 rounded-full animate-ping bg-vault/30" />
        </div>
        {list.slice(0, 10).map((p, i) => {
          const angle = (p.id % 360) * (Math.PI / 180) + i * 0.35
          const dist = i % 2 === 0 ? 38 : 55
          const synced = p.topoheight > 0
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 260, damping: 20 }}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `calc(50% + ${Math.cos(angle) * dist}px - 4px)`,
                top: `calc(50% + ${Math.sin(angle) * dist}px - 4px)`,
                background: synced ? '#67e8f9' : '#fbbf24',
                boxShadow: synced ? '0 0 8px rgba(103,232,249,0.7)' : '0 0 8px rgba(251,191,36,0.7)',
              }}
              title={`${p.addr} · v${p.version}`}
            />
          )
        })}
        {list.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-muted-foreground/60">
            scanning mesh…
          </div>
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-[11px] font-mono">
          <span className="text-muted-foreground">connected peers</span>
          <span className="font-semibold">{total}</span>
        </div>
        {versions.map(([v, n]) => (
          <div key={v} className="flex justify-between text-[10px] font-mono text-muted-foreground">
            <span>v{v}</span>
            <span>
              ×{n}
              {nodeVersion === v ? ' · matches node' : ''}
            </span>
          </div>
        ))}
        <div className="text-[9px] font-mono text-muted-foreground/70 pt-1">
          cyan = synced · amber = catching up · center = your vantage
        </div>
      </div>
    </div>
  )
}

// ---- Sealed by Design -----------------------------------------------------

const VISIBLE = [
  'Block structure & DAG topology',
  'Miner addresses & rewards',
  'Fees paid and burned',
  'Tx graph shape (source → N destinations)',
  'Contract calls, entries & gas',
  'Peers, versions, hashrate',
]

const SEALED = [
  'Transfer amounts',
  'Account balances',
  'Asset holdings per address',
  'Counterparty linkage amounts',
  'Historical flow values',
  'Everything under Twisted ElGamal',
]

export function SealedByDesign() {
  return (
    <div className="rounded-2xl glass-panel p-4 md:p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          <EyeOff className="w-3.5 h-3.5 text-pink-300/80" />
          Sealed by Design
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/60">privacy model</span>
      </div>

      <div className="grid grid-cols-1 gap-3 flex-1">
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-300 mb-2">
            <Eye className="w-3 h-3" /> visible here
          </div>
          <ul className="space-y-1">
            {VISIBLE.map((t) => (
              <li key={t} className="text-[11px] text-foreground/85 flex items-start gap-1.5">
                <span className="text-emerald-400 mt-px">·</span> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-pink-400/20 bg-pink-400/5 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-pink-300 mb-2">
            <EyeOff className="w-3 h-3" /> sealed forever
          </div>
          <ul className="space-y-1">
            {SEALED.map((t) => (
              <li key={t} className="text-[11px] text-foreground/85 flex items-start gap-1.5">
                <span className="text-pink-400 mt-px">·</span> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
        XELIS encrypts amounts with homomorphic Twisted ElGamal. The Observatory shows you the machinery
        never the money. That is the point.
      </p>
    </div>
  )
}
