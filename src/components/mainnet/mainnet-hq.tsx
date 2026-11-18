// MAINNET HQ — the retro experience.
//
// A deliberate contrast inside the Maison site: the private-banking
// pages stay editorial, and THIS page is the "cartridge" — a CRT
// terminal from a 1986 that happens to know about confidential
// finance. Every interaction is real: worlds open, levels explain the
// actual protocol features (same facts as the marketing pages), the
// countdown runs to the published June 2027 mainnet window, and the
// quest log is the real roadmap.
//
// Craft rules kept throughout:
//   • pixels stay crisp: integer sprite scales, shape-rendering
//     crispEdges, steps() animations (no smooth interpolation)
//   • reduced-motion: the page is fully static and instant
//   • keyboard: arrows move, Enter opens, Esc closes — everything is
//     a real <button> so Tab/Enter work natively too
//   • no photosensitivity traps: no full-screen flashes, the CRT
//     flicker is a 3% opacity breath

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { PixelSprite, type SpriteName } from './pixel-sprites'
import {
  WORLDS, QUESTS, STATUS_META, MARQUEE_ITEMS,
  MAINNET_WINDOW_MS, MAINNET_WINDOW_SUB, MISSION_PROGRESS,
  type Level, type World,
} from './pixel-data'
import { FONT_PIXEL, FONT_VT } from '@/lib/pixel-fonts'

// ── CRT palette ─────────────────────────────────────────────────────

const C = {
  void: '#0a0c14',
  panel: '#10131f',
  panelHi: '#151a2c',
  line: '#232a44',
  lineHi: '#39436b',
  gold: '#f0b35c',
  teal: '#5cc8d7',
  emerald: '#6ee7a0',
  red: '#d95763',
  paper: '#e8e4d8',
  steel: '#8a93b0',
  dim: '#5a6480',
}

const ACCENTS: Record<World['accent'], string> = {
  gold: C.gold,
  teal: C.teal,
  emerald: C.emerald,
  red: C.red,
  violet: '#b18cf0',
}

// ── Pixel chrome ────────────────────────────────────────────────────

/** Chunky retro bevel + hard offset shadow. No clip-path fragility. */
function pixelBox(
  border = C.line,
  bg = C.panel,
  extra: React.CSSProperties = {},
): React.CSSProperties {
  return {
    border: `2px solid ${border}`,
    background: bg,
    boxShadow: `4px 4px 0 rgba(0,0,0,0.55), inset 2px 2px 0 rgba(255,255,255,0.045), inset -2px -2px 0 rgba(0,0,0,0.4)`,
    ...extra,
  }
}

function PixelButton({
  children,
  onClick,
  href,
  accent = C.gold,
  filled = false,
  className,
  style,
  title,
  small,
}: {
  children: React.ReactNode
  onClick?: () => void
  href?: string
  accent?: string
  filled?: boolean
  className?: string
  style?: React.CSSProperties
  title?: string
  small?: boolean
}) {
  const [hover, setHover] = useState(false)
  const [down, setDown] = useState(false)
  const box: React.CSSProperties = {
    ...pixelBox(hover ? accent : C.line, filled ? accent : C.panel),
    color: filled ? C.void : accent,
    transform: down ? 'translate(2px, 2px)' : hover ? 'translate(-2px, -2px)' : 'none',
    boxShadow: down
      ? '0 0 0 rgba(0,0,0,0)'
      : hover
        ? `6px 6px 0 rgba(0,0,0,0.6), inset 2px 2px 0 rgba(255,255,255,0.07)`
        : pixelBox().boxShadow,
    transition: 'transform 70ms steps(2), box-shadow 70ms steps(2), border-color 70ms steps(2)',
    letterSpacing: '0.08em',
    ...style,
  }
  const cls = cn(
    'inline-flex items-center gap-2 select-none cursor-pointer',
    small ? 'px-3 py-1.5 text-[9px]' : 'px-5 py-3 text-[10px]',
    FONT_PIXEL,
    className,
  )
  const inner = <>{children}</>
  if (href) {
    return (
      <Link href={href} className={cls} style={box} title={title}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setDown(false) }}
        onMouseDown={() => setDown(true)} onMouseUp={() => setDown(false)}
      >
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" className={cls} style={box} title={title} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setDown(false) }}
      onMouseDown={() => setDown(true)} onMouseUp={() => setDown(false)}
    >
      {inner}
    </button>
  )
}

/** Tiny 3-line "corner brackets" marker for selected cards. */
function CornerTicks({ color }: { color: string }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {[
        'left-[-2px] top-[-2px]',
        'right-[-2px] top-[-2px]',
        'left-[-2px] bottom-[-2px]',
        'right-[-2px] bottom-[-2px]',
      ].map((pos) => (
        <span key={pos} className={cn('absolute h-[5px] w-[5px]', pos)} style={{ background: color }} />
      ))}
    </span>
  )
}

// ── 8-bit sound (default OFF — opt-in chip in the HUD) ──────────────

function useBlips(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)
  const blip = useCallback(
    (freq: number, dur = 0.05, type: OscillatorType = 'square', gain = 0.04, when = 0) => {
      if (!enabled) return
      try {
        if (!ctxRef.current) {
          const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
          if (!AC) return
          ctxRef.current = new AC()
        }
        const ctx = ctxRef.current
        if (ctx.state === 'suspended') void ctx.resume()
        const t = ctx.currentTime + when
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = type
        osc.frequency.setValueAtTime(freq, t)
        g.gain.setValueAtTime(gain, t)
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
        osc.connect(g).connect(ctx.destination)
        osc.start(t)
        osc.stop(t + dur + 0.02)
      } catch { /* audio blocked — the toggle simply does nothing */ }
    },
    [enabled],
  )
  return useMemo(() => ({
    move: () => blip(660, 0.035),
    select: () => { blip(880, 0.05); blip(1318, 0.07, 'square', 0.035, 0.055) },
    back: () => blip(330, 0.06),
    boot: () => { blip(523, 0.06); blip(659, 0.06, 'square', 0.035, 0.07); blip(784, 0.09, 'square', 0.04, 0.14) },
  }), [blip])
}

// ── CRT overlays ────────────────────────────────────────────────────

function CRTLayer({ motionOk }: { motionOk: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40">
      {/* scanlines — light enough to keep small text crisp */}
      <div
        className="absolute inset-0"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(5,7,12,0.15) 0px, rgba(5,7,12,0.15) 1px, transparent 1px, transparent 3px)',
          mixBlendMode: 'multiply',
        }}
      />
      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 120% 105% at 50% 42%, transparent 55%, rgba(4,6,10,0.55) 100%)' }}
      />
      {/* breathing flicker — 3%, safe */}
      {motionOk && (
        <div
          className="absolute inset-0"
          style={{
            background: 'rgba(150,190,255,0.03)',
            animation: 'xv-crt-flicker 4.2s steps(3) infinite',
          }}
        />
      )}
    </div>
  )
}

/** Two parallax star layers drawn with box-shadow pixel stars. */
function Starfield({ motionOk }: { motionOk: boolean }) {
  const layers = useMemo(() => {
    const rnd = (seed: number) => {
      let x = seed
      return () => { x = (x * 16807) % 2147483647; return x / 2147483647 }
    }
    const make = (seed: number, n: number, colors: string[]) => {
      const r = rnd(seed)
      const shadows: string[] = []
      for (let i = 0; i < n; i++) {
        const left = Math.floor(r() * 2000)
        const top = Math.floor(r() * 1600)
        shadows.push(`${left}px ${top}px 0 ${colors[Math.floor(r() * colors.length)]}`)
      }
      return shadows.join(', ')
    }
    return [
      { shadow: make(42, 70, ['#39436b', '#2c3454']), dur: 90, size: 2 },
      { shadow: make(7, 26, ['#8a93b0', '#f0b35c', '#5cc8d7']), dur: 55, size: 2 },
    ]
  }, [])
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {layers.map((l, i) => (
        <div
          key={i}
          className="absolute -inset-y-[1600px] inset-x-0"
          style={{
            height: 'auto',
            width: '100%',
          }}
        >
          <div
            className="h-[1600px] w-full"
            style={{
              backgroundImage: 'none',
              boxShadow: l.shadow,
              transform: 'translateY(-50%)',
              ...(motionOk
                ? { animation: `xv-stars-${i} ${l.dur}s linear infinite` }
                : {}),
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes xv-stars-0 { from { transform: translateY(0); } to { transform: translateY(800px); } }
        @keyframes xv-stars-1 { from { transform: translateY(0); } to { transform: translateY(800px); } }
      `}</style>
    </div>
  )
}

// ── Boot sequence ───────────────────────────────────────────────────

const BOOT_LINES = [
  'XELISVAULT OS  v2027.6',
  'ARCHIVE LINK ......... OK',
  'PRIVACY MODULE ....... OK',
  'MAINNET COUNTDOWN .... LOADED',
]

function BootSequence({ onDone, sound }: { onDone: () => void; sound: () => void }) {
  const reduced = useReducedMotion()
  const [lines, setLines] = useState<string[]>(reduced ? BOOT_LINES : [])
  const [ready, setReady] = useState(reduced)

  useEffect(() => {
    if (reduced) return
    let i = 0
    const t = setInterval(() => {
      i++
      setLines(BOOT_LINES.slice(0, i))
      if (i >= BOOT_LINES.length) {
        clearInterval(t)
        setTimeout(() => setReady(true), 240)
      }
    }, 210)
    return () => clearInterval(t)
  }, [reduced])

  useEffect(() => {
    const go = () => { sound(); onDone() }
    const onKey = (e: KeyboardEvent) => { if (ready || e.key === 'Enter' || e.key === ' ') go() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', go)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', go)
    }
  }, [ready, onDone, sound])

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center"
      style={{ background: C.void }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.28 } }}
      onClick={() => { sound(); onDone() }}
    >
      {/* the boot screen IS a CRT — scanlines + vignette + phosphor glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(0deg, rgba(5,7,12,0.22) 0px, rgba(5,7,12,0.22) 1px, transparent 1px, transparent 3px)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 120% 100% at 50% 45%, transparent 52%, rgba(3,5,9,0.7) 100%)' }} />
      </div>
      <div className={cn('relative w-[min(92vw,560px)] px-6 py-8 sm:px-10', FONT_VT)} style={pixelBox(C.line, '#0c101c')}>
        <CornerTicks color={C.emerald} />
        <div className="text-[22px] leading-relaxed" style={{ color: C.emerald, textShadow: '0 0 12px rgba(110,231,160,0.35)' }}>
          {lines.map((l, i) => (
            <div key={i} className="whitespace-pre">{l}</div>
          ))}
          {!ready && <span className="inline-block h-[18px] w-[11px] translate-y-[2px]" style={{ background: C.emerald, animation: 'xv-blink 0.9s steps(2) infinite' }} />}
        </div>
        <div className={cn('mt-10 text-center', FONT_PIXEL)}>
          {ready ? (
            <span
              className="text-[15px] sm:text-[19px]"
              style={{ color: C.gold, animation: 'xv-blink-soft 1.3s steps(2) infinite', textShadow: `3px 3px 0 ${C.void}, 0 0 22px rgba(240,179,92,0.45)` }}
            >
              &gt;&gt; PRESS START
            </span>
          ) : (
            <span className="text-[10px]" style={{ color: C.dim }}>LOADING…</span>
          )}
        </div>
        <div className={cn('mt-5 text-center text-[17px]', FONT_VT)} style={{ color: C.dim }}>
          click / enter · sound stays off until you turn it on
        </div>
      </div>
    </motion.div>
  )
}

// ── Countdown ───────────────────────────────────────────────────────

function useCountdown(target: number) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const left = Math.max(0, target - (now ?? target))
  const s = Math.floor(left / 1000)
  return {
    ready: now != null,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    open: now != null && now >= target,
  }
}

function CountdownClock({ compact }: { compact?: boolean }) {
  const cd = useCountdown(MAINNET_WINDOW_MS)
  const cells: [string, number][] = [
    ['DAYS', cd.days],
    ['HRS', cd.hours],
    ['MIN', cd.minutes],
    ['SEC', cd.seconds],
  ]
  if (cd.open) {
    return (
      <span className={cn(FONT_PIXEL, 'text-[11px]')} style={{ color: C.emerald }}>
        ▶ MAINNET WINDOW IS OPEN
      </span>
    )
  }
  return (
    <span className="inline-flex items-end gap-1.5 sm:gap-2.5" role="timer" aria-label={`mainnet window in ${cd.days} days`}>
      {cells.map(([label, v], i) => (
        <span key={label} className="inline-flex items-center gap-1.5 sm:gap-2.5">
          {i > 0 && (
            <span
              aria-hidden
              className={cn('translate-y-[-4px]', FONT_VT)}
              style={{ color: C.gold, fontSize: compact ? 20 : 30, animation: 'xv-blink 1s steps(2) infinite' }}
            >
              :
            </span>
          )}
          <span className="inline-flex flex-col items-center">
            <span
              className={cn('tabular-nums', FONT_VT)}
              style={{
                color: C.paper,
                fontSize: compact ? 24 : 46,
                lineHeight: 0.95,
                textShadow: `0 0 14px rgba(232,228,216,0.12)`,
              }}
            >
              {cd.ready ? String(v).padStart(2, '0') : '--'}
            </span>
            <span className={cn(FONT_PIXEL, 'mt-1')} style={{ color: C.dim, fontSize: compact ? 6 : 8 }}>
              {label}
            </span>
          </span>
        </span>
      ))}
    </span>
  )
}

// ── HUD ─────────────────────────────────────────────────────────────

function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items]
  return (
      <div
      aria-hidden
      className="relative flex-1 overflow-hidden border-y-2"
      style={{
        borderColor: C.line,
        background: '#0c0f1a',
        maskImage: 'linear-gradient(90deg, transparent, black 5%, black 93%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, black 5%, black 93%, transparent)',
      }}
    >
      <div
        className="flex w-max items-center gap-10 py-1.5"
        style={{ animation: 'xv-marquee 46s linear infinite' }}
      >
        {row.map((it, i) => (
          <span key={i} className={cn('flex items-center gap-3 whitespace-nowrap', FONT_PIXEL)} style={{ fontSize: 8, color: i % 2 ? C.teal : C.gold }}>
            <span style={{ color: C.dim }}>+</span> {it}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Cards ───────────────────────────────────────────────────────────

function StatusChip({ status }: { status: Level['status'] }) {
  const m = STATUS_META[status]
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 px-1.5 py-1', FONT_PIXEL)}
      style={{
        fontSize: 7,
        color: m.color,
        border: `1px solid ${m.color}`,
        background: `${m.color}14`,
        letterSpacing: '0.12em',
      }}
    >
      {status === 'live' && <span className="inline-block h-[5px] w-[5px]" style={{ background: m.color, animation: 'xv-blink 1.2s steps(2) infinite' }} />}
      {status === 'audited' && '✓ '}
      {m.label}
    </span>
  )
}

function LevelCard({
  level,
  selected,
  onSelect,
  motionOk,
  sound,
}: {
  level: Level
  selected: boolean
  onSelect: () => void
  motionOk: boolean
  sound: { move: () => void; select: () => void }
}) {
  const accent = STATUS_META[level.status].color
  return (
    <button
      type="button"
      onClick={() => { sound.select(); onSelect() }}
      onMouseEnter={() => sound.move()}
      onFocus={() => sound.move()}
      data-level-card={level.id}
      className={cn('group relative flex flex-col items-start gap-2.5 p-4 text-left', motionOk && 'transition-transform duration-75')}
      style={{
        ...pixelBox(selected ? accent : C.line, C.panel),
        transform: selected ? 'translate(-2px,-2px)' : undefined,
      }}
    >
      {selected && <CornerTicks color={accent} />}
      <span className="flex w-full items-start justify-between gap-2">
        <PixelSprite
          name={level.sprite}
          px={4}
          title={level.name}
          style={motionOk ? { animation: `xv-bob 1.4s steps(2) infinite` } : undefined}
        />
        <StatusChip status={level.status} />
      </span>
      <span className={cn(FONT_PIXEL, 'leading-relaxed')} style={{ fontSize: 10, color: C.paper }}>
        {level.name}
      </span>
      <span className={cn(FONT_VT, 'leading-snug')} style={{ fontSize: 17, color: C.steel }}>
        {level.hook}
      </span>
      <span className="mt-auto flex w-full items-center gap-2 pt-1">
        <span className="relative h-[8px] flex-1" style={{ border: `1px solid ${C.line}`, background: '#0c0f1a' }}>
          <span
            className="absolute inset-y-0 left-0"
            style={{
              width: `${Math.round(level.progress * 100)}%`,
              background: `repeating-linear-gradient(90deg, ${accent} 0 4px, transparent 4px 6px)`,
              ...(motionOk ? { animation: 'xv-load 0.9s steps(8)' } : {}),
            }}
          />
        </span>
        <span className={cn(FONT_PIXEL, 'tabular-nums')} style={{ fontSize: 7, color: accent }}>
          {Math.round(level.progress * 100)}%
        </span>
      </span>
    </button>
  )
}

function LevelDetail({ level, onClose }: { level: Level; onClose: () => void }) {
  const m = STATUS_META[level.status]
  const accent = m.color
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.22 } }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
      className="relative mt-4 p-5 sm:p-7"
      style={pixelBox(accent, C.panelHi)}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            className="flex h-16 w-16 items-center justify-center"
            style={{ border: `2px solid ${C.line}`, background: C.void }}
          >
            <PixelSprite name={level.sprite} px={4} title={level.name} style={{ animation: 'xv-bob 1.6s steps(2) infinite' }} />
          </span>
          <div>
            <h3 className={cn(FONT_PIXEL)} style={{ fontSize: 14, color: C.paper }}>{level.name}</h3>
            <div className="mt-2"><StatusChip status={level.status} /></div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={cn('px-3 py-2', FONT_PIXEL)}
          style={{ ...pixelBox(C.line, C.panel), fontSize: 8, color: C.steel }}
          aria-label="close details"
        >
          ESC ✕
        </button>
      </div>

      <div className="mt-6 grid gap-7 lg:grid-cols-[1.2fr_1fr]">
        <section>
          <h4 className={cn(FONT_PIXEL, 'mb-3')} style={{ fontSize: 9, color: accent, letterSpacing: '0.18em' }}>
            ▚ WHAT IT DOES
          </h4>
          <p className={cn(FONT_VT, 'leading-snug')} style={{ fontSize: 20, color: C.paper }}>
            {level.what}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {level.facts.map((f) => (
              <span
                key={f}
                className={cn('px-2 py-1', FONT_PIXEL)}
                style={{ fontSize: 7, color: C.teal, border: `1px solid ${C.line}`, background: C.void, letterSpacing: '0.1em' }}
              >
                {f}
              </span>
            ))}
          </div>
        </section>
        <section>
          <h4 className={cn(FONT_PIXEL, 'mb-3')} style={{ fontSize: 9, color: accent, letterSpacing: '0.18em' }}>
            ▚ WHAT YOU&apos;LL DO ON MAINNET
          </h4>
          <ul className="flex flex-col gap-2">
            {level.youWill.map((y) => (
              <li key={y} className={cn('flex gap-2 leading-snug', FONT_VT)} style={{ fontSize: 19, color: C.paper }}>
                <span style={{ color: accent }}>▸</span>{y}
              </li>
            ))}
          </ul>
          <div className={cn('mt-4', FONT_VT)} style={{ fontSize: 16, color: C.dim }}>
            · {m.note}
          </div>
        </section>
      </div>

      {(level.status === 'live' || level.status === 'audited') && (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t-2 pt-5" style={{ borderColor: C.line }}>
          <PixelButton href="/launch" filled small>
            {level.status === 'live' ? '>> PLAY IT NOW' : '>> SEE IT IN THE APP'}
          </PixelButton>
          <span className={cn(FONT_VT)} style={{ fontSize: 16, color: C.dim }}>
            {level.status === 'live' ? 'live on the XELIS mainnet — real wallet, real chain' : 'the audited module, ready for the drop'}
          </span>
        </div>
      )}
    </motion.div>
  )
}

function WorldCard({
  world,
  active,
  onSelect,
  sound,
}: {
  world: World
  active: boolean
  onSelect: () => void
  sound: { move: () => void; select: () => void }
}) {
  const accent = ACCENTS[world.accent]
  return (
    <button
      type="button"
      onClick={() => { sound.select(); onSelect() }}
      onMouseEnter={() => sound.move()}
      data-world-card={world.id}
      className="group relative flex w-[190px] shrink-0 snap-start flex-col gap-3 p-4 text-left sm:w-[210px]"
      style={{
        ...pixelBox(active ? accent : C.line, active ? '#141a30' : C.panel),
        transform: active ? 'translate(-2px,-2px)' : undefined,
      }}
    >
      {active && <CornerTicks color={accent} />}
      <span className="flex items-center justify-between">
        <span className={cn(FONT_PIXEL)} style={{ fontSize: 8, color: accent }}>{world.code}</span>
        {world.id === 'floor' && (
          <span className={cn(FONT_PIXEL, 'inline-block h-2 w-2 rounded-none')} style={{ background: C.emerald, animation: 'xv-blink 1.1s steps(2) infinite' }} aria-label="live" />
        )}
      </span>
      <PixelSprite name={world.sprite} px={5} title={world.name} style={{ animation: 'xv-bob 1.8s steps(2) infinite' }} />
      <span className={cn(FONT_PIXEL, 'leading-relaxed')} style={{ fontSize: 11, color: active ? accent : C.paper }}>
        {world.name}
      </span>
      <span className={cn(FONT_VT, 'leading-snug')} style={{ fontSize: 16, color: C.steel }}>
        {world.tagline}
      </span>
      <span className={cn('mt-auto pt-1', FONT_PIXEL)} style={{ fontSize: 7, color: C.dim }}>
        {world.levels.length} LEVEL{world.levels.length > 1 ? 'S' : ''} ·{' '}
        {world.levels.filter((l) => l.status === 'live').length > 0 ? (
          <span style={{ color: C.emerald }}>LIVE</span>
        ) : (
          <span style={{ color: C.teal }}>BUILDING</span>
        )}
      </span>
    </button>
  )
}

// ── Quest log ───────────────────────────────────────────────────────

function QuestLog() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {QUESTS.map((q) => {
        const color = q.state === 'done' ? C.emerald : q.state === 'active' ? C.gold : C.steel
        return (
          <div
            key={q.id}
            className="relative flex items-center gap-4 p-4"
            style={pixelBox(q.state === 'active' ? C.gold : C.line, C.panel)}
          >
            {q.state === 'active' && <CornerTicks color={C.gold} />}
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center text-[13px]"
              style={{ border: `2px solid ${color}`, color, background: C.void }}
              aria-label={q.state}
            >
              {q.state === 'done' ? '✓' : q.state === 'active' ? '⚡' : '🔒'}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate', FONT_PIXEL)} style={{ fontSize: 9, color: q.state === 'locked' ? C.gold : C.paper }}>
                {q.name}
              </span>
              <span className={cn('mt-1.5 block', FONT_VT)} style={{ fontSize: 16, color: C.steel }}>
                {q.date} · {q.note}
              </span>
            </span>
            {q.state === 'active' && (
              <span className={cn('shrink-0', FONT_PIXEL)} style={{ fontSize: 7, color: C.gold, animation: 'xv-blink 1.3s steps(2) infinite' }}>
                IN PROGRESS
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── The page ────────────────────────────────────────────────────────

export function MainnetHQ() {
  const reduced = useReducedMotion()
  const motionOk = !reduced
  const [booted, setBooted] = useState(true) // SSR-safe: boot only mounts client-side
  const [needBoot, setNeedBoot] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [world, setWorld] = useState<World>(WORLDS[0])
  const [openLevel, setOpenLevel] = useState<Level | null>(null)
  const sound = useBlips(soundOn)
  const gridRef = useRef<HTMLDivElement>(null)

  // boot once per session (skipped entirely under reduced motion)
  useEffect(() => {
    try {
      if (sessionStorage.getItem('xv-mainnet-booted') === '1') return
      sessionStorage.setItem('xv-mainnet-booted', '1')
      setNeedBoot(true)
      setBooted(false)
    } catch { /* private mode — skip the boot */ }
  }, [])
  useEffect(() => {
    try { setSoundOn(sessionStorage.getItem('xv-mainnet-snd') === '1') } catch { /* noop */ }
  }, [])
  const toggleSound = () => {
    setSoundOn((v) => {
      const next = !v
      try { sessionStorage.setItem('xv-mainnet-snd', next ? '1' : '0') } catch { /* noop */ }
      return next
    })
  }

  const selectWorld = (w: World) => {
    setWorld(w)
    setOpenLevel(null)
    requestAnimationFrame(() => gridRef.current?.scrollIntoView({ behavior: motionOk ? 'smooth' : 'auto', block: 'nearest' }))
  }

  // keyboard: ←→ move between worlds, ↑↓ between levels, Enter opens, Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!booted) return
      if (e.key === 'Escape') { if (openLevel) { sound.back(); setOpenLevel(null) } ; return }
      if (e.key === 'Enter' || e.key === ' ') {
        const el = document.activeElement
        if (el && (el as HTMLElement).dataset?.levelCard) return // native button handles it
        return
      }
      const worlds = WORLDS
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const i = worlds.findIndex((w) => w.id === world.id)
        const next = worlds[(i + (e.key === 'ArrowRight' ? 1 : worlds.length - 1)) % worlds.length]
        sound.move()
        selectWorld(next)
        requestAnimationFrame(() => {
          document.querySelector(`[data-world-card="${next.id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: motionOk ? 'smooth' : 'auto' })
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [world, booted, openLevel, sound, motionOk])

  const openLevelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (openLevel) openLevelRef.current?.scrollIntoView({ block: 'nearest', behavior: motionOk ? 'smooth' : 'auto' })
  }, [openLevel, motionOk])

  return (
    <div className="relative min-h-screen overflow-x-clip" style={{ background: C.void }}>
      <Starfield motionOk={motionOk} />
      <CRTLayer motionOk={motionOk} />
      <AnimatePresence>
        {needBoot && !booted && (
          <BootSequence onDone={() => setBooted(true)} sound={() => { if (soundOn) sound.boot() }} />
        )}
      </AnimatePresence>

      {/* keyframes (scoped, no global css touched) */}
      <style>{`
        @keyframes xv-blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0.06; } }
        @keyframes xv-blink-soft { 0%,54% { opacity: 1; } 55%,100% { opacity: 0.35; } }
        @keyframes xv-bob { 0% { transform: translateY(0); } 50% { transform: translateY(-3px); } 100% { transform: translateY(0); } }
        @keyframes xv-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes xv-crt-flicker { 0%,100% { opacity: 0.35; } 50% { opacity: 1; } }
        @keyframes xv-load { from { width: 0 !important; } }
        @keyframes xv-glitch { 0%,100% { text-shadow: 3px 0 rgba(217,87,99,0.55), -3px 0 rgba(92,200,215,0.55); } 50% { text-shadow: -3px 0 rgba(217,87,99,0.55), 3px 0 rgba(92,200,215,0.55); } }
      `}</style>

      {/* HUD */}
      <header className="sticky top-0 z-50" style={{ background: C.void }}>
        <div className="mx-auto flex max-w-6xl items-stretch gap-3 px-4 pt-4">
          <Link
            href="/"
            className={cn('flex shrink-0 items-center gap-2.5 px-3', FONT_PIXEL)}
            style={{ ...pixelBox(C.line, C.panel), fontSize: 9, color: C.gold }}
            title="back to xelisvault.xyz"
          >
            &lt;&lt; XV
          </Link>
          <div className={cn('flex shrink-0 items-center px-3', FONT_PIXEL)} style={{ ...pixelBox(C.line, C.panel), fontSize: 9, color: C.paper }}>
            MAINNET&nbsp;HQ
          </div>
          <div className="hidden min-w-0 flex-1 sm:flex"><Marquee items={MARQUEE_ITEMS} /></div>
          <button
            type="button"
            onClick={toggleSound}
            className={cn('shrink-0 px-3 py-1.5', FONT_PIXEL)}
            style={{ ...pixelBox(soundOn ? C.teal : C.line, C.panel), fontSize: 8, color: soundOn ? C.teal : C.steel }}
            aria-pressed={soundOn}
            title="8-bit sound"
          >
            SND {soundOn ? 'ON' : 'OFF'}
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-14 px-4 pb-24 pt-10 sm:pt-16">
        {/* HERO */}
        <section className="relative flex flex-col items-center gap-5 text-center">
          <div className={cn('flex items-center gap-2 px-3 py-2', FONT_PIXEL)} style={{ ...pixelBox(C.emerald, `${C.emerald}12`), fontSize: 9, color: C.emerald }}>
            <span className="inline-block h-[6px] w-[6px]" style={{ background: C.emerald, animation: 'xv-blink 1.2s steps(2) infinite' }} />
            THE LAUNCH FLOOR IS LIVE · MAINNET 23.09.2026
          </div>

          <div className="relative flex flex-col items-center">
            <PixelSprite
              name="rocket"
              px={6}
              title="the mainnet rocket"
              style={motionOk ? { animation: 'xv-bob 1.3s steps(2) infinite', filter: 'drop-shadow(0 10px 24px rgba(240,179,92,0.18))' } : undefined}
            />
          </div>

          <h1 className={cn('mx-auto max-w-4xl leading-[1.4]', FONT_PIXEL)} style={{ fontSize: 'clamp(17px, 3.4vw, 34px)', color: C.paper }}>
            <span className="block">THE FULL PROTOCOL</span>
            <span className="block">
              <span style={{ color: C.gold, ...(motionOk ? { animation: 'xv-glitch 3.2s steps(2) infinite' } : {}) }}>
                IS LOADING
              </span>{' '}
              <span style={{ color: C.steel }}>FOR MAINNET</span>
            </span>
          </h1>

          <p className={cn('max-w-2xl leading-snug', FONT_VT)} style={{ fontSize: 20, color: C.steel }}>
            The audited engines of XelisVault — confidential lending, the private dollar, the
            mixer, the oracle — land on the XELIS mainnet in one drop. Explore every level of
            what&apos;s coming, then watch the clock with us.
          </p>

          {/* hero stat chips — the protocol in four numbers */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {[
              ['1', 'AUDITED MIXER'],
              ['5s', 'FINALITY'],
              ['51', 'CONTRACTS BUILT'],
              ['0', 'LINKABLE POINTS'],
            ].map(([v, l]) => (
              <span
                key={l}
                className="flex items-baseline gap-2 px-3 py-1.5"
                style={pixelBox(C.line, C.panel)}
              >
                <span className={cn(FONT_PIXEL)} style={{ fontSize: 11, color: C.gold }}>{v}</span>
                <span className={cn(FONT_PIXEL)} style={{ fontSize: 7, color: C.steel }}>{l}</span>
              </span>
            ))}
          </div>

          {/* countdown */}
          <div className="relative flex flex-col items-center gap-3.5 p-6 sm:p-7" style={pixelBox(C.gold, C.panel)}>
            <CornerTicks color={C.gold} />
            <span className={cn(FONT_PIXEL)} style={{ fontSize: 9, color: C.gold, letterSpacing: '0.2em' }}>
              MAINNET WINDOW OPENS IN
            </span>
            <CountdownClock />
            <span className={cn(FONT_VT)} style={{ fontSize: 17, color: C.steel }}>
              {MAINNET_WINDOW_SUB}
            </span>
          </div>

          {/* mission progress */}
          <div className="flex w-full max-w-xl flex-col items-center gap-2">
            <div className="flex w-full items-center justify-between">
              <span className={cn(FONT_PIXEL)} style={{ fontSize: 8, color: C.steel }}>MISSION PROGRESS</span>
              <span className={cn(FONT_PIXEL, 'tabular-nums')} style={{ fontSize: 8, color: C.emerald, textShadow: '0 0 10px rgba(110,231,160,0.35)' }}>
                5/7 MILESTONES · {Math.round(MISSION_PROGRESS * 100)}%
              </span>
            </div>
            <div className="relative h-[14px] w-full" style={{ border: `2px solid ${C.line}`, background: C.void }}>
              <div
                className="absolute inset-0"
                style={{
                  width: `${Math.round(MISSION_PROGRESS * 100)}%`,
                  background: `repeating-linear-gradient(90deg, ${C.emerald} 0 6px, transparent 6px 9px)`,
                  ...(motionOk ? { animation: 'xv-load 1.2s steps(10)' } : {}),
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <PixelButton href="/launch" filled>&gt;&gt; ENTER THE LIVE LAUNCHPAD</PixelButton>
            <PixelButton href="#worlds" accent={C.teal}>EXPLORE THE WORLDS</PixelButton>
          </div>
        </section>

        {/* WORLDS */}
        <section id="worlds" ref={gridRef} className="scroll-mt-24">
          <SectionTitle code="SELECT" title="CHOOSE YOUR WORLD" sub="five categories · every level explained · keyboard ←→ works" />
          <div className="flex snap-x gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]">
            {WORLDS.map((w) => (
              <WorldCard key={w.id} world={w} active={w.id === world.id} onSelect={() => selectWorld(w)} sound={sound} />
            ))}
            {/* quest log shortcut */}
            <button
              type="button"
              onClick={() => { sound.select(); document.getElementById('quests')?.scrollIntoView({ behavior: motionOk ? 'smooth' : 'auto', block: 'start' }) }}
              onMouseEnter={() => sound.move()}
              className="flex w-[190px] shrink-0 snap-start flex-col gap-3 p-4 text-left sm:w-[210px]"
              style={pixelBox(C.line, C.panel)}
            >
              <span className={cn(FONT_PIXEL)} style={{ fontSize: 8, color: C.gold }}>LOG</span>
              <PixelSprite name="scroll" px={5} title="quest log" />
              <span className={cn(FONT_PIXEL, 'leading-relaxed')} style={{ fontSize: 11, color: C.paper }}>QUEST LOG</span>
              <span className={cn(FONT_VT, 'leading-snug')} style={{ fontSize: 16, color: C.steel }}>
                the roadmap so far — 5 of 7 cleared
              </span>
              <span className={cn('mt-auto pt-1', FONT_PIXEL)} style={{ fontSize: 7, color: C.dim }}>
                SCROLL ↓
              </span>
            </button>
          </div>

          {/* levels of the active world */}
          <div className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
            <span className={cn(FONT_PIXEL)} style={{ fontSize: 11, color: ACCENTS[world.accent] }}>
              {world.code} · {world.name}
            </span>
            <span className={cn(FONT_VT)} style={{ fontSize: 18, color: C.steel }}>
              — {world.tagline}
            </span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {world.levels.map((lv) => (
                <motion.div
                  key={lv.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.18 } }}
                  exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
                >
                  <div className="h-full">
                    <LevelCard
                      level={lv}
                      selected={openLevel?.id === lv.id}
                      onSelect={() => setOpenLevel((cur) => (cur?.id === lv.id ? null : lv))}
                      motionOk={motionOk}
                      sound={sound}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div ref={openLevelRef} className="scroll-mt-28">
            <AnimatePresence>
              {openLevel && (
                <LevelDetail level={openLevel} onClose={() => { sound.back(); setOpenLevel(null) }} />
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* QUEST LOG */}
        <section id="quests" className="scroll-mt-24">
          <SectionTitle code="LOG" title="QUEST LOG" sub="the real roadmap — dates as published" />
          <QuestLog />
        </section>

        {/* CLOSER */}
        <section className="relative flex flex-col items-center gap-7 p-8 text-center sm:p-12" style={pixelBox(C.gold, C.panel)}>
          <CornerTicks color={C.gold} />
          <PixelSprite name="vault" px={6} title="the vault" style={{ animation: 'xv-bob 2s steps(2) infinite' }} />
          <h2 className={cn(FONT_PIXEL, 'leading-relaxed')} style={{ fontSize: 'clamp(13px, 2.2vw, 21px)', color: C.paper }}>
            SAVE THE DATE.
            <br />
            <span style={{ color: C.gold }}>JUNE 2027.</span>
          </h2>
          <p className={cn('max-w-xl leading-snug', FONT_VT)} style={{ fontSize: 20, color: C.steel }}>
            The vault opens once. Everything you explored here goes live in one drop — and the
            floor is already open today while you wait.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <PixelButton href="/launch" filled>&gt;&gt; PLAY THE LAUNCHPAD NOW</PixelButton>
            <PixelButton href="https://discord.gg/UHpYAWbG" accent={C.teal}>JOIN THE COMMUNITY</PixelButton>
          </div>
          <div className={cn(FONT_VT)} style={{ fontSize: 15, color: C.dim }}>
            xelisvault.xyz · the site never holds keys · everything client-side
          </div>
        </section>
      </main>
    </div>
  )
}

function SectionTitle({ code, title, sub }: { code: string; title: string; sub: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3">
        <span className={cn(FONT_PIXEL, 'px-2 py-1')} style={{ fontSize: 8, color: C.void, background: C.gold }}>
          {code}
        </span>
        <h2 className={cn(FONT_PIXEL)} style={{ fontSize: 'clamp(12px, 2vw, 18px)', color: C.paper }}>
          {title}
        </h2>
      </div>
      <p className={cn('mt-2.5', FONT_VT)} style={{ fontSize: 17, color: C.dim }}>{sub}</p>
    </div>
  )
}
