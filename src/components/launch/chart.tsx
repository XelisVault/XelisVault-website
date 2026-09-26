// PriceChart — the premium trading chart of the VaultLaunch app.
//
// One component, two renderings, switched live from the chart header:
//   • LINE    the signature curve: smooth stroke, gradient fill,
//             draw-in animation, pulsing square head
//   • CANDLES classic OHLC candlesticks with true exchange semantics:
//             buckets are anchored to ABSOLUTE point indices, so a CLOSED
//             candle is FROZEN FOREVER — only the live candle moves.
//
// ── Exchange-grade viewport ────────────────────────────────────────
// The chart is a real trading terminal viewport, not a static picture:
//   • candles/points sit at a FIXED pixel spacing, right-anchored — a
//     pair with a short history hugs the right edge (exactly like a
//     freshly listed pair on an exchange) instead of stretching a few
//     candles across the whole plot with giant gaps between them
//   • DRAG (mouse or touch) pans back through history
//   • WHEEL / TRACKPAD / PINCH zooms, anchored under the cursor
//   • a LIVE button snaps back to the present; double-click does too
//   • a bottom time axis labels the visible window in REAL wall-clock
//     time (HH:MM today, DD.MM on past days) — 1 point = `pointSeconds`
//     of mainnet time, the live edge is "now" (the series survives
//     page refreshes via persist.ts)
// Closed candles keep their frozen guarantee: navigation only changes
// WHICH immutable candles are on screen, never their values.
//
// ── Why absolute anchoring matters ─────────────────────────────────
// The engine appends one price point per topo (and one per user trade)
// and tracks `points` (total ever emitted) + `histStart` (absolute index
// of history[0]). Candle bucket N covers absolute indices
// [N*chunk, (N+1)*chunk). Because buckets are keyed by ABSOLUTE index:
//   • appending a point only ever touches the LAST bucket (live candle)
//   • the capped window sliding left changes nothing — same absolute
//     indices, same data, same frozen candles
// This is exactly how a real exchange buckets ticks by timestamp.

'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export const CHART_UP = 'var(--vault)'
export const CHART_DOWN = 'var(--destructive)'
export const CHART_TEAL = 'var(--xusd)'

type Mode = 'line' | 'candles'

/** One OHLC candle. `closed` candles are immutable history. */
export type Candle = {
  o: number; h: number; l: number; c: number; vol: number
  /** absolute bucket id — stable identity across renders */
  id: number
  /** false only for the bucket containing the very last point */
  closed: boolean
}

/** Interval presets — real-time durations; the chunk size adapts to
 *  the series spacing (1 point = `pointSeconds` of mainnet time). */
export const INTERVALS = [
  { id: '2m', label: '2m', seconds: 120 },
  { id: '10m', label: '10m', seconds: 600 },
  { id: '30m', label: '30m', seconds: 1800 },
  { id: '2h', label: '2h', seconds: 7200 },
] as const
export type IntervalId = (typeof INTERVALS)[number]['id']

/** Safety cap only — 900 points ÷ chunk 6 = 150 candles max. */
const MAX_CANDLES = 400

// viewport zoom ranges, in px per unit
const SP_C_MIN = 2.5, SP_C_MAX = 40 // candles
const SP_L_MIN = 0.7, SP_L_MAX = 14 // line points
const L_SPACING_DEFAULT = 2.4

/** Height of the bottom time-axis strip. */
const AXIS_H = 18

function clampN(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

/**
 * Derive candles from a price series with ABSOLUTE bucket anchoring.
 * `histStart` = absolute index of data[0]. Bucket of absolute index i is
 * floor(i / chunk). The bucket containing the LAST point is the live
 * candle (closed: false); everything before it is frozen history.
 */
export function toCandles(data: number[], histStart: number, chunk: number): Candle[] {
  if (data.length < 2 || chunk < 1) return []
  const out: Candle[] = []
  const lastAbs = histStart + data.length - 1
  const liveBucket = Math.floor(lastAbs / chunk)

  // Walk from the live bucket DOWN, but only over buckets that START inside
  // the visible window (bucket*chunk >= histStart). A bucket that starts
  // before the window has lost points on its left → its o/h/l would mutate
  // as the window slides → it is dropped entirely instead. Every rendered
  // candle is therefore computed from complete, immutable data.
  for (let bucket = liveBucket; bucket * chunk >= histStart; bucket--) {
    const from = bucket * chunk - histStart
    const to = Math.min(data.length, (bucket + 1) * chunk - histStart)
    if (to <= from || from < 0) continue
    const slice = data.slice(from, to)
    if (slice.length === 0) continue
    const o = slice[0]
    const c = slice[slice.length - 1]
    const h = Math.max(...slice)
    const l = Math.min(...slice)
    // activity proxy: accumulated absolute move inside the bucket
    let vol = 0
    for (let i = 1; i < slice.length; i++) vol += Math.abs(slice[i] - slice[i - 1])
    out.unshift({
      o, h, l, c,
      vol: vol + Math.abs(c - o) * 0.5,
      id: bucket,
      closed: bucket < liveBucket,
    })
    if (out.length >= MAX_CANDLES) break // safety: never explode
  }
  return out
}

function fmtAxis(v: number): string {
  if (v >= 1000) return v.toFixed(0)
  if (v >= 100) return v.toFixed(1)
  if (v >= 1) return v.toFixed(3)
  return v.toFixed(4)
}

/** Wall-clock timestamp (ms) of an absolute point index — the live
 *  edge is "now" and each point is `pointSeconds` of mainnet time
 *  apart, so absIndex → now + (absIndex − lastAbs)·pointSeconds. */
function absTimeMs(absIndex: number, lastAbs: number, pointSeconds: number): number {
  return Date.now() + (absIndex - lastAbs) * pointSeconds * 1000
}

const p2 = (x: number) => String(x).padStart(2, '0')

/** Axis label — exchange style: HH:MM for today, DD.MM on past days. */
function fmtClock(ms: number): string {
  const d = new Date(ms)
  const now = new Date()
  if (d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()) {
    return `${p2(d.getHours())}:${p2(d.getMinutes())}`
  }
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}`
}

/** Full date + time for the hover legend. */
function fmtFull(ms: number): string {
  const d = new Date(ms)
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length < 3) return `M ${pts.map((p) => `${p.x},${p.y}`).join(' L ')}`
  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}

export function PriceChart({
  data,
  histStart = 0,
  height = 300,
  color = 'auto',
  className,
  style,
  unit = 'XEL',
  defaultMode = 'line',
  defaultInterval = '2m',
  accent = 'gold',
  pointSeconds = 30,
}: {
  data: number[]
  /** absolute index of data[0] — REQUIRED for frozen closed candles */
  histStart?: number
  height?: number
  /** line color; candles are always gold-up / red-down */
  color?: 'auto' | string
  className?: string
  style?: CSSProperties
  unit?: string
  defaultMode?: Mode
  defaultInterval?: IntervalId
  /** gold (curve) or teal (dex) — tints the interval pills' active state */
  accent?: 'gold' | 'teal'
  /** seconds of mainnet time between two points — drives the time axis */
  pointSeconds?: number
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const scaleRef = useRef<{ key: string; lo: number; hi: number } | null>(null)
  const [width, setWidth] = useState(640)
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [iv, setIv] = useState<IntervalId>(defaultInterval)
  const [hover, setHover] = useState<number | null>(null) // candle idx / point idx
  // ── viewport state: zoom = px per unit, offset = units shifted back
  // from the live edge (0 = following live) ──
  const [cSp, setCSp] = useState(9)
  const [lSp, setLSp] = useState(L_SPACING_DEFAULT)
  const [cOff, setCOff] = useState(0)
  const [lOff, setLOff] = useState(0)
  const [dragging, setDragging] = useState(false)
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  // pointer bookkeeping (drag pan + pinch zoom)
  const ptrs = useRef(new Map<number, { x: number; y: number }>())
  const dragRef = useRef<{ id: number; startX: number; startOff: number; sp: number } | null>(null)
  const pinchRef = useRef<{ d0: number; s0: number } | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const gid = `pc${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const headerH = 30
  const chartH = Math.max(120, height - headerH)
  const n = data.length
  const ivSeconds = INTERVALS.find((i) => i.id === iv)?.seconds ?? 120
  const chunk = Math.max(1, Math.round(ivSeconds / Math.max(1, pointSeconds)))
  const candles = toCandles(data, histStart, chunk)
  const count = candles.length

  const spacing = mode === 'candles' ? cSp : lSp
  const spMin = mode === 'candles' ? SP_C_MIN : SP_L_MIN
  const spMax = mode === 'candles' ? SP_C_MAX : SP_L_MAX
  const setSpacing = (v: number) =>
    (mode === 'candles' ? setCSp : setLSp)(clampN(v, spMin, spMax))
  const setOff = mode === 'candles' ? setCOff : setLOff

  // ── shared geometry ──
  const padR = 56
  const padT = 10
  const hasVol = mode === 'candles' && count > 2
  const volH = hasVol ? Math.round(chartH * 0.15) : 0
  const gapVol = hasVol ? 10 : 0
  const gapAxis = 4
  const priceH = Math.max(40, chartH - padT - volH - gapVol - AXIS_H - gapAxis)
  const plotW = Math.max(10, width - padR)
  const axisY = chartH - AXIS_H

  // ── viewport derivation ─────────────────────────────────────
  // `spacing` px per unit, right-anchored. `off` = how many units the
  // viewport is shifted back from the live edge (clamped so we can
  // neither overshoot into the future nor pan past the first candle.
  const total = mode === 'candles' ? count : n
  const visCount = Math.max(6, Math.ceil(plotW / spacing))
  const maxOff = Math.max(0, total - visCount)
  const off = clampN(mode === 'candles' ? cOff : lOff, 0, maxOff)
  const rightIndex = total - 1 - off
  const xEdge = plotW - spacing * 0.55 // x of the unit at the right edge
  const xOf = (i: number) => xEdge - (rightIndex - i) * spacing
  const i1 = Math.min(total - 1, Math.floor(rightIndex))
  const i0 = Math.max(0, i1 - visCount - 1)

  const last = n > 0 ? data[n - 1] : 0
  const first = n > 0 ? data[0] : 0
  const upTrend = last >= first
  const lastAbs = histStart + n - 1

  const lineStroke =
    color === 'auto' ? (upTrend ? CHART_UP : CHART_DOWN) : color

  // ── visible window (drives scale + rendering) ──
  const visData = mode === 'line' ? data.slice(i0, i1 + 1) : null
  const visCandles = mode === 'candles' ? candles.slice(i0, i1 + 1) : null

  const lo = visCandles
    ? (visCandles.length ? Math.min(...visCandles.map((k) => k.l)) : 0)
    : (visData && visData.length ? Math.min(...visData) : 0)
  const hi = visCandles
    ? (visCandles.length ? Math.max(...visCandles.map((k) => k.h)) : 1)
    : (visData && visData.length ? Math.max(...visData) : 1)

  // ── STABLE Y SCALE (candles) ────────────────────────────────
  // A closed candle must never move. The scale is therefore refit ONLY
  // when the visible window or the interval changes; while the window
  // is steady (following the live edge inside a bucket) it can merely
  // EXTEND when the live price escapes the frame — exactly how an
  // exchange terminal behaves. Line mode keeps the continuous fit.
  let yLo: number
  let yHi: number
  if (mode === 'candles' && visCandles && visCandles.length) {
    const rawRange = hi - lo || hi || 1
    const pad = rawRange * 0.1
    const scaleKey = `${iv}:${i0}:${i1}`
    let s = scaleRef.current
    if (!s || s.key !== scaleKey) {
      s = { key: scaleKey, lo: lo - pad, hi: hi + pad }
    } else {
      // same window: extend only if the data escapes the current frame
      const margin = (s.hi - s.lo) * 0.05
      const nextLo = lo - margin < s.lo ? lo - margin : s.lo
      const nextHi = hi + margin > s.hi ? hi + margin : s.hi
      s = { key: s.key, lo: nextLo, hi: nextHi }
    }
    scaleRef.current = s
    yLo = s.lo
    yHi = s.hi
  } else {
    const pad = (hi - lo || hi || 1) * 0.1
    yLo = lo - pad
    yHi = hi + pad
  }
  const yOf = (v: number) => padT + priceH - ((v - yLo) / (yHi - yLo)) * priceH

  // grid ticks
  const ticks = 5
  const tickVals = Array.from({ length: ticks }, (_, i) => yLo + ((yHi - yLo) * i) / (ticks - 1))

  // ── hover plumbing ──
  const hoverIdx = hover != null && hover >= i0 && hover <= i1 ? hover : null
  const hoverPrice = mode === 'candles'
    ? (hoverIdx != null && candles[hoverIdx] ? candles[hoverIdx].c : last)
    : (hoverIdx != null && data[hoverIdx] != null ? data[hoverIdx] : last)

  /** unit index (candle/point) under pixel x, or null when outside */
  function idxAt(px: number): number | null {
    if (total < 2) return null
    const i = Math.round(rightIndex - (xEdge - px) / spacing)
    return px >= -2 && px <= plotW + 2 && i >= i0 && i <= i1 ? i : null
  }

  // ── pointer navigation: drag pan + pinch zoom (mouse & touch) ──
  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (ptrs.current.size >= 2) {
      const ps = [...ptrs.current.values()]
      const dx = ps[0].x - ps[1].x
      const dy = ps[0].y - ps[1].y
      pinchRef.current = { d0: Math.max(1, Math.hypot(dx, dy)), s0: spacing }
      dragRef.current = null
    } else {
      dragRef.current = { id: e.pointerId, startX: e.clientX, startOff: off, sp: spacing }
    }
    setDragging(true)
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (ptrs.current.has(e.pointerId)) {
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    if (pinchRef.current && ptrs.current.size >= 2) {
      const ps = [...ptrs.current.values()]
      const d = Math.max(1, Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y))
      setSpacing(pinchRef.current.s0 * (d / pinchRef.current.d0))
    } else if (dragRef.current && e.pointerId === dragRef.current.id) {
      const d = dragRef.current
      setOff(d.startOff + (e.clientX - d.startX) / d.sp)
    }
    setHover(idxAt(px))
  }

  function endPointer(e: React.PointerEvent<SVGSVGElement>) {
    ptrs.current.delete(e.pointerId)
    if (ptrs.current.size < 2) pinchRef.current = null
    if (ptrs.current.size === 0) {
      dragRef.current = null
      setDragging(false)
    } else {
      // one finger lifted from a pinch → re-anchor a drag on the rest
      const [rid, rp] = [...ptrs.current.entries()][0]
      dragRef.current = { id: rid, startX: rp.x, startOff: off, sp: spacing }
    }
  }

  function onPointerLeave() {
    if (!dragging && ptrs.current.size === 0) setHover(null)
  }

  // ── wheel / trackpad zoom (native listener → non-passive) ──
  const zoomRef = useRef<(px: number, dy: number, dx: number) => void>(() => {})
  useEffect(() => {
    zoomRef.current = (px, dy, dx) => {
      if (Math.abs(dx) > Math.abs(dy)) {
        // trackpad horizontal swipe = pan
        setOff(off + dx / spacing)
        return
      }
      const s1 = clampN(spacing * Math.exp(-dy * 0.0014), spMin, spMax)
      if (s1 === spacing) return
      // keep the unit under the cursor pinned to the cursor
      const k = (xEdge - px) / spacing
      setSpacing(s1)
      setOff(off + k - (xEdge - px) / s1)
    }
  })
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      zoomRef.current(e.clientX - rect.left, e.deltaY, e.deltaX)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── sensible default zoom when the interval changes: fit ~all candles
  // (a fresh 15m view has 2 candles — they should hug the right edge at
  // a normal size, not stretch across the plot with giant gaps) ──
  const fitRef = useRef({ data, histStart, width })
  useEffect(() => { fitRef.current = { data, histStart, width } })
  useEffect(() => {
    const { data: d, histStart: h, width: w } = fitRef.current
    const c = toCandles(d, h, chunk).length
    const plot = Math.max(10, w - 56)
    setCSp(clampN(plot / clampN(c + 4, 18, 90), 3.2, 24))
    setCOff(0)
  }, [iv])

  const zoomIn = () => zoomRef.current(plotW / 2, -220, 0)
  const zoomOut = () => zoomRef.current(plotW / 2, 220, 0)
  function resetView() {
    if (mode === 'candles') {
      setCSp(clampN(plotW / clampN(count + 4, 18, 90), 3.2, 24))
      setCOff(0)
    } else {
      setLSp(clampN(plotW / 240, SP_L_MIN, 5))
      setLOff(0)
    }
  }

  // ── bottom time axis ──
  const idToIdx = mode === 'candles' && count
    ? new Map(candles.map((c, i) => [c.id, i] as const))
    : null
  const firstId = mode === 'candles' ? (candles[i0]?.id ?? 0) : histStart + i0
  const lastId = mode === 'candles' ? (candles[i1]?.id ?? 0) : histStart + i1
  const stepsU = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200]
  const stepU = stepsU.find((s) => s * spacing >= 64) ?? 1800
  const timeTicks: { x: number; label: string }[] = []
  if (total > 1) {
    for (let u = Math.ceil(firstId / stepU) * stepU; u <= lastId; u += stepU) {
      if (mode === 'candles') {
        const idx = idToIdx?.get(u)
        if (idx == null) continue
        timeTicks.push({ x: xOf(idx), label: fmtClock(absTimeMs(u * chunk, lastAbs, pointSeconds)) })
      } else {
        timeTicks.push({ x: xOf(u - histStart), label: fmtClock(absTimeMs(u, lastAbs, pointSeconds)) })
      }
    }
  }

  // ── line geometry (visible slice only) ──
  const pts = visData
    ? visData.map((v, k) => ({ x: xOf(i0 + k), y: yOf(v) }))
    : []
  const linePath = smoothPath(pts)
  const areaPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x},${padT + priceH} L ${pts[0].x},${padT + priceH} Z`
    : ''
  const headPt = mode === 'line' && i1 >= n - 1 && pts.length ? pts[pts.length - 1] : null

  // ── candle geometry (visible slice only) ──
  const cW = clampN(spacing * 0.68, 1.5, 30)
  const maxVol = visCandles && visCandles.length ? Math.max(...visCandles.map((k) => k.vol)) : 1
  const volTop = padT + priceH + gapVol

  const lastCandle = count ? candles[count - 1] : null
  const legendCandle = (hoverIdx != null && candles[hoverIdx])
    || (off > 0.5 && candles[i1])
    || lastCandle
  const legendUp = legendCandle ? legendCandle.c >= legendCandle.o : upTrend

  const lastPriceUp = mode === 'candles'
    ? (lastCandle ? lastCandle.c >= lastCandle.o : true)
    : upTrend

  const accentText = accent === 'teal' ? 'text-xusd' : 'text-vault'
  const accentBorder = accent === 'teal' ? 'border-xusd/60 bg-xusd/12' : 'border-vault/60 bg-vault/12'

  return (
    <div ref={wrapRef} className={cn('relative w-full select-none', className)} style={{ height, ...style }}>
      {/* terminal header: label left, interval + mode toggle right */}
      <div className="flex h-[30px] items-center justify-between gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
          price · {unit}
        </span>
        <div className="flex items-center gap-1.5">
          {/* interval selector (candles only — line shows the raw feed) */}
          {mode === 'candles' && (
            <div className="flex" role="group" aria-label="Candle interval">
              {INTERVALS.map((ivl) => (
                <button
                  key={ivl.id}
                  type="button"
                  onClick={() => { setIv(ivl.id); setHover(null) }}
                  aria-pressed={iv === ivl.id}
                  title={`1 candle = ${ivl.label} of mainnet time`}
                  className={cn(
                    'border px-1.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] transition-colors',
                    iv === ivl.id
                      ? accentBorder + ' ' + accentText
                      : 'border-border bg-background/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {ivl.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex">
            {(['line', 'candles'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setHover(null) }}
                aria-pressed={mode === m}
                className={cn(
                  'border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] transition-colors',
                  m === 'line' ? 'border-r-0' : '',
                  mode === m
                    ? 'border-vault/60 bg-vault/12 text-vault'
                    : 'border-border bg-background/60 text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'line' ? 'curve' : 'candles'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={bodyRef} className="relative" style={{ height: chartH }}>
      {/* ── navigation overlay: LIVE snap-back + zoom controls ── */}
      <div className="absolute right-[60px] top-1.5 z-10 flex items-center gap-1">
        <AnimatePresence>
          {off > 0.5 && total > 1 && (
            <motion.button
              key="live"
              type="button"
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOff(0)}
              title="Snap back to live (or double-click the chart)"
              className={cn(
                'mr-0.5 flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] backdrop-blur-sm transition-colors',
                accent === 'teal'
                  ? 'border-xusd/60 bg-xusd/15 text-xusd hover:bg-xusd/25'
                  : 'border-vault/60 bg-vault/15 text-vault hover:bg-vault/25'
              )}
            >
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              live
            </motion.button>
          )}
        </AnimatePresence>
        <div className="flex">
          <button type="button" onClick={zoomOut} title="Zoom out" aria-label="Zoom out"
            className="h-[22px] w-[22px] border border-border bg-background/80 font-mono text-[11px] leading-none text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground">
            −
          </button>
          <button type="button" onClick={zoomIn} title="Zoom in" aria-label="Zoom in"
            className="h-[22px] w-[22px] border border-l-0 border-border bg-background/80 font-mono text-[11px] leading-none text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground">
            +
          </button>
          <button type="button" onClick={resetView} title="Reset zoom & follow live" aria-label="Reset view"
            className="h-[22px] border border-l-0 border-border bg-background/80 px-1 font-mono text-[9px] font-semibold uppercase leading-none tracking-[0.08em] text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground">
            fit
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height={chartH}
        viewBox={`0 0 ${width} ${chartH}`}
        preserveAspectRatio="none"
        className={cn('block w-full overflow-visible', dragging ? 'cursor-grabbing' : 'cursor-crosshair')}
        style={{ touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={onPointerLeave}
        onDoubleClick={() => setOff(0)}
        role="img"
        aria-label={`Price chart, ${unit} per token — drag to pan, wheel to zoom, double-click to return to live`}
      >
        <defs>
          <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineStroke} stopOpacity="0.20" />
            <stop offset="55%" stopColor={lineStroke} stopOpacity="0.05" />
            <stop offset="100%" stopColor={lineStroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* grid + price scale */}
        {tickVals.map((tv, i) => (
          <g key={i}>
            <line x1={0} x2={plotW} y1={yOf(tv)} y2={yOf(tv)} stroke="var(--border)" strokeDasharray="2 6" strokeWidth={1} />
            <text
              x={plotW + 8}
              y={yOf(tv) + 3}
              className="fill-[var(--muted-foreground)] font-mono tabular-nums"
              fontSize={9.5}
            >
              {fmtAxis(tv)}
            </text>
          </g>
        ))}
        {/* axis baseline */}
        <line x1={plotW} x2={plotW} y1={padT} y2={chartH} stroke="var(--border)" strokeWidth={1} />

        {/* ── LINE MODE ── */}
        {mode === 'line' && pts.length > 1 && (
          <>
            <motion.path
              d={areaPath}
              fill={`url(#${gid}-fill)`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.0, delay: 0.3 }}
              key={`area-${mounted}`}
            />
            <motion.path
              d={linePath}
              fill="none"
              stroke={lineStroke}
              strokeWidth={1.75}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
              key={`line-${mounted}`}
            />
            {/* pulsing square head — only when the live point is on screen */}
            {headPt && (
              <>
                <rect x={headPt.x - 5} y={headPt.y - 5} width={10} height={10} fill={lineStroke} opacity={0.16}>
                  <animate attributeName="opacity" values="0.28;0.06;0.28" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="x" values={`${headPt.x - 5};${headPt.x - 7};${headPt.x - 5}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="y" values={`${headPt.y - 5};${headPt.y - 7};${headPt.y - 5}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="width" values="10;14;10" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="height" values="10;14;10" dur="2s" repeatCount="indefinite" />
                </rect>
                <rect x={headPt.x - 2.5} y={headPt.y - 2.5} width={5} height={5} fill={lineStroke} stroke="var(--background)" strokeWidth={1} />
              </>
            )}
            {/* hover marker */}
            {hoverIdx != null && pts[hoverIdx - i0] && (
              <rect x={pts[hoverIdx - i0].x - 3} y={pts[hoverIdx - i0].y - 3} width={6} height={6} fill={lineStroke} stroke="var(--background)" strokeWidth={1} />
            )}
          </>
        )}

        {/* ── CANDLE MODE — closed candles are FROZEN (keyed by absolute
             bucket id), only the live candle re-renders each tick ── */}
        {mode === 'candles' && visCandles && visCandles.length > 0 && (
          <>
            {/* volume strip */}
            {hasVol && visCandles.map((k, kk) => {
              const vh = maxVol > 0 ? (k.vol / maxVol) * (volH - 2) : 0
              const up = k.c >= k.o
              return (
                <rect
                  key={`v${k.id}`}
                  x={xOf(i0 + kk) - cW / 2}
                  y={volTop + (volH - 2) - Math.max(1, vh)}
                  width={cW}
                  height={Math.max(1, vh)}
                  fill={up ? CHART_UP : CHART_DOWN}
                  opacity={hoverIdx === i0 + kk ? 0.55 : 0.26}
                />
              )
            })}
            {/* candles, revealed left to right on mode/interval change only */}
            <motion.g
              key={`cg-${mode}-${iv}`}
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
            >
              {visCandles.map((k, kk) => {
                const i = i0 + kk
                const up = k.c >= k.o
                const cx = xOf(i)
                const yH = yOf(k.h)
                const yL = yOf(k.l)
                const yO = yOf(k.o)
                const yC = yOf(k.c)
                const bodyTop = Math.min(yO, yC)
                const bodyH = Math.max(1.6, Math.abs(yO - yC))
                const col = up ? CHART_UP : CHART_DOWN
                const hovered = hoverIdx === i
                const isLive = i === count - 1 && !k.closed
                return (
                  <g key={k.id} opacity={hoverIdx != null && !hovered ? 0.5 : 1}>
                    {/* wick */}
                    <line x1={cx} x2={cx} y1={yH} y2={yL} stroke={col} strokeWidth={hovered ? 1.8 : 1.3} strokeLinecap="round" />
                    {/* body */}
                    <rect
                      x={cx - cW / 2}
                      y={bodyTop}
                      width={cW}
                      height={bodyH}
                      fill={col}
                      fillOpacity={up ? 0.85 : 0.95}
                      stroke={col}
                      strokeWidth={hovered ? 1.5 : 0.75}
                    />
                    {/* live candle marker — the ONLY candle that moves */}
                    {isLive && (
                      <rect x={cx - cW / 2 - 2.5} y={bodyTop - 2.5} width={cW + 5} height={bodyH + 5} fill="none" stroke={col} strokeWidth={1} opacity={0.5}>
                        <animate attributeName="opacity" values="0.55;0.12;0.55" dur="1.8s" repeatCount="indefinite" />
                      </rect>
                    )}
                  </g>
                )
              })}
            </motion.g>
          </>
        )}

        {/* last price line + tag (both modes) — always the LIVE price */}
        {n > 1 && (
          <g>
            <line
              x1={0} x2={plotW}
              y1={yOf(last)} y2={yOf(last)}
              stroke={lastPriceUp ? CHART_UP : CHART_DOWN}
              strokeOpacity={0.55}
              strokeDasharray="3 5"
              strokeWidth={1}
            />
            <g transform={`translate(${plotW + 2}, ${yOf(last) - 8})`}>
              <rect width={padR - 6} height={16} fill={lastPriceUp ? CHART_UP : CHART_DOWN} />
              <text
                x={(padR - 6) / 2}
                y={11.5}
                textAnchor="middle"
                fontSize={9.5}
                className="font-mono tabular-nums fill-[oklch(0.145_0.01_80)] font-semibold"
              >
                {fmtAxis(last)}
              </text>
            </g>
          </g>
        )}

        {/* crosshair: vertical + horizontal dashed, price tag on the axis */}
        {hoverIdx != null && (
          <>
            <line
              x1={xOf(hoverIdx)}
              x2={xOf(hoverIdx)}
              y1={padT}
              y2={hasVol ? axisY - gapAxis : padT + priceH}
              stroke="var(--muted-foreground)"
              strokeOpacity={0.5}
              strokeDasharray="2 4"
              strokeWidth={1}
            />
            <line
              x1={0} x2={plotW}
              y1={yOf(hoverPrice)} y2={yOf(hoverPrice)}
              stroke="var(--muted-foreground)"
              strokeOpacity={0.5}
              strokeDasharray="2 4"
              strokeWidth={1}
            />
            <g transform={`translate(${plotW + 2}, ${yOf(hoverPrice) - 8})`}>
              <rect width={padR - 6} height={16} fill="var(--muted-foreground)" />
              <text
                x={(padR - 6) / 2}
                y={11.5}
                textAnchor="middle"
                fontSize={9.5}
                className="font-mono tabular-nums fill-[oklch(0.145_0.01_80)] font-semibold"
              >
                {fmtAxis(hoverPrice)}
              </text>
            </g>
          </>
        )}

        {/* ── bottom time axis (mainnet time; spacing = pointSeconds) ── */}
        {total > 1 && (
          <g>
            <line x1={0} x2={plotW} y1={axisY} y2={axisY} stroke="var(--border)" strokeWidth={1} />
            {timeTicks.map((t, k) => (
              <g key={`tt${k}`}>
                <line x1={t.x} x2={t.x} y1={axisY} y2={axisY + 3} stroke="var(--border)" strokeWidth={1} />
                <text
                  x={t.x}
                  y={chartH - 5}
                  textAnchor="middle"
                  fontSize={8.5}
                  className="fill-[var(--muted-foreground)] font-mono tabular-nums"
                >
                  {t.label}
                </text>
              </g>
            ))}
            {/* "now" marker at the live edge while following */}
            {off < 0.5 && (
              <g>
                <line x1={xEdge} x2={xEdge} y1={axisY} y2={axisY + 3} stroke="var(--muted-foreground)" strokeWidth={1} />
                <text
                  x={xEdge}
                  y={chartH - 5}
                  textAnchor="end"
                  fontSize={8.5}
                  className="fill-[var(--foreground)] font-mono"
                >
                  now
                </text>
              </g>
            )}
          </g>
        )}
      </svg>

      {/* OHLC legend (candles) / price legend (line) */}
      {mode === 'candles' && legendCandle ? (
        <div className="pointer-events-none absolute left-1.5 top-1 z-10 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 border border-border bg-background/90 px-2 py-1 font-mono text-[9.5px] tabular-nums">
          <span className="text-muted-foreground">
            {fmtFull(absTimeMs(legendCandle.id * chunk, lastAbs, pointSeconds))}
          </span>
          {[
            ['O', legendCandle.o], ['H', legendCandle.h], ['L', legendCandle.l], ['C', legendCandle.c],
          ].map(([k, v]) => (
            <span key={k as string} className="text-muted-foreground">
              {k as string} <span className={legendUp ? 'text-vault' : 'text-destructive'}>{(v as number).toFixed(4)}</span>
            </span>
          ))}
          <span className={legendUp ? 'text-vault' : 'text-destructive'}>
            {(((legendCandle.c - legendCandle.o) / legendCandle.o) * 100).toFixed(2)}%
          </span>
          {legendCandle === lastCandle && !legendCandle.closed && (
            <span className="border border-vault/50 bg-vault/10 px-1 py-px text-[8px] font-bold uppercase tracking-[0.18em] text-vault">
              live
            </span>
          )}
        </div>
      ) : mode === 'line' && hoverIdx != null && data[hoverIdx] != null ? (
        <div className="pointer-events-none absolute left-1.5 top-1 z-10 border border-border bg-background/90 px-2 py-1 font-mono text-[10px] tabular-nums text-foreground">
          <span className="text-muted-foreground">
            {fmtFull(absTimeMs(histStart + hoverIdx, lastAbs, pointSeconds))}
          </span>
          {' '}
          {data[hoverIdx] < 1 ? data[hoverIdx].toFixed(5) : data[hoverIdx].toFixed(3)}
          <span className="ml-1.5 text-muted-foreground">{unit}</span>
        </div>
      ) : null}
      </div>
    </div>
  )
}
