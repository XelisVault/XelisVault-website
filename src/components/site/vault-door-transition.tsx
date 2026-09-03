'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion, useAnimationControls } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { useDemo } from '@/lib/demo-store'
import { useCountdownState } from '@/lib/countdown'
import { vaultAudio } from '@/lib/vault-door-audio'

/**
 * VaultDoorTransition V2 — "THE GRAND OPENING".
 *
 * The door of XELIS Vault, rebuilt from the official mark itself
 * (a circle bisected by a vertical line):
 *
 *   0.00s  BLACKOUT — cinematic letterbox closes, secure-channel boot log
 *   0.55s  THE MARK — the official logo draws itself in light:
 *          the circle traces on, the line drops in, the emblem pulses
 *   1.85s  ASSEMBLY — heavy metal blooms around the mark: concentric
 *          rings lock with clunks + camera shake, 12 bolts clamp in,
 *          energy particles stream toward the door
 *   3.55s  COMBINATION — the line becomes the master dial: right ·
 *          left · right, mechanical ticks, hex code settles, progress
 *          arc lights around the port
 *   4.85s  UNLOCK — the line snaps vertical, bolts fire out rapid-fire,
 *          the seam ignites white-hot, the hum swells, camera pushes in
 *   5.50s  THE BREACH — flash. The door SPLITS ALONG THE LINE and swings
 *          open toward the viewer in true 3D. God rays, triple
 *          shockwave, 40 sparks, lens flare, chromatic split
 *   6.35s  SETTLE — light dissolves, letterbox opens, chime
 *   6.85s  DONE — the app is live
 *
 * Click anywhere (or Escape) to skip. Honors prefers-reduced-motion.
 * Every sound is synthesized live (WebAudio) — no assets.
 */

const T = {
  sealCircle: 550,
  sealLine: 1100,
  sealPulse: 1400,
  assembly: 1850,
  ringLock1: 2050,
  ringLock2: 2350,
  boltsEngage: 2600,
  combo: 3550,
  comboAccepted: 4700,
  unlock: 4850,
  align: 5000,
  breach: 5500,
  settle: 6350,
  done: 6850,
}

const STATUS = [
  'SECURE CHANNEL OPENED',
  'VERIFYING SEAL',
  'ASSEMBLING VAULT',
  'ENTERING COMBINATION',
  'COMBINATION ACCEPTED',
  'RELEASING BOLTS',
  'SEAL BREACHED',
  'VAULT OPEN — WELCOME',
]

const LOGS = [
  { at: 150, text: 'xelis-secure v2.4 — channel opened' },
  { at: 700, text: 'seal integrity … OK' },
  { at: 2100, text: 'rings 1/2 locked · torque nominal' },
  { at: 2950, text: 'bolts 12/12 engaged' },
  { at: 3600, text: 'combination R-128 L-074 R-141' },
  { at: 4750, text: 'code verified … ACCEPTED' },
  { at: 4900, text: 'bolts released · seal critical' },
  { at: 5500, text: 'BREACH — access granted' },
]

/* ---------------------------------- art ---------------------------------- */

// The full metal artwork of the door (600×600), rendered inside each half
// so the door can split along the center line. r=118 is the dial port —
// exactly where the official mark lives.
function DoorFaceArt({ rimOn }: { rimOn: boolean }) {
  return (
    <svg viewBox="0 0 600 600" className="absolute inset-0 w-full h-full" aria-hidden>
      <defs>
        <radialGradient id="v2-face" cx="0.5" cy="0.42" r="0.62">
          <stop offset="0%" stopColor="#2E271C" />
          <stop offset="55%" stopColor="#211B12" />
          <stop offset="88%" stopColor="#15100A" />
          <stop offset="100%" stopColor="#0D0A06" />
        </radialGradient>
        <radialGradient id="v2-plate" cx="0.5" cy="0.4" r="0.55">
          <stop offset="0%" stopColor="#332B1E" />
          <stop offset="80%" stopColor="#241D13" />
          <stop offset="100%" stopColor="#171209" />
        </radialGradient>
        <filter id="v2-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* base disc */}
      <circle cx="300" cy="300" r="262" fill="url(#v2-face)" />
      {/* chamfered edge */}
      <circle cx="300" cy="300" r="262" fill="none" stroke="#CDA452" strokeWidth="3" opacity="0.75" />
      <circle cx="300" cy="300" r="256" fill="none" stroke="#0B0906" strokeWidth="5" opacity="0.65" />
      <circle cx="300" cy="300" r="249" fill="none" stroke="#E8C87A" strokeWidth="1.4" opacity="0.4" />

      {/* engraved graduations — outer ring */}
      {Array.from({ length: 96 }).map((_, i) => {
        const a = (i / 96) * Math.PI * 2
        const long = i % 8 === 0
        const r1 = long ? 226 : 233
        const r2 = 245
        return (
          <line
            key={`g1-${i}`}
            x1={300 + Math.cos(a) * r1}
            y1={300 + Math.sin(a) * r1}
            x2={300 + Math.cos(a) * r2}
            y2={300 + Math.sin(a) * r2}
            stroke="#CDA452"
            strokeWidth={long ? 2.6 : 1.2}
            opacity={long ? 0.5 : 0.24}
          />
        )
      })}

      {/* rivet ring */}
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2
        const r = 210
        return (
          <g key={`rv-${i}`}>
            <circle
              cx={300 + Math.cos(a) * r}
              cy={300 + Math.sin(a) * r}
              r="5"
              fill="#3A3122"
              stroke="#CDA452"
              strokeWidth="1"
              opacity="0.75"
            />
            <circle
              cx={300 + Math.cos(a) * r - 1.4}
              cy={300 + Math.sin(a) * r - 1.6}
              r="1.6"
              fill="#F5E3AE"
              opacity="0.8"
            />
          </g>
        )
      })}

      {/* groove + fine graduations */}
      <circle cx="300" cy="300" r="196" fill="none" stroke="rgba(205,164,82,0.22)" strokeWidth="2" />
      <circle cx="300" cy="300" r="190" fill="none" stroke="rgba(11,9,6,0.6)" strokeWidth="3" />
      {Array.from({ length: 60 }).map((_, i) => {
        const a = (i / 60) * Math.PI * 2
        const r1 = 170
        const r2 = 180
        return (
          <line
            key={`g2-${i}`}
            x1={300 + Math.cos(a) * r1}
            y1={300 + Math.sin(a) * r1}
            x2={300 + Math.cos(a) * r2}
            y2={300 + Math.sin(a) * r2}
            stroke="#E8C87A"
            strokeWidth="1"
            opacity="0.3"
          />
        )
      })}

      {/* raised spoke plate */}
      <circle cx="300" cy="300" r="152" fill="url(#v2-plate)" stroke="#CDA452" strokeWidth="1.2" opacity="0.9" />
      <circle cx="300" cy="300" r="146" fill="none" stroke="rgba(11,9,6,0.55)" strokeWidth="3" />

      {/* machined dashed arc */}
      <circle
        cx="300"
        cy="300"
        r="128"
        fill="none"
        stroke="#CDA452"
        strokeWidth="1.2"
        strokeDasharray="2 9"
        opacity="0.28"
      />

      {/* dial port recess — the official mark sits here */}
      <circle cx="300" cy="300" r="120" fill="#080604" />
      <circle cx="300" cy="300" r="121" fill="none" stroke="rgba(0,0,0,0.9)" strokeWidth="5" />

      {/* the glowing rim — the circle of the official logo.
          Hidden while the door is closed (the live mark renders it on top);
          revealed exactly at the breach so the ring RIPS APART with the door. */}
      <motion.g animate={{ opacity: rimOn ? 1 : 0 }} transition={{ duration: 0.18 }} filter="url(#v2-glow)">
        <circle cx="300" cy="300" r="118" fill="none" stroke="#F1F1F1" strokeWidth="4" />
      </motion.g>

      {/* the seam — shadowed groove exactly on the vertical line */}
      <line x1="300" y1="38" x2="300" y2="562" stroke="#050403" strokeWidth="3" opacity="0.6" />
    </svg>
  )
}

// One radial bolt — heavy champagne steel
function Bolt({
  angle,
  engaged,
  retracted,
  delay,
}: {
  angle: number
  engaged: boolean
  retracted: boolean
  delay: number
}) {
  const rad = (angle * Math.PI) / 180
  const R = 44.5 // % — sits on the ring
  const left = 50 + Math.cos(rad) * R
  const top = 50 + Math.sin(rad) * R
  const dx = -Math.cos(rad) * 26
  const dy = -Math.sin(rad) * 26
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: '4%',
        height: '10.5%',
        marginLeft: '-2%',
        marginTop: '-5.25%',
        rotate: `${angle + 90}deg`,
        zIndex: 15,
      }}
    >
      <motion.div
        className="w-full h-full relative"
        style={{
          background: 'linear-gradient(180deg, #F5E3AE 0%, #E8C87A 30%, #B98A3E 75%, #7E5C24 100%)',
          borderRadius: '3px',
          boxShadow:
            '0 0 10px rgba(232,200,122,0.5), inset 0 -2px 4px rgba(60,42,14,0.7), inset 0 1px 2px rgba(255,244,200,0.8)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={
          retracted
            ? { scale: 0.1, opacity: 0, x: dx, y: dy }
            : engaged
              ? { scale: 1, opacity: 1, x: 0, y: 0 }
              : { scale: 0, opacity: 0 }
        }
        transition={
          retracted
            ? { delay, duration: 0.32, ease: [0.6, 0, 0.9, 0.4] }
            : { delay, type: 'spring', stiffness: 380, damping: 20 }
        }
      />
    </div>
  )
}

// Cipher rain
function CipherRain() {
  const glyphs = useMemo(() => {
    const CH = '0123456789ABCDEF·×+/$#%&@ΞΔ§'
    return Array.from({ length: 34 }).map((_, i) => ({
      ch: CH[Math.floor(Math.random() * CH.length)],
      left: (i / 34) * 100 + Math.random() * 2,
      dur: 6 + Math.random() * 10,
      delay: -Math.random() * 14,
      size: 9 + Math.random() * 10,
      op: 0.05 + Math.random() * 0.1,
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

// Energy particles streaming INTO the door during assembly
function IntakeParticles({ active }: { active: boolean }) {
  const parts = useMemo(
    () =>
      Array.from({ length: 14 }).map(() => {
        const a = Math.random() * Math.PI * 2
        const d = 42 + Math.random() * 24 // vmin from center
        return {
          x0: Math.cos(a) * d,
          y0: Math.sin(a) * d,
          size: 2 + Math.random() * 3.5,
          dur: 0.8 + Math.random() * 0.7,
          delay: Math.random() * 0.6,
        }
      }),
    [],
  )
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {parts.map((p, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: 'radial-gradient(circle, #FFEFA8, rgba(232,200,122,0))',
            boxShadow: '0 0 8px rgba(232,200,122,0.8)',
          }}
          initial={{ x: `${p.x0}vmin`, y: `${p.y0}vmin`, opacity: 0, scale: 1 }}
          animate={
            active
              ? {
                  x: `${p.x0 * 0.12}vmin`,
                  y: `${p.y0 * 0.12}vmin`,
                  opacity: [0, 0.9, 0],
                  scale: [1, 0.4, 0.1],
                }
              : { opacity: 0 }
          }
          transition={
            active
              ? { duration: p.dur, delay: p.delay, repeat: 2, ease: [0.3, 0.6, 0.4, 1] }
              : { duration: 0.2 }
          }
        />
      ))}
    </div>
  )
}

// THE official mark: circle + line, drawn in light during the seal phase,
// then living on as the dial of the assembled vault.
function TheMark({
  circleDrawn,
  lineIn,
  dial,
  flared,
  gone,
}: {
  circleDrawn: boolean
  lineIn: boolean
  dial: number
  flared: boolean
  gone: boolean
}) {
  // NOTE: `flared` (breach instant — the line ignites into a column) and
  // `gone` (≈0.42s later — what remains of the mark dissolves) are DELIBERATELY
  // separate beats so the breach never has a dark gap: line → column → burst.
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 30 }}
      animate={gone ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.22 }}
    >
      {/* the circle — official logo geometry: r 39.3% of door */}
      <svg viewBox="0 0 600 600" className="absolute inset-0 w-full h-full" aria-hidden>
        <defs>
          <filter id="v2-markglow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <motion.circle
          cx="300"
          cy="300"
          r="118"
          fill="none"
          stroke="#F1F1F1"
          strokeWidth="4"
          filter="url(#v2-markglow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={
            circleDrawn
              ? { pathLength: 1, opacity: flared ? 1.15 : 1 }
              : { pathLength: 0, opacity: 0.9 }
          }
          transition={
            circleDrawn
              ? { duration: flared ? 0.2 : 0.7, ease: [0.4, 0.1, 0.2, 1] }
              : { duration: 0.3 }
          }
          style={{ rotate: -90, transformOrigin: '300px 300px' }}
        />
      </svg>

      {/* the line — official logo geometry: 52% of door height,
          overhanging the circle, becomes the master dial */}
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{
          x: '-50%',
          y: '-50%',
          width: 'min(0.9%, 5px)',
          height: '52%',
          transformOrigin: 'center center',
          zIndex: 31,
        }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={
          gone
            ? { scaleY: 0.1, opacity: 0 }
            : flared
              ? { scaleY: 2.6, scaleX: 4, opacity: 1, rotate: 0 }
              : lineIn
                ? { scaleY: 1, scaleX: 1, opacity: 1, rotate: dial }
                : { scaleY: 0, opacity: 0 }
        }
        transition={
          flared
            ? { duration: 0.3, ease: [0.7, 0, 0.2, 1] }
            : lineIn
              ? { scaleY: { type: 'spring', stiffness: 200, damping: 17 }, rotate: { duration: 0.55, ease: [0.65, 0.02, 0.3, 1] } }
              : { duration: 0.25 }
        }
      >
        <div
          className={`w-full h-full ${flared || gone ? '' : 'animate-pulse'}`}
          style={{
            background: flared
              ? 'linear-gradient(180deg, #FFFFFF, #FFF7DC 30%, #FFEFA8 55%, rgba(255,240,190,0.9))'
              : 'linear-gradient(180deg, #FAFAFA 0%, #F1F1F1 35%, #D8D8D8 70%, #C9C9C9 100%)',
            borderRadius: '3px',
            boxShadow: flared
              ? '0 0 40px rgba(255,244,200,1), 0 0 120px rgba(255,230,150,0.9), 0 0 260px rgba(255,220,120,0.7)'
              : '0 0 14px rgba(241,241,241,0.75), 0 0 40px rgba(241,241,241,0.3)',
          }}
        />
      </motion.div>

      {/* hub */}
      <motion.div
        className="absolute left-1/2 top-1/2 w-[4.6%] aspect-square rounded-full"
        style={{
          x: '-50%',
          y: '-50%',
          zIndex: 32,
          background: 'radial-gradient(circle at 35% 30%, #FDFDFD, #D9D9D9 55%, #9C9C9C)',
          boxShadow: '0 0 16px rgba(241,241,241,0.8), inset 0 -2px 4px rgba(40,40,40,0.5)',
        }}
        initial={{ scale: 0 }}
        animate={gone ? { scale: 0 } : lineIn ? { scale: 1 } : { scale: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.25 }}
      />
    </motion.div>
  )
}

// Progress arc around the port during the combination
function ProgressArc({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 600 600" className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 29 }} aria-hidden>
      <motion.circle
        cx="300"
        cy="300"
        r="132"
        fill="none"
        stroke="#E8C87A"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: progress, opacity: progress > 0 ? 0.9 : 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ rotate: -90, transformOrigin: '300px 300px' }}
      />
    </svg>
  )
}

// Scrambling hex readout that settles on the true combination
function HexReadout({ active, settled }: { active: boolean; settled: boolean }) {
  const TARGET = 'R-128 · L-074 · R-141'
  const [text, setText] = useState('··· ··· ··· ···')
  useEffect(() => {
    if (!active) return
    const CH = '0123456789ABCDEF'
    let settledCount = 0
    const iv = setInterval(() => {
      settledCount = Math.min(settledCount + 1, TARGET.length)
      let out = ''
      for (let i = 0; i < TARGET.length; i++) {
        const c = TARGET[i]
        if (c === ' ' || i < settledCount) out += c
        else out += CH[Math.floor(Math.random() * CH.length)]
      }
      setText(out)
    }, 55)
    return () => clearInterval(iv)
  }, [active])
  useEffect(() => {
    if (settled) setText(TARGET)
  }, [settled])
  return (
    <div className="h-5" aria-hidden>
      <AnimatePresence>
        {(active || settled) && (
          <motion.div
            key="hex"
            className="font-mono text-[11px] md:text-xs tracking-[0.32em] text-vault"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: settled ? 1 : 0.85, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Terminal boot log, bottom-left
function TerminalLog({ count }: { count: number }) {
  return (
    <div className="absolute left-4 bottom-4 md:left-6 md:bottom-6 hidden sm:flex flex-col gap-1 pointer-events-none" aria-hidden>
      {LOGS.slice(0, count).map((l, i) => (
        <motion.div
          key={l.at}
          className="font-mono text-[9px] md:text-[10px] tracking-[0.14em] text-vault/50"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {i === count - 1 ? (
            <span className="text-vault/75">
              {'> '}
              {l.text}
              <span className="inline-block w-[1.5ch] animate-pulse">_</span>
            </span>
          ) : (
            <span>
              {'> '}
              {l.text}
            </span>
          )}
        </motion.div>
      ))}
    </div>
  )
}

// Cinematic letterbox bars
function Letterbox({ closed }: { closed: boolean }) {
  return (
    <>
      {[0, 1].map((i) => (
        <motion.div
          key={`lb-${i}`}
          className="absolute left-0 right-0 bg-black pointer-events-none"
          style={i === 0 ? { top: 0 } : { bottom: 0 }}
          initial={{ height: 0 }}
          animate={{ height: closed ? '10vh' : '0vh' }}
          transition={{ duration: 0.45, ease: [0.7, 0, 0.2, 1] }}
        />
      ))}
    </>
  )
}

/* ------------------------------- breach FX ------------------------------- */

function GodRays({ on, settling }: { on: boolean; settling: boolean }) {
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 w-0 h-0 pointer-events-none"
      style={{ zIndex: 40 }}
      animate={{ rotate: on ? 24 : 0, scale: settling ? 1.12 : 1 }}
      transition={on ? { duration: 3, ease: 'linear' } : { duration: 0.3 }}
    >
      {Array.from({ length: 16 }).map((_, i) => (
        <motion.div
          key={`ray-${i}`}
          className="absolute left-0 bottom-0 origin-bottom pointer-events-none"
          style={{
            width: i % 2 === 0 ? '1.4vmin' : '0.8vmin',
            height: '56vmin',
            rotate: i * (360 / 16),
            background:
              'linear-gradient(to top, rgba(255,244,200,0.85) 0%, rgba(240,214,138,0.35) 40%, transparent 78%)',
            filter: 'blur(1px)',
          }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={on ? { scaleY: 1.9, opacity: settling ? 0.4 : 0.85 } : { scaleY: 0, opacity: 0 }}
          transition={{
            scaleY: { duration: 1.1, delay: 0.05 + i * 0.02, ease: [0.2, 0.7, 0.3, 1] },
            opacity: { duration: 0.4, delay: 0.05 + i * 0.015 },
          }}
        />
      ))}
    </motion.div>
  )
}

function Shockwaves({ on }: { on: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 41 }} aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`sw-${i}`}
          className="absolute rounded-full"
          style={{
            width: '18vmin',
            height: '18vmin',
            border: `${i === 0 ? 3 : 2}px solid ${i === 0 ? 'rgba(255,255,255,0.95)' : i === 1 ? 'rgba(240,214,138,0.7)' : 'rgba(185,138,62,0.45)'}`,
          }}
          initial={{ scale: 0.1, opacity: 0 }}
          animate={on ? { scale: [0.1, 5.5, 9], opacity: [0, 0.85, 0] } : { scale: 0.1, opacity: 0 }}
          transition={{ duration: 1.4, delay: i * 0.13, ease: [0.12, 0.75, 0.25, 1] }}
        />
      ))}
    </div>
  )
}

function Sparks({ on }: { on: boolean }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 40 }).map(() => {
        const a = Math.random() * Math.PI * 2
        const d = 22 + Math.random() * 42 // vmin
        const size = 2 + Math.random() * 3.5
        return {
          x: Math.cos(a) * d,
          y: Math.sin(a) * d,
          size,
          dur: 0.8 + Math.random() * 0.8,
          delay: Math.random() * 0.18,
          warm: Math.random() > 0.4,
        }
      }),
    [],
  )
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 42 }} aria-hidden>
      {sparks.map((s, i) => (
        <motion.div
          key={`spk-${i}`}
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: s.size,
            height: s.size,
            marginTop: -s.size / 2,
            marginLeft: -s.size / 2,
            background: s.warm ? '#FFE9A8' : '#FFFFFF',
            boxShadow: s.warm
              ? '0 0 10px rgba(255,225,140,0.95), 0 0 22px rgba(232,200,122,0.6)'
              : '0 0 10px rgba(255,255,255,0.95), 0 0 22px rgba(220,230,255,0.5)',
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
          animate={
            on
              ? { x: `${s.x}vmin`, y: `${s.y}vmin`, opacity: [0, 1, 0], scale: [1, 0.75, 0.15] }
              : { opacity: 0 }
          }
          transition={
            on
              ? { duration: s.dur, delay: s.delay, ease: [0.1, 0.8, 0.3, 1] }
              : { duration: 0.15 }
          }
        />
      ))}
    </div>
  )
}

function LensFlare({ on }: { on: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 43 }} aria-hidden>
      <motion.div
        className="absolute left-1/2 top-1/2"
        initial={{ opacity: 0, scale: 0.4 }}
        animate={on ? { opacity: [0, 0.9, 0], scale: [0.4, 1.25, 1.6] } : { opacity: 0 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        style={{ x: '-50%', y: '-50%' }}
      >
        <div
          className="rounded-full"
          style={{
            width: '7vmin',
            height: '7vmin',
            background: 'radial-gradient(circle, #FFFFFF 0%, rgba(255,248,220,0.85) 35%, rgba(240,214,138,0.25) 60%, transparent 75%)',
            filter: 'blur(1px)',
          }}
        />
        {[
          { dx: 14, dy: -8, s: 2.6, c: 'rgba(120,170,255,0.22)' },
          { dx: 26, dy: -15, s: 1.7, c: 'rgba(255,220,150,0.25)' },
          { dx: -12, dy: 7, s: 3.4, c: 'rgba(200,255,240,0.14)' },
          { dx: -24, dy: 14, s: 1.9, c: 'rgba(255,190,120,0.2)' },
        ].map((g, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `calc(50% + ${g.dx}vmin)`,
              top: `calc(50% + ${g.dy}vmin)`,
              width: `${g.s}vmin`,
              height: `${g.s}vmin`,
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${g.c} 0%, transparent 70%)`,
            }}
          />
        ))}
      </motion.div>
    </div>
  )
}

function ChromaticFlash({ on }: { on: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 60 }} aria-hidden>
      <motion.div
        className="absolute inset-0"
        style={{ background: 'rgba(255,40,60,0.10)', mixBlendMode: 'screen' }}
        initial={{ opacity: 0, x: 0 }}
        animate={on ? { opacity: [0, 0.9, 0], x: [-8, 6, 0] } : { opacity: 0 }}
        transition={{ duration: 0.42 }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ background: 'rgba(40,120,255,0.10)', mixBlendMode: 'screen' }}
        initial={{ opacity: 0, x: 0 }}
        animate={on ? { opacity: [0, 0.9, 0], x: [8, -6, 0] } : { opacity: 0 }}
        transition={{ duration: 0.42 }}
      />
    </div>
  )
}

/* ------------------------------ main ceremony ----------------------------- */

type Phase = 'idle' | 'playing' | 'fading'

export function VaultDoorTransition() {
  const open = useDemo((s) => s.open)
  const { isLaunched } = useCountdownState()
  const pathname = usePathname()
  const router = useRouter()
  const reduced = useReducedMotion()

  const [phase, setPhase] = useState<Phase>('idle')
  const [status, setStatus] = useState(0)
  const [logCount, setLogCount] = useState(0)
  const [metal, setMetal] = useState(false)
  const [ringLock, setRingLock] = useState(0)
  const [engaged, setEngaged] = useState(false)
  const [retracted, setRetracted] = useState(false)
  const [circleDrawn, setCircleDrawn] = useState(false)
  const [lineIn, setLineIn] = useState(false)
  const [pulse, setPulse] = useState(0)
  const [dial, setDial] = useState(0)
  const [hexActive, setHexActive] = useState(false)
  const [hexSettled, setHexSettled] = useState(false)
  const [arc, setArc] = useState(0)
  const [opened, setOpened] = useState(false)
  const [markFaded, setMarkFaded] = useState(false)
  const [settling, setSettling] = useState(false)
  const [intake, setIntake] = useState(false)

  const camShake = useAnimationControls()
  const prevOpen = useRef(false)
  const suppress = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const navigated = useRef(false)

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const shake = useCallback(
    (power = 1, dur = 0.4) => {
      void camShake.start({
        x: [0, -7 * power, 5 * power, -3 * power, 1.5 * power, 0],
        y: [0, 4 * power, -3 * power, 2 * power, -1 * power, 0],
        transition: { duration: dur, ease: 'easeOut' },
      })
    },
    [camShake],
  )

  const finish = useCallback(() => {
    clearTimers()
    vaultAudio.stopHum()
    setPhase('idle')
    setStatus(0)
    setLogCount(0)
    setMetal(false)
    setRingLock(0)
    setEngaged(false)
    setRetracted(false)
    setCircleDrawn(false)
    setLineIn(false)
    setPulse(0)
    setDial(0)
    setHexActive(false)
    setHexSettled(false)
    setArc(0)
    setOpened(false)
    setMarkFaded(false)
    setSettling(false)
    setIntake(false)
  }, [clearTimers])

  const skip = useCallback(() => {
    if (phase !== 'playing') return
    clearTimers()
    vaultAudio.stopHum()
    setPhase('fading')
    if (pathname !== '/' && !navigated.current) {
      navigated.current = true
      try {
        sessionStorage.setItem('xv-door-handoff', '1')
      } catch {
        /* ignore */
      }
      router.push('/?openApp=1')
    }
    timers.current.push(setTimeout(finish, 300))
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

    vaultAudio.unlock()
    setPhase('playing')

    const at = (t: number, fn: () => void) => {
      timers.current.push(setTimeout(fn, t))
    }

    /* ---- 0.0s BLACKOUT ---- */
    at(120, () => setLogCount(1))
    at(300, () => setStatus(1))
    at(600, () => setLogCount(2))

    /* ---- 0.55s THE MARK ---- */
    at(T.sealCircle, () => {
      setCircleDrawn(true)
      vaultAudio.shimmer()
    })
    at(T.sealLine, () => {
      setLineIn(true)
      vaultAudio.tick(0.6)
    })
    at(T.sealPulse, () => {
      setPulse(1)
      vaultAudio.tick(0.9)
    })
    at(T.sealPulse + 160, () => vaultAudio.tick(1.1))

    /* ---- 1.85s ASSEMBLY ---- */
    at(T.assembly - 80, () => {
      setMetal(true)
      setIntake(true)
    })
    at(T.ringLock1, () => {
      setRingLock(1)
      vaultAudio.clunk(1)
      shake(1)
    })
    at(T.ringLock2, () => {
      setRingLock(2)
      vaultAudio.clunk(0.8)
      shake(0.7)
    })
    at(T.boltsEngage, () => {
      setEngaged(true)
      for (let i = 0; i < 12; i++) {
        at(T.boltsEngage + 120 + i * 55, () => vaultAudio.boltClick())
      }
      at(T.boltsEngage + 140, () => shake(0.35, 0.3))
      at(T.boltsEngage + 420, () => shake(0.3, 0.3))
    })
    at(2950, () => setLogCount(4))
    at(3100, () => setIntake(false))
    at(3200, () => setStatus(2))
    at(3300, () => setLogCount(5))

    /* ---- 3.55s COMBINATION ---- */
    at(T.combo, () => {
      setStatus(3)
      setHexActive(true)
      setArc(0.33)
      vaultAudio.whirr(0.6)
      setDial(128)
    })
    ;[0, 130, 260, 390].forEach((d) => at(T.combo + 60 + d, () => vaultAudio.tick(1)))
    at(T.combo + 500, () => {
      setDial(54)
      vaultAudio.whirr(0.45)
    })
    ;[0, 110, 220].forEach((d) => at(T.combo + 560 + d, () => vaultAudio.tick(1.15)))
    at(T.combo + 820, () => {
      setDial(141)
      setArc(0.72)
      vaultAudio.whirr(0.55)
    })
    ;[0, 120, 240, 360].forEach((d) => at(T.combo + 880 + d, () => vaultAudio.tick(0.95)))
    at(T.comboAccepted, () => {
      setStatus(4)
      setHexSettled(true)
      setArc(1)
      vaultAudio.tick(0.7)
      vaultAudio.tick(0.5)
    })
    at(T.comboAccepted + 100, () => setLogCount(6))

    /* ---- 4.85s UNLOCK ---- */
    at(T.unlock, () => {
      setStatus(5)
      setLogCount(7)
      vaultAudio.startHum()
    })
    at(T.align, () => {
      setDial(0) // the line snaps vertical — the seam is made
      vaultAudio.clunk(0.6)
      shake(0.45, 0.35)
    })
    at(T.align + 120, () => setRetracted(true))
    for (let i = 0; i < 12; i++) {
      at(T.align + 150 + i * 32, () => vaultAudio.boltClick())
    }

    /* ---- 5.5s THE BREACH ---- */
    at(T.breach - 450, () => {
      // route beneath the door on non-home pages — seamless handoff
      if (pathname !== '/' && !navigated.current) {
        navigated.current = true
        try {
          sessionStorage.setItem('xv-door-handoff', '1')
        } catch {
          /* ignore */
        }
        router.push('/?openApp=1')
      }
    })
    at(T.breach, () => {
      setOpened(true)
      setStatus(6)
      vaultAudio.stopHum()
      vaultAudio.boom()
      shake(1.6, 0.6)
    })
    at(T.breach + 420, () => setMarkFaded(true))
    at(T.breach + 140, () => setLogCount(8))
    at(T.settle, () => {
      setSettling(true)
      setStatus(7)
      vaultAudio.chime()
    })
    at(T.settle + 600, () => setPhase('fading'))
    at(T.done, finish)

    return clearTimers
  }, [open, isLaunched, pathname, router, reduced, finish, clearTimers, shake])

  // on mount: arriving via cross-page handoff → don't replay
  useEffect(() => {
    try {
      if (sessionStorage.getItem('xv-door-handoff') === '1') {
        sessionStorage.removeItem('xv-door-handoff')
        suppress.current = true
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  // Escape to skip
  useEffect(() => {
    if (phase !== 'playing') return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && skip()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, skip])

  const rimOn = opened // the SVG rim lights when the live mark hands off
  const markGone = markFaded // mark flared at the breach, dissolves just after

  // camera: hero zoom during seal, settle for assembly, push-in on unlock,
  // dramatic pull-back at the breach
  const camScale =
    status >= 6 ? 0.86 : status >= 5 ? 1.05 : status >= 2 ? 1.0 : 1.42

  return (
    <AnimatePresence>
      {phase !== 'idle' && (
        <motion.div
          key="vault-door-v2"
          className="fixed inset-0 z-[95] overflow-hidden select-none cursor-pointer bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'fading' ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: phase === 'fading' ? 0.45 : 0.25, ease: 'easeOut' }}
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
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 32%, rgba(8,6,4,0.7) 100%)',
            }}
            animate={{ opacity: opened ? 0 : 1 }}
            transition={{ duration: 0.6 }}
          />
          <motion.div animate={{ opacity: opened ? 0.3 : 1 }} transition={{ duration: 0.6 }}>
            <CipherRain />
          </motion.div>

          {/* scanline texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.05]"
            style={{
              background:
                'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255,255,255,0.5) 3px, transparent 4px)',
            }}
            aria-hidden
          />

          {/* ------- CAMERA + THE DOOR ------- */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            style={{ perspective: 1500 }}
          >
            <motion.div
              className="flex items-center justify-center"
              animate={{ scale: camScale }}
              transition={
                status >= 6
                  ? { duration: 1.0, ease: [0.16, 1, 0.3, 1] }
                  : { duration: 0.9, ease: [0.4, 0.1, 0.2, 1] }
              }
            >
              <motion.div animate={camShake} className="flex items-center justify-center">
                <div
                  className="relative w-[min(74vmin,640px)] aspect-square"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* light bloom behind the door — only visible once it opens */}
                  <motion.div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[58%] aspect-square rounded-full pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(255,248,225,0.98) 0%, rgba(240,214,138,0.55) 30%, rgba(185,138,62,0.2) 55%, transparent 75%)',
                      filter: 'blur(8px)',
                    }}
                    initial={{ scale: 0.1, opacity: 0 }}
                    animate={opened ? { scale: [0.3, 1.3, 4.4], opacity: [0, 1, 1] } : { scale: 0.1, opacity: 0 }}
                    transition={{ duration: 0.9, ease: [0.16, 0.8, 0.28, 1] }}
                  />

                  {/* rotating dashed HUD orbit */}
                  <motion.div
                    className="absolute inset-[-14%] rounded-full pointer-events-none"
                    style={{
                      border: '1px dashed rgba(205,164,82,0.28)',
                      zIndex: 5,
                    }}
                    animate={{ rotate: metal ? 360 : 0 }}
                    transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    // eslint-disable-next-line react-hooks/exhaustive-deps
                  />

                  {/* ---------- LEFT HALF of the door ---------- */}
                  <motion.div
                    className="absolute inset-0"
                    style={{ clipPath: 'inset(0 50% 0 0)', transformOrigin: '6% 50%', zIndex: 10 }}
                    animate={
                      opened
                        ? { rotateY: -84, x: '-16%', opacity: 0.88 }
                        : { rotateY: 0, x: '0%', opacity: 1 }
                    }
                    transition={
                      opened
                        ? { duration: 1.2, ease: [0.7, 0, 0.2, 1], opacity: { duration: 1.5 } }
                        : { duration: 0.4 }
                    }
                  >
                    <motion.div
                      className="absolute inset-0"
                      initial={{ opacity: 0, scale: 0.52, rotate: -5 }}
                      animate={
                        metal
                          ? { opacity: 1, scale: 1, rotate: 0 }
                          : { opacity: 0, scale: 0.52, rotate: -5 }
                      }
                      transition={
                        metal
                          ? { duration: 0.85, ease: [0.22, 1.2, 0.36, 1] }
                          : { duration: 0.2 }
                      }
                    >
                      <DoorFaceArt rimOn={rimOn} />
                      {/* ring lock flash — outer ring stamps once */}
                      <motion.div
                        className="absolute inset-[4%] rounded-full pointer-events-none"
                        style={{ boxShadow: 'inset 0 0 0 2px rgba(232,200,122,0)' }}
                        animate={
                          ringLock === 1
                            ? { boxShadow: ['inset 0 0 0 2px rgba(232,200,122,0.9)', 'inset 0 0 0 2px rgba(232,200,122,0)'] }
                            : {}
                        }
                        transition={{ duration: 0.5 }}
                      />
                      {Array.from({ length: 12 }).map((_, i) => (
                        <Bolt
                          key={`bolt-l-${i}`}
                          angle={-90 + i * 30}
                          engaged={engaged}
                          retracted={retracted}
                          delay={retracted ? 0.02 + i * 0.03 : 0.12 + i * 0.055}
                        />
                      ))}
                      {/* seam edge — ignites when the seal breaks */}
                      <motion.div
                        className="absolute top-[6%] bottom-[6%] right-0 w-[4px]"
                        style={{
                          background:
                            'linear-gradient(180deg, transparent, rgba(255,250,230,0.98) 28%, rgba(255,244,200,0.98) 72%, transparent)',
                          filter: 'blur(0.5px)',
                        }}
                        animate={{ opacity: retracted && !opened ? 1 : 0, scaleY: retracted ? 1 : 0.3 }}
                        transition={{ duration: 0.35 }}
                      />
                    </motion.div>
                  </motion.div>

                  {/* ---------- RIGHT HALF of the door ---------- */}
                  <motion.div
                    className="absolute inset-0"
                    style={{ clipPath: 'inset(0 0 0 50%)', transformOrigin: '94% 50%', zIndex: 10 }}
                    animate={
                      opened
                        ? { rotateY: 84, x: '16%', opacity: 0.88 }
                        : { rotateY: 0, x: '0%', opacity: 1 }
                    }
                    transition={
                      opened
                        ? { duration: 1.2, ease: [0.7, 0, 0.2, 1], opacity: { duration: 1.5 } }
                        : { duration: 0.4 }
                    }
                  >
                    <motion.div
                      className="absolute inset-0"
                      initial={{ opacity: 0, scale: 0.52, rotate: 5 }}
                      animate={
                        metal
                          ? { opacity: 1, scale: 1, rotate: 0 }
                          : { opacity: 0, scale: 0.52, rotate: 5 }
                      }
                      transition={
                        metal
                          ? { duration: 0.85, ease: [0.22, 1.2, 0.36, 1] }
                          : { duration: 0.2 }
                      }
                    >
                      <DoorFaceArt rimOn={rimOn} />
                      <motion.div
                        className="absolute inset-[4%] rounded-full pointer-events-none"
                        animate={
                          ringLock === 2
                            ? { boxShadow: ['inset 0 0 0 2px rgba(232,200,122,0.9)', 'inset 0 0 0 2px rgba(232,200,122,0)'] }
                            : {}
                        }
                        transition={{ duration: 0.5 }}
                      />
                      {Array.from({ length: 12 }).map((_, i) => (
                        <Bolt
                          key={`bolt-r-${i}`}
                          angle={-90 + i * 30}
                          engaged={engaged}
                          retracted={retracted}
                          delay={retracted ? 0.02 + i * 0.03 : 0.12 + i * 0.055}
                        />
                      ))}
                      <motion.div
                        className="absolute top-[6%] bottom-[6%] left-0 w-[4px]"
                        style={{
                          background:
                            'linear-gradient(180deg, transparent, rgba(255,250,230,0.98) 28%, rgba(255,244,200,0.98) 72%, transparent)',
                          filter: 'blur(0.5px)',
                        }}
                        animate={{ opacity: retracted && !opened ? 1 : 0, scaleY: retracted ? 1 : 0.3 }}
                        transition={{ duration: 0.35 }}
                      />
                    </motion.div>
                  </motion.div>

                  {/* ---------- THE OFFICIAL MARK (dial) ---------- */}
                  <TheMark
                    circleDrawn={circleDrawn}
                    lineIn={lineIn}
                    dial={dial}
                    flared={opened}
                    gone={markGone}
                  />
                  <ProgressArc progress={arc} />

                  {/* intake energy particles */}
                  <IntakeParticles active={intake} />
                </div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* ------- BREACH FX LAYERS ------- */}
          <GodRays on={opened} settling={settling} />
          <Shockwaves on={opened} />
          <Sparks on={opened} />
          <LensFlare on={opened} />
          <ChromaticFlash on={opened} />

          {/* the light column — the line, torn open across the whole screen */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[6px] pointer-events-none"
            style={{
              height: '240vh',
              background:
                'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.95) 12%, #FFFFFF 50%, rgba(255,255,255,0.95) 88%, transparent 100%)',
              filter: 'blur(2px)',
              zIndex: 45,
            }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={
              opened
                ? { scaleY: [0, 1.1, 1], opacity: [0, 1, settling ? 0 : 0.95] }
                : { scaleY: 0, opacity: 0 }
            }
            transition={
              opened
                ? {
                    scaleY: { duration: 0.32, ease: [0.6, 0, 0.2, 1] },
                    opacity: { duration: 0.45, delay: 0.02, ease: 'easeOut' },
                  }
                : { duration: 0.2 }
            }
          />

          {/* white flash */}
          <motion.div
            className="absolute inset-0 bg-white pointer-events-none"
            style={{ zIndex: 65 }}
            initial={{ opacity: 0 }}
            animate={opened ? { opacity: [0, 1, 0.65, 0] } : { opacity: 0 }}
            transition={{ duration: 0.55, times: [0, 0.08, 0.3, 1] }}
          />

          {/* letterbox cinema bars */}
          <Letterbox closed={!settling} />

          {/* ------- STATUS / TYPE ------- */}
          <div className="absolute inset-x-0 bottom-[9%] flex flex-col items-center gap-3 px-6 text-center pointer-events-none" style={{ zIndex: 70 }}>
            <motion.div
              className="font-display text-lg md:text-xl tracking-[0.42em] uppercase text-gradient-vault"
              initial={{ opacity: 0, letterSpacing: '0.7em' }}
              animate={{ opacity: phase === 'fading' ? 0 : 1, letterSpacing: '0.42em' }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              Xelis Vault
            </motion.div>
            <HexReadout active={hexActive} settled={hexSettled} />
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

          <TerminalLog count={logCount} />

          {phase === 'playing' && !opened && (
            <motion.div
              className="absolute inset-x-0 bottom-3 text-center font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground/40 pointer-events-none"
              style={{ zIndex: 70 }}
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
