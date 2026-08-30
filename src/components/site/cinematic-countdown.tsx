'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  useCountdownState,
  CIPHER_GLYPHS,
  randomGlyph,
} from '@/lib/countdown'

/**
 * Cinematic Countdown v2 — XELIS Vault Launch
 *
 * Two escalating experiences:
 *
 *  A. MECHANISM (T > 10s) — a living vault-lock:
 *     · 3 concentric gear rings rotating at different speeds & directions
 *     · 12 sealing bolts retract one-by-one as time progresses
 *     · progress arc + % sealed
 *     · cipher-digit scramble on every change (ciphertext → plaintext)
 *     · orbiting glyph aura (BlockDAG energy)
 *
 *  B. FINAL SEQUENCE (T ≤ 10s) — full-screen launch theatre:
 *     · giant digit (38vw) with chromatic aberration on every tick
 *     · per-second flash + expanding shockwave + screen shake
 *     · 10 bolt pips going out one by one
 *     · amber "FINAL SEQUENCE" warning styling
 *
 * Pure SVG + Framer Motion. No external assets. Mobile-safe.
 */

function scrambleDigit(target: string, progress: number): string {
  if (progress >= 1) return target
  if (Math.random() < progress * 0.7) return target
  return randomGlyph()
}

// ===== Gear rings (vault mechanism metaphor) =====
function MechanismRings({ urgent }: { urgent: boolean }) {
  const speedMul = urgent ? 2.4 : 1
  return (
    <g>
      {/* Outer gear — clockwise, slow */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 120 / speedMul, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '0px 0px' }}
      >
        <circle
          r={178}
          fill="none"
          stroke="oklch(0.62 0.22 295 / 0.22)"
          strokeWidth={7}
          strokeDasharray="1.5 9.5"
        />
      </motion.g>
      {/* Mid gear — counter-clockwise */}
      <motion.g
        animate={{ rotate: -360 }}
        transition={{ duration: 75 / speedMul, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '0px 0px' }}
      >
        <circle
          r={151}
          fill="none"
          stroke="oklch(0.62 0.22 295 / 0.16)"
          strokeWidth={5}
          strokeDasharray="2 7"
        />
      </motion.g>
      {/* Inner fine gear — clockwise, faster */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 50 / speedMul, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '0px 0px' }}
      >
        <circle
          r={118}
          fill="none"
          stroke="oklch(0.7 0.2 320 / 0.14)"
          strokeWidth={2.5}
          strokeDasharray="1 5"
        />
      </motion.g>
    </g>
  )
}

// ===== Bolt ring — bolts retract as we approach launch =====
const BOLT_COUNT = 12

function BoltRing({ progress }: { progress: number }) {
  const bolts = useMemo(
    () =>
      Array.from({ length: BOLT_COUNT }, (_, i) => ({
        id: i,
        threshold: i / BOLT_COUNT,
        angle: (i / BOLT_COUNT) * Math.PI * 2 - Math.PI / 2,
      })),
    []
  )

  const radius = 132
  const boltLength = 22

  return (
    <g>
      {bolts.map((bolt) => {
        const retracted = progress >= bolt.threshold
        const retractProgress = Math.max(
          0,
          Math.min(1, (progress - bolt.threshold + 0.05) / 0.1)
        )
        const x1 = radius * Math.cos(bolt.angle)
        const y1 = radius * Math.sin(bolt.angle)
        const x2 = (radius + boltLength * (1 - retractProgress * 0.7)) * Math.cos(bolt.angle)
        const y2 = (radius + boltLength * (1 - retractProgress * 0.7)) * Math.sin(bolt.angle)

        return (
          <g key={bolt.id}>
            <line
              x1={x1}
              y1={y1}
              x2={(radius + boltLength) * Math.cos(bolt.angle)}
              y2={(radius + boltLength) * Math.sin(bolt.angle)}
              stroke="oklch(0.62 0.22 295 / 0.15)"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <motion.line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={retracted ? 'oklch(0.62 0.22 295 / 0.3)' : 'oklch(0.62 0.22 295)'}
              strokeWidth={retracted ? 1.5 : 3}
              strokeLinecap="round"
              animate={{ opacity: retracted ? [0.3, 0.5, 0.3] : 1 }}
              transition={{ duration: 2, repeat: retracted ? Infinity : 0, ease: 'easeInOut' }}
            />
            <motion.circle
              cx={x2}
              cy={y2}
              r={retracted ? 1.5 : 3}
              fill={retracted ? 'oklch(0.62 0.22 295 / 0.4)' : 'oklch(0.62 0.22 295)'}
              animate={{ opacity: retracted ? 0.4 : 1 }}
            />
          </g>
        )
      })}
    </g>
  )
}

// ===== Progress arc =====
function ProgressArc({ progress }: { progress: number }) {
  const radius = 105
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  return (
    <>
      <circle cx={0} cy={0} r={radius} fill="none" stroke="oklch(1 0 0 / 0.06)" strokeWidth={1.5} />
      <motion.circle
        cx={0}
        cy={0}
        r={radius}
        fill="none"
        stroke="url(#vaultGradient)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={circumference}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        transform="rotate(-90 0 0)"
        style={{ filter: 'drop-shadow(0 0 8px oklch(0.62 0.22 295 / 0.6))' }}
      />
      <defs>
        <linearGradient id="vaultGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.62 0.22 295)" />
          <stop offset="50%" stopColor="oklch(0.7 0.2 320)" />
          <stop offset="100%" stopColor="oklch(0.78 0.16 195)" />
        </linearGradient>
      </defs>
    </>
  )
}

// ===== Ciphertext digit (scrambles before settling) =====
function CipherDigit({ value, label }: { value: number; label: string }) {
  const [display, setDisplay] = useState('00')
  const [scrambling, setScrambling] = useState(true)
  const targetStr = String(value).padStart(2, '0')

  useEffect(() => {
    setScrambling(true)
    let frame = 0
    const totalFrames = 20
    const interval = setInterval(() => {
      frame++
      const progress = frame / totalFrames
      setDisplay(targetStr.split('').map((d) => scrambleDigit(d, progress)).join(''))
      if (frame >= totalFrames) {
        clearInterval(interval)
        setDisplay(targetStr)
        setScrambling(false)
      }
    }, 16)
    return () => clearInterval(interval)
  }, [targetStr])

  return (
    <div className="flex flex-col items-center">
      <motion.div
        key={display}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        className="font-mono font-bold text-2xl md:text-4xl tabular-nums tracking-tight"
        style={{
          color: scrambling ? 'oklch(0.65 0.15 295 / 0.7)' : 'var(--vault)',
          textShadow: scrambling
            ? '0 0 12px oklch(0.62 0.22 295 / 0.4)'
            : '0 0 20px oklch(0.62 0.22 295 / 0.5)',
          minWidth: '2.2em',
          textAlign: 'center',
        }}
      >
        {display}
      </motion.div>
      <div className="mt-1 text-[9px] md:text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70">
        {label}
      </div>
    </div>
  )
}

// ===== Orbiting glyph aura =====
function OrbitingGlyphs({ progress }: { progress: number }) {
  const glyphs = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        glyph: CIPHER_GLYPHS[i % CIPHER_GLYPHS.length],
        angle: (i / 18) * Math.PI * 2,
        radius: 165 + (i % 3) * 12,
        speed: 0.3 + (i % 4) * 0.1,
        size: 9 + (i % 3) * 2,
      })),
    []
  )

  return (
    <g>
      {glyphs.map((g) => (
        <motion.g
          key={g.id}
          animate={{ rotate: 360 }}
          transition={{ duration: 40 / g.speed, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '0px 0px' }}
        >
          <motion.text
            x={g.radius * Math.cos(g.angle)}
            y={g.radius * Math.sin(g.angle)}
            fontSize={g.size}
            fontFamily="var(--font-jetbrains)"
            fill="oklch(0.62 0.22 295)"
            animate={{ opacity: [0.1, 0.4 * (1 - progress * 0.5), 0.1] }}
            transition={{ duration: 3, repeat: Infinity, delay: g.id * 0.2 }}
          >
            {g.glyph}
          </motion.text>
        </motion.g>
      ))}
    </g>
  )
}

// ===== FINAL SEQUENCE — full-screen launch theatre =====
export function FinalSequenceOverlay({ seconds }: { seconds: number }) {
  const boltPips = useMemo(() => Array.from({ length: 10 }, (_, i) => i), [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-background/90 backdrop-blur-md"
    >
      {/* deep red-amber vignette of urgency */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, oklch(0.5 0.19 40 / 0.14) 100%)',
        }}
      />

      {/* shockwave — remounts every second */}
      <motion.div
        key={`shock-${seconds}`}
        className="absolute rounded-full border-2 pointer-events-none"
        style={{
          width: '42vmin',
          height: '42vmin',
          borderColor: 'oklch(0.75 0.18 60 / 0.55)',
          boxShadow: '0 0 60px oklch(0.75 0.18 60 / 0.35), inset 0 0 60px oklch(0.75 0.18 60 / 0.15)',
        }}
        initial={{ scale: 0.15, opacity: 0.9 }}
        animate={{ scale: 3.4, opacity: 0 }}
        transition={{ duration: 1.05, ease: [0.12, 0.8, 0.3, 1] }}
      />
      {/* second, slower wave */}
      <motion.div
        key={`shock2-${seconds}`}
        className="absolute rounded-full border pointer-events-none"
        style={{
          width: '42vmin',
          height: '42vmin',
          borderColor: 'oklch(0.62 0.22 295 / 0.35)',
        }}
        initial={{ scale: 0.1, opacity: 0.6 }}
        animate={{ scale: 4.6, opacity: 0 }}
        transition={{ duration: 1.35, ease: [0.12, 0.8, 0.3, 1], delay: 0.08 }}
      />

      {/* screen flash — remounts every second */}
      <motion.div
        key={`flash-${seconds}`}
        className="absolute inset-0 pointer-events-none bg-white"
        initial={{ opacity: 0.16 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
      />

      {/* shaken stage — remounts every second */}
      <motion.div
        key={`stage-${seconds}`}
        className="relative flex flex-col items-center"
        initial={{ x: 0, y: 0 }}
        animate={{
          x: [0, -14, 10, -6, 3, 0],
          y: [0, 8, -10, 5, -2, 0],
        }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* header */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-2 md:mb-6"
        >
          <span className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="w-2 h-2 rounded-full bg-amber-400/50 animate-pulse [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-amber-400/25 animate-pulse [animation-delay:0.4s]" />
          </span>
          <span className="font-mono text-[10px] md:text-xs uppercase tracking-[0.5em] text-amber-300">
            Final Sequence
          </span>
        </motion.div>

        {/* GIANT digit with chromatic aberration */}
        <div className="relative flex items-center justify-center">
          {/* red ghost */}
          <motion.span
            key={`r-${seconds}`}
            className="absolute font-display font-bold tabular-nums select-none"
            style={{
              fontSize: 'clamp(11rem, 38vmin, 34rem)',
              lineHeight: 1,
              color: 'oklch(0.62 0.26 25 / 0.55)',
            }}
            initial={{ x: -4, y: -2, opacity: 0.8 }}
            animate={{ x: -14, y: -4, opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            {seconds}
          </motion.span>
          {/* cyan ghost */}
          <motion.span
            key={`c-${seconds}`}
            className="absolute font-display font-bold tabular-nums select-none"
            style={{
              fontSize: 'clamp(11rem, 38vmin, 34rem)',
              lineHeight: 1,
              color: 'oklch(0.78 0.16 195 / 0.55)',
            }}
            initial={{ x: 4, y: 2, opacity: 0.8 }}
            animate={{ x: 14, y: 4, opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            {seconds}
          </motion.span>
          {/* main digit */}
          <motion.span
            key={`m-${seconds}`}
            className="font-display font-bold tabular-nums select-none"
            style={{
              fontSize: 'clamp(11rem, 38vmin, 34rem)',
              lineHeight: 1,
              backgroundImage:
                'linear-gradient(160deg, oklch(0.98 0.02 80) 0%, oklch(0.8 0.17 65) 45%, oklch(0.66 0.22 50) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 42px oklch(0.75 0.18 60 / 0.45))',
            }}
            initial={{ scale: 1.14, opacity: 0.55 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.42, ease: [0.2, 0.9, 0.25, 1] }}
          >
            {seconds}
          </motion.span>
        </div>

        {/* sub-label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 md:mt-6 font-mono text-[10px] md:text-xs uppercase tracking-[0.6em] text-muted-foreground"
        >
          Vault opening in
        </motion.div>
      </motion.div>

      {/* bolt pips — one goes out per second */}
      <div className="absolute bottom-10 md:bottom-14 flex items-center gap-2 md:gap-3">
        {boltPips.map((i) => {
          const gone = i < 10 - seconds
          return (
            <motion.div
              key={i}
              animate={
                gone
                  ? { scaleX: 0.15, opacity: 0.25 }
                  : { scaleX: 1, opacity: 1 }
              }
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="h-1 rounded-full origin-center"
              style={{
                width: 'clamp(18px, 4vw, 34px)',
                background: gone
                  ? 'oklch(0.65 0.02 280)'
                  : 'linear-gradient(90deg, oklch(0.75 0.18 60), oklch(0.66 0.22 50))',
                boxShadow: gone ? 'none' : '0 0 12px oklch(0.75 0.18 60 / 0.5)',
              }}
            />
          )
        })}
      </div>

      {/* corner telemetry */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 font-mono text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50">
        <div>XELIS · BlockDAG</div>
        <div className="mt-1">Genesis height 1</div>
      </div>
      <div className="absolute top-6 right-6 md:top-8 md:right-8 text-right font-mono text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50">
        <div>Target 14:00 UTC</div>
        <div className="mt-1 text-amber-400/70">T-MINUS {seconds}</div>
      </div>
    </motion.div>
  )
}

// ===== Main countdown component =====
export function CinematicCountdown() {
  const {
    days,
    hours,
    minutes,
    seconds,
    progress,
    isLaunched,
    isFinalCountdown,
  } = useCountdownState()

  if (isLaunched) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative w-32 h-32 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-3 h-3 rounded-full bg-emerald-400"
          />
          <div className="absolute inset-0 rounded-full border border-emerald-400/30 animate-ping" />
        </div>
        <div className="font-display text-2xl font-semibold text-emerald-400">Testnet is LIVE</div>
        <div className="text-xs font-mono text-muted-foreground">Connect your Genesix wallet to begin</div>
      </motion.div>
    )
  }

  // FULL-SCREEN FINAL SEQUENCE is rendered globally by <LaunchExperience />
  // (mounted in the root layout so every page ignites at T-10s).
  if (isFinalCountdown) return null

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.3em] text-vault"
      >
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full bg-vault"
        />
        Vault Sealing · T-Minus
      </motion.div>

      {/* The dial */}
      <div className="relative">
        <motion.svg
          width="380"
          height="380"
          viewBox="-200 -200 400 400"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="max-w-[90vw] max-h-[90vw]"
        >
          {/* Outer aura glow */}
          <circle cx={0} cy={0} r={180} fill="none" stroke="oklch(0.62 0.22 295 / 0.1)" strokeWidth={0.5} />
          <circle
            cx={0}
            cy={0}
            r={160}
            fill="none"
            stroke="oklch(0.62 0.22 295 / 0.05)"
            strokeWidth={0.5}
            strokeDasharray="2 4"
          />

          {/* Gear mechanism */}
          <MechanismRings urgent={false} />

          {/* Orbiting glyphs */}
          <OrbitingGlyphs progress={progress} />

          {/* Bolt ring */}
          <BoltRing progress={progress} />

          {/* Progress arc */}
          <ProgressArc progress={progress} />

          {/* Inner core glow */}
          <motion.circle
            cx={0}
            cy={0}
            r={90}
            fill="oklch(0.62 0.22 295 / 0.04)"
            animate={{ r: [88, 92, 88], opacity: [0.04, 0.08, 0.04] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.svg>

        {/* Center overlay: logo + digits + percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
            className="relative"
          >
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px -4px var(--vault)',
                  '0 0 32px -2px var(--vault)',
                  '0 0 20px -4px var(--vault)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-11 h-11 md:w-12 md:h-12 rounded-lg overflow-hidden ring-1 ring-vault/50"
            >
              <img src="/images/xelisvault-logo.png" alt="Xelis Vault" className="w-full h-full object-cover" />
            </motion.div>
          </motion.div>

          <div className="flex items-center gap-2 md:gap-4 mt-1">
            <CipherDigit value={days} label="Days" />
            <Separator />
            <CipherDigit value={hours} label="Hours" />
            <Separator />
            <CipherDigit value={minutes} label="Minutes" />
            <Separator />
            <CipherDigit value={seconds} label="Seconds" />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-1 text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/60"
          >
            <span className="text-vault/80">{(progress * 100).toFixed(2)}%</span> sealed
          </motion.div>
        </div>
      </div>

      {/* Target date */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">Target</div>
        <div className="mt-1 font-display text-lg font-semibold">August 30, 2026 · 14:00 UTC</div>
        <div className="mt-1 text-xs text-muted-foreground/60 font-mono">
          {days} days · {Math.floor((days * 24 * 60 * 60) / 5).toLocaleString()} blocks remaining
        </div>
      </motion.div>
    </div>
  )
}

function Separator() {
  return (
    <motion.div
      animate={{ opacity: [0.3, 0.8, 0.3] }}
      transition={{ duration: 1, repeat: Infinity }}
      className="font-mono text-2xl md:text-4xl text-vault/40"
    >
      :
    </motion.div>
  )
}

// Compact inline chip (kept for API compatibility)
export function CompactCountdown() {
  const { days, hours, minutes, seconds, isLaunched } = useCountdownState()

  if (isLaunched) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-4 py-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">
          Testnet Live
        </span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-2">
      <motion.span
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-1.5 h-1.5 rounded-full bg-vault"
      />
      <span className="text-xs font-mono text-muted-foreground">Launch in</span>
      <span className="text-xs font-mono font-bold text-vault tabular-nums">
        {days}d {hours}h {minutes}m {seconds}s
      </span>
    </div>
  )
}
