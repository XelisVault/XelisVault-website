// PriceChart — the premium trading chart of the VaultLaunch app.
//
// One component, two renderings, switched live from the chart header:
//   • LINE    the signature curve: smooth stroke, gradient fill,
//             draw-in animation, pulsing square head
//   • CANDLES classic OHLC candlesticks with true exchange semantics:
//             buckets are anchored to ABSOLUTE point indices, so a CLOSED
//             candle is FROZEN FOREVER — only the live candle moves.
// Both modes share the same plumbing: right-hand price scale, dashed
// hairline grid, last-price line with a live tag, and a snapping
// crosshair. No chart library — hand-drawn SVG, house style.
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
import { motion } from 'framer-motion'
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

/** Interval presets. 1 point = 1 topo = 2s of simulated time. */
export const INTERVALS = [
  { id: '12s', label: '12s', chunk: 6 },
  { id: '1m', label: '1m', chunk: 30 },
  { id: '5m', label: '5m', chunk: 150 },
  { id: '15m', label: '15m', chunk: 450 },
] as const
export type IntervalId = (typeof INTERVALS)[number]['id']

/** Max candles drawn at once (the chart shows the most recent window). */
const MAX_CANDLES = 88

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
    if (out.length >= MAX_CANDLES + 2) break // safety: never explode
  }
  return out.slice(-MAX_CANDLES)
}

function fmtAxis(v: number): string {
  if (v >= 1000) return v.toFixed(0)
  if (v >= 100) return v.toFixed(1)
  if (v >= 1) return v.toFixed(3)
  return v.toFixed(4)
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
  defaultInterval = '1m',
  accent = 'gold',
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
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef<{ key: string; lo: number; hi: number } | null>(null)
  const [width, setWidth] = useState(640)
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [iv, setIv] = useState<IntervalId>(defaultInterval)
  const [hover, setHover] = useState<number | null>(null) // candle idx / point idx
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

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
  const chunk = INTERVALS.find((i) => i.id === iv)?.chunk ?? 30
  const candles = toCandles(data, histStart, chunk)
  const liveIdx = candles.length - 1 // live candle is always last

  // ── shared geometry ──
  const padR = 56
  const padT = 10
  const hasVol = mode === 'candles' && candles.length > 2
  const volH = hasVol ? Math.round(chartH * 0.15) : 0
  const gapVol = hasVol ? 10 : 0
  const priceH = chartH - padT - volH - gapVol
  const plotW = Math.max(10, width - padR)

  const last = n > 0 ? data[n - 1] : 0
  const first = n > 0 ? data[0] : 0
  const upTrend = last >= first

  const lineStroke =
    color === 'auto' ? (upTrend ? CHART_UP : CHART_DOWN) : color

  const lo = mode === 'candles' && candles.length
    ? Math.min(...candles.map((k) => k.l))
    : n ? Math.min(...data) : 0
  const hi = mode === 'candles' && candles.length
    ? Math.max(...candles.map((k) => k.h))
    : n ? Math.max(...data) : 1

  // ── STABLE Y SCALE (candles) ────────────────────────────────
  // A closed candle must never move. The scale is therefore refit ONLY
  // when a new bucket opens (or the interval changes); within a bucket it
  // can merely EXTEND when the live price escapes the frame — exactly how
  // an exchange terminal behaves. Line mode keeps the continuous fit.
  let yLo: number
  let yHi: number
  const liveBucketId = candles.length ? candles[liveIdx].id : -1
  const scaleKey = `${iv}:${liveBucketId}`
  if (mode === 'candles') {
    const rawRange = hi - lo || hi || 1
    const pad = rawRange * 0.1
    let s = scaleRef.current
    if (!s || s.key !== scaleKey) {
      s = { key: scaleKey, lo: lo - pad, hi: hi + pad }
    } else {
      // same bucket: extend only if the data escapes the current frame
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
  const range = yHi - yLo || yHi || 1
  const yOf = (v: number) => padT + priceH - ((v - yLo) / (yHi - yLo)) * priceH

  // grid ticks
  const ticks = 5
  const tickVals = Array.from({ length: ticks }, (_, i) => yLo + ((yHi - yLo) * i) / (ticks - 1))
  // ── hover plumbing ──
  const hoverIdx = hover
  const hoverPrice = mode === 'candles'
    ? (hoverIdx != null && candles[hoverIdx] ? candles[hoverIdx].c : last)
    : (hoverIdx != null && data[hoverIdx] != null ? data[hoverIdx] : last)

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (mode === 'candles') {
      if (candles.length === 0) return
      const rect = e.currentTarget.getBoundingClientRect()
      const px = e.clientX - rect.left
      const step = plotW / candles.length
      const i = Math.floor(px / step)
      setHover(i >= 0 && i < candles.length ? i : null)
    } else {
      if (n < 2) return
      const rect = e.currentTarget.getBoundingClientRect()
      const px = e.clientX - rect.left
      const i = Math.round((px / plotW) * (n - 1))
      setHover(i >= 0 && i < n ? i : null)
    }
  }

  // ── line geometry ──
  const pts = data.map((v, i) => ({
    x: (i / Math.max(1, n - 1)) * plotW,
    y: yOf(v),
  }))
  const linePath = smoothPath(pts)
  const areaPath = n > 1 ? `${linePath} L ${pts[n - 1].x},${padT + priceH} L ${pts[0].x},${padT + priceH} Z` : ''
  const headPt = pts[n - 1]

  // ── candle geometry ──
  const cStep = candles.length ? plotW / candles.length : 0
  const cW = Math.max(3, Math.min(15, cStep * 0.62))
  const maxVol = candles.length ? Math.max(...candles.map((k) => k.vol)) : 1
  const volTop = padT + priceH + gapVol

  const lastCandle = candles.length ? candles[liveIdx] : null
  const legendCandle = (hoverIdx != null && mode === 'candles' && candles[hoverIdx]) || lastCandle
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
                  title={`1 candle = ${ivl.label} of simulated time`}
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

      <div className="relative" style={{ height: chartH }}>
      <svg
        width="100%"
        height={chartH}
        viewBox={`0 0 ${width} ${chartH}`}
        preserveAspectRatio="none"
        className="block w-full overflow-visible"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`Price chart, ${unit} per token`}
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
        {mode === 'line' && n > 1 && (
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
            {/* pulsing square head */}
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
            {hoverIdx != null && pts[hoverIdx] && (
              <rect x={pts[hoverIdx].x - 3} y={pts[hoverIdx].y - 3} width={6} height={6} fill={lineStroke} stroke="var(--background)" strokeWidth={1} />
            )}
          </>
        )}

        {/* ── CANDLE MODE — closed candles are FROZEN (keyed by absolute
             bucket id), only the live candle re-renders each tick ── */}
        {mode === 'candles' && candles.length > 0 && (
          <>
            {/* volume strip */}
            {hasVol && candles.map((k, i) => {
              const vh = maxVol > 0 ? (k.vol / maxVol) * (volH - 2) : 0
              const up = k.c >= k.o
              return (
                <rect
                  key={`v${k.id}`}
                  x={i * cStep + (cStep - cW) / 2}
                  y={volTop + (volH - 2) - Math.max(1, vh)}
                  width={cW}
                  height={Math.max(1, vh)}
                  fill={up ? CHART_UP : CHART_DOWN}
                  opacity={hoverIdx === i ? 0.55 : 0.26}
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
              {candles.map((k, i) => {
                const up = k.c >= k.o
                const cx = i * cStep + cStep / 2
                const yH = yOf(k.h)
                const yL = yOf(k.l)
                const yO = yOf(k.o)
                const yC = yOf(k.c)
                const bodyTop = Math.min(yO, yC)
                const bodyH = Math.max(1.6, Math.abs(yO - yC))
                const col = up ? CHART_UP : CHART_DOWN
                const hovered = hoverIdx === i
                const isLive = i === liveIdx && !k.closed
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
              x1={mode === 'candles' ? hoverIdx * cStep + cStep / 2 : pts[hoverIdx]?.x ?? 0}
              x2={mode === 'candles' ? hoverIdx * cStep + cStep / 2 : pts[hoverIdx]?.x ?? 0}
              y1={padT}
              y2={hasVol ? chartH : padT + priceH}
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
      </svg>

      {/* OHLC legend (candles) / price legend (line) */}
      {mode === 'candles' && legendCandle ? (
        <div className="pointer-events-none absolute left-1.5 top-1 z-10 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 border border-border bg-background/90 px-2 py-1 font-mono text-[9.5px] tabular-nums">
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
          {data[hoverIdx] < 1 ? data[hoverIdx].toFixed(5) : data[hoverIdx].toFixed(3)}
          <span className="ml-1.5 text-muted-foreground">{unit}</span>
        </div>
      ) : null}
      </div>
    </div>
  )
}
