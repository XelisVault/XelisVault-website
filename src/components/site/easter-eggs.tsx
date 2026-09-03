'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { alpha, useCountdownState, randomGlyph, seededRandom } from '@/lib/countdown'

/**
 * ═══════════════════════════════════════════════════════════════════
 *  EASTER EGGS — hidden life across the whole site
 * ═══════════════════════════════════════════════════════════════════
 *
 *  7 secrets are hidden. Some hints live in the browser console…
 *
 *   ⌨  KONAMI CODE (↑↑↓↓←→←→BA) → VAULT OVERDRIVE (rainbow storm)
 *   ⌨  type "vault" | "coffre" | "xelis" → the mini vault opens
 *   ⌨  type "lea"                    → hearts, for the founder
 *   🖱  click the countdown dial 5× fast → do NOT shake the vault
 *   🖱  a tiny invisible ◆ hides at the bottom-left of every page —
 *      click it 3× → the cornerstone
 *   ⏱  stay idle for 60s             → the vault watches you
 *   🖥  open the console              → the vault speaks
 *
 *  Found secrets are remembered in localStorage and counted in toasts.
 */

const GOLD = 'oklch(0.85 0.12 80)'
const VIOLET = 'oklch(0.62 0.22 295)'
const EMERALD = 'oklch(0.72 0.14 160)'
const PINK = 'oklch(0.7 0.2 340)'

const SECRET_NAMES: Record<string, string> = {
  konami: 'Vault Overdrive',
  vault: 'The Mini Vault',
  coffre: 'Le Coffre Secret',
  xelis: 'The XELIS Sigil',
  lea: 'Pour léa ❤',
  shake: 'Vault Shaker',
  cornerstone: 'The Cornerstone',
  idle: 'The Watcher',
}
const TOTAL_SECRETS = Object.keys(SECRET_NAMES).length
const STORAGE_KEY = 'xv-secrets-found'

function loadSecrets(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch {
    /* ignore */
  }
  return new Set()
}

// ===== shared burst particles =====
function useBurst(seed: number, count: number, colors: string[]) {
  return useRef(
    (() => {
      const rnd = seededRandom(seed)
      return Array.from({ length: count }, (_, i) => {
        const a = rnd() * Math.PI * 2
        const dist = 90 + rnd() * 260
        return {
          id: i,
          x: Math.cos(a) * dist,
          y: Math.sin(a) * dist - 60,
          size: 4 + rnd() * 6,
          dur: 0.9 + rnd() * 0.8,
          color: colors[Math.floor(rnd() * colors.length)],
          rot: (rnd() - 0.5) * 540,
        }
      })
    })()
  ).current
}

// ═══════════════════ FX 1 · KONAMI OVERDRIVE ═══════════════════
function OverdriveFX() {
  const glyphs = useBurst(42, 46, [VIOLET, GOLD, EMERALD, PINK])
  const rain = useRef(
    Array.from({ length: 36 }, (_, i) => ({
      id: i,
      left: (i * 97) % 100,
      size: 10 + ((i * 13) % 18),
      dur: 1.4 + ((i * 7) % 10) / 8,
      delay: ((i * 11) % 14) / 10,
      glyph: randomGlyph(),
    }))
  ).current

  return (
    <motion.div
      className="fixed inset-0 z-[96] pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* rainbow storm */}
      <motion.div
        className="absolute -inset-[50%]"
        style={{
          background:
            'conic-gradient(from 0deg, oklch(0.62 0.22 295 / 0.16), oklch(0.8 0.17 65 / 0.14), oklch(0.72 0.14 160 / 0.14), oklch(0.7 0.2 340 / 0.16), oklch(0.62 0.22 295 / 0.16))',
          filter: 'blur(60px)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
      />
      {/* glyph rain */}
      {rain.map((g) => (
        <motion.span
          key={`rain-${g.id}`}
          className="absolute font-mono font-bold"
          style={{
            left: `${g.left}%`,
            fontSize: g.size,
            color: [VIOLET, GOLD, EMERALD, PINK][g.id % 4],
            textShadow: `0 0 12px currentColor`,
          }}
          initial={{ y: '-10vh' }}
          animate={{ y: '115vh' }}
          transition={{ duration: g.dur, delay: g.delay, repeat: Infinity, ease: 'linear' }}
        >
          {g.glyph}
        </motion.span>
      ))}
      {/* title */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [0.4, 1.15, 1], opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.2, 0.9, 0.3, 1] }}
          className="text-center"
        >
          <div
            className="font-display font-bold uppercase tracking-[0.1em]"
            style={{
              fontSize: 'clamp(2.4rem, 9vw, 7rem)',
              backgroundImage:
                'linear-gradient(100deg, oklch(0.62 0.22 295), oklch(0.8 0.17 65), oklch(0.72 0.14 160), oklch(0.7 0.2 340), oklch(0.62 0.22 295))',
              backgroundSize: '300% 100%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 30px oklch(0.62 0.22 295 / 0.5))',
            }}
          >
            <motion.span
              animate={{ backgroundPosition: ['0% 0%', '300% 0%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="block"
            >
              Vault Overdrive
            </motion.span>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-3 font-mono text-[10px] md:text-xs uppercase tracking-[0.6em] text-white/70"
          >
            30× energy · full privacy · zero rug
          </motion.div>
        </motion.div>
      </div>
      {/* burst */}
      <div className="absolute left-1/2 top-[42%]">
        {glyphs.map((p) => (
          <motion.span
            key={`b-${p.id}`}
            className="absolute rounded-full"
            style={{ width: p.size, height: p.size, background: p.color, boxShadow: `0 0 14px ${p.color}` }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.1 }}
            transition={{ duration: p.dur, ease: [0.1, 0.75, 0.25, 1] }}
          />
        ))}
      </div>
    </motion.div>
  )
}

// ═══════════════════ FX 2 · MINI VAULT ═══════════════════
function MiniVaultFX() {
  const bolts = useRef(
    Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2
      return { id: i, x: Math.cos(a) * 46, y: Math.sin(a) * 46 }
    })
  ).current
  const confetti = useBurst(99, 36, [GOLD, 'oklch(0.98 0.02 80)', VIOLET])

  return (
    <motion.div
      className="fixed left-1/2 top-[16%] z-[96] pointer-events-none"
      initial={{ x: '-50%', y: -140, opacity: 0 }}
      animate={{ x: '-50%', y: 0, opacity: 1 }}
      exit={{ y: -140, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <motion.svg
        width="150"
        height="150"
        viewBox="-75 -75 150 150"
        initial={{ rotate: -160, scale: 0.5 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ duration: 0.85, ease: [0.3, 0.9, 0.3, 1] }}
      >
        {/* glow behind the opening */}
        <motion.circle
          r={30}
          fill={GOLD}
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ opacity: [0, 0.9, 0.5], scale: [0.2, 1.6, 1.3] }}
          transition={{ delay: 0.9, duration: 1 }}
          style={{ filter: 'blur(2px)' }}
        />
        {/* door */}
        <circle r={54} fill="oklch(0.16 0.03 285)" stroke={`${alpha(GOLD, 0.7)}`} strokeWidth={2.5} />
        {/* bolts fly out */}
        {bolts.map((b, i) => (
          <motion.circle
            key={b.id}
            cx={b.x}
            cy={b.y}
            r={4.5}
            fill={GOLD}
            initial={{ opacity: 1 }}
            animate={{ x: b.x * 2.1, y: b.y * 2.1, opacity: 0 }}
            transition={{ delay: 0.55 + i * 0.07, duration: 0.45, ease: 'backIn' }}
          />
        ))}
        {/* spokes */}
        <motion.g
          animate={{ rotate: 720 }}
          transition={{ duration: 1.1, ease: [0.4, 0, 0.3, 1] }}
          style={{ transformOrigin: '0px 0px' }}
        >
          {[0, 90, 180, 270].map((deg) => (
            <rect key={deg} x={-3} y={-32} width={6} height={24} rx={3} fill={`${alpha(GOLD, 0.8)}`} transform={`rotate(${deg})`} />
          ))}
        </motion.g>
        <circle r={14} fill="oklch(0.14 0.03 285)" stroke={`${alpha(GOLD, 0.9)}`} strokeWidth={2} />
        {/* the treasure sparkle */}
        <motion.path
          d="M 0 -7 L 2 -2 L 7 0 L 2 2 L 0 7 L -2 2 L -7 0 L -2 -2 Z"
          fill="oklch(0.98 0.02 80)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.9] }}
          transition={{ delay: 1.05, duration: 0.6, type: 'spring' }}
          style={{ filter: `drop-shadow(0 0 8px ${GOLD})` }}
        />
      </motion.svg>
      {/* confetti */}
      {confetti.map((p) => (
        <motion.span
          key={`c-${p.id}`}
          className="absolute rounded-full left-1/2 top-1/2"
          style={{ width: p.size, height: p.size, background: p.color, boxShadow: `0 0 10px ${p.color}` }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rot }}
          transition={{ duration: p.dur, delay: 0.95, ease: [0.1, 0.75, 0.25, 1] }}
        />
      ))}
    </motion.div>
  )
}

// ═══════════════════ FX 3 · HEARTS FOR LEA ═══════════════════
function HeartsFX() {
  const hearts = useRef(
    Array.from({ length: 26 }, (_, i) => ({
      id: i,
      left: 4 + ((i * 83) % 92),
      size: 14 + ((i * 17) % 22),
      dur: 2.4 + ((i * 13) % 18) / 10,
      delay: ((i * 7) % 20) / 10,
      color: [PINK, GOLD, VIOLET][i % 3],
    }))
  ).current

  return (
    <motion.div
      className="fixed inset-0 z-[96] pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {hearts.map((h) => (
        <motion.span
          key={`h-${h.id}`}
          className="absolute font-mono"
          style={{ left: `${h.left}%`, fontSize: h.size, color: h.color, textShadow: `0 0 16px ${h.color}` }}
          initial={{ y: '108vh', opacity: 0, rotate: -8 }}
          animate={{ y: '-12vh', opacity: [0, 1, 1, 0], rotate: 8 }}
          transition={{ duration: h.dur, delay: h.delay, ease: 'easeOut' }}
        >
          ❤
        </motion.span>
      ))}
      <div className="absolute left-1/2 top-[20%] -translate-x-1/2 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.08, 1], opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="glass-panel rounded-2xl px-6 py-4"
        >
          <div className="font-display text-xl md:text-2xl font-semibold" style={{ color: PINK }}>
            Pour léa
          </div>
          <div className="mt-1 font-mono text-[10px] md:text-xs uppercase tracking-[0.35em] text-muted-foreground">
            merci de faire vivre le coffre
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ═══════════════════ FX 4 · CORNERSTONE ═══════════════════
function CornerstoneFX({ x, y }: { x: number; y: number }) {
  const sparks = useBurst(123, 30, [GOLD, 'oklch(0.98 0.02 80)'])
  return (
    <motion.div className="fixed z-[96] pointer-events-none" style={{ left: x, top: y }} initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.3em]"
        style={{ color: GOLD, textShadow: `0 0 12px ${GOLD}` }}
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: [0, 1, 0], y: -46 }}
        transition={{ duration: 1.6 }}
      >
        the cornerstone
      </motion.div>
      {sparks.map((p) => (
        <motion.span
          key={`s-${p.id}`}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, background: p.color, boxShadow: `0 0 12px ${p.color}` }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.1 }}
          transition={{ duration: p.dur, ease: [0.1, 0.75, 0.25, 1] }}
        />
      ))}
    </motion.div>
  )
}

// ═══════════════════ FX 5 · IDLE SCREENSAVER ═══════════════════
function ScreenSaver() {
  const glyphs = useRef(
    Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: (i * 89) % 96,
      top: (i * 47) % 88,
      size: 10 + ((i * 13) % 16),
      dur: 7 + ((i * 11) % 10),
      glyph: randomGlyph(),
      color: [VIOLET, EMERALD, GOLD][i % 3],
    }))
  ).current

  return (
    <motion.div
      className="fixed inset-0 z-[95] pointer-events-none flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.4 }}
      style={{ background: 'oklch(0.07 0.02 280 / 0.82)', backdropFilter: 'blur(6px)' }}
    >
      {glyphs.map((g) => (
        <motion.span
          key={`g-${g.id}`}
          className="absolute font-mono"
          style={{ left: `${g.left}%`, top: `${g.top}%`, fontSize: g.size, color: g.color, opacity: 0.35 }}
          animate={{ y: [0, -30, 0], opacity: [0.15, 0.4, 0.15] }}
          transition={{ duration: g.dur, repeat: Infinity, ease: 'easeInOut' }}
        >
          {g.glyph}
        </motion.span>
      ))}
      <motion.div
        className="text-center"
        animate={{ opacity: [0.35, 0.8, 0.35] }}
        transition={{ duration: 3.2, repeat: Infinity }}
      >
        <div className="font-mono text-[10px] md:text-xs uppercase tracking-[0.6em]" style={{ color: VIOLET }}>
          The vault watches
        </div>
        <div className="mt-3 font-mono text-[9px] md:text-[10px] uppercase tracking-[0.4em] text-muted-foreground/60">
          move to wake it
        </div>
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════ MAIN ═══════════════════
export function EasterEggs() {
  const { toast } = useToast()
  const { isFinalCountdown } = useCountdownState()
  const [fx, setFx] = useState<{ id: number; kind: string; x?: number; y?: number } | null>(null)
  const [idle, setIdle] = useState(false)
  const secretsRef = useRef<Set<string>>(loadSecrets())
  const lastFiredRef = useRef<Record<string, number>>({})
  const clicksRef = useRef<number[]>([])
  const stoneClicksRef = useRef<number[]>([])
  const consoleShownRef = useRef(false)

  const registerSecret = useCallback(
    (id: string) => {
      const isNew = !secretsRef.current.has(id)
      secretsRef.current.add(id)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...secretsRef.current]))
      } catch {
        /* private mode */
      }
      const found = secretsRef.current.size
      const name = SECRET_NAMES[id] ?? id
      toast({
        title: isNew ? `🔑 Secret unlocked, ${name}` : `🔑 ${name}`,
        description: isNew
          ? `${found} / ${TOTAL_SECRETS} secrets found. Keep exploring…`
          : 'Already in your collection.',
        duration: 4200,
      })
    },
    [toast]
  )

  const fire = useCallback(
    (kind: string, opts?: { x?: number; y?: number }) => {
      setFx({ id: Date.now(), kind, x: opts?.x, y: opts?.y })
    },
    []
  )

  // gate: eggs can't fire twice within 6s each
  const canFire = useCallback((id: string, cooldown = 6000) => {
    const now = Date.now()
    if (now - (lastFiredRef.current[id] ?? 0) < cooldown) return false
    lastFiredRef.current[id] = now
    return true
  }, [])

  // ── keyboard: konami + typed words ──
  useEffect(() => {
    let keyBuf = ''
    let wordBuf = ''
    const KONAMI = 'UUDDLRLRBA'

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) {
        wordBuf = ''
        return
      }

      // konami mapping
      const map: Record<string, string> = {
        ArrowUp: 'U',
        ArrowDown: 'D',
        ArrowLeft: 'L',
        ArrowRight: 'R',
      }
      const k = map[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : '')
      if (k) {
        keyBuf = (keyBuf + k).slice(-10)
        if (keyBuf === KONAMI) {
          keyBuf = ''
          if (canFire('konami')) {
            fire('konami')
            registerSecret('konami')
          }
        }
      }

      // typed words
      if (/^[a-zA-Z]$/.test(e.key)) {
        wordBuf = (wordBuf + e.key.toLowerCase()).slice(-12)
        if (wordBuf.endsWith('coffre')) {
          wordBuf = ''
          if (canFire('coffre')) {
            fire('minivault')
            registerSecret('coffre')
          }
        } else if (wordBuf.endsWith('vault')) {
          wordBuf = ''
          if (canFire('vault')) {
            fire('minivault')
            registerSecret('vault')
          }
        } else if (wordBuf.endsWith('xelis')) {
          wordBuf = ''
          if (canFire('xelis')) {
            fire('minivault')
            registerSecret('xelis')
          }
        } else if (wordBuf.endsWith('lea')) {
          wordBuf = ''
          if (canFire('lea')) {
            fire('hearts')
            registerSecret('lea')
          }
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [canFire, fire, registerSecret])

  // ── custom events from other components (dial shake) ──
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string; detail?: string } | undefined
      const id = detail?.id
      if (!id) return
      if (id === 'shake' && canFire('shake')) registerSecret('shake')
    }
    window.addEventListener('xv:egg', handler)
    return () => window.removeEventListener('xv:egg', handler)
  }, [canFire, registerSecret])

  // ── idle screensaver ──
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const reset = () => {
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), 60_000)
    }
    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }))
    reset()
    return () => {
      clearTimeout(timer)
      events.forEach((ev) => window.removeEventListener(ev, reset))
    }
  }, [])

  // idle = secret (only once ever counted)
  useEffect(() => {
    if (idle && !secretsRef.current.has('idle')) registerSecret('idle')
  }, [idle, registerSecret])

  // ── console whisper ──
  useEffect(() => {
    if (consoleShownRef.current) return
    consoleShownRef.current = true
    try {
      const style = 'color: oklch(0.85 0.12 80); font-family: monospace; font-size: 12px;'
      const violet = 'color: oklch(0.7 0.18 310); font-family: monospace;'
      console.log(
        '%c     __\n    /  \\    XELIS VAULT\n   | [] |   confidential finance\n    \\__/    for the privacy era\n',
        style
      )
      console.log(
        '%cCurious one… %c%d secrets are hidden across this site.',
        violet,
        'color: oklch(0.85 0.12 80); font-family: monospace;',
        TOTAL_SECRETS
      )
      console.log(
        '%cTry the Konami code. Try typing what you seek. Try not moving at all. Try shaking the countdown…',
        'color: oklch(0.7 0.16 90); font-family: monospace; font-size: 11px;'
      )
      const found = secretsRef.current.size
      if (found > 0) {
        console.log('%cYou already found %d. The vault remembers.', 'color: oklch(0.72 0.14 160); font-family: monospace;', found)
      }
    } catch {
      /* console unavailable */
    }
  }, [])

  // fx auto-dismiss
  useEffect(() => {
    if (!fx) return
    const durations: Record<string, number> = {
      konami: 6500,
      minivault: 3400,
      hearts: 4200,
      cornerstone: 2000,
    }
    const t = setTimeout(() => setFx(null), durations[fx.kind] ?? 3000)
    return () => clearTimeout(t)
  }, [fx])

  // ── the hidden cornerstone (bottom-left, on every page) ──
  const handleStone = (e: React.MouseEvent) => {
    const now = Date.now()
    stoneClicksRef.current = [...stoneClicksRef.current.filter((t) => now - t < 3000), now]
    if (stoneClicksRef.current.length >= 3) {
      stoneClicksRef.current = []
      if (canFire('cornerstone')) {
        fire('cornerstone', { x: e.clientX, y: e.clientY })
        registerSecret('cornerstone')
      }
    }
  }

  return (
    <>
      {/* hidden hotspot */}
      {!isFinalCountdown && (
        <button
          aria-label="?"
          onClick={handleStone}
          className="fixed bottom-2 left-2 z-[60] w-6 h-6 flex items-center justify-center text-[9px] opacity-[0.06] hover:opacity-60 transition-opacity duration-300 cursor-pointer"
          style={{ color: GOLD }}
        >
          ◆
        </button>
      )}

      <AnimatePresence>{idle && !isFinalCountdown && <ScreenSaver key="screensaver" />}</AnimatePresence>

      <AnimatePresence>
        {fx?.kind === 'konami' && <OverdriveFX key={`fx-${fx.id}`} />}
        {fx?.kind === 'minivault' && <MiniVaultFX key={`fx-${fx.id}`} />}
        {fx?.kind === 'hearts' && <HeartsFX key={`fx-${fx.id}`} />}
        {fx?.kind === 'cornerstone' && <CornerstoneFX key={`fx-${fx.id}`} x={fx.x ?? 40} y={fx.y ?? 40} />}
      </AnimatePresence>
    </>
  )
}
