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
 *  Sequence: black veil → the seam draws itself → title decodes →
 *  the two worlds breathe side by side. Choosing a side folds the
 *  gate into that world's palette and crosses you over.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useSide, type Side } from '@/lib/side-store'

/* ── the "decode" title effect ── */
const GLYPHS = '01<>[]{}#$%&*+=/\\|ABCDEFXYZ'

function useDecodedText(target: string, speed = 42, startDelay = 500) {
  const [text, setText] = useState('')
  const raf = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setText(target)
      return
    }
    let frame = 0
    let finished = false
    const timeout = setTimeout(() => {
      raf.current = setInterval(() => {
        frame++
        const revealed = Math.floor(frame / 2)
        if (revealed >= target.length) {
          setText(target)
          if (raf.current) clearInterval(raf.current)
          finished = true
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
      clearTimeout(timeout)
      if (raf.current) clearInterval(raf.current)
      void finished
    }
  }, [target, speed, startDelay])

  return text
}

/* ── dust particles (gold for Xelis, signal bits for Nerva) ── */
function Particles({ world, count = 26 }: { world: Side; count?: number }) {
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
              : 'bg-[oklch(0.84_0.11_215_/_0.6)]'
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
  onChoose: () => void
  onSelect: () => void
}

function WorldPanel({ world, active, dimmed, onChoose, onSelect }: WorldPanelProps) {
  const isXelis = world === 'xelis'
  return (
    <motion.button
      type="button"
      onClick={onChoose}
      onMouseEnter={onSelect}
      onFocus={onSelect}
      initial={false}
      animate={{
        opacity: dimmed ? 0.32 : 1,
        filter: dimmed ? 'saturate(0.4) brightness(0.75)' : 'none',
        scale: active ? 1.012 : 1,
      }}
      transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
      className={`relative flex-1 group flex flex-col items-center justify-center overflow-hidden h-full w-full px-8 sm:px-12 outline-none focus-visible:ring-2 ${
        isXelis ? 'focus-visible:ring-[oklch(0.52_0.09_70)]' : 'focus-visible:ring-[oklch(0.82_0.115_215)]'
      }`}
      aria-label={isXelis ? 'Enter the XELIS side — confidential finance on BlockDAG' : 'Enter the NERVA side — private CPU-mined digital cash'}
    >
      {/* ambient world wash */}
      {isXelis ? (
        <>
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: active ? 0.1 : 0.05,
              background:
                'radial-gradient(ellipse 80% 60% at 30% 20%, oklch(0.9 0.05 80 / 0.6), transparent 65%)',
            }}
          />
          <div className="absolute inset-0 bg-[oklch(0.977_0.004_85)]/4 dark:hidden" style={{ background: 'oklch(0.977 0.004 85 / 0.03)' }} />
        </>
      ) : (
        <>
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: active ? 0.14 : 0.06,
              background:
                'radial-gradient(ellipse 80% 60% at 70% 75%, oklch(0.72 0.15 290 / 0.8), transparent 60%), radial-gradient(ellipse 70% 50% at 25% 25%, oklch(0.82 0.115 215 / 0.7), transparent 65%)',
            }}
          />
          <div className="absolute inset-0 circuit-bg opacity-60" />
        </>
      )}

      <Particles world={world} />

      {/* edge glow on hover */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: active ? 1 : 0,
          boxShadow: isXelis
            ? 'inset 0 0 120px -30px oklch(0.72 0.09 75 / 0.5)'
            : 'inset 0 0 120px -30px oklch(0.82 0.115 215 / 0.55), inset 0 0 200px -60px oklch(0.72 0.15 290 / 0.5)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* logo */}
        <motion.div
          animate={{ y: active ? -4 : 0, scale: active ? 1.06 : 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-7"
        >
          <div
            className="absolute -inset-6 rounded-full blur-2xl transition-opacity duration-500"
            style={{
              opacity: active ? 0.55 : 0.2,
              background: isXelis
                ? 'radial-gradient(circle, oklch(0.72 0.09 75 / 0.6), transparent 70%)'
                : 'radial-gradient(circle, oklch(0.82 0.115 215 / 0.55), transparent 70%)',
            }}
          />
          <img
            src={isXelis ? '/images/xelisvault-logo.png' : '/images/nerva/nerva-mark.png'}
            alt={isXelis ? 'Xelis Vault logo' : 'NERVA logo'}
            className={`relative w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-2xl ${
              isXelis ? 'rounded-[6px] ring-1 ring-white/20' : ''
            }`}
            draggable={false}
          />
        </motion.div>

        {/* protocol name */}
        <div
          className={`font-mono tracking-[0.42em] text-[26px] sm:text-[32px] font-bold leading-none ${
            isXelis ? 'text-[oklch(0.93_0.03_80)]' : 'text-[oklch(0.88_0.1_240)]'
          }`}
        >
          {isXelis ? 'XELIS' : 'NERVA'}
        </div>

        <div
          className={`mt-4 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.3em] ${
            isXelis ? 'text-[oklch(0.78_0.06_78)]' : 'text-[oklch(0.72_0.1_250)]'
          }`}
        >
          {isXelis ? 'Confidential Finance' : 'Private Digital Cash'}
        </div>

        {/* bullets */}
        <ul className="mt-7 space-y-2.5 text-left">
          {(isXelis
            ? ['BlockDAG · 5s finality · homomorphic encryption', 'xUSD stablecoin · VLT governance · P2P lending', 'Institutional-grade private banking interface']
            : ['CryptoNight-Adaptive v6 · CPU-only mining', 'Ring signatures ×5 · RingCT · one-time addresses', 'Tail emission 0.3 XNV/block · live explorer & payments']
          ).map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-[12.5px] text-white/55 leading-snug">
              <span
                className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${
                  isXelis ? 'bg-[oklch(0.78_0.08_78)]' : 'bg-[oklch(0.82_0.115_215)]'
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
              : 'border-[oklch(0.82_0.115_215_/_0.4)] text-[oklch(0.85_0.09_225)]'
          } ${active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
        >
          Enter {isXelis ? 'the Vault' : 'the Signal'}
        </div>
      </div>
    </motion.button>
  )
}

/* ── the gate itself ─────────────────────────────────────────── */

type Phase = 'intro' | 'choosing' | 'crossing-xelis' | 'crossing-nerva'

export function SideGate() {
  const { gateOpen, side, choose } = useSide()
  const router = useRouter()
  const reduce = useReducedMotion()
  const [hover, setHover] = useState<Side | null>(null)
  const [phase, setPhase] = useState<Phase>('intro')
  const title = useDecodedText('CHOOSE YOUR SIDE', 40, 700)

  // lock scroll while the gate is up
  useEffect(() => {
    if (gateOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [gateOpen])

  // intro → choosing after the seam draws itself
  useEffect(() => {
    if (!gateOpen) {
      const r = setTimeout(() => setPhase('intro'), 0)
      return () => clearTimeout(r)
    }
    const t = setTimeout(() => setPhase('choosing'), reduce ? 200 : 1100)
    return () => clearTimeout(t)
  }, [gateOpen, reduce])

  // Esc keeps the current side (first session without a choice → default xelis)
  useEffect(() => {
    if (!gateOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') choose(side ?? 'xelis')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gateOpen, side, choose])

  const cross = (world: Side) => {
    if (phase.startsWith('crossing')) return
    if (reduce) {
      choose(world)
      if (world === 'nerva') router.push('/nerva')
      return
    }
    setPhase(world === 'xelis' ? 'crossing-xelis' : 'crossing-nerva')
    setTimeout(() => {
      choose(world)
      if (world === 'nerva') router.push('/nerva')
    }, 1250)
  }

  if (!gateOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        key="side-gate"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.7, ease: 'easeInOut' } }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-[90] bg-[oklch(0.045_0.015_270)] select-none"
        role="dialog"
        aria-modal="true"
        aria-label="Choose your side"
      >
        {/* film grain */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
          }}
        />

        {/* the seam — one glowing line splitting the two worlds */}
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: phase === 'intro' ? 0 : 1 }}
          transition={{ duration: reduce ? 0.1 : 0.9, ease: [0.65, 0, 0.35, 1] }}
          className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 origin-center hidden md:block"
          style={{
            background:
              'linear-gradient(180deg, oklch(0.72 0.09 75) 0%, oklch(0.82 0.115 215) 55%, oklch(0.72 0.15 290) 100%)',
            boxShadow:
              '0 0 18px oklch(0.8 0.1 90 / 0.65), 0 0 46px oklch(0.82 0.115 215 / 0.5)',
          }}
          aria-hidden="true"
        />
        {/* horizontal seam for mobile */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: phase === 'intro' ? 0 : 1 }}
          transition={{ duration: reduce ? 0.1 : 0.9, ease: [0.65, 0, 0.35, 1] }}
          className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 origin-center md:hidden"
          style={{
            background:
              'linear-gradient(90deg, oklch(0.72 0.09 75) 0%, oklch(0.82 0.115 215) 55%, oklch(0.72 0.15 290) 100%)',
          }}
          aria-hidden="true"
        />

        {/* header */}
        <div className="absolute top-0 left-0 right-0 z-20 pt-7 sm:pt-9 pb-3 px-6 text-center pointer-events-none">
          <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.5em] text-white/35">
            XelisVault · Two protocols · One standard
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: phase === 'intro' ? 0 : 1, y: phase === 'intro' ? 6 : 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-3.5 font-mono font-bold tracking-[0.34em] text-[17px] sm:text-[21px] text-white/95 tabular-nums"
          >
            {title || '\u00A0'}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'choosing' ? 1 : 0 }}
            className="mt-2.5 font-mono text-[9px] sm:text-[10px] tracking-[0.22em] text-white/30"
          >
            SELECT A WORLD — IT REMEMBERS FOR THIS SESSION
          </motion.div>
        </div>

        {/* the two worlds */}
        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{
            opacity: phase === 'choosing' ? 1 : 0,
            scale: phase === 'choosing' ? 1 : 0.985,
          }}
          transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
          className="absolute inset-0 flex flex-col md:flex-row pt-24 pb-16 md:pt-20 md:pb-10"
        >
          <WorldPanel
            world="xelis"
            active={hover === 'xelis'}
            dimmed={hover === 'nerva'}
            onSelect={() => setHover('xelis')}
            onChoose={() => cross('xelis')}
          />
          <WorldPanel
            world="nerva"
            active={hover === 'nerva'}
            dimmed={hover === 'xelis'}
            onSelect={() => setHover('nerva')}
            onChoose={() => cross('nerva')}
          />
        </motion.div>

        {/* crossing overlays */}
        <AnimatePresence>
          {phase === 'crossing-xelis' && (
            <motion.div
              key="cross-x"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, times: [0, 0.3, 1] }}
              className="absolute inset-0 z-30 flex items-center justify-center"
              style={{ background: 'radial-gradient(circle at center, oklch(0.96 0.02 82) 0%, oklch(0.72 0.09 75 / 0.9) 60%, oklch(0.045 0.015 270) 100%)' }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.1, opacity: 1 }}
                transition={{ duration: 1.15, ease: [0.22, 0.61, 0.36, 1] }}
                className="font-mono tracking-[0.5em] text-[oklch(0.3_0.04_60)] text-sm"
              >
                ENTERING THE VAULT
              </motion.div>
            </motion.div>
          )}
          {phase === 'crossing-nerva' && (
            <motion.div
              key="cross-n"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, times: [0, 0.25, 1] }}
              className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden"
              style={{ background: 'radial-gradient(circle at center, oklch(0.14 0.05 265) 0%, oklch(0.1 0.06 275) 55%, oklch(0.045 0.015 270) 100%)' }}
            >
              {/* warp streaks */}
              {Array.from({ length: 18 }).map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 0 }}
                  animate={{
                    x: Math.cos((i / 18) * Math.PI * 2) * 900,
                    y: Math.sin((i / 18) * Math.PI * 2) * 900,
                    opacity: [0, 0.9, 0],
                  }}
                  transition={{ duration: 0.9, delay: 0.08 + (i % 6) * 0.05, ease: 'easeIn' }}
                  className="absolute w-24 h-0.5 rounded-full"
                  style={{
                    background: i % 2 ? 'oklch(0.82 0.115 215 / 0.9)' : 'oklch(0.72 0.15 290 / 0.9)',
                    transform: `rotate(${(i / 18) * 360}deg)`,
                    boxShadow: '0 0 12px oklch(0.82 0.115 215 / 0.8)',
                  }}
                />
              ))}
              <motion.div
                initial={{ scale: 0.6, opacity: 0, rotate: -6 }}
                animate={{ scale: 1.15, opacity: 1, rotate: 0 }}
                transition={{ duration: 1.1, ease: [0.22, 0.61, 0.36, 1] }}
                className="relative flex flex-col items-center gap-5"
              >
                <img src="/images/nerva/nerva-mark.png" alt="NERVA" className="w-24 h-24 drop-shadow-[0_0_30px_oklch(0.82_0.115_215_/_0.7)]" />
                <div className="font-mono tracking-[0.5em] text-[oklch(0.85_0.1_230)] text-sm">
                  ENTERING THE SIGNAL
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'choosing' ? 1 : 0 }}
          transition={{ delay: 0.4 }}
          className="absolute bottom-0 left-0 right-0 z-20 pb-5 px-6 text-center pointer-events-none"
        >
          <span className="font-mono text-[8.5px] sm:text-[9px] tracking-[0.24em] text-white/25 uppercase">
            Press Esc to stay on {side === 'nerva' ? 'NERVA' : 'XELIS'} · switch sides anytime from the top bar
          </span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
