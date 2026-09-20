'use client'

/**
 * ─────────────────────────────────────────────────────────────
 *  CHOOSE YOUR SIDE — the XelisVault entry ritual
 * ─────────────────────────────────────────────────────────────
 *  Every fresh browser session opens the site through this gate.
 *  Two protocols, two worlds, one standard: privacy.
 *
 *  XELIS  → the confidential BlockDAG financial platform (this site)
 *  NERVA  → private CPU-mined digital cash (/nerva world)
 *
 *  Crossing contract (the part that must never flash):
 *   1. Click a world → the crossing overlay becomes fully opaque
 *      (iris bloom) BEFORE anything underneath can change.
 *   2. router.push() runs under that opaque overlay, in BOTH
 *      directions: → /nerva when entering Nerva, → / when the
 *      visitor was inside /nerva and returns to Xelis.
 *   3. An arrival watcher closes the gate only once the target
 *      world has actually rendered, plus a paint buffer.
 *   4. The gate itself exits with a real animation (fade + zoom),
 *      because the root element is an AnimatePresence child,
 *      never an early `return null`.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { useSide, type Side } from '@/lib/side-store'

/* choreography timings (ms) */
const MIN_THEATRE = 1750 // the bloom + word moment always gets to breathe
const PAINT_BUFFER = 400 // let the arrived world paint before the reveal
const SAFETY_RELEASE = 8000 // if navigation dies, release the visitor anyway

const EASE_OUT = [0.22, 0.61, 0.36, 1] as const
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const

/* ── the "decode" title effect ── */
const GLYPHS = '01<>[]{}#$%&*+=/\\|ABCDEFXYZ'

function useDecodedText(target: string, speed = 34, startDelay = 420) {
  const [text, setText] = useState('')

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setText(target)
      return
    }
    let timer: ReturnType<typeof setInterval> | null = null
    const start = setTimeout(() => {
      let frame = 0
      timer = setInterval(() => {
        frame++
        const revealed = Math.floor(frame / 2)
        if (revealed >= target.length) {
          setText(target)
          if (timer) clearInterval(timer)
          return
        }
        let out = target.slice(0, revealed)
        for (let i = revealed; i < target.length; i++) {
          out += target[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        }
        setText(out)
      }, speed)
    }, startDelay)
    return () => {
      clearTimeout(start)
      if (timer) clearInterval(timer)
    }
  }, [target, speed, startDelay])

  return text
}

/* ── dust particles (gold for Xelis, signal bits for Nerva) ── */
function Particles({ world, count = 22 }: { world: Side; count?: number }) {
  const dots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2.4,
        dur: 5 + Math.random() * 9,
        delay: Math.random() * 6,
        drift: (Math.random() - 0.5) * 30,
      })),
    [count]
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {dots.map((d) => (
        <span
          key={d.id}
          className={`absolute rounded-full ${
            world === 'xelis'
              ? 'bg-[oklch(0.82_0.1_78_/_0.55)]'
              : 'bg-[oklch(0.8_0.06_237_/_0.6)]'
          }`}
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            animation: `side-float ${d.dur}s ease-in-out ${d.delay}s infinite`,
            ['--drift' as string]: `${d.drift}px`,
          }}
        />
      ))}
    </div>
  )
}

/* ── a world panel ── */
interface WorldPanelProps {
  world: Side
  active: boolean
  dimmed: boolean
  /** the other world was chosen: sink away while the bloom takes over */
  suppressed: boolean
  entranceDelay: number
  onChoose: () => void
  onSelect: () => void
}

function WorldPanel({ world, active, dimmed, suppressed, entranceDelay, onChoose, onSelect }: WorldPanelProps) {
  const isXelis = world === 'xelis'
  return (
    /* entrance wrapper: slides the world in from its own side of the seam */
    <motion.div
      initial={{ opacity: 0, x: isXelis ? -26 : 26, y: isXelis ? -18 : 18 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.8, delay: entranceDelay, ease: EASE_OUT }}
      className="flex-1 min-h-0 flex"
    >
      <motion.button
        type="button"
        onClick={onChoose}
        onMouseEnter={onSelect}
        onFocus={onSelect}
        initial={false}
        animate={{
          opacity: suppressed ? 0.06 : dimmed ? 0.35 : active ? 1 : 0.96,
          filter: suppressed
            ? 'blur(5px) brightness(0.4)'
            : dimmed
              ? 'blur(0px) saturate(0.4) brightness(0.75)'
              : 'blur(0px) saturate(1) brightness(1)',
          scale: active && !suppressed ? 1.012 : 1,
        }}
        transition={{ duration: suppressed ? 0.5 : 0.45, ease: EASE_OUT }}
        className={`relative group flex flex-col items-center justify-center overflow-hidden h-full w-full px-8 sm:px-12 outline-none focus-visible:ring-2 ${
          isXelis ? 'focus-visible:ring-[oklch(0.52_0.09_70)]' : 'focus-visible:ring-[oklch(0.78_0.06_237)]'
        } ${isXelis ? 'pb-14 md:pb-0' : 'pt-14 md:pt-0'}`}
        aria-label={isXelis ? 'Enter the XELIS side: confidential finance on BlockDAG' : 'Enter the NERVA side: private CPU-mined digital cash'}
      >
        {/* ambient world wash */}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            opacity: active ? (isXelis ? 0.1 : 0.14) : isXelis ? 0.05 : 0.06,
            background: isXelis
              ? 'radial-gradient(ellipse 80% 60% at 30% 20%, oklch(0.9 0.05 80 / 0.6), transparent 65%)'
              : 'radial-gradient(ellipse 80% 60% at 70% 75%, oklch(0.62 0.08 306 / 0.7), transparent 60%), radial-gradient(ellipse 70% 50% at 25% 25%, oklch(0.78 0.06 237 / 0.6), transparent 65%)',
          }}
        />
        {!isXelis && <div className="absolute inset-0 circuit-bg opacity-60" />}

        <Particles world={world} />

        {/* edge glow on hover / when chosen */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: active && !suppressed ? 1 : 0,
            boxShadow: isXelis
              ? 'inset 0 0 120px -30px oklch(0.72 0.09 75 / 0.5)'
              : 'inset 0 0 120px -30px oklch(0.78 0.06 237 / 0.5), inset 0 0 200px -60px oklch(0.62 0.08 306 / 0.45)',
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          {/* logo */}
          <motion.div
            animate={{ y: active && !suppressed ? -4 : 0, scale: active && !suppressed ? 1.06 : 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative mb-7"
          >
            <div
              className="absolute -inset-6 rounded-full blur-2xl transition-opacity duration-500"
              style={{
                opacity: active ? 0.5 : 0.18,
                background: isXelis
                  ? 'radial-gradient(circle, oklch(0.72 0.09 75 / 0.6), transparent 70%)'
                  : 'radial-gradient(circle, oklch(0.78 0.06 237 / 0.5), transparent 70%)',
              }}
            />
            <img
              src={isXelis ? '/images/xelis-logo.svg' : '/images/nerva/nerva-mark.png'}
              alt={isXelis ? 'XELIS logo' : 'NERVA logo'}
              className={`relative w-20 h-20 sm:w-24 sm:h-24 object-contain ${isXelis ? 'drop-shadow-[0_2px_12px_oklch(0_0_0_/_0.5)]' : 'drop-shadow-2xl'}`}
              draggable={false}
            />
          </motion.div>

          {/* protocol name */}
          <div
            className={`font-mono tracking-[0.42em] text-[26px] sm:text-[32px] font-bold leading-none ${
              isXelis ? 'text-[oklch(0.93_0.03_80)]' : 'text-[oklch(0.88_0.04_240)]'
            }`}
          >
            {isXelis ? 'XELIS' : 'NERVA'}
          </div>

          <div
            className={`mt-4 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.3em] ${
              isXelis ? 'text-[oklch(0.78_0.06_78)]' : 'text-[oklch(0.7_0.04_240)]'
            }`}
          >
            {isXelis ? 'Confidential Finance' : 'Private Digital Cash'}
          </div>

          {/* bullets */}
          <ul className="mt-7 space-y-2.5 text-left">
            {(isXelis
              ? ['BlockDAG · 5s finality · homomorphic encryption', 'xUSD stablecoin · VLT governance · P2P lending', 'Institutional-grade private banking interface']
              : ['CryptoNight-Adaptive v6 · CPU-only mining', 'Ring signatures ×5 · RingCT · one-time addresses', 'Tail emission 0.3 XNV/block · live explorer and payments']
            ).map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-[12.5px] text-white/55 leading-snug">
                <span
                  className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${
                    isXelis ? 'bg-[oklch(0.78_0.08_78)]' : 'bg-[oklch(0.78_0.06_237)]'
                  }`}
                />
                {line}
              </li>
            ))}
          </ul>

          {/* enter hint */}
          <div
            className={`mt-9 font-mono text-[10px] uppercase tracking-[0.34em] px-5 py-2.5 border transition-all duration-500 ${
              isXelis
                ? 'border-[oklch(0.72_0.09_75_/_0.4)] text-[oklch(0.85_0.07_78)]'
                : 'border-[oklch(0.78_0.06_237_/_0.4)] text-[oklch(0.83_0.06_237)]'
            } ${active && !suppressed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
          >
            Enter {isXelis ? 'the Vault' : 'the Signal'}
          </div>
        </div>
      </motion.button>
    </motion.div>
  )
}

/* ── the crossing: one world takes over the whole screen ────── */

function CrossingOverlay({ world }: { world: Side }) {
  const isXelis = world === 'xelis'

  const streaks = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        angle: (i / 14) * 360,
        x: 380 + (i % 5) * 90,
        dur: 0.9 + (i % 4) * 0.12,
        delay: 0.12 + (i % 7) * 0.055,
        steel: i % 2 === 0,
      })),
    []
  )

  const motes = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: 12 + Math.random() * 76,
        top: 22 + Math.random() * 58,
        dur: 1.9 + Math.random() * 1.1,
        delay: 0.25 + Math.random() * 0.55,
      })),
    []
  )

  return (
    <div className="absolute inset-0 z-30 overflow-hidden" aria-hidden="true">
      {/* iris bloom: the chosen world floods out from the seam */}
      <motion.div
        className="absolute inset-0"
        initial={{ clipPath: 'circle(0% at 50% 50%)' }}
        animate={{ clipPath: 'circle(148% at 50% 50%)' }}
        transition={{ duration: 0.62, ease: EASE_IN_OUT }}
        style={{
          background: isXelis
            ? 'radial-gradient(circle at 50% 50%, oklch(0.9 0.04 84) 0%, oklch(0.82 0.07 79) 36%, oklch(0.72 0.09 75) 52%, oklch(0.16 0.03 70) 78%, oklch(0.045 0.015 270) 100%)'
            : 'radial-gradient(circle at 50% 50%, oklch(0.18 0.035 250) 0%, oklch(0.14 0.03 255) 42%, oklch(0.1 0.02 260) 68%, oklch(0.045 0.015 270) 100%)',
        }}
      />

      {!isXelis && <div className="absolute inset-0 circuit-bg opacity-30" />}

      {/* Nerva: sonar pings rippling out from the signal */}
      {!isXelis &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={`ping-${i}`}
            className="absolute left-1/2 top-1/2 rounded-full border"
            style={{
              borderColor: 'oklch(0.78 0.06 237 / 0.55)',
              width: 10,
              height: 10,
              marginLeft: -5,
              marginTop: -5,
            }}
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: [1, 110], opacity: [0, 0.8, 0] }}
            transition={{ duration: 1.6, delay: 0.28 + i * 0.34, ease: 'easeOut', times: [0, 0.32, 1] }}
          />
        ))}

      {/* Nerva: warp streaks radiating outward */}
      {!isXelis &&
        streaks.map((s) => (
          <span
            key={`streak-${s.id}`}
            className="absolute left-1/2 top-1/2"
            style={{ transform: `rotate(${s.angle}deg)` }}
          >
            <motion.span
              className="block h-px w-28 rounded-full"
              style={{
                background: s.steel ? 'oklch(0.78 0.06 237 / 0.7)' : 'oklch(0.62 0.08 306 / 0.55)',
                boxShadow: '0 0 10px oklch(0.78 0.06 237 / 0.5)',
              }}
              initial={{ x: 0, opacity: 0 }}
              animate={{ x: [0, s.x], opacity: [0, 0.75, 0] }}
              transition={{ duration: s.dur, delay: s.delay, ease: [0.5, 0, 0.8, 0.4], times: [0, 0.42, 1] }}
            />
          </span>
        ))}

      {/* Xelis: gold motes rising through the light */}
      {isXelis &&
        motes.map((m) => (
          <motion.span
            key={`mote-${m.id}`}
            className="absolute w-1 h-1 rounded-full bg-[oklch(0.85_0.09_85_/_0.85)]"
            style={{ left: `${m.left}%`, top: `${m.top}%` }}
            initial={{ y: 36, opacity: 0 }}
            animate={{ y: -64, opacity: [0, 0.9, 0] }}
            transition={{ duration: m.dur, delay: m.delay, ease: 'easeOut', times: [0, 0.4, 1] }}
          />
        ))}

      {/* center of the crossing: the world announces itself */}
      <motion.div
        className="relative z-10 h-full flex flex-col items-center justify-center gap-7"
        initial={{ opacity: 0, scale: 0.86, filter: 'blur(8px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ delay: 0.38, duration: 0.66, ease: EASE_OUT }}
      >
        {isXelis ? (
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[oklch(0.09_0.015_270)] ring-1 ring-[oklch(0.72_0.09_75_/_0.55)] shadow-[0_0_70px_oklch(0.72_0.09_75_/_0.45)] flex items-center justify-center">
            <img src="/images/xelis-logo.svg" alt="XELIS" className="w-12 h-12 sm:w-14 sm:h-14" draggable={false} />
          </div>
        ) : (
          <img
            src="/images/nerva/nerva-mark.png"
            alt="NERVA"
            className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_0_38px_oklch(0.78_0.06_237_/_0.55)]"
            draggable={false}
          />
        )}

        <motion.div
          initial={{ letterSpacing: '0.9em', opacity: 0 }}
          animate={{ letterSpacing: '0.5em', opacity: 1 }}
          transition={{ delay: 0.48, duration: 0.7, ease: EASE_OUT }}
          className={`font-mono text-[12px] sm:text-[13px] font-semibold uppercase ${
            isXelis ? 'text-[oklch(0.34_0.05_62)]' : 'text-[oklch(0.8_0.06_237)]'
          }`}
        >
          {isXelis ? 'Entering the Vault' : 'Entering the Signal'}
        </motion.div>

        {/* loading hairline: fills while the new world renders underneath */}
        <div className={`h-px w-44 overflow-hidden ${isXelis ? 'bg-[oklch(0.3_0.04_60_/_0.3)]' : 'bg-white/12'}`}>
          <motion.div
            className="h-full origin-left"
            style={{ background: isXelis ? 'oklch(0.72 0.09 75)' : 'oklch(0.78 0.06 237)' }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5, duration: 1.45, ease: [0.3, 0, 0.2, 1] }}
          />
        </div>
      </motion.div>
    </div>
  )
}

/* ── the gate itself ─────────────────────────────────────────── */

type Phase = 'idle' | 'crossing-xelis' | 'crossing-nerva'

export function SideGate() {
  const gateOpen = useSide((s) => s.gateOpen)
  const side = useSide((s) => s.side)
  const choose = useSide((s) => s.choose)
  const router = useRouter()
  const pathname = usePathname() ?? '/'
  const reduce = useReducedMotion()
  const [hover, setHover] = useState<Side | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const title = useDecodedText('CHOOSE YOUR SIDE', 34, 420)
  const crossStart = useRef(0)

  /* lock scroll while the gate is up */
  useEffect(() => {
    if (gateOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [gateOpen])

  /* whenever the gate reopens, reset the theatre */
  useEffect(() => {
    if (gateOpen) {
      const r = requestAnimationFrame(() => setPhase('idle'))
      return () => cancelAnimationFrame(r)
    }
  }, [gateOpen])

  /* Esc keeps the current side (a first session defaults to Xelis) */
  useEffect(() => {
    if (!gateOpen || phase !== 'idle') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') choose(side ?? 'xelis')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gateOpen, phase, side, choose])

  /* THE CROSS: cover first, navigate underneath, land, then reveal */
  const cross = (world: Side) => {
    if (phase !== 'idle') return
    const inNerva = pathname.startsWith('/nerva')
    const needsNav = world === 'nerva' ? !inNerva : inNerva
    if (reduce) {
      choose(world)
      if (needsNav) router.push(world === 'nerva' ? '/nerva' : '/')
      return
    }
    crossStart.current = performance.now()
    setPhase(world === 'xelis' ? 'crossing-xelis' : 'crossing-nerva')
    /* navigate immediately: the overlay is turning opaque above it */
    if (needsNav) router.push(world === 'nerva' ? '/nerva' : '/')
  }

  /* arrival watcher: close the gate only once the target world
     has actually rendered (and its paint had time to settle) */
  useEffect(() => {
    if (phase === 'idle' || !gateOpen) return
    const wantNerva = phase === 'crossing-nerva'
    const inNerva = pathname.startsWith('/nerva')
    if (wantNerva === inNerva) {
      const elapsed = performance.now() - crossStart.current
      const wait = Math.max(0, MIN_THEATRE - elapsed) + PAINT_BUFFER
      const t = setTimeout(() => choose(wantNerva ? 'nerva' : 'xelis'), wait)
      return () => clearTimeout(t)
    }
    /* not arrived yet: hold the veil. Navigation is still in flight. */
  }, [pathname, phase, gateOpen, choose])

  /* safety valve: if navigation dies mid-crossing, never trap the visitor */
  useEffect(() => {
    if (phase === 'idle' || !gateOpen) return
    const t = setTimeout(() => {
      if (useSide.getState().gateOpen) choose(side ?? 'xelis')
    }, SAFETY_RELEASE)
    return () => clearTimeout(t)
  }, [phase, gateOpen, side, choose])

  const crossingWorld: Side | null =
    phase === 'crossing-xelis' ? 'xelis' : phase === 'crossing-nerva' ? 'nerva' : null

  return (
    <AnimatePresence>
      {gateOpen && (
        <motion.div
          key="side-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.32, ease: 'easeOut' } }}
          exit={{ opacity: 0, scale: 1.03, transition: { duration: 0.7, ease: [0.33, 1, 0.68, 1] } }}
          className="fixed inset-0 z-[150] bg-[oklch(0.045_0.015_270)] select-none"
          role="dialog"
          aria-modal="true"
          aria-label="Choose your side"
        >
          {/* depth vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 120% 90% at 50% 50%, transparent 55%, oklch(0.02 0.01 270 / 0.6) 100%)' }}
          />

          {/* film grain */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
            }}
          />

          {/* the seam: one glowing line splitting the two worlds (desktop) */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 hidden md:block" aria-hidden="true">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: crossingWorld ? 0 : 1, opacity: crossingWorld ? 0 : 1 }}
              transition={{
                scaleY: { duration: 0.85, delay: 0.18, ease: EASE_IN_OUT },
                opacity: { duration: 0.3 },
              }}
              className="absolute inset-0 origin-center"
              style={{
                background:
                  'linear-gradient(180deg, oklch(0.72 0.09 75) 0%, oklch(0.78 0.06 237) 55%, oklch(0.62 0.08 306) 100%)',
                boxShadow:
                  '0 0 18px oklch(0.8 0.1 90 / 0.6), 0 0 46px oklch(0.78 0.06 237 / 0.45)',
              }}
            />
            {/* one light pulse travelling the freshly drawn seam */}
            <motion.span
              initial={{ top: '-12%', opacity: 0 }}
              animate={{ top: ['−12%', '112%'], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.25, delay: 1.05, times: [0, 0.14, 0.86, 1], ease: 'easeInOut' }}
              className="absolute left-1/2 -translate-x-1/2 w-[3px] h-16 rounded-full"
              style={{
                background: 'linear-gradient(180deg, transparent, oklch(0.93 0.06 90 / 0.95), transparent)',
                filter: 'blur(1px)',
              }}
            />
          </div>
          {/* horizontal seam for mobile */}
          <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 md:hidden" aria-hidden="true">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: crossingWorld ? 0 : 1, opacity: crossingWorld ? 0 : 1 }}
              transition={{
                scaleX: { duration: 0.85, delay: 0.18, ease: EASE_IN_OUT },
                opacity: { duration: 0.3 },
              }}
              className="absolute inset-0 origin-center"
              style={{
                background:
                  'linear-gradient(90deg, oklch(0.72 0.09 75) 0%, oklch(0.78 0.06 237) 55%, oklch(0.62 0.08 306) 100%)',
              }}
            />
          </div>

          {/* the third door: ANTUMBRA teaser at the seam crossing.
              Both seams (vertical on desktop, horizontal on mobile) meet at
              the exact centre: one medallion serves both layouts. It is a
              navigation, not a world crossing: the visitor keeps their side. */}
          <motion.button
            type="button"
            onClick={() => {
              if (phase !== 'idle') return
              choose(side ?? 'xelis')
              router.push('/antumbra')
            }}
            initial={{ opacity: 0, scale: 0.65 }}
            animate={{ opacity: crossingWorld ? 0 : 1, scale: crossingWorld ? 0.82 : 1 }}
            transition={{
              opacity: { delay: crossingWorld ? 0 : 1.05, duration: crossingWorld ? 0.28 : 0.9 },
              scale: { delay: crossingWorld ? 0 : 1.05, duration: crossingWorld ? 0.28 : 0.9 },
              ease: EASE_OUT,
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 group flex flex-col items-center gap-1.5 sm:gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.85_0.1_88)] rounded-2xl px-3 py-2 sm:px-4 sm:py-3"
            aria-label="Open the ANTUMBRA teaser: the third protocol, specification phase"
          >
            {/* the annular eclipse sigil */}
            <span className="relative block w-[48px] h-[48px] sm:w-[96px] sm:h-[96px] transition-transform duration-500 group-hover:scale-[1.06]">
              <span
                className="absolute -inset-3 sm:-inset-5 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'radial-gradient(circle, oklch(0.85 0.1 88 / 0.5), transparent 70%)' }}
              />
              <span
                className="absolute inset-0 rounded-full border-[3px] sm:border-[4px] border-[oklch(0.85_0.11_88_/_0.85)] group-hover:border-[oklch(0.89_0.11_88)] transition-colors duration-500"
                style={{ boxShadow: '0 0 22px oklch(0.85 0.1 88 / 0.5), inset 0 0 22px oklch(0.85 0.1 88 / 0.3)' }}
              />
              <span
                className="absolute rounded-full bg-[oklch(0.05_0.012_270)] inset-[8px] sm:inset-[13px]"
                style={{ boxShadow: 'inset 0 0 22px oklch(0.02 0.01 270)' }}
              />
              {!reduce && (
                <span
                  className="absolute inset-0"
                  style={{ animation: 'antumbra-spin 9s linear infinite' }}
                  aria-hidden="true"
                >
                  <span
                    className="absolute left-1/2 -translate-x-1/2 -top-[1.5px] sm:-top-[2px] w-[3.5px] h-[3.5px] sm:w-[5px] sm:h-[5px] rounded-full bg-[oklch(0.93_0.08_92)]"
                    style={{ boxShadow: '0 0 10px oklch(0.9 0.1 90 / 0.95)' }}
                  />
                </span>
              )}
            </span>
            {/* label */}
            <span className="flex flex-col items-center">
              <span className="font-mono font-bold tracking-[0.3em] sm:tracking-[0.34em] text-[8.5px] sm:text-[12px] text-[oklch(0.88_0.09_88)]">
                ANTUMBRA
              </span>
              <span className="mt-1 hidden sm:block font-mono text-[8px] uppercase tracking-[0.3em] text-white/35 group-hover:text-white/60 transition-colors duration-400">
                the third door · coming
              </span>
            </span>
          </motion.button>

          {/* header */}
          <div className="absolute top-0 left-0 right-0 z-20 pt-7 sm:pt-9 pb-3 px-6 text-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.5em] text-white/35"
            >
              XelisVault · Two protocols · One standard
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: crossingWorld ? 0 : 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-3.5 font-mono font-bold tracking-[0.34em] text-[17px] sm:text-[21px] text-white/95 tabular-nums"
            >
              {title || '\u00A0'}
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: crossingWorld ? 0 : 1 }}
              transition={{ delay: 1.15, duration: 0.6 }}
              className="mt-2.5 font-mono text-[9px] sm:text-[10px] tracking-[0.22em] text-white/30"
            >
              SELECT A WORLD · IT REMEMBERS FOR THIS SESSION
            </motion.div>
          </div>

          {/* the two worlds */}
          <div className="absolute inset-0 flex flex-col md:flex-row pt-24 pb-16 md:pt-20 md:pb-10">
            <WorldPanel
              world="xelis"
              active={hover === 'xelis' || crossingWorld === 'xelis'}
              dimmed={hover === 'nerva' && crossingWorld === null}
              suppressed={crossingWorld !== null && crossingWorld !== 'xelis'}
              entranceDelay={0.5}
              onSelect={() => setHover('xelis')}
              onChoose={() => cross('xelis')}
            />
            <WorldPanel
              world="nerva"
              active={hover === 'nerva' || crossingWorld === 'nerva'}
              dimmed={hover === 'xelis' && crossingWorld === null}
              suppressed={crossingWorld !== null && crossingWorld !== 'nerva'}
              entranceDelay={0.66}
              onSelect={() => setHover('nerva')}
              onChoose={() => cross('nerva')}
            />
          </div>

          {/* the crossing overlay */}
          {crossingWorld && <CrossingOverlay world={crossingWorld} />}

          {/* footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: crossingWorld ? 0 : 1 }}
            transition={{ delay: 1.3, duration: 0.6 }}
            className="absolute bottom-0 left-0 right-0 z-20 pb-5 px-6 text-center pointer-events-none"
          >
            <span className="font-mono text-[8.5px] sm:text-[9px] tracking-[0.24em] text-white/25 uppercase">
              Press Esc to stay on {side === 'nerva' ? 'NERVA' : 'XELIS'} · switch sides anytime from the top bar
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── boot veil: kills the first-paint flash ────────────────────
 * The inline script in the root layout adds `xv-booting` to <html>
 * BEFORE the browser paints anything, so a fresh session never
 * reveals the underlying page while React hydrates. This component
 * lifts the veil once the gate (same background color) has painted.
 */
export function BootVeil() {
  const hydrated = useSide((s) => s.hydrated)
  const gateOpen = useSide((s) => s.gateOpen)

  useEffect(() => {
    if (!hydrated) return
    if (!gateOpen) {
      /* returning session: the inline script added nothing to lift */
      document.documentElement.classList.remove('xv-booting')
      return
    }
    /* the gate is mounting under the veil: hold until it is fully
       painted (its 0.32s fade-in completes), then swap invisibly
       since both surfaces are the exact same color. */
    const t = setTimeout(() => {
      document.documentElement.classList.remove('xv-booting')
    }, 480)
    return () => clearTimeout(t)
  }, [hydrated, gateOpen])

  return null
}
