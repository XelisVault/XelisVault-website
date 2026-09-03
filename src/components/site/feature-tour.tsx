'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { alpha, seededRandom, randomGlyph } from '@/lib/countdown'

/**
 * ═══════════════════════════════════════════════════════════════════
 *  THE PROTOCOL TOUR — the feature showcase inside the chain
 * ═══════════════════════════════════════════════════════════════════
 *
 *  After the blockchain chain assembles (and the camera dives INTO it),
 *  the tour walks through every spectacular module of the protocol,
 *  one cinematic scene each:
 *
 *    01 Vault Engine   gauge sweeping to a 200% collateral ratio
 *    02 VaultSwap      tokens flying along the private swap route
 *    03 Privacy Mixer  deposits enter a storm, leave untraceable
 *    04 Savings        coins stacking, interest accruing per block
 *    05 PSM            the peg needle oscillates, then locks $1.00
 *    06 Oracle         EKG of the median price feed, miners voting
 *    07 Governance     vote bars race, quorum gets stamped
 *    08 Miner          the halving staircase of block emissions
 *    09 VaultChat      encrypted bubbles decoding wallet-to-wallet
 *
 *  Every scene slides in like a keynote slide (blur + drift), has its
 *  own accent color, its own bespoke SVG animation and a progress rail.
 *  In `fast` mode (the late-comer welcome) the whole tour is a speedrun.
 *
 *  Pure SVG + Framer Motion — deterministic, no assets, mobile-safe.
 */

export const TOUR_SCENE_COUNT = 9
// 3000ms per scene — matches the whispered module lines in the soundtrack
// (one module name roughly every 3s from track 60s to 87s)
export const TOUR_SCENE_MS = 3000
export const TOUR_SCENE_MS_FAST = 950
export function tourDurationMs(fast = false): number {
  return TOUR_SCENE_COUNT * (fast ? TOUR_SCENE_MS_FAST : TOUR_SCENE_MS)
}

const C = {
  vault: 'oklch(0.62 0.22 295)',
  cyan: 'oklch(0.78 0.16 195)',
  amber: 'oklch(0.8 0.17 65)',
  emerald: 'oklch(0.72 0.14 160)',
  gold: 'oklch(0.85 0.12 80)',
  teal: 'oklch(0.75 0.12 180)',
  magenta: 'oklch(0.7 0.2 320)',
  amberDeep: 'oklch(0.75 0.15 55)',
  text: 'oklch(0.92 0.01 280)',
  dim: 'oklch(0.6 0.01 280 / 0.55)',
}

interface SceneDef {
  id: string
  kicker: string
  title: string
  tagline: string
  stat: string
  color: string
  glyph: string
}

const SCENES: SceneDef[] = [
  {
    id: 'engine',
    kicker: 'Module 01 · Core',
    title: 'Vault Engine',
    tagline: 'Overcollateralized credit on a confidential ledger',
    stat: 'MIN 1,000 VLT · CR 200% · HALVING EMISSION',
    color: C.vault,
    glyph: '◆',
  },
  {
    id: 'swap',
    kicker: 'Module 02 · Core',
    title: 'VaultSwap',
    tagline: 'Swap XEL, xUSD and VLT without leaking your book',
    stat: 'PRIVATE ROUTES · NO SLIPPAGE LEAKS',
    color: C.cyan,
    glyph: '⇄',
  },
  {
    id: 'mixer',
    kicker: 'Module 03 · Privacy',
    title: 'Privacy Mixer',
    tagline: 'Break the link between what goes in and what comes out',
    stat: 'NOTE + NULLIFIER · SHARED POOL · v2',
    color: C.amber,
    glyph: '⊗',
  },
  {
    id: 'savings',
    kicker: 'Module 04 · Core',
    title: 'Savings',
    tagline: 'Idle xUSD, compounding every single block',
    stat: 'ACCRUED PER BLOCK · CLAIM ANYTIME',
    color: C.emerald,
    glyph: '◎',
  },
  {
    id: 'psm',
    kicker: 'Module 05 · Core',
    title: 'PSM',
    tagline: 'Hard peg: one xUSD, always one dollar',
    stat: 'MINT & REDEEM AT PARITY · 1:1',
    color: C.gold,
    glyph: '≈',
  },
  {
    id: 'oracle',
    kicker: 'Module 06 · Network',
    title: 'Oracle',
    tagline: 'Miners submit prices, the median decides truth',
    stat: 'MEDIAN OF STAKED SUBMISSIONS',
    color: C.teal,
    glyph: 'Ω',
  },
  {
    id: 'governance',
    kicker: 'Module 07 · Network',
    title: 'Governance',
    tagline: 'VLT stakers steer every parameter of the protocol',
    stat: '1 STAKED VLT = 1 VOTE · TIME BOOST',
    color: C.magenta,
    glyph: 'λ',
  },
  {
    id: 'miner',
    kicker: 'Module 08 · Network',
    title: 'Miner',
    tagline: 'Point hashrate at the vault, get paid in VLT',
    stat: '0.43593 VLT / BLOCK · HALVING EVERY 6,307,200 BLOCKS',
    color: C.amberDeep,
    glyph: '∆',
  },
  {
    id: 'chat',
    kicker: 'Module 09 · Privacy',
    title: 'VaultChat',
    tagline: 'Wallet-to-wallet messages, encrypted end to end',
    stat: 'RELAYED ON-CHAIN · E2E ENCRYPTED',
    color: C.vault,
    glyph: 'Ψ',
  },
]

// ─────────────────────────────────────────────────────────────────
//  Small shared helpers
// ─────────────────────────────────────────────────────────────────

function TourCountUp({
  to,
  decimals = 0,
  duration = 1.1,
  delay = 0,
  prefix = '',
  suffix = '',
}: {
  to: number
  decimals?: number
  duration?: number
  delay?: number
  prefix?: string
  suffix?: string
}) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    let start: number | null = null
    const to_ = setTimeout(() => {
      const step = (ts: number) => {
        if (start === null) start = ts
        const p = Math.min(1, (ts - start) / (duration * 1000))
        setV(to * (1 - Math.pow(1 - p, 3)))
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, delay)
    return () => {
      clearTimeout(to_)
      cancelAnimationFrame(raf)
    }
  }, [to, duration, delay])
  return (
    <span className="tabular-nums">
      {prefix}
      {v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  )
}

/** one-shot decode: cipher glyphs resolve into the final text */
function useDecode(text: string, ms = 50, startDelay = 0): string {
  const [out, setOut] = useState(text.replace(/[^\s]/g, '·'))
  useEffect(() => {
    let resolved = 0
    let iv: ReturnType<typeof setInterval> | undefined
    const to = setTimeout(() => {
      setOut(text.replace(/[^\s]/g, '·'))
      iv = setInterval(() => {
        resolved++
        setOut(
          text
            .split('')
            .map((ch, i) => (i < resolved ? ch : ch === ' ' ? ' ' : randomGlyph()))
            .join('')
        )
        if (resolved >= text.length && iv) clearInterval(iv)
      }, ms)
    }, startDelay)
    return () => {
      clearTimeout(to)
      if (iv) clearInterval(iv)
    }
  }, [text, ms, startDelay])
  return out
}

/** live cycling digits — "#"" placeholders keep randomizing forever */
function useLiveDigits(pattern: string, ms = 140): string {
  const [out, setOut] = useState(pattern.replace(/#/g, '0'))
  useEffect(() => {
    const t = setInterval(() => {
      setOut(pattern.replace(/#/g, () => String(Math.floor(Math.random() * 10))))
    }, ms)
    return () => clearInterval(t)
  }, [pattern, ms])
  return out
}

const pad2 = (n: number) => String(n).padStart(2, '0')

// ─────────────────────────────────────────────────────────────────
//  SCENE 01 · VAULT ENGINE — the collateral gauge
// ─────────────────────────────────────────────────────────────────
function GaugeScene({ color }: { color: string }) {
  const R = 84
  const A0 = 150 // SVG degrees, gauge sweeps 240° clockwise over the top
  const SWEEP = 240
  const pol = (deg: number, r = R) => ({
    x: +(Math.cos((deg * Math.PI) / 180) * r).toFixed(1),
    y: +(Math.sin((deg * Math.PI) / 180) * r).toFixed(1),
  })
  const p0 = pol(A0)
  const p1 = pol(A0 + SWEEP)
  const track = `M ${p0.x} ${p0.y} A ${R} ${R} 0 1 1 ${p1.x} ${p1.y}`
  // value = 200% of a 250% max → fraction 0.8
  const end = pol(A0 + SWEEP * 0.8)
  const valueArc = `M ${p0.x} ${p0.y} A ${R} ${R} 0 1 1 ${end.x} ${end.y}`
  const needleAngle = A0 + SWEEP * 0.8

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="-130 -130 260 200" className="w-[min(72vw,340px)] max-h-full" style={{ overflow: 'visible' }}>
        {/* outer bolts */}
        {Array.from({ length: 10 }, (_, i) => {
          const a = ((i / 10) * Math.PI * 2 - Math.PI / 2) as number
          return (
            <motion.circle
              key={i}
              cx={Math.cos(a) * (R + 20)}
              cy={Math.sin(a) * (R + 20)}
              r={2.6}
              fill={`${alpha(color, 0.5)}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.05, type: 'spring', stiffness: 400, damping: 18 }}
              style={{ transformOrigin: `${Math.cos(a) * (R + 20)}px ${Math.sin(a) * (R + 20)}px` }}
            />
          )
        })}
        {/* track */}
        <path d={track} fill="none" stroke="oklch(1 0 0 / 0.09)" strokeWidth={10} strokeLinecap="round" />
        {/* value arc */}
        <motion.path
          d={valueArc}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.2, 0.8, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 8px ${alpha(color, 0.7)})` }}
        />
        {/* ticks */}
        {Array.from({ length: 11 }, (_, k) => {
          const ang = A0 + (SWEEP * k) / 10
          const a = pol(ang, R - 12)
          const b = pol(ang, R - 4)
          const major = k % 5 === 0
          return (
            <motion.line
              key={k}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={major ? 'oklch(0.92 0.01 280 / 0.55)' : 'oklch(0.92 0.01 280 / 0.25)'}
              strokeWidth={major ? 2 : 1}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 + k * 0.04 }}
            />
          )
        })}
        {/* 0 / MAX labels */}
        <text x={p0.x - 6} y={p0.y + 16} textAnchor="middle" fontSize={8} fontFamily="var(--font-jetbrains)" fill={C.dim}>
          0
        </text>
        <text x={p1.x + 6} y={p1.y + 16} textAnchor="middle" fontSize={8} fontFamily="var(--font-jetbrains)" fill={C.dim}>
          250%
        </text>
        {/* needle */}
        <motion.g
          initial={{ rotate: A0 }}
          animate={{ rotate: needleAngle }}
          transition={{ delay: 0.15, duration: 1.05, ease: [0.3, 0.9, 0.3, 1.2] }}
          style={{ transformOrigin: '0px 0px' }}
        >
          <line x1={0} y1={0} x2={R - 26} y2={0} stroke={C.text} strokeWidth={3} strokeLinecap="round" />
          <circle cx={R - 26} cy={0} r={3.5} fill={C.text} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        </motion.g>
        <circle r={9} fill="oklch(0.14 0.03 285)" stroke={`${alpha(color, 0.7)}`} strokeWidth={2} />
        {/* readout */}
        <text x={0} y={-28} textAnchor="middle" fontSize={34} fontFamily="var(--font-display)" fontWeight={700} fill={C.text}>
          <TourCountUp to={200} duration={1.15} suffix="%" />
        </text>
        <text x={0} y={-12} textAnchor="middle" fontSize={7.5} letterSpacing={2.5} fontFamily="var(--font-jetbrains)" fill={C.dim}>
          COLLATERAL RATIO
        </text>
        {/* safe LED */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.15 }}>
          <rect x={-34} y={16} width={68} height={17} rx={8.5} fill={`${alpha(C.emerald, 0.12)}`} stroke={`${alpha(C.emerald, 0.5)}`} strokeWidth={1} />
          <circle cx={-22} cy={24.5} r={2.5} fill={C.emerald} className="animate-pulse" />
          <text x={2} y={27.5} textAnchor="middle" fontSize={7.5} letterSpacing={1.5} fontFamily="var(--font-jetbrains)" fill={C.emerald}>
            SAFE
          </text>
        </motion.g>
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
//  SCENE 02 · VAULTSWAP — tokens on the private route
// ─────────────────────────────────────────────────────────────────
function SwapScene({ color }: { color: string }) {
  const rate = useDecode('1 XEL = 2.381 xUSD', 42, 350)
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="-170 -112 340 228" className="w-[min(80vw,400px)] max-h-full" style={{ overflow: 'visible' }}>
        <defs>
          <path id="xv-swap-arc" d="M -92 36 Q 0 -92 92 36" fill="none" />
        </defs>
        {/* route */}
        <motion.path
          d="M -92 36 Q 0 -92 92 36"
          fill="none"
          stroke={`${alpha(color, 0.65)}`}
          strokeWidth={2}
          strokeDasharray="7 5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
        {/* privacy veil under the route */}
        <motion.path
          d="M -92 36 Q 0 -92 92 36"
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.08 }}
          animate={{ pathLength: 1, opacity: 0.08 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
        {/* traveling bubble (native SMIL, loops forever) */}
        <circle r={8} fill={color} style={{ filter: `drop-shadow(0 0 10px ${color})` }} opacity={0.95}>
          <animateMotion dur="1.5s" repeatCount="indefinite" rotate="auto">
            <mpath href="#xv-swap-arc" />
          </animateMotion>
        </circle>
        <circle r={3.4} fill="oklch(0.98 0.005 280)">
          <animateMotion dur="1.5s" repeatCount="indefinite" begin="0.12s">
            <mpath href="#xv-swap-arc" />
          </animateMotion>
        </circle>
        {/* XEL coin (left) */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          style={{ transformOrigin: '-92px 36px' }}
        >
          <motion.circle
            cx={-92}
            cy={36}
            r={27}
            fill="oklch(0.16 0.03 285)"
            stroke="oklch(0.62 0.22 295 / 0.75)"
            strokeWidth={2}
            animate={{ boxShadow: [] }}
            style={{ filter: 'drop-shadow(0 0 10px oklch(0.62 0.22 295 / 0.45))' }}
          />
          <circle cx={-92} cy={36} r={20} fill="none" stroke="oklch(0.62 0.22 295 / 0.3)" strokeWidth={1} strokeDasharray="2 3" />
          <text x={-92} y={42} textAnchor="middle" fontSize={19} fontWeight={700} fontFamily="var(--font-jetbrains)" fill={C.text}>
            X
          </text>
          <text x={-92} y={74} textAnchor="middle" fontSize={8} letterSpacing={2} fontFamily="var(--font-jetbrains)" fill={C.dim}>
            XEL
          </text>
        </motion.g>
        {/* xUSD coin (right) */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.12, type: 'spring', stiffness: 260, damping: 16 }}
          style={{ transformOrigin: '92px 36px' }}
        >
          <circle cx={92} cy={36} r={27} fill="oklch(0.16 0.03 285)" stroke={`${alpha(color, 0.8)}`} strokeWidth={2} style={{ filter: `drop-shadow(0 0 10px ${alpha(color, 0.5)})` }} />
          <circle cx={92} cy={36} r={20} fill="none" stroke={`${alpha(color, 0.35)}`} strokeWidth={1} strokeDasharray="2 3" />
          <text x={92} y={43} textAnchor="middle" fontSize={21} fontWeight={700} fontFamily="var(--font-jetbrains)" fill={C.text}>
            $
          </text>
          <text x={92} y={74} textAnchor="middle" fontSize={8} letterSpacing={2} fontFamily="var(--font-jetbrains)" fill={C.dim}>
            xUSD
          </text>
        </motion.g>
        {/* rate readout */}
        <motion.text
          x={0}
          y={-72}
          textAnchor="middle"
          fontSize={13}
          fontFamily="var(--font-jetbrains)"
          fill={C.text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {rate}
        </motion.text>
        {/* route label */}
        <motion.text
          x={0}
          y={-56}
          textAnchor="middle"
          fontSize={7.5}
          letterSpacing={3}
          fontFamily="var(--font-jetbrains)"
          fill={`${alpha(color, 0.75)}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          CONFIDENTIAL ROUTE
        </motion.text>
        {/* slippage hush bar */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <rect x={-72} y={92} width={144} height={16} rx={8} fill="oklch(1 0 0 / 0.04)" stroke="oklch(1 0 0 / 0.08)" />
          <motion.rect
            x={-72}
            y={92}
            height={16}
            rx={8}
            width={144}
            fill={`${alpha(C.emerald, 0.25)}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.7, duration: 0.6, ease: 'easeOut' }}
            style={{ transformOrigin: '-72px 100px' }}
          />
          <text x={0} y={103} textAnchor="middle" fontSize={7.5} letterSpacing={2} fontFamily="var(--font-jetbrains)" fill={C.emerald}>
            PRICE IMPACT · HIDDEN
          </text>
        </motion.g>
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
//  SCENE 03 · PRIVACY MIXER — the storm that forgets
// ─────────────────────────────────────────────────────────────────
function MixerScene({ color }: { color: string }) {
  const { drops, orbiters } = useMemo(() => {
    const rnd = seededRandom(4242)
    const inColors = [C.amber, C.cyan, C.vault]
    const drops = Array.from({ length: 12 }, (_, i) => {
      const lane = i % 3
      const outLane = (lane + 1 + Math.floor(rnd() * 2)) % 3 // never the same lane
      const yIn = -44 + lane * 44
      const yOut = -44 + outLane * 44
      return {
        id: i,
        color: inColors[lane],
        yIn,
        yOut,
        yMid: yIn + (rnd() - 0.5) * 90,
        yMid2: yOut + (rnd() - 0.5) * 90,
        dur: 2 + rnd() * 0.8,
        delay: rnd() * 1.6,
        size: 4.5 + rnd() * 3,
      }
    })
    const orbiters = Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2
      return { id: i, x: Math.cos(a) * 30, y: Math.sin(a) * 22, r: 2 + (i % 3) }
    })
    return { drops, orbiters }
  }, [])
  const anon = useDecode('ANONYMITY SET · 512 NOTES', 40, 700)

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="-170 -95 340 190" className="w-[min(84vw,420px)] max-h-full" style={{ overflow: 'visible' }}>
        {/* input streams */}
        {[-44, 0, 44].map((y) => (
          <motion.line
            key={`in-${y}`}
            x1={-168}
            y1={y}
            x2={-58}
            y2={y}
            stroke={`${alpha(color, 0.25)}`}
            strokeWidth={1}
            strokeDasharray="3 6"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5 }}
          />
        ))}
        {[-44, 0, 44].map((y) => (
          <motion.line
            key={`out-${y}`}
            x1={58}
            y1={y}
            x2={168}
            y2={y}
            stroke={`${alpha(color, 0.25)}`}
            strokeWidth={1}
            strokeDasharray="3 6"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          />
        ))}

        {/* the chamber */}
        <motion.g
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16 }}
          style={{ transformOrigin: '0px 0px' }}
        >
          <ellipse cx={0} cy={-52} rx={56} ry={13} fill="oklch(0.13 0.03 282)" stroke={`${alpha(color, 0.6)}`} strokeWidth={1.6} />
          <ellipse cx={0} cy={52} rx={56} ry={13} fill="oklch(0.1 0.025 282)" stroke={`${alpha(color, 0.6)}`} strokeWidth={1.6} />
          <line x1={-56} y1={-52} x2={-56} y2={52} stroke={`${alpha(color, 0.35)}`} strokeWidth={1} strokeDasharray="4 4" />
          <line x1={56} y1={-52} x2={56} y2={52} stroke={`${alpha(color, 0.35)}`} strokeWidth={1} strokeDasharray="4 4" />
          {/* storm inside */}
          <motion.g animate={{ rotate: 360 }} transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '0px 0px' }}>
            {orbiters.map((o) => (
              <circle key={o.id} cx={o.x} cy={o.y} r={o.r} fill={`${alpha(color, 0.8)}`} />
            ))}
          </motion.g>
          <motion.g animate={{ rotate: -360 }} transition={{ duration: 3.4, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '0px 0px' }}>
            {orbiters.slice(0, 4).map((o, i) => (
              <circle key={i} cx={-o.x} cy={-o.y + 12} r={o.r * 0.8} fill={`${alpha(C.cyan, 0.55)}`} />
            ))}
          </motion.g>
          {/* glyph rain inside */}
          {['Φ', '⊗', 'λ', 'Ω'].map((g, i) => (
            <motion.text
              key={g}
              x={-36 + i * 24}
              fontSize={9}
              fontFamily="var(--font-jetbrains)"
              fill={`${alpha(color, 0.5)}`}
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: [null, 40], opacity: [0, 0.8, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.28 }}
            >
              {g}
            </motion.text>
          ))}
        </motion.g>

        {/* the deposits, enter, swirl, exit elsewhere */}
        {drops.map((p) => (
          <motion.circle
            key={p.id}
            r={p.size}
            fill={p.color}
            style={{ filter: `drop-shadow(0 0 6px ${p.color})` }}
            initial={{ x: -168, y: p.yIn, opacity: 0 }}
            animate={{
              x: [-168, -60, 0, 60, 168],
              y: [p.yIn, p.yIn, p.yMid, p.yMid2, p.yOut],
              opacity: [0, 1, 1, 1, 0],
            }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* labels */}
        <text x={-140} y={-78} textAnchor="middle" fontSize={7.5} letterSpacing={2.5} fontFamily="var(--font-jetbrains)" fill={C.dim}>
          DEPOSITS
        </text>
        <text x={140} y={-78} textAnchor="middle" fontSize={7.5} letterSpacing={2.5} fontFamily="var(--font-jetbrains)" fill={C.dim}>
          WITHDRAWALS
        </text>
        <motion.text
          x={0}
          y={86}
          textAnchor="middle"
          fontSize={9.5}
          letterSpacing={2}
          fontFamily="var(--font-jetbrains)"
          fill={`${alpha(color, 0.9)}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {anon}
        </motion.text>
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
//  SCENE 04 · SAVINGS — coins stacking, interest accruing
// ─────────────────────────────────────────────────────────────────
function SavingsScene({ color }: { color: string }) {
  const [accrued, setAccrued] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setAccrued((v) => v + 0.0037), 120)
    return () => clearInterval(t)
  }, [])
  const coins = [0, 1, 2, 3, 4, 5]
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="-130 -110 260 210" className="w-[min(64vw,310px)] max-h-full" style={{ overflow: 'visible' }}>
        {/* growth curve behind */}
        <motion.path
          d="M -100 70 C -30 66, 20 30, 78 -58"
          fill="none"
          stroke={`${alpha(color, 0.35)}`}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.3, ease: 'easeOut' }}
        />
        {/* base plate */}
        <motion.rect
          x={-62}
          y={78}
          width={124}
          height={7}
          rx={3.5}
          fill="oklch(0.2 0.03 285)"
          stroke={`${alpha(color, 0.4)}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4 }}
          style={{ transformOrigin: '0px 81px' }}
        />
        {/* the stacking coins */}
        {coins.map((i) => (
          <motion.g
            key={i}
            initial={{ y: -105, opacity: 0, rotate: (i % 2 ? 8 : -8) }}
            animate={{ y: 62 - i * 17, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.15 + i * 0.16, type: 'spring', stiffness: 320, damping: 15 }}
          >
            <ellipse cx={0} cy={62 - i * 17} rx={30} ry={9} fill="oklch(0.17 0.04 285)" stroke={`${alpha(color, 0.75)}`} strokeWidth={1.6} />
            <ellipse cx={0} cy={62 - i * 17 - 3.5} rx={30} ry={9} fill="oklch(0.22 0.05 285)" stroke={`${alpha(color, 0.45)}`} strokeWidth={1} />
            <text x={0} y={62 - i * 17 - 1} textAnchor="middle" fontSize={8.5} fontFamily="var(--font-jetbrains)" fill={`${alpha(color, 0.95)}`}>
              xUSD
            </text>
          </motion.g>
        ))}
        {/* spark when a coin lands */}
        {[2, 4].map((i) => (
          <motion.g key={`spark-${i}`} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ delay: 0.15 + i * 0.16 + 0.22, duration: 0.35 }}>
            <circle cx={34} cy={62 - i * 17} r={2} fill={C.gold} />
            <circle cx={-36} cy={62 - i * 17} r={1.6} fill={C.gold} />
          </motion.g>
        ))}
        {/* accrued readout */}
        <motion.g initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <rect x={-88} y={-104} width={176} height={26} rx={13} fill="oklch(0.14 0.03 285 / 0.9)" stroke={`${alpha(color, 0.45)}`} />
          <text x={0} y={-87} textAnchor="middle" fontSize={10} fontFamily="var(--font-jetbrains)" fill={C.text}>
            +{accrued.toFixed(4)} xUSD
          </text>
          <text x={104} y={-87} textAnchor="end" fontSize={7} letterSpacing={1.5} fontFamily="var(--font-jetbrains)" fill={`${alpha(color, 0.8)}`}>
            LIVE
          </text>
        </motion.g>
        <text x={0} y={100} textAnchor="middle" fontSize={7.5} letterSpacing={2.5} fontFamily="var(--font-jetbrains)" fill={C.dim}>
          EVERY BLOCK · FOREVER
        </text>
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
//  SCENE 05 · PSM — the peg locks at one dollar
// ─────────────────────────────────────────────────────────────────
function PegScene({ color }: { color: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="-150 -100 300 190" className="w-[min(78vw,380px)] max-h-full" style={{ overflow: 'visible' }}>
        {/* big parity readout */}
        <motion.text
          x={0}
          y={-56}
          textAnchor="middle"
          fontSize={40}
          fontWeight={700}
          fontFamily="var(--font-display)"
          fill={C.text}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55, type: 'spring', stiffness: 200, damping: 14 }}
          style={{ filter: `drop-shadow(0 0 14px ${alpha(color, 0.5)})` }}
        >
          $1.00
        </motion.text>

        {/* meter track */}
        <motion.line
          x1={-120}
          y1={30}
          x2={120}
          y2={30}
          stroke="oklch(1 0 0 / 0.12)"
          strokeWidth={3}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        />
        {/* zone ticks: 0.97 → 1.03 */}
        {[-120, -80, -40, 0, 40, 80, 120].map((x, i) => (
          <motion.line
            key={x}
            x1={x}
            y1={24}
            x2={x}
            y2={36}
            stroke={x === 0 ? `${alpha(color, 0.9)}` : 'oklch(1 0 0 / 0.2)'}
            strokeWidth={x === 0 ? 2 : 1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.05 }}
          />
        ))}
        {[
          [-120, '$0.97'],
          [0, '$1.00'],
          [120, '$1.03'],
        ].map(([x, label]) => (
          <text
            key={label as string}
            x={x as number}
            y={52}
            textAnchor="middle"
            fontSize={7.5}
            fontFamily="var(--font-jetbrains)"
            fill={C.dim}
          >
            {label}
          </text>
        ))}
        {/* center diamond */}
        <motion.path
          d="M 0 16 L 6 23 L 0 30 L -6 23 Z"
          fill={color}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.55, type: 'spring', stiffness: 300, damping: 15 }}
          style={{ transformOrigin: '0px 23px', filter: `drop-shadow(0 0 8px ${color})` }}
        />

        {/* the needle, oscillates, then locks dead center */}
        <motion.g
          initial={{ x: -34 }}
          animate={{ x: [-34, 26, -16, 9, -4, 0] }}
          transition={{ duration: 1.0, ease: 'easeInOut', times: [0, 0.22, 0.45, 0.66, 0.84, 1] }}
        >
          <line x1={0} y1={14} x2={0} y2={30} stroke={C.text} strokeWidth={3} strokeLinecap="round" />
          <circle cx={0} cy={14} r={2.4} fill={C.text} />
        </motion.g>
        {/* lock ping */}
        <motion.circle
          cx={0}
          cy={30}
          r={6}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 3.4], opacity: [0, 0.9, 0] }}
          transition={{ delay: 1.02, duration: 0.55, ease: 'easeOut' }}
        />

        {/* mint / redeem flows */}
        <motion.g initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
          <rect x={-148} y={-12} width={86} height={30} rx={15} fill="oklch(0.15 0.03 285)" stroke={`${alpha(C.cyan, 0.5)}`} />
          <text x={-105} y={2} textAnchor="middle" fontSize={8.5} fontFamily="var(--font-jetbrains)" fill={C.text}>
            MINT
          </text>
          <text x={-105} y={12} textAnchor="middle" fontSize={6.5} fontFamily="var(--font-jetbrains)" fill={C.dim}>
            1 XEL → 1 xUSD
          </text>
          <motion.path d="M -58 3 L -18 3" stroke={C.cyan} strokeWidth={1.5} markerEnd="" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.35 }} />
          <motion.polygon points="-18,3 -26,-1.5 -26,7.5" fill={C.cyan} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} />
        </motion.g>
        <motion.g initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
          <rect x={62} y={-12} width={86} height={30} rx={15} fill="oklch(0.15 0.03 285)" stroke={`${alpha(C.magenta, 0.5)}`} />
          <text x={105} y={2} textAnchor="middle" fontSize={8.5} fontFamily="var(--font-jetbrains)" fill={C.text}>
            REDEEM
          </text>
          <text x={105} y={12} textAnchor="middle" fontSize={6.5} fontFamily="var(--font-jetbrains)" fill={C.dim}>
            1 xUSD → 1 XEL
          </text>
          <motion.path d="M 58 3 L 18 3" stroke={C.magenta} strokeWidth={1.5} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6, duration: 0.35 }} />
          <motion.polygon points="18,3 26,-1.5 26,7.5" fill={C.magenta} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} />
        </motion.g>

        <motion.text
          x={0}
          y={82}
          textAnchor="middle"
          fontSize={7}
          letterSpacing={2.5}
          fontFamily="var(--font-jetbrains)"
          fill={`${alpha(color, 0.85)}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.15 }}
        >
          PEG LOCKED · PARITY GUARANTEED BY ARBITRAGE
        </motion.text>
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
//  SCENE 06 · ORACLE — the heartbeat of the price feed
// ─────────────────────────────────────────────────────────────────
function OracleScene({ color }: { color: string }) {
  const price = useLiveDigits('$0.4###', 160)
  const miners = useMemo(
    () => [
      { label: 'MINER 7F', val: '$0.4###', median: false },
      { label: 'MINER A2', val: '$0.4###', median: true },
      { label: 'MINER C9', val: '$0.4###', median: false },
    ],
    []
  )
  // EKG path across the viewBox
  const ekg =
    'M -150 20 L -118 20 L -108 20 L -100 -34 L -90 58 L -80 20 L -52 20 L -40 14 L -28 26 L -16 20 L 6 20 L 16 20 L 24 -20 L 34 48 L 44 20 L 74 20 L 86 15 L 98 24 L 110 20 L 150 20'
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="-160 -95 320 195" className="w-[min(86vw,430px)] max-h-full" style={{ overflow: 'visible' }}>
        <defs>
          <path id="xv-ekg" d={ekg} fill="none" />
        </defs>
        {/* grid dots */}
        {Array.from({ length: 14 }, (_, i) => (
          <motion.circle
            key={i}
            cx={-150 + i * 23}
            cy={20}
            r={0.8}
            fill="oklch(1 0 0 / 0.12)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
          />
        ))}
        {/* the EKG line */}
        <motion.path
          d={ekg}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.15, ease: 'easeInOut' }}
          style={{ filter: `drop-shadow(0 0 7px ${alpha(color, 0.65)})` }}
        />
        {/* heartbeat dot traveling the line */}
        <circle r={4.5} fill="oklch(0.98 0.005 280)" style={{ filter: `drop-shadow(0 0 9px ${color})` }}>
          <animateMotion dur="1.6s" repeatCount="indefinite">
            <mpath href="#xv-ekg" />
          </animateMotion>
        </circle>

        {/* price readout */}
        <motion.g initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <rect x={-74} y={-92} width={148} height={34} rx={17} fill="oklch(0.14 0.03 285 / 0.92)" stroke={`${alpha(color, 0.5)}`} />
          <motion.circle cx={-56} cy={-75} r={3.5} fill={C.emerald} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
          <text x={-40} y={-70} fontSize={9} fontFamily="var(--font-jetbrains)" fill={C.dim}>
            XEL / USD
          </text>
          <text x={62} y={-70} textAnchor="end" fontSize={14} fontWeight={700} fontFamily="var(--font-jetbrains)" fill={C.text}>
            {price}
          </text>
        </motion.g>

        {/* miner submissions → median */}
        {miners.map((m, i) => (
          <motion.g
            key={m.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.14, type: 'spring', stiffness: 260, damping: 18 }}
          >
            <rect
              x={-128 + i * 88}
              y={54}
              width={80}
              height={30}
              rx={15}
              fill={m.median ? `${alpha(color, 0.14)}` : 'oklch(0.15 0.03 285)'}
              stroke={m.median ? `${alpha(color, 0.85)}` : 'oklch(1 0 0 / 0.12)'}
              strokeWidth={m.median ? 1.6 : 1}
            />
            <text x={-88 + i * 88} y={66} textAnchor="middle" fontSize={7} letterSpacing={1} fontFamily="var(--font-jetbrains)" fill={m.median ? `${alpha(color, 0.95)}` : C.dim}>
              {m.label}
            </text>
            <text x={-88 + i * 88} y={77} textAnchor="middle" fontSize={8.5} fontFamily="var(--font-jetbrains)" fill={C.text}>
              {m.val.replace(/#/g, String(2 + i))}
            </text>
            {m.median && (
              <motion.g initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 1.25, type: 'spring', stiffness: 380, damping: 13 }}>
                <rect x={38} y={48} width={44} height={13} rx={6.5} fill={color} />
                <text x={60} y={57.5} textAnchor="middle" fontSize={7} letterSpacing={1} fontFamily="var(--font-jetbrains)" fill="oklch(0.12 0.02 285)">
                  MEDIAN
                </text>
              </motion.g>
            )}
          </motion.g>
        ))}
        {/* connectors miners → line */}
        {[-88, 0, 88].map((x, i) => (
          <motion.line
            key={`conn-${i}`}
            x1={x}
            y1={54}
            x2={x * 0.6}
            y2={30}
            stroke={`${alpha(color, 0.3)}`}
            strokeWidth={1}
            strokeDasharray="2 3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1 + i * 0.12, duration: 0.3 }}
          />
        ))}
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
//  SCENE 07 · GOVERNANCE — the vote race
// ─────────────────────────────────────────────────────────────────
function GovScene({ color }: { color: string }) {
  const votes = [
    { label: 'FOR', pct: 72, color },
    { label: 'AGAINST', pct: 21, color: 'oklch(0.66 0.19 25)' },
    { label: 'ABSTAIN', pct: 7, color: 'oklch(0.65 0.01 280)' },
  ]
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="-140 -95 280 200" className="w-[min(72vw,350px)] max-h-full" style={{ overflow: 'visible' }}>
        {/* baseline */}
        <motion.line
          x1={-110}
          y1={70}
          x2={110}
          y2={70}
          stroke="oklch(1 0 0 / 0.14)"
          strokeWidth={1.5}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4 }}
        />
        {/* quorum line */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <motion.line
            x1={-110}
            y1={70 - 110 * 0.3}
            x2={110}
            y2={70 - 110 * 0.3}
            stroke={C.gold}
            strokeWidth={1}
            strokeDasharray="5 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          />
          <text x={114} y={70 - 110 * 0.3 + 3} fontSize={6.5} letterSpacing={1} fontFamily="var(--font-jetbrains)" fill={`${alpha(C.gold, 0.85)}`}>
            QUORUM
          </text>
        </motion.g>
        {/* the bars */}
        {votes.map((v, i) => {
          const x = -90 + i * 90
          const h = 110 * (v.pct / 100)
          return (
            <g key={v.label}>
              <motion.rect
                x={x}
                y={70}
                width={54}
                height={0}
                rx={4}
                fill={`${alpha(v.color, 0.22)}`}
                stroke={`${alpha(v.color, 0.7)}`}
                strokeWidth={1.4}
                initial={{ height: 0, y: 70 }}
                animate={{ height: h, y: 70 - h }}
                transition={{ delay: 0.15 + i * 0.12, duration: 0.6, ease: [0.2, 0.9, 0.3, 1.1] }}
                style={{ filter: `drop-shadow(0 0 8px ${alpha(v.color, 0.25)})` }}
              />
              {/* bar sheen */}
              <motion.rect
                x={x + 4}
                width={6}
                height={0}
                rx={3}
                fill={`${alpha(v.color, 0.5)}`}
                initial={{ height: 0, y: 70 }}
                animate={{ height: Math.max(0, h - 8), y: 70 - h + 4 }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.6, ease: [0.2, 0.9, 0.3, 1.1] }}
              />
              <motion.text
                x={x + 27}
                y={70 - h - 20}
                textAnchor="middle"
                fontSize={17}
                fontWeight={700}
                fontFamily="var(--font-display)"
                fill={v.color}
                initial={{ opacity: 0, y: 70 - h - 8 }}
                animate={{ opacity: 1, y: 70 - h - 20 }}
                transition={{ delay: 0.55 + i * 0.12, type: 'spring', stiffness: 220, damping: 16 }}
              >
                {v.pct}%
              </motion.text>
              <text x={x + 27} y={88} textAnchor="middle" fontSize={8} letterSpacing={1.5} fontFamily="var(--font-jetbrains)" fill={C.dim}>
                {v.label}
              </text>
            </g>
          )
        })}
        {/* quorum stamp */}
        <motion.g
          initial={{ scale: 2.6, opacity: 0, rotate: -18 }}
          animate={{ scale: 1, opacity: 1, rotate: -8 }}
          transition={{ delay: 0.95, type: 'spring', stiffness: 420, damping: 16 }}
          style={{ transformOrigin: '0px -34px' }}
        >
          <rect x={-56} y={-52} width={112} height={26} rx={6} fill="none" stroke={C.gold} strokeWidth={2} strokeDasharray="4 3" />
          <text x={0} y={-34} textAnchor="middle" fontSize={10} letterSpacing={2.5} fontFamily="var(--font-jetbrains)" fontWeight={700} fill={C.gold}>
            QUORUM ✓
          </text>
        </motion.g>
        {/* stake chips */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}>
          {['2.1M VLT', '612K VLT', '204K VLT'].map((s, i) => (
            <text key={s} x={-90 + i * 90 + 27} y={100} textAnchor="middle" fontSize={7} fontFamily="var(--font-jetbrains)" fill={C.dim}>
              {s}
            </text>
          ))}
        </motion.g>
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
//  SCENE 08 · MINER — the halving staircase
// ─────────────────────────────────────────────────────────────────
function MinerScene({ color }: { color: string }) {
  const years = [
    { label: 'Y1', v: 0.43593, h: 92 },
    { label: 'Y2', v: 0.21797, h: 46 },
    { label: 'Y3', v: 0.10898, h: 23 },
    { label: 'Y4', v: 0.05449, h: 12 },
  ]
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="-150 -100 300 205" className="w-[min(78vw,380px)] max-h-full" style={{ overflow: 'visible' }}>
        {/* emission readout */}
        <motion.g initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <rect x={-92} y={-96} width={184} height={30} rx={15} fill="oklch(0.14 0.03 285 / 0.92)" stroke={`${alpha(color, 0.5)}`} />
          <motion.circle cx={-74} cy={-81} r={3.5} fill={C.emerald} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
          <text x={-58} y={-76} fontSize={9} fontFamily="var(--font-jetbrains)" fill={C.dim}>
            EMISSION
          </text>
          <text x={80} y={-76} textAnchor="end" fontSize={13} fontWeight={700} fontFamily="var(--font-jetbrains)" fill={C.text}>
            0.43593 <tspan fontSize={8} fill={C.dim}>VLT/BLK</tspan>
          </text>
        </motion.g>

        {/* the staircase */}
        {years.map((y, i) => {
          const x = -108 + i * 62
          return (
            <g key={y.label}>
              <motion.rect
                x={x}
                y={66}
                width={48}
                height={0}
                rx={5}
                fill={`${alpha(color, i === 0 ? 0.3 : 0.16)}`}
                stroke={`${alpha(color, 0.7)}`}
                strokeWidth={1.4}
                initial={{ height: 0, y: 66 }}
                animate={{ height: y.h, y: 66 - y.h }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.55, ease: [0.2, 0.9, 0.3, 1.05] }}
                style={{ filter: `drop-shadow(0 0 8px ${alpha(color, 0.22)})` }}
              />
              <motion.text
                x={x + 24}
                y={66 - y.h - 8}
                textAnchor="middle"
                fontSize={9.5}
                fontFamily="var(--font-jetbrains)"
                fill={C.text}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.12 }}
              >
                {y.v.toFixed(5)}
              </motion.text>
              <text x={x + 24} y={82} textAnchor="middle" fontSize={8} letterSpacing={1} fontFamily="var(--font-jetbrains)" fill={C.dim}>
                {y.label}
              </text>
            </g>
          )
        })}
        {/* halving slashes between steps */}
        {[0, 1, 2].map((i) => (
          <motion.g key={`sl-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 + i * 0.16 }}>
            <line x1={-60 + i * 62} y1={66 - years[i].h - 14} x2={-60 + i * 62 + 14} y2={66 - years[i].h - 24} stroke={C.gold} strokeWidth={2} strokeLinecap="round" />
          </motion.g>
        ))}
        {/* baseline */}
        <motion.line x1={-120} y1={66} x2={120} y2={66} stroke="oklch(1 0 0 / 0.14)" strokeWidth={1.5} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }} />

        {/* hashrate equalizer */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          {Array.from({ length: 16 }, (_, i) => (
            <motion.rect
              key={i}
              x={-112 + i * 15}
              y={-14}
              width={5}
              height={10}
              rx={2.5}
              fill={`${alpha(color, 0.55)}`}
              animate={{ height: [4 + ((i * 7) % 17), 8 + ((i * 13) % 22), 4 + ((i * 7) % 17)], y: [-14 - (4 + ((i * 7) % 17)) / 2, -14 - (8 + ((i * 13) % 22)) / 2, -14 - (4 + ((i * 7) % 17)) / 2] }}
              transition={{ duration: 0.7 + (i % 4) * 0.12, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </motion.g>
        <text x={0} y={106} textAnchor="middle" fontSize={7.5} letterSpacing={2.5} fontFamily="var(--font-jetbrains)" fill={C.dim}>
          BITCOIN-STYLE HALVING · EVERY 6,307,200 BLOCKS
        </text>
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
//  SCENE 09 · VAULTCHAT — encrypted bubbles
// ─────────────────────────────────────────────────────────────────
function ChatScene({ color }: { color: string }) {
  const msg1 = useDecode('vault open?', 55, 250)
  const msg2 = useDecode('mixing now ⊗', 55, 700)
  const msg3 = useDecode('sent ✓', 55, 1150)
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="-160 -100 320 200" className="w-[min(84vw,420px)] max-h-full" style={{ overflow: 'visible' }}>
        <defs>
          <path id="xv-chat-line" d="M -96 -28 L 96 -28" />
        </defs>
        {/* secure channel line */}
        <motion.line
          x1={-96}
          y1={-28}
          x2={96}
          y2={-28}
          stroke={`${alpha(color, 0.5)}`}
          strokeWidth={1.5}
          strokeDasharray="6 5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6 }}
        />
        {/* key exchange dots */}
        <circle r={3} fill={C.cyan} style={{ filter: `drop-shadow(0 0 6px ${C.cyan})` }}>
          <animateMotion dur="1.3s" repeatCount="indefinite">
            <mpath href="#xv-chat-line" />
          </animateMotion>
        </circle>
        <circle r={3} fill={C.magenta} style={{ filter: `drop-shadow(0 0 6px ${C.magenta})` }}>
          <animateMotion dur="1.3s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1">
            <mpath href="#xv-chat-line" />
          </animateMotion>
        </circle>

        {/* avatars */}
        {[
          { x: -96, label: 'xet:7f…c2', ring: C.cyan },
          { x: 96, label: 'xet:a2…9d', ring: C.magenta },
        ].map((a, i) => (
          <motion.g
            key={a.label}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.15, type: 'spring', stiffness: 260, damping: 15 }}
            style={{ transformOrigin: `${a.x}px -28px` }}
          >
            <circle cx={a.x} cy={-28} r={17} fill="oklch(0.15 0.03 285)" stroke={`${alpha(a.ring, 0.8)}`} strokeWidth={2} />
            <text x={a.x} y={-23} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily="var(--font-jetbrains)" fill={C.text}>
              {i === 0 ? '◧' : '◨'}
            </text>
            <text x={a.x} y={4} textAnchor="middle" fontSize={7.5} fontFamily="var(--font-jetbrains)" fill={C.dim}>
              {a.label}
            </text>
          </motion.g>
        ))}

        {/* the lock */}
        <motion.g
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 14 }}
          style={{ transformOrigin: '0px -28px' }}
        >
          <rect x={-11} y={-26} width={22} height={16} rx={4} fill={`${alpha(color, 0.25)}`} stroke={color} strokeWidth={1.8} style={{ filter: `drop-shadow(0 0 8px ${alpha(color, 0.6)})` }} />
          <motion.path
            d="M -6 -26 L -6 -31 A 6 6 0 0 1 6 -31 L 6 -26"
            fill="none"
            stroke={color}
            strokeWidth={2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.55, duration: 0.4 }}
          />
          <motion.circle cx={0} cy={-18} r={2.2} fill={color} animate={{ scale: [1, 1.35, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
        </motion.g>

        {/* bubbles */}
        <motion.g initial={{ opacity: 0, x: -46 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, type: 'spring', stiffness: 240, damping: 17 }}>
          <rect x={-118} y={6} width={104} height={30} rx={15} fill="oklch(0.16 0.03 285)" stroke={`${alpha(C.cyan, 0.5)}`} />
          <polygon points="-14,21 -4,14 -4,28" fill="oklch(0.16 0.03 285)" stroke={`${alpha(C.cyan, 0.5)}`} strokeWidth={1} />
          <text x={-66} y={25} textAnchor="middle" fontSize={10.5} fontFamily="var(--font-jetbrains)" fill={C.text}>
            {msg1}
          </text>
        </motion.g>
        <motion.g initial={{ opacity: 0, x: 46 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.75, type: 'spring', stiffness: 240, damping: 17 }}>
          <rect x={14} y={44} width={104} height={30} rx={15} fill="oklch(0.18 0.04 300)" stroke={`${alpha(C.magenta, 0.5)}`} />
          <polygon points="14,59 4,52 4,66" fill="oklch(0.18 0.04 300)" stroke={`${alpha(C.magenta, 0.5)}`} strokeWidth={1} />
          <text x={66} y={63} textAnchor="middle" fontSize={10.5} fontFamily="var(--font-jetbrains)" fill={C.text}>
            {msg2}
          </text>
        </motion.g>
        <motion.g initial={{ opacity: 0, x: -46 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.15, type: 'spring', stiffness: 240, damping: 17 }}>
          <rect x={-118} y={82} width={86} height={30} rx={15} fill="oklch(0.16 0.03 285)" stroke={`${alpha(C.cyan, 0.5)}`} />
          <polygon points="-32,97 -22,90 -22,104" fill="oklch(0.16 0.03 285)" stroke={`${alpha(C.cyan, 0.5)}`} strokeWidth={1} />
          <text x={-75} y={101} textAnchor="middle" fontSize={10.5} fontFamily="var(--font-jetbrains)" fill={C.emerald}>
            {msg3}
          </text>
        </motion.g>

        {/* cipher mist */}
        {['Φ', 'λ', 'Σ', 'Ω', '∂'].map((g, i) => (
          <motion.text
            key={g}
            x={-130 + i * 64}
            y={70 - (i % 3) * 40}
            fontSize={9}
            fontFamily="var(--font-jetbrains)"
            fill={`${alpha(color, 0.3)}`}
            animate={{ opacity: [0.15, 0.45, 0.15], y: [0, -6, 0] }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
          >
            {g}
          </motion.text>
        ))}
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
//  Centerpiece dispatch
// ─────────────────────────────────────────────────────────────────
function Centerpiece({ id, color }: { id: string; color: string }) {
  switch (id) {
    case 'engine':
      return <GaugeScene color={color} />
    case 'swap':
      return <SwapScene color={color} />
    case 'mixer':
      return <MixerScene color={color} />
    case 'savings':
      return <SavingsScene color={color} />
    case 'psm':
      return <PegScene color={color} />
    case 'oracle':
      return <OracleScene color={color} />
    case 'governance':
      return <GovScene color={color} />
    case 'miner':
      return <MinerScene color={color} />
    case 'chat':
      return <ChatScene color={color} />
    default:
      return null
  }
}

// ─────────────────────────────────────────────────────────────────
//  MAIN — the tour itself
// ─────────────────────────────────────────────────────────────────
const sceneVariants = {
  enter: { x: 170, opacity: 0, scale: 0.95, filter: 'blur(8px)' },
  center: { x: 0, opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { x: -170, opacity: 0, scale: 0.95, filter: 'blur(8px)' },
}

export function FeatureTour({ fast = false }: { fast?: boolean }) {
  const sceneMs = fast ? TOUR_SCENE_MS_FAST : TOUR_SCENE_MS
  const total = tourDurationMs(fast)
  const [idx, setIdx] = useState(0)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 1; i < SCENES.length; i++) {
      timers.push(setTimeout(() => setIdx(i), i * sceneMs))
    }
    timers.push(setTimeout(() => setClosing(true), Math.max(0, total - 350)))
    return () => timers.forEach(clearTimeout)
  }, [sceneMs, total])

  const scene = SCENES[idx]

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0, scale: 1.14, filter: 'blur(10px)' }}
      animate={{
        opacity: closing ? 0 : 1,
        scale: 1,
        filter: 'blur(0px)',
      }}
      transition={{
        opacity: { duration: 0.32 },
        scale: { duration: 0.6, ease: [0.2, 0.8, 0.3, 1] },
        filter: { duration: 0.6 },
      }}
    >
      {/* the chain rail, we are traveling INSIDE the blockchain */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none" style={{ opacity: 0.5 }}>
        <div
          className="h-px w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${alpha(scene.color, 0.25)}, transparent)` }}
        />
        <div
          className="h-2.5 w-full -mt-[5px]"
          style={{
            background: `repeating-linear-gradient(90deg, ${alpha(scene.color, 0.13)} 0 2px, transparent 2px 46px)`,
            maskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)',
            WebkitMaskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)',
          }}
        />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
          style={{ left: '-2%', background: scene.color, boxShadow: `0 0 14px 3px ${scene.color}` }}
          animate={{ left: ['-2%', '102%'], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'linear', times: [0, 0.06, 0.94, 1] }}
        />
      </div>

      {/* vignette to focus the stage */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 85% 72% at 50% 46%, transparent 52%, oklch(0.07 0.02 280 / 0.6) 100%)',
        }}
      />

      {/* giant ghost index behind the stage */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <AnimatePresence mode="sync">
          <motion.span
            key={`ghost-${scene.id}`}
            initial={{ opacity: 0, scale: 1.25, y: 20 }}
            animate={{ opacity: 0.07, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="font-display font-bold leading-none"
            style={{ fontSize: 'clamp(13rem, 44vmin, 30rem)', color: scene.color }}
          >
            {pad2(idx + 1)}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* top chrome */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="absolute top-6 md:top-8 inset-x-0 flex justify-center pointer-events-none"
      >
        <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.5em] text-muted-foreground/60">
          Xelis Vault · Protocol Tour
        </span>
      </motion.div>

      {/* the stage */}
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="relative w-full max-w-3xl h-[min(64vh,520px)]">
          <AnimatePresence mode="sync">
            <motion.div
              key={scene.id}
              variants={sceneVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 210, damping: 26 },
                opacity: { duration: 0.32 },
                scale: { duration: 0.45, ease: 'easeOut' },
                filter: { duration: 0.4 },
              }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 md:gap-4"
            >
              {/* accent glow behind the stage */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vmin] h-[70vmin] rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${alpha(scene.color, 0.15)} 0%, transparent 62%)` }}
              />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.4 }}
                className="relative font-mono text-[9px] md:text-[10px] uppercase tracking-[0.42em]"
                style={{ color: scene.color }}
              >
                {scene.kicker}
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.5, ease: [0.2, 0.9, 0.25, 1] }}
                className="relative font-display text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-none"
                style={{ textShadow: `0 0 34px ${alpha(scene.color, 0.33)}` }}
              >
                {scene.title}
                <span className="ml-3 align-middle text-[0.45em] font-mono" style={{ color: scene.color }}>
                  {scene.glyph}
                </span>
              </motion.h2>
              <div className="relative h-[clamp(170px,30vh,290px)] flex items-center justify-center">
                <Centerpiece id={scene.id} color={scene.color} />
              </div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.45 }}
                className="relative text-xs md:text-sm text-muted-foreground max-w-md text-center leading-relaxed"
              >
                {scene.tagline}
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.45 }}
                className="relative flex items-center gap-2 font-mono text-[8.5px] md:text-[10px] tracking-[0.22em]"
                style={{ color: `${scene.color}` }}
              >
                <span style={{ color: scene.color }}>▪</span>
                <span className="text-muted-foreground/80">{scene.stat}</span>
                <span style={{ color: scene.color }}>▪</span>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* progress rail */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        className="absolute bottom-[7%] inset-x-0 flex items-center justify-center gap-3 px-6"
      >
        <div className="flex items-center gap-1.5">
          {SCENES.map((s, i) => (
            <div key={s.id} className="relative h-1 w-4 sm:w-7 rounded-full overflow-hidden bg-foreground/10">
              <motion.div
                className="absolute inset-0 origin-left rounded-full"
                style={{ background: i <= idx ? s.color : 'transparent' }}
                initial={{ scaleX: i === 0 ? 0 : 0 }}
                animate={{ scaleX: i < idx ? 1 : i === idx ? 1 : 0 }}
                transition={{ duration: i === idx ? sceneMs / 1000 : 0.25, ease: i === idx ? 'linear' : 'easeOut' }}
              />
            </div>
          ))}
        </div>
        <span className="font-mono text-[9px] md:text-[10px] tabular-nums text-muted-foreground/70 tracking-widest">
          {pad2(idx + 1)} / {pad2(SCENES.length)}
        </span>
      </motion.div>
    </motion.div>
  )
}
