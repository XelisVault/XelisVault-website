'use client'

import { motion } from 'framer-motion'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { ChevronRight, Rocket, Clock } from 'lucide-react'
import { alpha, LAUNCH_DATE, randomGlyph, seededRandom } from '@/lib/countdown'
import { ChainVisual } from '@/components/site/launch-celebration'
import { FeatureTour, tourDurationMs } from '@/components/site/feature-tour'

/**
 * ═══════════════════════════════════════════════════════════════════
 *  THE LATE-COMER WELCOME — "you missed the opening, not the era"
 * ═══════════════════════════════════════════════════════════════════
 *
 *  A unique ~24s cinematic for visitors who arrive AFTER the launch
 *  (and never saw the vault opening). Deliberately different from
 *  the unlock ceremony — a discovery vibe instead of high tension:
 *
 *   1. ARCHIVE   film-style playback HUD fades in — "LAUNCH ARCHIVE"
 *   2. RUSH      the whole 21-day countdown re-runs as a 2.4s
 *                accelerating slot-machine time-rush → 00:00:00
 *   3. REPLAY    the opening, speedrun: wheel spins, bolts blow,
 *                a compressed golden breach
 *   4. CHAIN     the blockchain line assembles itself and every
 *                protocol feature blooms from its block
 *   5. TOUR      the protocol tour in fast-forward — all nine
 *                modules flash by in a 8.5s speedrun
 *   6. WELCOME   "WELCOME TO THE NEW ERA" decodes, stats, CTA
 *
 *  Emerald & gold identity (the ceremony was violet & amber).
 *  Skip with the button or Esc.
 */

type Phase = 'archive' | 'rush' | 'replay' | 'chain' | 'tour' | 'welcome'
const PHASES: Phase[] = ['archive', 'rush', 'replay', 'chain', 'tour', 'welcome']

const T_RUSH = 1000
const T_REPLAY = 4300
const T_CHAIN = 6800
const T_TOUR = 10100
const T_WELCOME = T_TOUR + tourDurationMs(true) + 250
const T_END = T_WELCOME + 4200
const T_COMPLETE = T_END + 800

const EMERALD = 'oklch(0.72 0.14 160)'
const GOLD = 'oklch(0.85 0.12 80)'

/** human "X ago" from launch to now */
function agoSince(ts: number): string {
  const ms = Math.max(0, ts - LAUNCH_DATE)
  const m = Math.floor(ms / 60_000)
  if (m < 60) return `${Math.max(1, m)} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m ago`
  const d = Math.floor(h / 24)
  return `${d} day${d > 1 ? 's' : ''} ago`
}

// ===== Time rush — the 21 days replayed in ~2.4s =====
function TimeRush({ active }: { active: boolean }) {
  const TOTAL = 21 * 24 * 3600 * 1000 // announced 21 days before
  const [ms, setMs] = useState(TOTAL)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!active) return
    let raf = 0
    const dur = 2400
    const t0 = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur)
      // accelerating ease-in — slow start, mad finish
      const eased = p * p * p
      setMs(TOTAL * (1 - eased))
      if (p < 1) raf = requestAnimationFrame(step)
      else {
        setMs(0)
        setDone(true)
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [active])

  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="relative flex flex-col items-center">
      {/* speed lines while rushing */}
      {!done && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 10 }, (_, i) => (
            <motion.div
              key={i}
              className="absolute h-px"
              style={{
                top: `${8 + i * 9}%`,
                left: `${(i * 37) % 70}%`,
                width: `${10 + (i % 4) * 8}%`,
                background: `linear-gradient(90deg, transparent, ${i % 3 === 0 ? GOLD : EMERALD} / 0.5, transparent)`,
              }}
              animate={{ x: ['-30vw', '40vw'], opacity: [0, 0.8, 0] }}
              transition={{ duration: 0.5 + (i % 3) * 0.15, repeat: Infinity, ease: 'easeIn' }}
            />
          ))}
        </div>
      )}
      <motion.div
        animate={done ? { scale: [1, 1.12, 1], filter: ['brightness(1)', 'brightness(2.2)', 'brightness(1)'] } : {}}
        transition={{ duration: 0.5 }}
        className="flex items-baseline gap-2 md:gap-4 font-mono font-bold tabular-nums"
        style={{
          fontSize: 'clamp(2.2rem, 9vmin, 6rem)',
          color: done ? GOLD : 'oklch(0.92 0.01 280)',
          textShadow: done ? `0 0 42px ${alpha(GOLD, 0.7)}` : `0 0 22px ${alpha(EMERALD, 0.35)}`,
        }}
      >
        <span>{pad(d)}<span className="text-[0.4em] opacity-50">D</span></span>
        <span className="opacity-40">:</span>
        <span>{pad(h)}</span>
        <span className="opacity-40">:</span>
        <span>{pad(m)}</span>
        <span className="opacity-40">:</span>
        <span>{pad(s)}</span>
      </motion.div>
      {/* the moment of genesis */}
      {done && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-4 font-mono text-[10px] md:text-xs uppercase tracking-[0.5em]"
          style={{ color: EMERALD }}
        >
          Genesis · {agoSince(Date.now())}
        </motion.div>
      )}
    </div>
  )
}

// ===== Replay — the opening, speedrun =====
function MiniWheelReplay({ active }: { active: boolean }) {
  const bolts = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2
        return { id: i, a, x: Math.cos(a) * 120, y: Math.sin(a) * 120 }
      }),
    []
  )
  return (
    <motion.svg
      width="300"
      height="300"
      viewBox="-160 -160 320 320"
      className="max-w-[70vw] max-h-[70vw]"
      initial={{ opacity: 0, scale: 0.9, rotate: -30 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* plate */}
      <circle r={130} fill="oklch(0.13 0.025 282)" stroke={`${alpha(EMERALD, 0.4)}`} strokeWidth={2} />
      <circle r={100} fill="none" stroke={`${alpha(EMERALD, 0.2)}`} strokeWidth={1} strokeDasharray="3 6" />
      {/* spinning spoke assembly */}
      <motion.g
        animate={{ rotate: 420 }}
        transition={{ duration: 1.6, ease: [0.5, 0, 0.4, 1] }}
        style={{ transformOrigin: '0px 0px' }}
      >
        {[0, 90, 180, 270].map((deg) => (
          <rect
            key={deg}
            x={-5}
            y={-78}
            width={10}
            height={58}
            rx={5}
            fill={EMERALD}
            opacity={0.7}
            transform={`rotate(${deg})`}
          />
        ))}
        <circle r={78} fill="none" stroke={EMERALD} strokeWidth={8} opacity={0.6} />
      </motion.g>
      {/* bolts blow rapid-fire */}
      {bolts.map((b, i) => (
        <motion.g key={b.id}>
          <motion.line
            x1={Math.cos(b.a) * 100}
            y1={Math.sin(b.a) * 100}
            x2={b.x}
            y2={b.y}
            stroke={GOLD}
            strokeWidth={4}
            strokeLinecap="round"
            initial={{ opacity: 1 }}
            animate={active ? { x2: b.x * 1.6, y2: b.y * 1.6, opacity: 0 } : {}}
            transition={{ delay: 0.15 + i * 0.07, duration: 0.4, ease: 'backIn' }}
          />
          <motion.circle
            cx={b.x}
            cy={b.y}
            r={5}
            fill={GOLD}
            initial={{ opacity: 1 }}
            animate={active ? { opacity: 0, scale: 2.4 } : {}}
            transition={{ delay: 0.15 + i * 0.07, duration: 0.35 }}
          />
        </motion.g>
      ))}
      {/* hub */}
      <circle r={34} fill="oklch(0.14 0.03 285)" stroke={`${alpha(GOLD, 0.6)}`} strokeWidth={2.5} />
      <motion.circle
        r={8}
        fill={GOLD}
        animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      />
    </motion.svg>
  )
}

// ===== breach particles (deterministic) =====
function buildBurst() {
  const rnd = seededRandom(777)
  const colors = [GOLD, EMERALD, 'oklch(0.98 0.005 280)', 'oklch(0.78 0.16 195)']
  return Array.from({ length: 90 }, (_, i) => {
    const a = rnd() * Math.PI * 2
    const dist = 120 + rnd() * 640
    return {
      id: i,
      x: Math.cos(a) * dist,
      y: Math.sin(a) * dist,
      size: 3 + rnd() * 5,
      dur: 1.1 + rnd() * 0.9,
      color: colors[Math.floor(rnd() * colors.length)],
      glyph: rnd() < 0.3 ? randomGlyph() : null,
    }
  })
}

// ===== small decode text =====
function DecodeText({ text, startDelay = 0 }: { text: string; startDelay?: number }) {
  const [out, setOut] = useState('')
  useEffect(() => {
    let resolved = 0
    let interval: ReturnType<typeof setInterval> | undefined
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        resolved++
        setOut(
          text
            .split('')
            .map((ch, i) => (i < resolved ? ch : ch === ' ' ? ' ' : randomGlyph()))
            .join('')
        )
        if (resolved >= text.length && interval) clearInterval(interval)
      }, 46)
    }, startDelay)
    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [text, startDelay])
  return <span>{out || text.replace(/[^\s]/g, ' ')}</span>
}

// ═══════════════════ MAIN COMPONENT ═══════════════════
export function WelcomeSequence({
  onComplete,
  onEnterApp,
}: {
  onComplete: () => void
  onEnterApp?: () => void
}) {
  const [phase, setPhase] = useState<Phase>('archive')
  const [fading, setFading] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const burst = useMemo(buildBurst, [])
  const pi = PHASES.indexOf(phase)
  const agoRef = useRef(agoSince(Date.now()))

  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const finish = useCallback(() => {
    setFading(true)
    setTimeout(() => onCompleteRef.current(), 500)
  }, [])

  useEffect(() => {
    const schedule: [number, () => void][] = [
      [T_RUSH, () => setPhase('rush')],
      [T_REPLAY, () => setPhase('replay')],
      [T_CHAIN, () => setPhase('chain')],
      [T_TOUR, () => setPhase('tour')],
      [T_WELCOME, () => setPhase('welcome')],
      [T_END, () => setFading(true)],
      [T_COMPLETE, () => onCompleteRef.current()],
    ]
    const timers = schedule.map(([ms, fn]) => setTimeout(fn, ms))
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !skipping) {
        setSkipping(true)
        finish()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [finish, skipping])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="fixed inset-0 z-[100] bg-background overflow-hidden select-none"
    >
      {/* emerald morning light rays */}
      <motion.div
        className="absolute left-1/2 top-1/2 pointer-events-none"
        style={{
          width: '240vmax',
          height: '240vmax',
          x: '-50%',
          y: '-50%',
          background:
            'repeating-conic-gradient(from 0deg, transparent 0deg 12deg, oklch(0.72 0.14 160 / 0.06) 12deg 14deg, transparent 14deg 26deg, oklch(0.85 0.12 80 / 0.04) 26deg 27.5deg, transparent 27.5deg 40deg)',
          maskImage: 'radial-gradient(circle, black 0%, transparent 62%)',
          WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 62%)',
        }}
        initial={{ opacity: 0, rotate: 0 }}
        animate={{ opacity: pi >= 5 ? 0.85 : pi === 4 ? 0.4 : pi >= 2 ? 0.85 : pi >= 1 ? 0.4 : 0, rotate: 360 }}
        transition={{
          opacity: { duration: 1 },
          rotate: { duration: 130, repeat: Infinity, ease: 'linear' },
        }}
      />

      {/* ── PHASE 1 · ARCHIVE HUD ── */}
      {pi === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-6"
        >
          <div className="absolute top-8 left-8 font-mono text-[10px] md:text-xs uppercase tracking-[0.35em] text-muted-foreground/70 flex items-center gap-2">
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.1, repeat: Infinity }}
              className="w-2 h-2 rounded-full"
              style={{ background: GOLD }}
            />
            Vault Archive · Playback
          </div>
          <div className="absolute top-8 right-8 font-mono text-[10px] md:text-xs uppercase tracking-[0.35em] text-muted-foreground/70 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            {agoRef.current}
          </div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 160 }}
            className="relative w-20 h-20 md:w-24 md:h-24 rounded-none overflow-hidden ring-2"
            style={{ '--tw-ring-color': `${alpha(EMERALD, 0.6)}` } as React.CSSProperties}
          >
            <img src="/images/xelisvault-logo.png" alt="Xelis Vault" className="w-full h-full object-cover" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="font-mono text-[10px] md:text-xs uppercase tracking-[0.5em] text-muted-foreground"
          >
            Replaying the launch…
          </motion.div>
        </motion.div>
      )}

      {/* ── PHASE 2 · TIME RUSH ── */}
      {pi === 1 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 font-mono text-[10px] md:text-xs uppercase tracking-[0.5em]"
            style={{ color: EMERALD }}
          >
            <span className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: EMERALD }} />
              <span className="w-2 h-2 rounded-full animate-pulse [animation-delay:0.2s]" style={{ background: `${alpha(EMERALD, 0.5)}` }} />
              <span className="w-2 h-2 rounded-full animate-pulse [animation-delay:0.4s]" style={{ background: `${alpha(EMERALD, 0.25)}` }} />
            </span>
            Time Compression · 21 Days
          </motion.div>
          <TimeRush active />
          {/* final flash when rush completes */}
          <motion.div
            className="absolute inset-0 bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ delay: 3.15, duration: 0.5 }}
          />
        </div>
      )}

      {/* ── PHASE 3 · REPLAY, the opening, speedrun ── */}
      {pi === 2 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <MiniWheelReplay active />
          {/* compressed breach flash + burst */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ delay: 1.5, duration: 0.55 }}
            style={{ background: 'radial-gradient(circle, oklch(0.85 0.12 80 / 0.35) 0%, transparent 60%)' }}
          />
          <motion.div
            className="absolute left-1/2 top-1/2 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 1, 0] }}
            transition={{ delay: 1.5, duration: 2.2, times: [0, 0.68, 0.72, 1] }}
          >
            {burst.map((p) => (
              <motion.div
                key={p.id}
                className="absolute"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.2 }}
                transition={{ duration: p.dur, delay: 1.5, ease: [0.08, 0.7, 0.2, 1] }}
                style={
                  p.glyph
                    ? {
                        color: p.color,
                        fontSize: p.size * 2.4,
                        fontFamily: 'var(--font-jetbrains)',
                        textShadow: `0 0 10px ${p.color}`,
                      }
                    : {
                        width: p.size,
                        height: p.size,
                        borderRadius: '50%',
                        background: p.color,
                        boxShadow: `0 0 12px ${p.color}`,
                      }
                }
              >
                {p.glyph ?? ''}
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* ── PHASES 4-6 · THE CHAIN → THE TOUR → WELCOME ── */}
      {pi >= 3 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 md:gap-9">
          <motion.div
            initial={{ scale: 0, y: 40, opacity: 0 }}
            animate={{ scale: pi >= 5 ? 0.72 : 1, y: pi >= 5 ? -72 : 0, opacity: pi === 4 || fading ? 0 : 1 }}
            transition={{
              scale: { type: 'spring', stiffness: 170, damping: 16 },
              y: { type: 'spring', stiffness: 130, damping: 17 },
            }}
            className="relative z-10"
          >
            <motion.div
              animate={{
                boxShadow: [
                  `0 0 30px -4px ${EMERALD}`,
                  `0 0 70px 4px ${alpha(GOLD, 0.6)}`,
                  `0 0 30px -4px ${EMERALD}`,
                ],
              }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="w-20 h-20 md:w-24 md:h-24 rounded-none overflow-hidden ring-2"
              style={{ '--tw-ring-color': `${alpha(EMERALD, 0.6)}` } as React.CSSProperties}
            >
              <img src="/images/xelisvault-logo.png" alt="Xelis Vault" className="w-full h-full object-cover" />
            </motion.div>
          </motion.div>

          {/* the chain, dives INTO the camera when the tour starts */}
          <motion.div
            key={pi >= 5 ? 'chain-welcome' : 'chain-main'}
            initial={{ opacity: 0, scale: 0.72 }}
            animate={{
              opacity: pi === 4 || fading ? 0 : 1,
              scale: pi === 4 ? 6.5 : pi >= 5 ? 0.9 : 1,
            }}
            transition={
              pi === 4
                ? { duration: 0.55, ease: [0.55, 0, 0.85, 0.4] }
                : { duration: 0.5, ease: [0.2, 0.8, 0.3, 1] }
            }
          >
            <ChainVisual compact={pi >= 5} fading={fading} />
          </motion.div>

          {pi === 3 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.7, 1] }}
              transition={{ delay: 1.4, duration: 1.2 }}
              className="font-mono text-[10px] md:text-xs uppercase tracking-[0.42em] text-center"
              style={{ color: `${alpha(EMERALD, 0.9)}` }}
            >
              The Blockchain · every state encrypted at birth
            </motion.div>
          )}
        </div>
      )}

      {/* ── PHASE 5 · THE PROTOCOL TOUR, speedrun ── */}
      {pi === 4 && <FeatureTour fast />}

      {/* ── PHASE 6 · WELCOME TEXT ── */}
      {pi >= 5 && (
        <div className="absolute inset-x-0 bottom-[9%] flex flex-col items-center gap-4 px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.9, 0.25, 1] }}
            className="font-display text-4xl md:text-6xl font-semibold tracking-[-0.04em] leading-[0.95]"
          >
            <span style={{ color: EMERALD }}>
              <DecodeText text="WELCOME TO" startDelay={200} />
            </span>
            <span className="ml-3 md:ml-4" style={{ color: GOLD }}>
              <DecodeText text="THE NEW ERA" startDelay={800} />
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="text-xs md:text-sm font-mono text-muted-foreground"
          >
            The vault opened {agoRef.current}, the future is still young
          </motion.div>

          {/* live stats */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.45, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-xs md:text-sm"
          >
            <span style={{ color: EMERALD }}>
              <b className="text-lg md:text-xl font-display">51</b> contracts
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span style={{ color: 'oklch(0.78 0.16 195)' }}>
              <b className="text-lg md:text-xl font-display">966</b> entry points
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span style={{ color: GOLD }}>
              <b className="text-lg md:text-xl font-display">5s</b> finality
            </span>
          </motion.div>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 2.0, type: 'spring', stiffness: 220, damping: 18 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={(e) => {
              e.stopPropagation()
              if (onEnterApp) {
                setSkipping(true)
                onEnterApp()
                finish()
              } else {
                finish()
              }
            }}
            className="relative mt-2 inline-flex h-12 items-center gap-2.5 rounded-none px-8 text-sm font-semibold text-white"
            style={{
              background: `linear-gradient(120deg, ${EMERALD}, oklch(0.55 0.16 175))`,
              boxShadow: `0 0 40px -6px ${alpha(EMERALD, 0.7)}`,
              cursor: 'pointer',
            }}
          >
            <motion.span
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [`0 0 0 0 ${alpha(EMERALD, 0.5)}`, `0 0 0 10px ${alpha(EMERALD, 0)})`],
              }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
            <Rocket className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Enter the App</span>
          </motion.button>
        </div>
      )}

      {/* skip control */}
      {!fading && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          whileHover={{ opacity: 1 }}
          onClick={(e) => {
            e.stopPropagation()
            if (skipping) return
            setSkipping(true)
            finish()
          }}
          className="absolute bottom-5 right-5 z-10 inline-flex items-center gap-1 rounded-none border border-border bg-card/50 backdrop-blur px-4 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground transition-colors"
        >
          Skip <ChevronRight className="w-3.5 h-3.5" />
        </motion.button>
      )}

      {/* progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: T_COMPLETE / 1000, ease: 'linear' }}
        className="absolute bottom-0 left-0 right-0 h-0.5 origin-left"
        style={{ background: `linear-gradient(90deg, ${EMERALD}, ${GOLD})` }}
      />
    </motion.div>
  )
}
