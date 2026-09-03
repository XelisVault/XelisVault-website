'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { useDemo } from '@/lib/demo-store'
import { useCountdownState } from '@/lib/countdown'

/**
 * VaultDoorTransition — the door of XELIS Vault.
 *
 * Every time the app is opened (from any page), a full-screen vault-door
 * ceremony plays, built from the brand mark itself — a circle bisected
 * by a vertical line:
 *
 *   0.00s  the seal appears — glowing ring + the vertical line
 *   0.30s  bolts engage around the circumference
 *   0.50s  the line becomes the combination dial: mechanical
 *          steps, right · left · right
 *   1.75s  bolts retract one by one — the seal is broken
 *   2.05s  the line retracts, light breaches the center
 *   2.35s  the door SPLITS along the line: both halves slide
 *          apart, champagne light floods in, and the app
 *          is revealed BEHIND the opening door
 *   3.10s  the last elements dissolve — the app is live
 *
 * Click anywhere (or Escape) to skip. Honors prefers-reduced-motion.
 * On non-home pages the app is routed to "/?openApp=1" while the door
 * still covers the screen — a seamless handoff.
 */

const T = {
  dialStart: 600,
  dialEnd: 1650,
  bolts: 1750,
  breach: 2050,
  split: 2350,
  reveal: 3100,
  done: 3400,
}

// The ring artwork — rendered twice (left clip / right clip) so the door
// can split along the center line. Pure SVG, 600×600.
function DoorRing({ glow }: { glow: boolean }) {
  return (
    <svg viewBox="0 0 600 600" className="absolute inset-0 w-full h-full" aria-hidden>
      <defs>
        <linearGradient id="door-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8C87A" />
          <stop offset="55%" stopColor="#CDA452" />
          <stop offset="100%" stopColor="#B98A3E" />
        </linearGradient>
        <radialGradient id="door-inner" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.62" stopColor="rgba(20,17,13,0)" />
          <stop offset="0.86" stopColor="rgba(16,13,10,0.55)" />
          <stop offset="1" stopColor="rgba(12,10,8,0.85)" />
        </radialGradient>
      </defs>

      <circle cx="300" cy="300" r="252" fill="url(#door-inner)" />

      {/* engraved safe-dial graduations */}
      {Array.from({ length: 48 }).map((_, i) => {
        const a = (i / 48) * Math.PI * 2
        const long = i % 4 === 0
        const r1 = long ? 234 : 240
        const r2 = 250
        return (
          <line
            key={i}
            x1={300 + Math.cos(a) * r1}
            y1={300 + Math.sin(a) * r1}
            x2={300 + Math.cos(a) * r2}
            y2={300 + Math.sin(a) * r2}
            stroke="#CDA452"
            strokeWidth={long ? 2.4 : 1.3}
            opacity={long ? 0.4 : 0.22}
          />
        )
      })}

      {/* the logo circle, heavy champagne */}
      <circle cx="300" cy="300" r="256" fill="none" stroke="url(#door-grad)" strokeWidth="10" opacity="0.96" />
      <circle cx="300" cy="300" r="278" fill="none" stroke="#B98A3E" strokeWidth="2.5" opacity="0.5" />
      <circle cx="300" cy="300" r="228" fill="none" stroke="#E8C87A" strokeWidth="1.5" opacity="0.35" />

      {/* the seam — shadowed groove exactly on the vertical line */}
      <line x1="300" y1="34" x2="300" y2="566" stroke="#0B0906" strokeWidth="3" opacity="0.55" />
      {glow && (
        <>
          <line x1="298.2" y1="34" x2="298.2" y2="566" stroke="#E8C87A" strokeWidth="1.2" opacity="0.9" />
          <line x1="301.8" y1="34" x2="301.8" y2="566" stroke="#E8C87A" strokeWidth="1.2" opacity="0.9" />
        </>
      )}
    </svg>
  )
}

// One radial bolt (HTML so framer-motion animates it freely)
function Bolt({ angle, retracted, delay }: { angle: number; retracted: boolean; delay: number }) {
  const rad = (angle * Math.PI) / 180
  const R = 46 // % of container — sits on the ring
  const left = 50 + Math.cos(rad) * R
  const top = 50 + Math.sin(rad) * R
  const dx = -Math.cos(rad) * 22
  const dy = -Math.sin(rad) * 22
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: '3.4%',
        height: '9.5%',
        marginLeft: '-1.7%',
        marginTop: '-4.75%',
        rotate: `${angle + 90}deg`,
      }}
    >
      <motion.div
        className="w-full h-full"
        style={{
          background: 'linear-gradient(180deg, #E8C87A 0%, #B98A3E 60%, #8F6A2C 100%)',
          borderRadius: '2px',
          boxShadow: '0 0 6px rgba(232,200,122,0.45)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={
          retracted
            ? { scale: 0.12, opacity: 0, x: dx, y: dy }
            : { scale: 1, opacity: 1, x: 0, y: 0 }
        }
        transition={
          retracted
            ? { delay, duration: 0.4, ease: [0.6, 0, 0.9, 0.4] }
            : { delay, type: 'spring', stiffness: 320, damping: 22 }
        }
      />
    </div>
  )
}

// Subtle cipher rain
function CipherRain() {
  const glyphs = useMemo(() => {
    const CH = '0123456789ABCDEF·×+/$#%&@ΞΔ§'
    return Array.from({ length: 26 }).map((_, i) => ({
      ch: CH[Math.floor(Math.random() * CH.length)],
      left: (i / 26) * 100 + Math.random() * 2,
      dur: 7 + Math.random() * 9,
      delay: -Math.random() * 12,
      size: 10 + Math.random() * 8,
      op: 0.06 + Math.random() * 0.09,
    }))
  }, [])
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {glyphs.map((g, i) => (
        <motion.span
          key={i}
          className="absolute font-mono text-vault select-none"
          style={{ left: `${g.left}%`, fontSize: g.size, opacity: g.op }}
          initial={{ y: '-12vh' }}
          animate={{ y: '112vh' }}
          transition={{ duration: g.dur, delay: g.delay, repeat: Infinity, ease: 'linear' }}
        >
          {g.ch}
        </motion.span>
      ))}
    </div>
  )
}

const STATUS = [
  'VERIFYING SEAL',
  'ENTERING COMBINATION',
  'COMBINATION ACCEPTED',
  'RETRACTING BOLTS',
  'SEAL BREACHED',
  'VAULT OPEN — WELCOME',
]

type Phase = 'idle' | 'playing' | 'fading'

export function VaultDoorTransition() {
  const open = useDemo((s) => s.open)
  const { isLaunched } = useCountdownState()
  const pathname = usePathname()
  const router = useRouter()
  const reduced = useReducedMotion()

  const [phase, setPhase] = useState<Phase>('idle')
  const [status, setStatus] = useState(0)
  const prevOpen = useRef(false)
  const suppress = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const navigated = useRef(false)

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const finish = useCallback(() => {
    clearTimers()
    setPhase('idle')
    setStatus(0)
  }, [clearTimers])

  const skip = useCallback(() => {
    if (phase !== 'playing') return
    clearTimers()
    setPhase('fading')
    if (pathname !== '/' && !navigated.current) {
      navigated.current = true
      try { sessionStorage.setItem('xv-door-handoff', '1') } catch { /* ignore */ }
      router.push('/?openApp=1')
    }
    timers.current.push(setTimeout(finish, 280))
  }, [phase, pathname, router, clearTimers, finish])

  // watch open false→true — ignite the ceremony
  useEffect(() => {
    if (prevOpen.current === open) return
    prevOpen.current = open
    if (!open || !isLaunched) return

    if (suppress.current) {
      suppress.current = false
      return // cross-page handoff already played
    }

    if (reduced) {
      setPhase('fading')
      timers.current.push(setTimeout(finish, 300))
      return
    }

    setPhase('playing')

    const at = (t: number, fn: () => void) => timers.current.push(setTimeout(fn, t))
    at(T.dialStart - 100, () => setStatus(1))
    at(T.dialEnd - 150, () => setStatus(2))
    at(T.bolts, () => setStatus(3))
    at(T.breach, () => setStatus(4))
    at(T.split + 250, () => setStatus(5))

    // mid-ceremony: route to the app on non-home pages so it mounts
    // beneath the door (client-side nav — store + overlay persist)
    if (pathname !== '/') {
      at(T.split - 350, () => {
        if (navigated.current) return
        navigated.current = true
        try { sessionStorage.setItem('xv-door-handoff', '1') } catch { /* ignore */ }
        router.push('/?openApp=1')
      })
    }

    at(T.reveal, () => setPhase('fading'))
    at(T.done, finish)

    return clearTimers
  }, [open, isLaunched, pathname, router, reduced, finish, clearTimers])

  // on mount: arriving via cross-page handoff → don't replay
  useEffect(() => {
    try {
      if (sessionStorage.getItem('xv-door-handoff') === '1') {
        sessionStorage.removeItem('xv-door-handoff')
        suppress.current = true
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  // Escape to skip
  useEffect(() => {
    if (phase !== 'playing') return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && skip()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, skip])

  const dialAngle = [0, 128, 74, 141, 141, 141][status] ?? 0
  const opened = status >= 4
  const retracted = status >= 3

  return (
    <AnimatePresence>
      {phase !== 'idle' && (
        <motion.div
          key="vault-door"
          className="fixed inset-0 z-[95] overflow-hidden select-none cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'fading' ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: phase === 'fading' ? 0.3 : 0.25, ease: 'easeOut' }}
          onClick={skip}
          role="button"
          aria-label="Skip vault animation"
        >
          {/* opaque backdrop — dissolves exactly when the door opens,
              revealing the app behind it */}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'oklch(0.145 0.012 80)' }}
            animate={{ opacity: opened ? 0 : 1 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(8,6,4,0.75) 100%)' }}
            animate={{ opacity: opened ? 0 : 1 }}
            transition={{ duration: 0.6 }}
          />
          <motion.div animate={{ opacity: opened ? 0.35 : 1 }} transition={{ duration: 0.6 }}>
            <CipherRain />
          </motion.div>

          {/* ------- THE DOOR ------- */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(78vmin,640px)] aspect-square"
            initial={{ scale: 0.94, opacity: 0 }}
            animate={
              opened
                ? { scale: 1, opacity: 1 }
                : { scale: [0.94, 1.012, 1], opacity: 1 }
            }
            transition={
              opened
                ? { duration: 0.4 }
                : { duration: 0.55, ease: [0.34, 1.4, 0.64, 1] }
            }
          >
            {/* light burst behind the door */}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[55%] aspect-square rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle, rgba(240,214,138,0.95) 0%, rgba(232,200,122,0.5) 28%, rgba(185,138,62,0.22) 52%, transparent 72%)',
                filter: 'blur(6px)',
              }}
              initial={{ scale: 0.1, opacity: 0 }}
              animate={opened ? { scale: [0.1, 1.15, 3.6], opacity: [0, 0.9, 1] } : { scale: 0.1, opacity: 0 }}
              transition={{ duration: 1.05, ease: [0.16, 0.8, 0.28, 1] }}
            />

            {/* rays of light through the breach */}
            {opened &&
              Array.from({ length: 14 }).map((_, i) => (
                <motion.div
                  key={`ray-${i}`}
                  className="absolute left-1/2 top-1/2 w-[1.5px] h-[48%] origin-bottom pointer-events-none"
                  style={{
                    rotate: i * (360 / 14),
                    y: '-100%',
                    background:
                      'linear-gradient(to top, transparent, rgba(240,214,138,0.7) 45%, rgba(255,244,200,0.9))',
                  }}
                  initial={{ scaleY: 0.1, opacity: 0 }}
                  animate={{ scaleY: [0.1, 1.7], opacity: [0, 0.6] }}
                  transition={{ duration: 0.9, delay: 0.08 + i * 0.016, ease: [0.2, 0.7, 0.3, 1] }}
                />
              ))}

            {/* left half of the door */}
            <motion.div
              className="absolute inset-0"
              style={{ clipPath: 'inset(0 50% 0 0)' }}
              animate={
                opened
                  ? { x: '-62%', rotate: -3.5, opacity: 0.92 }
                  : { x: '0%', rotate: 0, opacity: 1 }
              }
              transition={{ duration: 0.9, ease: [0.83, 0, 0.17, 1] }}
            >
              <DoorRing glow={retracted} />
              <motion.div
                className="absolute top-[5.5%] bottom-[5.5%] right-0 w-[3px]"
                style={{
                  background:
                    'linear-gradient(180deg, transparent, rgba(240,214,138,0.95) 30%, rgba(240,214,138,0.95) 70%, transparent)',
                  filter: 'blur(0.5px)',
                }}
                animate={{ opacity: retracted && !opened ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>

            {/* right half */}
            <motion.div
              className="absolute inset-0"
              style={{ clipPath: 'inset(0 0 0 50%)' }}
              animate={
                opened
                  ? { x: '62%', rotate: 3.5, opacity: 0.92 }
                  : { x: '0%', rotate: 0, opacity: 1 }
              }
              transition={{ duration: 0.9, ease: [0.83, 0, 0.17, 1] }}
            >
              <DoorRing glow={retracted} />
              <motion.div
                className="absolute top-[5.5%] bottom-[5.5%] left-0 w-[3px]"
                style={{
                  background:
                    'linear-gradient(180deg, transparent, rgba(240,214,138,0.95) 30%, rgba(240,214,138,0.95) 70%, transparent)',
                  filter: 'blur(0.5px)',
                }}
                animate={{ opacity: retracted && !opened ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>

            {/* bolts around the circumference */}
            {Array.from({ length: 12 }).map((_, i) => (
              <Bolt
                key={`bolt-${i}`}
                angle={-90 + i * 30}
                retracted={retracted}
                delay={retracted ? 0.02 + (i % 2) * 0.05 + i * 0.028 : 0.3 + i * 0.05}
              />
            ))}

            {/* the combination dial — the logo's vertical line */}
            <motion.div
              className="absolute left-1/2 top-1/2 w-[4.5%] h-[78%]"
              style={{ x: '-50%', y: '-50%', transformOrigin: 'center center' }}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={
                opened
                  ? { scaleY: 0.1, scaleX: 1.8, opacity: 0, rotate: 141 }
                  : {
                      scaleY: 1,
                      opacity: 1,
                      scaleX: 1,
                      rotate: dialAngle,
                    }
              }
              transition={
                opened
                  ? { duration: 0.36, ease: [0.6, 0, 0.8, 0.3] }
                  : status === 0
                    ? { duration: 0.5, ease: 'easeOut' }
                    : { duration: 0.58, ease: [0.7, 0.02, 0.28, 1] }
              }
            >
              <div
                className="w-full h-full"
                style={{
                  background: 'linear-gradient(180deg, #F5E3AE 0%, #E8C87A 35%, #CDA452 70%, #B98A3E 100%)',
                  borderRadius: '3px',
                  boxShadow: '0 0 18px rgba(232,200,122,0.65), 0 0 42px rgba(232,200,122,0.3)',
                }}
              />
            </motion.div>

            {/* center hub */}
            <motion.div
              className="absolute left-1/2 top-1/2 w-[7%] aspect-square rounded-full"
              style={{
                x: '-50%',
                y: '-50%',
                background: 'radial-gradient(circle at 35% 30%, #F5E3AE, #CDA452 55%, #8F6A2C)',
                boxShadow: '0 0 12px rgba(232,200,122,0.7), inset 0 -2px 5px rgba(60,42,14,0.6)',
              }}
              initial={{ scale: 0 }}
              animate={{ scale: retracted ? 0 : 1 }}
              transition={{ duration: 0.35, delay: 0.15, type: 'spring', stiffness: 300, damping: 20 }}
            />
          </motion.div>

          {/* ------- STATUS TEXT ------- */}
          <div className="absolute inset-x-0 bottom-[9%] flex flex-col items-center gap-3 px-6 text-center pointer-events-none">
            <motion.div
              className="font-display text-lg md:text-xl tracking-[0.42em] uppercase text-gradient-vault"
              initial={{ opacity: 0, letterSpacing: '0.7em' }}
              animate={{ opacity: phase === 'fading' ? 0 : 1, letterSpacing: '0.42em' }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              Xelis Vault
            </motion.div>
            <motion.div
              className="font-mono text-[11px] md:text-xs tracking-[0.3em] uppercase text-vault/80"
              key={status}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: [0, 1], y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {STATUS[Math.min(status, STATUS.length - 1)] || STATUS[0]}
              <span className="inline-block w-[2ch] animate-pulse">_</span>
            </motion.div>
          </div>

          {phase === 'playing' && !opened && (
            <motion.div
              className="absolute inset-x-0 bottom-3 text-center font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground/40 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              click to skip
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
