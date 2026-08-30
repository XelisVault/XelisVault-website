'use client'

// FX primitives for the Observatory:
//  - <Odometer>       : digit-rolling animated numbers
//  - <Identicon>      : deterministic 5×5 avatar generated from an address
//  - playBlockPing / playMempoolBlip : tiny WebAudio sonar (no audio files)

import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'

// ---- Odometer ----------------------------------------------------------

function Digit({ char }: { char: string }) {
  return (
    <span className="relative inline-block overflow-hidden" style={{ height: '1.1em', lineHeight: '1.1em' }}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={char}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="inline-block tabular-nums"
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function Odometer({ value, className = '' }: { value: string | number; className?: string }) {
  const str = String(value)
  return (
    <span className={`inline-flex items-baseline ${className}`} aria-label={str}>
      {str.split('').map((ch, i) =>
        /\d/.test(ch) ? (
          <Digit key={`${i}-${ch}`} char={ch} />
        ) : (
          <span key={`${i}-${ch}`} className="inline-block">
            {ch}
          </span>
        )
      )}
    </span>
  )
}

// ---- Identicon ---------------------------------------------------------

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PALETTES = [
  ['#a78bfa', '#7c3aed', '#c4b5fd'],
  ['#67e8f9', '#0891b2', '#a5f3fc'],
  ['#fbbf24', '#d97706', '#fde68a'],
  ['#f472b6', '#db2777', '#fbcfe8'],
  ['#4ade80', '#16a34a', '#bbf7d0'],
]

export function Identicon({ seed, size = 28, className = '' }: { seed: string; size?: number; className?: string }) {
  const { cells, colors } = useMemo(() => {
    const h = hashStr(seed)
    const rand = mulberry32(h)
    const palette = PALETTES[h % PALETTES.length]
    const grid: boolean[][] = []
    for (let y = 0; y < 5; y++) {
      const row: boolean[] = []
      for (let x = 0; x < 3; x++) row.push(rand() > 0.45)
      grid.push([...row, row[1], row[0]]) // mirror for symmetry
    }
    return { cells: grid, colors: palette }
  }, [seed])

  const cell = size / 5
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={`shrink-0 ${className}`} aria-hidden>
      <rect width={size} height={size} rx={size * 0.18} fill="oklch(0.1 0.02 280)" />
      {cells.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect
              key={`${x}-${y}`}
              x={x * cell + cell * 0.12}
              y={y * cell + cell * 0.12}
              width={cell * 0.76}
              height={cell * 0.76}
              rx={cell * 0.2}
              fill={colors[(x + y) % 3]}
              opacity={0.55 + ((x + y) % 3) * 0.15}
            />
          ) : null
        )
      )}
    </svg>
  )
}

// ---- Sonar audio (WebAudio synth, no files) ----------------------------

let audioCtx: AudioContext | null = null

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch {
      return null
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  return audioCtx
}

function blip(freq: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const c = ctx()
  if (!c) return
  const osc = c.createOscillator()
  const osc2 = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc2.type = 'sine'
  osc.frequency.value = freq
  osc2.frequency.value = freq * 1.5 // perfect fifth shimmer
  const t = c.currentTime
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g)
  osc2.connect(g)
  g.connect(c.destination)
  osc.start(t)
  osc2.start(t)
  osc.stop(t + dur + 0.05)
  osc2.stop(t + dur + 0.05)
}

/** Soft ping for each new block. Pitch rises with the tx count; side blocks get a lower tone. */
export function playBlockPing(txs: number, blockType: string) {
  if (blockType === 'Side') {
    blip(300, 0.5, 0.045, 'triangle')
    return
  }
  const freq = Math.min(940, 460 + Math.min(txs, 10) * 36)
  blip(freq, 0.38, 0.05)
}

/** Higher ping when a tx enters the mempool. */
export function playMempoolBlip() {
  blip(880, 0.22, 0.04, 'square')
}
