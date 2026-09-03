'use client'

// Achievements — the Observatory's witness game.
// Watching the chain live unlocks badges (persisted in localStorage).
// Unlock moments fire a toast + a tiny fanfare when sound is on.

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trophy, Eye, EyeOff } from 'lucide-react'
import { XelisBlock } from '@/lib/xelis/explorer'
import { SessionStats } from './use-explorer-live'
import { playFanfare } from './fx'

const STORE_KEY = 'observatory-achievements-v1'

export interface Achievement {
  id: string
  title: string
  desc: string
  icon: string
  check: (ctx: { session: SessionStats; blocks: XelisBlock[] }) => boolean
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-light', title: 'First Light', desc: 'Witness your first live block', icon: '🌅', check: ({ session }) => session.blocksWitnessed >= 1 },
  { id: 'sentry', title: 'Vault Sentry', desc: 'Witness 10 blocks live', icon: '👁️', check: ({ session }) => session.blocksWitnessed >= 10 },
  { id: 'dag-whisperer', title: 'DAG Whisperer', desc: 'Witness 50 blocks live', icon: '🌌', check: ({ session }) => session.blocksWitnessed >= 50 },
  { id: 'archivist', title: 'Lattice Archivist', desc: 'Witness 100 blocks live', icon: '📜', check: ({ session }) => session.blocksWitnessed >= 100 },
  { id: 'fork-spotter', title: 'Fork Spotter', desc: 'See a Side block land (30% reward)', icon: '🌿', check: ({ session }) => session.sideBlocks >= 1 },
  { id: 'twin-heights', title: 'Twin Heights', desc: 'Watch two blocks share one height', icon: '👯', check: ({ blocks }) => {
    const byHeight = new Map<number, number>()
    for (const b of blocks) byHeight.set(b.height, (byHeight.get(b.height) ?? 0) + 1)
    for (const [, n] of byHeight) if (n >= 2) return true
    return false
  } },
  { id: 'fire-witness', title: 'Fire Witness', desc: 'Watch fees burn live', icon: '🔥', check: ({ session }) => session.xelBurned > 0 },
  { id: 'full-load', title: 'Full Load', desc: 'See a block carry 5+ transactions', icon: '📦', check: ({ session }) => session.biggestTxs >= 5 },
  { id: 'sealed-ten', title: 'Sealed Ten', desc: 'Watch 10 txs get sealed live', icon: '🔒', check: ({ session }) => session.txsSealed >= 10 },
]

interface Toast {
  key: number
  achievement: Achievement
}

export function Achievements({
  session,
  blocks,
  soundOn,
}: {
  session: SessionStats
  blocks: XelisBlock[]
  soundOn: boolean
}) {
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set())
  const [toasts, setToasts] = useState<Toast[]>([])
  const hydrated = useRef(false)
  const soundRef = useRef(soundOn)
  useEffect(() => { soundRef.current = soundOn }, [soundOn])

  // hydrate from storage (deferred to a frame — no sync setState in effect body)
  useEffect(() => {
    let raw: string | null = null
    try {
      raw = localStorage.getItem(STORE_KEY)
    } catch { /* noop */ }
    hydrated.current = true
    if (!raw) return
    const saved = raw
    const raf = requestAnimationFrame(() => {
      try {
        setUnlocked(new Set(JSON.parse(saved) as string[]))
      } catch { /* noop */ }
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  // evaluate unlock conditions (only live-witnessed stats matter)
  const ctx = useMemo(() => ({ session, blocks }), [session, blocks])
  useEffect(() => {
    if (!hydrated.current) return
    const fresh = ACHIEVEMENTS.filter((a) => !unlocked.has(a.id) && a.check(ctx))
    if (fresh.length === 0) return
    const key = Date.now()
    const keys = fresh.map((_, i) => key + i)
    const current = unlocked
    const raf = requestAnimationFrame(() => {
      const next = new Set(current)
      fresh.forEach((a) => next.add(a.id))
      setUnlocked(next)
      try { localStorage.setItem(STORE_KEY, JSON.stringify([...next])) } catch { /* noop */ }
      setToasts((prev) => [...prev.slice(-2), ...fresh.map((a, i) => ({ key: key + i, achievement: a }))])
      if (soundRef.current) playFanfare()
    })
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => !keys.includes(x.key)))
    }, 5200)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [ctx, unlocked])

  const pct = Math.round((unlocked.size / ACHIEVEMENTS.length) * 100)

  return (
    <>
      {/* Toasts (top-right, stack) */}
      <div className="fixed top-20 md:top-24 right-4 z-[70] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.key}
              initial={{ opacity: 0, x: 60, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-[#161022]/95 backdrop-blur px-4 py-3 shadow-[0_0_40px_-8px_rgba(251,191,36,0.4)]"
            >
              <span className="text-2xl">{t.achievement.icon}</span>
              <div>
                <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-amber-300">
                  <Trophy className="w-3 h-3" /> achievement unlocked
                </div>
                <div className="text-sm font-semibold text-foreground">{t.achievement.title}</div>
                <div className="text-[10px] font-mono text-muted-foreground">{t.achievement.desc}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Badge board */}
      <div className="rounded-2xl glass-panel p-4 md:p-5 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
            <Trophy className="w-3.5 h-3.5 text-amber-300/80" />
            Witness Achievements
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/60">
            {unlocked.size}/{ACHIEVEMENTS.length} · {pct}%
          </span>
        </div>

        {/* progress bar */}
        <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden mb-3">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-200"
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const on = unlocked.has(a.id)
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative rounded-xl border px-2 py-2.5 text-center transition-colors ${
                  on ? 'border-amber-400/30 bg-amber-400/5' : 'border-border/60 bg-card/30'
                }`}
                title={a.desc}
              >
                <div className={`text-xl leading-none ${on ? '' : 'opacity-25 grayscale'}`}>{a.icon}</div>
                <div className={`mt-1 text-[9px] font-mono leading-tight ${on ? 'text-amber-200/90' : 'text-muted-foreground/70'}`}>
                  {a.title}
                </div>
                {!on && <EyeOff className="absolute top-1.5 right-1.5 w-2.5 h-2.5 text-muted-foreground/30" />}
                {on && <Eye className="absolute top-1.5 right-1.5 w-2.5 h-2.5 text-amber-400/50" />}
              </motion.div>
            )
          })}
        </div>

        <p className="mt-3 text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
          Badges unlock only from blocks you watched land live, witnessing history, not loading it.
          Progress persists on this device.
        </p>
      </div>
    </>
  )
}
