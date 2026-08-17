'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Cinematic Countdown — XELIS Vault Launch
 *
 * Combines three protocol-themed concepts:
 *  1. Sealed Vault ring — bolts retract as time progresses, fully open at T-0
 *  2. Ciphertext reveal — each digit scrambles through cipher glyphs before settling
 *  3. Particle aura — monospace glyphs orbit the ring (encrypted state, BlockDAG energy)
 *
 * No external assets. Pure SVG + Framer Motion. Mobile-safe.
 */

const LAUNCH_DATE = new Date('2026-08-25T14:00:00Z').getTime()

// Cipher glyphs for the scramble effect — ElGamal-themed (hex + crypto symbols)
const CIPHER_GLYPHS = '0123456789ABCDEF∆∇ΣΦΨΩαβγδλμπσ∇∂∫∏≈≠≡⊕⊗⨯⌬⏃⏆'.split('')

function randomGlyph() {
  return CIPHER_GLYPHS[Math.floor(Math.random() * CIPHER_GLYPHS.length)]
}

function scrambleDigit(target: string, progress: number): string {
  // progress 0..1 — 0 = fully scrambled, 1 = fully resolved
  if (progress >= 1) return target
  // Higher chance of showing the real digit as progress increases
  if (Math.random() < progress * 0.7) return target
  return randomGlyph()
}

// ===== Bolt ring (vault door metaphor) =====
const BOLT_COUNT = 12

function BoltRing({ progress }: { progress: number }) {
  // progress 0..1 — bolts retract as we approach launch
  // Each bolt has its own threshold; they retract in sequence
  const bolts = useMemo(
    () =>
      Array.from({ length: BOLT_COUNT }, (_, i) => ({
        id: i,
        threshold: i / BOLT_COUNT,
        angle: (i / BOLT_COUNT) * Math.PI * 2 - Math.PI / 2,
      })),
    []
  )

  const radius = 130
  const boltLength = 22

  return (
    <g>
      {bolts.map((bolt) => {
        // Bolt is retracted when progress >= threshold
        const retracted = progress >= bolt.threshold
        // Smooth retract animation
        const retractProgress = Math.max(0, Math.min(1, (progress - bolt.threshold + 0.05) / 0.1))
        const x1 = radius * Math.cos(bolt.angle)
        const y1 = radius * Math.sin(bolt.angle)
        const x2 = (radius + boltLength * (1 - retractProgress * 0.7)) * Math.cos(bolt.angle)
        const y2 = (radius + boltLength * (1 - retractProgress * 0.7)) * Math.sin(bolt.angle)

        return (
          <g key={bolt.id}>
            {/* Bolt track (faded) */}
            <line
              x1={x1}
              y1={y1}
              x2={(radius + boltLength) * Math.cos(bolt.angle)}
              y2={(radius + boltLength) * Math.sin(bolt.angle)}
              stroke="oklch(0.62 0.22 295 / 0.15)"
              strokeWidth={2}
              strokeLinecap="round"
            />
            {/* Active bolt */}
            <motion.line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={retracted ? 'oklch(0.62 0.22 295 / 0.3)' : 'oklch(0.62 0.22 295)'}
              strokeWidth={retracted ? 1.5 : 3}
              strokeLinecap="round"
              animate={{
                opacity: retracted ? [0.3, 0.5, 0.3] : 1,
              }}
              transition={{
                duration: 2,
                repeat: retracted ? Infinity : 0,
                ease: 'easeInOut',
              }}
            />
            {/* Bolt head (circle) */}
            <motion.circle
              cx={x2}
              cy={y2}
              r={retracted ? 1.5 : 3}
              fill={retracted ? 'oklch(0.62 0.22 295 / 0.4)' : 'oklch(0.62 0.22 295)'}
              animate={{
                opacity: retracted ? 0.4 : 1,
              }}
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
      {/* Track */}
      <circle
        cx={0}
        cy={0}
        r={radius}
        fill="none"
        stroke="oklch(1 0 0 / 0.06)"
        strokeWidth={1.5}
      />
      {/* Progress */}
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
        style={{
          filter: 'drop-shadow(0 0 8px oklch(0.62 0.22 295 / 0.6))',
        }}
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
    const totalFrames = 20 // ~330ms of scramble at 60fps
    const interval = setInterval(() => {
      frame++
      const progress = frame / totalFrames
      const scrambled = targetStr
        .split('')
        .map((d) => scrambleDigit(d, progress))
        .join('')
      setDisplay(scrambled)
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

// ===== Orbiting glyph particles =====
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
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 40 / g.speed,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ transformOrigin: '0px 0px' }}
        >
          <motion.text
            x={g.radius * Math.cos(g.angle)}
            y={g.radius * Math.sin(g.angle)}
            fontSize={g.size}
            fontFamily="var(--font-jetbrains)"
            fill="oklch(0.62 0.22 295)"
            animate={{
              opacity: [0.1, 0.4 * (1 - progress * 0.5), 0.1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: g.id * 0.2,
            }}
          >
            {g.glyph}
          </motion.text>
        </motion.g>
      ))}
    </g>
  )
}

// ===== Main countdown component =====
export function CinematicCountdown({ compact = false }: { compact?: boolean }) {
  const [timeLeft, setTimeLeft] = useState(LAUNCH_DATE - Date.now())
  const [isLaunched, setIsLaunched] = useState(Date.now() >= LAUNCH_DATE)

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = LAUNCH_DATE - Date.now()
      setTimeLeft(remaining)
      setIsLaunched(remaining <= 0)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Total duration: from a reference start date (Aug 9, 2026 — when we announced the delay)
  const TOTAL_DURATION = LAUNCH_DATE - new Date('2026-08-09T00:00:00Z').getTime()
  const elapsed = TOTAL_DURATION - timeLeft
  const progress = Math.max(0, Math.min(1, elapsed / TOTAL_DURATION))

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
        <div className="font-display text-2xl font-semibold text-emerald-400">
          Testnet is LIVE
        </div>
        <div className="text-xs font-mono text-muted-foreground">
          Connect your Genesix wallet to begin
        </div>
      </motion.div>
    )
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

  if (compact) {
    // Compact version for inline use
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

      {/* The ring */}
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
          <circle
            cx={0}
            cy={0}
            r={180}
            fill="none"
            stroke="oklch(0.62 0.22 295 / 0.1)"
            strokeWidth={0.5}
          />
          <circle
            cx={0}
            cy={0}
            r={160}
            fill="none"
            stroke="oklch(0.62 0.22 295 / 0.05)"
            strokeWidth={0.5}
            strokeDasharray="2 4"
          />

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
            animate={{
              r: [88, 92, 88],
              opacity: [0.04, 0.08, 0.04],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.svg>

        {/* Center overlay: logo + digits + percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          {/* Logo in the heart of the vault */}
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
              <img
                src="/images/xelisvault-logo.png"
                alt="Xelis Vault"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </motion.div>

          {/* Digits */}
          <div className="flex items-center gap-2 md:gap-4 mt-1">
            <CipherDigit value={days} label="Days" />
            <Separator />
            <CipherDigit value={hours} label="Hours" />
            <Separator />
            <CipherDigit value={minutes} label="Minutes" />
            <Separator />
            <CipherDigit value={seconds} label="Seconds" />
          </div>

          {/* Percentage indicator */}
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
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          Target
        </div>
        <div className="mt-1 font-display text-lg font-semibold">
          August 25, 2026 · 14:00 UTC
        </div>
        <div className="mt-1 text-xs text-muted-foreground/60 font-mono">
          {Math.floor(timeLeft / (1000 * 60 * 60 * 24))} days · {Math.floor(timeLeft / (1000 * 60 * 60 * 24) * 5 / 60)} blocks remaining
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
