'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { ChevronRight, Rocket } from 'lucide-react'
import { alpha, seededRandom, randomGlyph } from '@/lib/countdown'
import { FeatureTour, tourDurationMs } from './feature-tour'

/**
 * ═══════════════════════════════════════════════════════════════════
 *  THE VAULT OPENING — Launch Unlock Sequence
 * ═══════════════════════════════════════════════════════════════════
 *
 *  A ~38 second cinematic that plays ONCE, the moment the countdown
 *  hits zero. Eight escalating phases:
 *
 *   1. HOLD      the final "0" freezes, glitches, collapses to a point
 *   2. BOLTS     the vault wheel materializes — 12 bolts blow rapid-fire
 *   3. ROTATE    the wheel makes its final half-turn, tension peaks
 *   4. BREACH    💥 white flash · shockwaves · screen shake · the door
 *                shatters into 8 wedges · particle storm · light rays
 *   5. GENESIS   the logo rises and a BlockDAG constellation is born —
 *                blocks appear and edges draw themselves (true DAG)
 *   6. CHAIN     the constellation condenses into THE BLOCKCHAIN — a
 *                line of blocks chains itself left→right, and every
 *                spectacular protocol feature blooms from a block
 *   7. TOUR      the camera dives INTO the chain and walks through all
 *                nine modules — Vault Engine, VaultSwap, Mixer, Savings,
 *                PSM, Oracle, Governance, Miner, VaultChat — each with
 *                its own cinematic scene (see feature-tour.tsx)
 *   8. LIVE      "TESTNET LIVE" decodes, stats count up, CTA materializes
 *
 *  Click "Skip" (or press Esc) to end early.
 *  Pure SVG + Framer Motion — no assets, Vercel-safe, mobile-safe.
 */

type Phase = 'hold' | 'bolts' | 'rotate' | 'breach' | 'genesis' | 'chain' | 'tour' | 'live'
const PHASES: Phase[] = ['hold', 'bolts', 'rotate', 'breach', 'genesis', 'chain', 'tour', 'live']

// Phase schedule (ms from mount) — RETIMED to Léa's soundtrack
// (public/audio/vault-opening.mp3, ~154s; ceremony start = track 10.0s):
//   track 12s  build begins       → BOLTS   (ceremony 2.0s)
//   track 20s  second hit         → ROTATE  (ceremony 10.0s, suspense during
//                                            the 23–27s energy dip)
//   track 28.5s THE DROP          → BREACH  (ceremony 18.5s, "The vault is open")
//   track 36s  "a constellation"  → GENESIS (ceremony 26.0s)
//   track 48s  "block after block"→ CHAIN   (ceremony 38.0s)
//   track 60s  module whispers    → TOUR    (ceremony 50.0s, 9 × 3.0s)
//   track ~87s "Testnet. Live."   → LIVE    (ceremony 77.25s)
const T_BOLTS = 2000
const T_ROTATE = 10000
const T_BREACH = 18500
const T_GENESIS = 26000
const T_CHAIN = 38000
const T_TOUR = 50000
const T_LIVE = T_TOUR + tourDurationMs(false) + 250
const T_END = T_LIVE + 5600
const T_COMPLETE = T_END + 900

// ===== Vault wheel geometry =====
const WHEEL_R = 175
const BOLTS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2
  return {
    id: i,
    a,
    x1: Math.cos(a) * 128,
    y1: Math.sin(a) * 128,
    x2: Math.cos(a) * 152,
    y2: Math.sin(a) * 152,
    hx: Math.cos(a) * 163,
    hy: Math.sin(a) * 163,
  }
})

// ===== Door fragments (8 wedges of the plate) =====
const FRAGMENTS = Array.from({ length: 8 }, (_, i) => {
  const mid = i * 45
  const a0 = ((mid - 22.5) * Math.PI) / 180
  const a1 = ((mid + 22.5) * Math.PI) / 180
  const r = WHEEL_R
  const x0 = Math.cos(a0) * r
  const y0 = Math.sin(a0) * r
  const x1 = Math.cos(a1) * r
  const y1 = Math.sin(a1) * r
  const d = `M 0 0 L ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`
  const dir = (mid * Math.PI) / 180
  return {
    id: i,
    d,
    dx: Math.cos(dir),
    dy: Math.sin(dir),
    dist: 420 + (i % 3) * 90,
    rot: (i % 2 === 0 ? 1 : -1) * (28 + ((i * 17) % 50)),
    delay: (i % 4) * 0.03,
  }
})

// ===== Particle storm (deterministic) =====
interface Particle {
  id: number
  x: number
  y: number
  size: number
  delay: number
  dur: number
  color: string
  glyph: string | null
  rot: number
}
function buildParticles(): Particle[] {
  const rnd = seededRandom(1337)
  const colors = [
    'oklch(0.62 0.22 295)', // vault
    'oklch(0.78 0.16 195)', // xusd
    'oklch(0.7 0.2 320)', // vlt
    'oklch(0.98 0.005 280)', // white
    'oklch(0.8 0.17 65)', // amber
  ]
  return Array.from({ length: 170 }, (_, i) => {
    const a = rnd() * Math.PI * 2
    const dist = 160 + rnd() * 820
    const isGlyph = rnd() < 0.35
    return {
      id: i,
      x: Math.cos(a) * dist,
      y: Math.sin(a) * dist,
      size: isGlyph ? 10 + rnd() * 14 : 3 + rnd() * 5,
      delay: rnd() * 0.3,
      dur: 1.6 + rnd() * 1.3,
      color: colors[Math.floor(rnd() * colors.length)],
      glyph: isGlyph ? '0123456789ABCDEF∆ΣΦΨΩαβγλπσ∂≈≠≡⊕⊗'[Math.floor(rnd() * 35)] : null,
      rot: (rnd() - 0.5) * 720,
    }
  })
}

// ===== BlockDAG constellation (true DAG topology) =====
interface DagNode {
  id: number
  x: number
  y: number
  r: number
  color: string
  delay: number
}
interface DagEdge {
  from: number
  to: number
  delay: number
}
function buildDAG(): { nodes: DagNode[]; edges: DagEdge[] } {
  const rnd = seededRandom(2026)
  const nodes: DagNode[] = [
    { id: 0, x: 0, y: 0, r: 15, color: 'oklch(0.98 0.02 80)', delay: 0 },
  ]
  const rings = [
    { count: 5, radius: 90, phase: -0.4 },
    { count: 7, radius: 172, phase: 0.3 },
    { count: 9, radius: 250, phase: 1.05 },
  ]
  rings.forEach((ring) => {
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2 + ring.phase + (rnd() - 0.5) * 0.5
      const rr = ring.radius + (rnd() - 0.5) * 26
      nodes.push({
        id: nodes.length,
        x: Math.cos(a) * rr,
        y: Math.sin(a) * rr,
        r: 6.5 - rings.indexOf(ring) * 0.8,
        color:
          nodes.length % 7 === 0
            ? 'oklch(0.7 0.2 320)'
            : nodes.length % 5 === 0
              ? 'oklch(0.78 0.16 195)'
              : 'oklch(0.62 0.22 295)',
        delay: 0.15 + nodes.length * 0.13,
      })
    }
  })
  const edges: DagEdge[] = []
  for (let i = 1; i < nodes.length; i++) {
    // every block references 1-2 parents (BlockDAG!)
    const parentCount = i <= 5 ? 1 : rnd() < 0.5 ? 2 : 1
    // candidates sorted by distance — blocks link to closer parents
    const candidates = Array.from({ length: i }, (_, k) => k).sort(
      (a, b) =>
        (nodes[a].x - nodes[i].x) ** 2 +
        (nodes[a].y - nodes[i].y) ** 2 -
        ((nodes[b].x - nodes[i].x) ** 2 + (nodes[b].y - nodes[i].y) ** 2)
    )
    const nearPool = candidates.slice(0, Math.max(2, Math.ceil(i / 2)))
    for (let p = 0; p < parentCount && nearPool.length; p++) {
      const parent = nearPool.splice(Math.floor(rnd() * nearPool.length), 1)[0]
      edges.push({ from: parent, to: i, delay: nodes[i].delay + 0.05 })
    }
  }
  return { nodes, edges }
}

// ===== CHAIN — the blockchain line + blooming features =====
interface ChainFeature {
  label: string
  glyph: string
  color: string
  block: number
  above: boolean
}

const FEATURES_FULL: ChainFeature[] = [
  { label: 'Private TXs', glyph: 'Φ', color: 'oklch(0.62 0.22 295)', block: 1, above: true },
  { label: 'Comparisons', glyph: '≡', color: 'oklch(0.78 0.16 195)', block: 2, above: false },
  { label: 'Contracts', glyph: 'Σ', color: 'oklch(0.7 0.2 320)', block: 3, above: true },
  { label: 'Mixer', glyph: '⊗', color: 'oklch(0.8 0.17 65)', block: 4, above: false },
  { label: 'Oracle', glyph: 'Ω', color: 'oklch(0.72 0.14 160)', block: 5, above: true },
  { label: 'PSM', glyph: '≈', color: 'oklch(0.78 0.16 195)', block: 6, above: false },
  { label: 'Mining', glyph: '∆', color: 'oklch(0.8 0.17 65)', block: 7, above: true },
  { label: 'Governance', glyph: 'λ', color: 'oklch(0.7 0.2 320)', block: 8, above: false },
]

function buildChain(isMobile: boolean) {
  const nBlocks = isMobile ? 5 : 9
  const spacing = isMobile ? 150 : 96
  const blockW = isMobile ? 46 : 56
  const features = (isMobile ? FEATURES_FULL.filter((f) => f.block <= 4) : FEATURES_FULL).map(
    (f, i) => ({ ...f, order: i })
  )
  const blocks = Array.from({ length: nBlocks }, (_, i) => ({
    id: i,
    x: (i - (nBlocks - 1) / 2) * spacing,
    genesis: i === 0,
    hash: `${['∆', 'Σ', 'Φ', 'Ψ', 'Ω', 'λ', 'π', 'σ'][i % 8]}${(0x3f + i * 17)
      .toString(16)
      .toUpperCase()}${['α', 'β', 'γ', 'δ'][i % 4]}`,
  }))
  return { blocks, features, spacing, blockW, width: nBlocks * spacing + 60 }
}

// ===== Decoding text (cipher → plaintext) =====
function DecodingText({
  text,
  active,
  startDelay = 0,
  className,
  speed = 55,
}: {
  text: string
  active: boolean
  startDelay?: number
  className?: string
  speed?: number
}) {
  const [out, setOut] = useState('')
  useEffect(() => {
    if (!active) return
    let resolved = 0
    let interval: ReturnType<typeof setInterval> | undefined
    const timeout = setTimeout(() => {
      setOut(text.replace(/[^\s]/g, '·'))
      interval = setInterval(() => {
        resolved++
        setOut(
          text
            .split('')
            .map((ch, i) => (i < resolved ? ch : ch === ' ' ? ' ' : randomGlyph()))
            .join('')
        )
        if (resolved >= text.length && interval) clearInterval(interval)
      }, speed)
    }, startDelay)
    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [active, text, startDelay, speed])

  return <span className={className}>{active ? out || text.replace(/[^\s]/g, ' ') : text}</span>
}

// ===== Count-up number =====
function CountUp({
  to,
  active,
  duration = 1.1,
  delay = 0,
  suffix = '',
}: {
  to: number
  active: boolean
  duration?: number
  delay?: number
  suffix?: string
}) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    let raf = 0
    let start: number | null = null
    const timeout = setTimeout(() => {
      const step = (ts: number) => {
        if (start === null) start = ts
        const p = Math.min(1, (ts - start) / (duration * 1000))
        const eased = 1 - Math.pow(1 - p, 3)
        setVal(Math.round(to * eased))
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, delay)
    return () => {
      clearTimeout(timeout)
      cancelAnimationFrame(raf)
    }
  }, [active, to, duration, delay])
  return (
    <span className="tabular-nums">
      {val.toLocaleString()}
      {suffix}
    </span>
  )
}

// ═══════════════════ MAIN COMPONENT ═══════════════════
export function LaunchCelebration({
  onComplete,
  onEnterApp,
}: {
  onComplete: () => void
  onEnterApp?: () => void
}) {
  const [phase, setPhase] = useState<Phase>('hold')
  const [fading, setFading] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const particles = useMemo(buildParticles, [])
  const dag = useMemo(buildDAG, [])
  const pi = PHASES.indexOf(phase) // phase index

  // Keep the latest callback without re-triggering the phase machine:
  // the parent re-renders every 200ms (countdown tick) and would keep
  // resetting the timers below if onComplete stayed in the deps.
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const finish = useCallback(() => {
    setFading(true)
    setTimeout(() => onCompleteRef.current(), 450)
  }, [])

  // Phase state machine — mount-only, never reset by parent re-renders
  useEffect(() => {
    const schedule: [number, () => void][] = [
      [T_BOLTS, () => setPhase('bolts')],
      [T_ROTATE, () => setPhase('rotate')],
      [T_BREACH, () => setPhase('breach')],
      [T_GENESIS, () => setPhase('genesis')],
      [T_CHAIN, () => setPhase('chain')],
      [T_TOUR, () => setPhase('tour')],
      [T_LIVE, () => setPhase('live')],
      [T_END, () => setFading(true)],
      [T_COMPLETE, () => onCompleteRef.current()],
    ]
    const timers = schedule.map(([ms, fn]) => setTimeout(fn, ms))
    return () => timers.forEach(clearTimeout)
  }, [])

  // Escape to skip
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

  // Screen shake during breach
  const shaking = phase === 'breach'

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 0.75, ease: 'easeInOut' }}
      className="fixed inset-0 z-[100] bg-background overflow-hidden select-none"
      style={{ cursor: 'default' }}
    >
      {/* ══ SCREEN SHAKE WRAPPER ══ */}
      <motion.div
        className="absolute inset-0"
        animate={
          shaking
            ? {
                x: [0, -18, 14, -10, 7, -4, 2, 0],
                y: [0, 10, -14, 8, -5, 3, -1, 0],
              }
            : { x: 0, y: 0 }
        }
        transition={shaking ? { duration: 0.65, ease: 'easeOut' } : { duration: 0.3 }}
      >
        {/* ── LIGHT RAYS (breach → end) ── */}
        <motion.div
          className="absolute left-1/2 top-1/2 pointer-events-none"
          style={{
            width: '240vmax',
            height: '240vmax',
            x: '-50%',
            y: '-50%',
            background:
              'repeating-conic-gradient(from 0deg, transparent 0deg 11deg, oklch(0.62 0.22 295 / 0.07) 11deg 13deg, transparent 13deg 24deg, oklch(0.78 0.16 195 / 0.045) 24deg 25.5deg, transparent 25.5deg 38deg)',
            maskImage: 'radial-gradient(circle, black 0%, transparent 62%)',
            WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 62%)',
          }}
          initial={{ opacity: 0, rotate: 0 }}
          animate={{
            opacity: pi >= 7 ? (fading ? 0 : 0.9) : pi === 6 ? 0.4 : pi >= 4 ? 0.8 : pi >= 3 ? 0.5 : 0,
            rotate: 360,
          }}
          transition={{
            opacity: { duration: 1 },
            rotate: { duration: 110, repeat: Infinity, ease: 'linear' },
          }}
        />

        {/* ── CENTRAL EMBER GLOW (breach → genesis bridge) ── */}
        {pi >= 3 && pi <= 4 && (
          <motion.div
            className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
            style={{
              width: '46vmin',
              height: '46vmin',
              x: '-50%',
              y: '-50%',
              background:
                'radial-gradient(circle, oklch(0.85 0.12 70 / 0.5) 0%, oklch(0.62 0.22 295 / 0.25) 40%, transparent 70%)',
            }}
            initial={{ scale: 0.2, opacity: 0.9 }}
            animate={{ scale: 1.5, opacity: pi >= 4 ? 0.35 : 0.6 }}
            transition={{ duration: 2.2, ease: 'easeOut' }}
          />
        )}

        {/* ── PHASE 1 · HOLD, the frozen zero ── */}
        {pi === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 1, opacity: 1 }}
              animate={{
                scale: [1, 1, 0.05],
                opacity: [1, 1, 1],
                filter: [
                  'brightness(1)',
                  'brightness(1.6)',
                  'brightness(3)',
                ],
              }}
              transition={{
                duration: 1.4,
                times: [0, 0.62, 1],
                ease: 'easeIn',
              }}
              className="relative"
            >
              <motion.span
                className="font-display font-bold tabular-nums block"
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
                animate={{
                  x: [0, -3, 4, -2, 0, 6, 0],
                  skewX: [0, 2, -3, 1, 0, -2, 0],
                }}
                transition={{ duration: 0.85, repeat: 1 }}
              >
                0
              </motion.span>
            </motion.div>
          </div>
        )}

        {/* ── PHASES 2-4 · THE VAULT WHEEL ── */}
        {pi >= 1 && pi <= 3 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.svg
              width="380"
              height="380"
              viewBox="-200 -200 400 400"
              style={{ overflow: 'visible' }}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{
                opacity: pi >= 3 ? 0 : 1,
                scale: pi >= 3 ? 1.3 : 1,
              }}
              transition={{
                opacity: pi >= 3 ? { duration: 0.28 } : { duration: 0.5 },
                scale: pi >= 3 ? { duration: 0.3, ease: 'easeIn' } : { duration: 0.7, ease: 'easeOut' },
              }}
              className="max-w-[86vw] max-h-[86vw]"
            >
              <defs>
                <radialGradient id="plateGrad" cx="38%" cy="32%" r="80%">
                  <stop offset="0%" stopColor="oklch(0.24 0.03 285)" />
                  <stop offset="55%" stopColor="oklch(0.13 0.025 282)" />
                  <stop offset="100%" stopColor="oklch(0.07 0.02 280)" />
                </radialGradient>
                <linearGradient id="spokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="oklch(0.68 0.14 295)" />
                  <stop offset="100%" stopColor="oklch(0.4 0.14 295)" />
                </linearGradient>
              </defs>

              {/* door plate (shatters at breach) */}
              {pi < 3 ? (
                <circle r={WHEEL_R} fill="url(#plateGrad)" stroke="oklch(0.62 0.22 295 / 0.35)" strokeWidth={2} />
              ) : (
                FRAGMENTS.map((f) => (
                  <motion.path
                    key={f.id}
                    d={f.d}
                    fill="url(#plateGrad)"
                    stroke="oklch(0.62 0.22 295 / 0.3)"
                    strokeWidth={1.5}
                    initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                    animate={{
                      x: f.dx * f.dist,
                      y: f.dy * f.dist,
                      opacity: 0,
                      rotate: f.rot,
                    }}
                    transition={{ duration: 1.15, delay: f.delay, ease: [0.1, 0.75, 0.3, 1] }}
                    style={{ transformOrigin: '0px 0px' }}
                  />
                ))
              )}

              {/* engraved rings */}
              <circle r={150} fill="none" stroke="oklch(0.62 0.22 295 / 0.18)" strokeWidth={1} strokeDasharray="3 6" />
              <circle r={118} fill="none" stroke="oklch(0.62 0.22 295 / 0.14)" strokeWidth={1} />

              {/* bolts, retract rapid-fire during BOLTS */}
              {BOLTS.map((b, i) => (
                <g key={b.id}>
                  {/* housing */}
                  <circle cx={b.hx} cy={b.hy} r={9} fill="oklch(0.1 0.025 282)" stroke="oklch(0.62 0.22 295 / 0.4)" strokeWidth={1.5} />
                  {/* the bolt */}
                  <motion.line
                    x1={b.x1}
                    y1={b.y1}
                    x2={b.x2}
                    y2={b.y2}
                    stroke="oklch(0.72 0.15 295)"
                    strokeWidth={5}
                    strokeLinecap="round"
                    initial={{ opacity: 1, x2: b.x2, y2: b.y2 }}
                    animate={
                      pi >= 2
                        ? {
                            x2: b.hx + Math.cos(b.a) * 14,
                            y2: b.hy + Math.sin(b.a) * 14,
                            opacity: 0.12,
                          }
                        : {}
                    }
                    transition={{ delay: i * 0.125, duration: 0.22, ease: 'backIn' }}
                  />
                  {/* retract flash */}
                  <motion.circle
                    cx={b.hx}
                    cy={b.hy}
                    r={4}
                    fill="oklch(0.9 0.1 80)"
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={pi >= 2 ? { opacity: [0, 1, 0], scale: [0.4, 2.4, 3.2] } : {}}
                    transition={{ delay: i * 0.125 + 0.14, duration: 0.4 }}
                  />
                </g>
              ))}

              {/* rotating spoke assembly */}
              <motion.g
                initial={{ rotate: 0 }}
                animate={{ rotate: pi >= 3 ? 195 : pi >= 2 ? 180 : 0 }}
                transition={
                  pi >= 2
                    ? { duration: 1.7, ease: [0.65, 0, 0.3, 1] }
                    : { duration: 0.4 }
                }
                style={{ transformOrigin: '0px 0px' }}
              >
                {[0, 90, 180, 270].map((deg) => (
                  <rect
                    key={deg}
                    x={-7}
                    y={-104}
                    width={14}
                    height={78}
                    rx={7}
                    fill="url(#spokeGrad)"
                    stroke="oklch(0.75 0.12 295 / 0.5)"
                    strokeWidth={1}
                    transform={`rotate(${deg})`}
                  />
                ))}
                {/* outer spoke ring */}
                <circle r={104} fill="none" stroke="url(#spokeGrad)" strokeWidth={11} />
                <circle r={104} fill="none" stroke="oklch(0.75 0.12 295 / 0.45)" strokeWidth={1.5} />
                {/* hub */}
                <circle r={40} fill="oklch(0.14 0.03 285)" stroke="oklch(0.68 0.16 295 / 0.6)" strokeWidth={2.5} />
                <circle r={31} fill="none" stroke="oklch(0.62 0.22 295 / 0.35)" strokeWidth={1} strokeDasharray="2 4" />
              </motion.g>

              {/* tension glow while rotating */}
              <motion.circle
                r={WHEEL_R + 8}
                fill="none"
                stroke="oklch(0.75 0.18 60)"
                strokeWidth={2}
                initial={{ opacity: 0 }}
                animate={{ opacity: pi === 2 ? [0, 0.55, 0.25, 0.8] : pi >= 3 ? 1 : 0 }}
                transition={pi === 2 ? { duration: 1.8 } : { duration: 0.3 }}
                style={{ filter: 'drop-shadow(0 0 18px oklch(0.75 0.18 60 / 0.6))' }}
              />
            </motion.svg>

            {/* hub logo overlay */}
            {pi < 3 && (
              <motion.div
                className="absolute w-12 h-12 md:w-14 md:h-14 rounded-none overflow-hidden ring-2 ring-vault/50"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  boxShadow: [
                    '0 0 18px -2px var(--vault)',
                    '0 0 44px 0px oklch(0.75 0.18 60)',
                    '0 0 18px -2px var(--vault)',
                  ],
                }}
                transition={{
                  opacity: { delay: 0.25, duration: 0.4 },
                  scale: { delay: 0.25, type: 'spring', stiffness: 200 },
                  boxShadow: { duration: 1.6, repeat: Infinity },
                }}
              >
                <img src="/images/xelisvault-logo.png" alt="Xelis Vault" className="w-full h-full object-cover" />
              </motion.div>
            )}
          </div>
        )}

        {/* ── PHASE 4 · BREACH FX ── */}
        {pi === 3 && (
          <>
            {/* blinding flash */}
            <motion.div
              className="absolute inset-0 bg-white pointer-events-none"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
            {/* shockwave I */}
            <motion.div
              className="absolute left-1/2 top-1/2 rounded-full border-2 pointer-events-none"
              style={{
                width: '46vmin',
                height: '46vmin',
                x: '-50%',
                y: '-50%',
                borderColor: 'oklch(0.98 0.01 80 / 0.8)',
                boxShadow: '0 0 80px oklch(0.9 0.1 70 / 0.5)',
              }}
              initial={{ scale: 0.05, opacity: 1 }}
              animate={{ scale: 5.5, opacity: 0 }}
              transition={{ duration: 1.3, ease: [0.1, 0.8, 0.25, 1] }}
            />
            {/* shockwave II */}
            <motion.div
              className="absolute left-1/2 top-1/2 rounded-full border pointer-events-none"
              style={{
                width: '46vmin',
                height: '46vmin',
                x: '-50%',
                y: '-50%',
                borderColor: 'oklch(0.62 0.22 295 / 0.6)',
              }}
              initial={{ scale: 0.03, opacity: 0.9 }}
              animate={{ scale: 7.5, opacity: 0 }}
              transition={{ duration: 1.7, ease: [0.1, 0.8, 0.25, 1], delay: 0.12 }}
            />
            {/* shockwave III, slow amber echo */}
            <motion.div
              className="absolute left-1/2 top-1/2 rounded-full border pointer-events-none"
              style={{
                width: '46vmin',
                height: '46vmin',
                x: '-50%',
                y: '-50%',
                borderColor: 'oklch(0.8 0.17 65 / 0.5)',
              }}
              initial={{ scale: 0.02, opacity: 0.8 }}
              animate={{ scale: 9, opacity: 0 }}
              transition={{ duration: 2.1, ease: [0.1, 0.8, 0.25, 1], delay: 0.3 }}
            />
            {/* particle storm */}
            <div className="absolute left-1/2 top-1/2 pointer-events-none">
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute"
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                  animate={{
                    x: p.x,
                    y: p.y,
                    opacity: [1, 1, 0],
                    scale: [1, 0.85, 0.1],
                    rotate: p.rot,
                  }}
                  transition={{ duration: p.dur, delay: p.delay, ease: [0.08, 0.7, 0.2, 1] }}
                  style={
                    p.glyph
                      ? {
                          color: p.color,
                          fontSize: p.size,
                          fontFamily: 'var(--font-jetbrains)',
                          textShadow: `0 0 10px ${p.color}`,
                          whiteSpace: 'nowrap',
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
            </div>
          </>
        )}

        {/* ── PHASES 5-8 · GENESIS → THE CHAIN → THE TOUR → LIVE ── */}
        {pi >= 4 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 md:gap-9">
            {/* DAG constellation backdrop, implodes into the chain */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.svg
                width="620"
                height="620"
                viewBox="-300 -300 600 600"
                className="max-w-[96vw] max-h-[96vh]"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: fading || pi >= 5 ? 0 : 1,
                  scale: pi >= 5 ? 0.18 : 1,
                }}
                transition={
                  pi >= 5
                    ? { duration: 0.55, ease: [0.6, 0, 0.8, 0.4] }
                    : { duration: 0.8 }
                }
              >
              <defs>
                <radialGradient id="dagGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="oklch(0.62 0.22 295 / 0.16)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              <circle r={280} fill="url(#dagGlow)" />

              {/* edges draw themselves */}
              {dag.edges.map((e, i) => (
                <motion.line
                  key={`edge-${i}`}
                  x1={dag.nodes[e.from].x}
                  y1={dag.nodes[e.from].y}
                  x2={dag.nodes[e.to].x}
                  y2={dag.nodes[e.to].y}
                  stroke="oklch(0.62 0.22 295 / 0.3)"
                  strokeWidth={1.3}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: e.delay, duration: 0.45, ease: 'easeOut' }}
                />
              ))}

              {/* nodes pop in */}
              {dag.nodes.slice(1).map((n) => (
                <motion.circle
                  key={`node-${n.id}`}
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill={n.color}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                  }}
                  transition={{ delay: n.delay, type: 'spring', stiffness: 320, damping: 18 }}
                  style={{
                    transformOrigin: `${n.x}px ${n.y}px`,
                    filter: `drop-shadow(0 0 6px ${n.color})`,
                  }}
                />
              ))}

              {/* genesis block halo (under the logo) */}
              <motion.circle
                r={24}
                fill="none"
                stroke="oklch(0.85 0.12 80 / 0.8)"
                strokeWidth={1.5}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: [0.4, 1.35, 1.15], opacity: [0, 1, 0.7] }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
              />
            </motion.svg>
            </div>

            {/* central logo rises, then lifts above the chain */}
            <motion.div
              initial={{ scale: 0, y: 46, opacity: 0 }}
              animate={{
                scale: pi >= 5 ? 0.72 : 1,
                y: pi >= 5 ? -72 : 0,
                opacity: pi === 6 || fading ? 0 : 1,
              }}
              transition={{
                scale: { type: 'spring', stiffness: 170, damping: 16 },
                y: { type: 'spring', stiffness: 130, damping: 17 },
                opacity: { duration: 0.4 },
              }}
              className="relative z-10"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 30px -4px var(--vault)',
                    '0 0 70px 4px oklch(0.75 0.18 60 / 0.7)',
                    '0 0 30px -4px var(--vault)',
                  ],
                }}
                transition={{ duration: 2.2, repeat: Infinity }}
                className="w-20 h-20 md:w-24 md:h-24 rounded-none overflow-hidden ring-2 ring-vault/60"
              >
                <img src="/images/xelisvault-logo.png" alt="Xelis Vault" className="w-full h-full object-cover" />
              </motion.div>
            </motion.div>

            {/* ── PHASE 6 · THE CHAIN, dives INTO the camera when the tour starts ── */}
            {pi >= 5 && (
              <motion.div
                key={pi >= 7 ? 'chain-live' : 'chain-main'}
                initial={{ opacity: 0, scale: 0.72 }}
                animate={{
                  opacity: pi === 6 || fading ? 0 : 1,
                  scale: pi === 6 ? 6.5 : pi >= 7 ? 0.9 : 1,
                }}
                transition={
                  pi === 6
                    ? { duration: 0.6, ease: [0.55, 0, 0.85, 0.4] }
                    : { duration: 0.55, ease: [0.2, 0.8, 0.3, 1] }
                }
              >
                <ChainVisual compact={pi >= 7} fading={fading} />
              </motion.div>
            )}

            {/* chain caption */}
            {pi === 5 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: [0, 1, 0.7, 1], y: 0 }}
                transition={{ delay: 1.6, duration: 1.4 }}
                className="font-mono text-[10px] md:text-xs uppercase tracking-[0.42em] text-center"
                style={{ color: 'oklch(0.8 0.14 70 / 0.9)' }}
              >
                The Blockchain · every state encrypted at birth
              </motion.div>
            )}
          </div>
        )}

        {/* ── PHASE 7 · THE PROTOCOL TOUR, walking inside the chain ── */}
        {pi === 6 && <FeatureTour />}

        {/* genesis caption */}
        {pi === 4 && (
          <div className="absolute inset-x-0 bottom-[12%] flex justify-center px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.6, 1] }}
              transition={{ duration: 1.2 }}
              className="font-mono text-[10px] md:text-xs uppercase tracking-[0.5em] text-vault"
            >
              Genesis · Height 1 · BlockDAG online
            </motion.div>
          </div>
        )}

        {/* ── PHASE 8 · LIVE TEXT LAYER ── */}
        {pi >= 7 && (
          <div className="absolute inset-x-0 bottom-[9%] flex flex-col items-center gap-4 px-6 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.2, 0.9, 0.25, 1] }}
              className="font-display text-5xl md:text-7xl font-semibold tracking-[-0.04em] leading-[0.95]"
            >
              <span className="text-gradient-vault">
                <DecodingText text="TESTNET" active startDelay={200} />
              </span>
              <span className="text-gradient-mono ml-3 md:ml-5">
                <DecodingText text="LIVE" active startDelay={700} />
              </span>
            </motion.h1>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.15, duration: 0.6 }}
                  className="text-xs md:text-sm font-mono text-muted-foreground"
                >
                  The vault is open · August 30, 2026 · 14:00 UTC
                </motion.div>

                {/* stats cascade */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4, duration: 0.6 }}
                  className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-xs md:text-sm"
                >
                  <span className="text-vault">
                    <b className="text-lg md:text-xl font-display">
                      <CountUp to={51} active delay={1500} />
                    </b>{' '}
                    contracts
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-xusd">
                    <b className="text-lg md:text-xl font-display">
                      <CountUp to={966} active delay={1650} />
                    </b>{' '}
                    entry points
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-vlt">
                    <b className="text-lg md:text-xl font-display">
                      <CountUp to={5} active delay={1800} suffix="s" />
                    </b>{' '}
                    finality
                  </span>
                </motion.div>

                {/* CTA */}
                <motion.button
                  initial={{ opacity: 0, y: 16, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 2.1, type: 'spring', stiffness: 220, damping: 18 }}
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
                    background: 'linear-gradient(120deg, oklch(0.62 0.22 295), oklch(0.55 0.24 320))',
                    boxShadow: '0 0 40px -6px oklch(0.62 0.22 295 / 0.7)',
                    cursor: 'pointer',
                  }}
                >
                  <motion.span
                    className="absolute inset-0 rounded-full"
                    animate={{
                      boxShadow: [
                        '0 0 0 0 oklch(0.62 0.22 295 / 0.5)',
                        '0 0 0 10px oklch(0.62 0.22 295 / 0)',
                      ],
                    }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                  <Rocket className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Enter the App</span>
                </motion.button>
          </div>
        )}

        {/* gentle particle rain (live phase) */}
        {pi >= 6 && !fading && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.slice(0, 26).map((p) => (
              <motion.div
                key={`rain-${p.id}`}
                className="absolute rounded-full"
                style={{
                  width: p.size * 0.5,
                  height: p.size * 0.5,
                  left: `${(p.x / 900 + 0.5) * 100}%`,
                  background: p.color,
                  boxShadow: `0 0 8px ${p.color}`,
                  opacity: 0.5,
                }}
                initial={{ y: '-5vh' }}
                animate={{ y: '108vh' }}
                transition={{
                  duration: 7 + (p.id % 5),
                  repeat: Infinity,
                  delay: (p.id % 10) * 0.7,
                  ease: 'linear',
                }}
              />
            ))}
          </div>
        )}
      </motion.div>

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

      {/* ending progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: T_COMPLETE / 1000, ease: 'linear' }}
        className="absolute bottom-0 left-0 right-0 h-0.5 origin-left"
        style={{ background: 'linear-gradient(90deg, oklch(0.62 0.22 295), oklch(0.75 0.18 60))' }}
      />
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  CHAIN VISUAL — the blockchain line & its blooming features
//  (also reused by the late-comer welcome sequence)
// ═══════════════════════════════════════════════════════════════
export function ChainVisual({ compact, fading }: { compact: boolean; fading: boolean }) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const { blocks, features, spacing, blockW } = useMemo(() => buildChain(isMobile), [isMobile])
  const vbW = spacing * blocks.length + 90
  const leftX = blocks[0].x - blockW / 2
  const rightX = blocks[blocks.length - 1].x + blockW / 2
  // exponential heights — the DAG grows fast
  const heightOf = (i: number) => (i === 0 ? 1 : 2 ** i)

  return (
    <motion.svg
      viewBox={`${-vbW / 2} -150 ${vbW} 300`}
      className="w-[min(94vw,900px)] max-h-[42vh]"
      initial={{ opacity: 0, scale: 0.75 }}
      animate={{ opacity: fading ? 0 : 1, scale: compact ? 0.88 : 1 }}
      transition={{ duration: 0.65, ease: [0.2, 0.8, 0.3, 1] }}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="chainBlockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.24 0.04 285)" />
          <stop offset="100%" stopColor="oklch(0.13 0.03 282)" />
        </linearGradient>
      </defs>

      {/* the whole chain gently floats */}
      <motion.g animate={{ y: [0, -4, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}>
        {/* links between blocks */}
        {blocks.slice(0, -1).map((b, i) => {
          const next = blocks[i + 1]
          return (
            <g key={`link-${i}`}>
              <motion.line
                x1={b.x + blockW / 2 + 4}
                y1={0}
                x2={next.x - blockW / 2 - 4}
                y2={0}
                stroke="oklch(0.62 0.22 295 / 0.55)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray="6 4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.07, duration: 0.26, ease: 'easeOut' }}
              />
              {/* connector pins */}
              <motion.circle
                cx={next.x - blockW / 2 - 4}
                cy={0}
                r={2.5}
                fill="oklch(0.78 0.16 195)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.42 + i * 0.07, type: 'spring', stiffness: 400, damping: 20 }}
              />
            </g>
          )
        })}

        {/* the traveling pulse, energy flowing through the chain */}
        <motion.circle
          r={5}
          cy={0}
          fill="oklch(0.98 0.02 80)"
          style={{ filter: 'drop-shadow(0 0 9px oklch(0.85 0.12 80 / 0.95))' }}
          initial={{ cx: leftX, opacity: 0 }}
          animate={{ cx: [leftX, rightX], opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 2.3,
            repeat: Infinity,
            ease: 'linear',
            repeatDelay: 0.7,
            delay: 1.4,
          }}
        />

        {/* blocks fly out from the center and chain themselves */}
        {blocks.map((b, i) => (
          <motion.g
            key={`block-${i}`}
            initial={{ x: 0, scale: 0.2, opacity: 0 }}
            animate={{ x: b.x, scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.07, type: 'spring', stiffness: 240, damping: 19 }}
            style={{ transformOrigin: '0px 0px' }}
          >
            <rect
              x={-blockW / 2}
              y={-blockW / 2}
              width={blockW}
              height={blockW}
              rx={10}
              fill="url(#chainBlockGrad)"
              stroke={b.genesis ? 'oklch(0.85 0.12 80 / 0.85)' : 'oklch(0.62 0.22 295 / 0.45)'}
              strokeWidth={b.genesis ? 2 : 1.5}
              style={{
                filter: b.genesis
                  ? 'drop-shadow(0 0 16px oklch(0.85 0.12 80 / 0.55))'
                  : 'drop-shadow(0 0 8px oklch(0.62 0.22 295 / 0.3))',
              }}
            />
            {/* seal LED */}
            <motion.circle
              cx={0}
              cy={-blockW / 2 + 9}
              r={2.2}
              fill={b.genesis ? 'oklch(0.9 0.1 80)' : 'oklch(0.78 0.16 195)'}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.22 }}
            />
            {/* cipher hash */}
            <text
              x={0}
              y={5}
              textAnchor="middle"
              fontSize={isMobile ? 10 : 11}
              fontFamily="var(--font-jetbrains)"
              fill={b.genesis ? 'oklch(0.9 0.1 80 / 0.95)' : 'oklch(0.62 0.22 295 / 0.9)'}
            >
              {b.hash}
            </text>
            {/* block height */}
            <text
              x={0}
              y={blockW / 2 - 9}
              textAnchor="middle"
              fontSize={7.5}
              fontFamily="var(--font-jetbrains)"
              fill="oklch(1 0 0 / 0.38)"
              letterSpacing={1}
            >
              {`#${heightOf(i).toLocaleString()}`}
            </text>
          </motion.g>
        ))}

        {/* feature chips bloom from the blocks */}
        {features.map((f, k) => {
          const bIdx = Math.min(f.block, blocks.length - 1)
          const bx = blocks[bIdx].x
          const above = f.above
          const w = f.label.length * 7 + 46
          const h = 34
          const chipY = above ? -96 : 96
          return (
            <motion.g
              key={`feat-${k}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8 + k * 0.1, type: 'spring', stiffness: 300, damping: 17 }}
              style={{ transformOrigin: `${bx}px ${chipY}px` }}
            >
              {/* connector from the chip to its block */}
              <motion.line
                x1={bx}
                y1={above ? -blockW / 2 - 3 : blockW / 2 + 3}
                x2={bx}
                y2={above ? chipY + h / 2 + 2 : chipY - h / 2 - 2}
                stroke={f.color}
                strokeWidth={1.2}
                strokeOpacity={0.55}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.78 + k * 0.1, duration: 0.3 }}
              />
              <circle cx={bx} cy={above ? -blockW / 2 - 3 : blockW / 2 + 3} r={2} fill={f.color} />
              {/* chip body */}
              <rect
                x={bx - w / 2}
                y={chipY - h / 2}
                width={w}
                height={h}
                rx={9}
                fill="oklch(0.17 0.03 285 / 0.92)"
                stroke={f.color}
                strokeOpacity={0.45}
                strokeWidth={1.2}
                style={{ filter: `drop-shadow(0 0 10px ${alpha(f.color, 0.25)})` }}
              />
              {/* glyph badge */}
              <circle cx={bx - w / 2 + 19} cy={chipY} r={9} fill={f.color} fillOpacity={0.14} stroke={f.color} strokeOpacity={0.55} strokeWidth={1} />
              <text
                x={bx - w / 2 + 19}
                y={chipY + 4}
                textAnchor="middle"
                fontSize={11}
                fontFamily="var(--font-jetbrains)"
                fill={f.color}
              >
                {f.glyph}
              </text>
              <text
                x={bx - w / 2 + 35}
                y={chipY + 4}
                fontSize={11.5}
                fontFamily="var(--font-jetbrains)"
                fill="oklch(0.92 0.01 280 / 0.95)"
                letterSpacing={0.4}
              >
                {f.label}
              </text>
            </motion.g>
          )
        })}
      </motion.g>
    </motion.svg>
  )
}
