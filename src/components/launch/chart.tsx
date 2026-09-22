// PriceChart — the premium trading chart of the VaultLaunch app.
//
// One component, two renderings, switched live from the chart header:
//   • LINE    the signature curve: smooth stroke, gradient fill,
//             draw-in animation, pulsing square head
//   • CANDLES classic OHLC candlesticks derived from the same series:
//             wicks + bodies, volume strip, crosshair with OHLC legend
// Both modes share the same plumbing: right-hand price scale, dashed
// hairline grid, last-price line with a live tag, and a snapping
// crosshair. No chart library — hand-drawn SVG, house style.
//
// Candles are derived deterministically: the series is chunked from the
// end (most recent points last) so the latest price is always inside
// the live candle: open = first point of the chunk, close = last,
// high/low = extremes.

'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export const CHART_UP = 'var(--vault)'
export const CHART_DOWN = 'var(--destructive)'
export const CHART_TEAL = 'var(--xusd)'

type Mode = 'line' | 'candles'

export type Candle = { o: number; h: number; l: number; c: number; vol: number }

/** Derive ~`target` candles from a price series (chunked from the end). */
export function toCandles(data: number[], target = 24): Candle[] {
  if (data.length < 4) return []
  const chunk = Math.max(2, Math.ceil(data.length / target))
  const out: Candle[] = []
  for (let end = data.length; end > 0; end -= chunk) {
    const start = Math.max(0, end - chunk)
    const slice = data.slice(start, end)
    if (slice.length === 0) continue
    const o = slice[0]
    const c = slice[slice.length - 1]
    const h = Math.max(...slice)
    const l = Math.min(...slice)
    // activity proxy: accumulated absolute move inside the window
    let vol = 0
    for (let i = 1; i < slice.length; i++) vol += Math.abs(slice[i] - slice[i - 1])
    out.unshift({ o, h, l, c, vol: vol + Math.abs(c - o) * 0.5 })
  }
  return out
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
  height = 300,
  color = 'auto',
  className,
  style,
  unit = 'XEL',
  defaultMode = 'line',
}: {
  data: number[]
  height?: number
  /** line color; candles are always gold-up / red-down */
  color?: 'auto' | string
  className?: string
  style?: CSSProperties
  unit?: string
  defaultMode?: Mode
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [mode, setMode] = useState<Mode>(defaultMode)
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
  const headerH = 28
  const chartH = Math.max(120, height - headerH)
  const n = data.length
  const candles = toCandles(data)

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
  const range = hi - lo || hi || 1
  const yPad = range * 0.1
  const yLo = lo - yPad
  const yHi = hi + yPad
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

  const lastCandle = candles.length ? candles[candles.length - 1] : null
  const legendCandle = (hoverIdx != null && mode === 'candles' && candles[hoverIdx]) || lastCandle
  const legendUp = legendCandle ? legendCandle.c >= legendCandle.o : upTrend

  const lastPriceUp = mode === 'candles'
    ? (lastCandle ? lastCandle.c >= lastCandle.o : true)
    : upTrend

  return (
    <div ref={wrapRef} className={cn('relative w-full select-none', className)} style={{ height, ...style }}>
      {/* terminal header: label left, mode toggle right */}
      <div className="flex h-[28px] items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/85">
          price · {unit}
        </span>
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
              opacity={0.85}
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

        {/* ── CANDLE MODE ── */}
        {mode === 'candles' && candles.length > 0 && (
          <>
            {/* volume strip */}
            {hasVol && candles.map((k, i) => {
              const vh = maxVol > 0 ? (k.vol / maxVol) * (volH - 2) : 0
              const up = k.c >= k.o
              return (
                <motion.rect
                  key={`v${i}`}
                  x={i * cStep + (cStep - cW) / 2}
                  y={volTop + (volH - 2) - Math.max(1, vh)}
                  width={cW}
                  height={Math.max(1, vh)}
                  fill={up ? CHART_UP : CHART_DOWN}
                  opacity={hoverIdx === i ? 0.5 : 0.22}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoverIdx === i ? 0.5 : 0.22 }}
                  transition={{ duration: 0.2 }}
                />
              )
            })}
            {/* candles, revealed left to right */}
            <motion.g
              key={`cg-${mode}`}
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{ duration: 0.85, ease: [0.65, 0, 0.35, 1] }}
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
                return (
                  <g key={i} opacity={hoverIdx != null && !hovered ? 0.45 : 1}>
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
                    {/* live candle marker */}
                    {i === candles.length - 1 && (
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
              strokeOpacity={0.5}
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
              strokeOpacity={0.45}
              strokeDasharray="2 4"
              strokeWidth={1}
            />
            <line
              x1={0} x2={plotW}
              y1={yOf(hoverPrice)} y2={yOf(hoverPrice)}
              stroke="var(--muted-foreground)"
              strokeOpacity={0.45}
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
        <div className="pointer-events-none absolute left-1.5 top-1 z-10 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 border border-border/70 bg-background/85 px-2 py-1 font-mono text-[9.5px] tabular-nums">
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
        </div>
      ) : mode === 'line' && hoverIdx != null && data[hoverIdx] != null ? (
        <div className="pointer-events-none absolute left-1.5 top-1 z-10 border border-border/70 bg-background/85 px-2 py-1 font-mono text-[10px] tabular-nums text-foreground">
          {data[hoverIdx] < 1 ? data[hoverIdx].toFixed(5) : data[hoverIdx].toFixed(3)}
          <span className="ml-1.5 text-muted-foreground">{unit}</span>
        </div>
      ) : null}
      </div>
    </div>
  )
}
