'use client'

// Live charts — built from the same block window the lattice shows.
//  - Difficulty Pressure: sparkline of block difficulty (oldest → newest),
//    eased interpolation so new points flow in instead of snapping.
//  - Block Cadence: histogram of real timestamp deltas between consecutive
//    blocks, with the 5s protocol target highlighted.

import { useEffect, useMemo, useRef } from 'react'
import { Activity, Timer } from 'lucide-react'
import { XelisBlock } from '@/lib/xelis/explorer'

// ---- shared canvas helper -------------------------------------------------

function useCanvas2D(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void,
  deps: unknown[]
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)

  useEffect(() => {
    drawRef.current = draw
  }, [draw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0
    let h = 0
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = rect.width
      h = rect.height
      canvas.width = Math.max(1, w * dpr)
      canvas.height = Math.max(1, h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      ctx.clearRect(0, 0, w, h)
      drawRef.current(ctx, w, h, t)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return canvasRef
}

// ---- Difficulty sparkline ---------------------------------------------------

export function DifficultyChart({ blocks }: { blocks: XelisBlock[] }) {
  // target series (oldest → newest), unique by topoheight
  const series = useMemo(() => {
    const sorted = [...blocks].sort((a, b) => a.topoheight - b.topoheight)
    return sorted.map((b) => parseInt(b.difficulty, 10) || 0)
  }, [blocks])

  // displayed values, eased toward target each frame
  const dispRef = useRef<number[]>([])
  const seriesRef = useRef<number[]>([])
  useEffect(() => { seriesRef.current = series }, [series])

  const canvasRef = useCanvas2D((ctx, w, h) => {
    const target = seriesRef.current
    const disp = dispRef.current
    // resize displayed array
    while (disp.length < target.length) disp.push(disp.length ? disp[disp.length - 1] : target[0] ?? 0)
    if (disp.length > target.length) disp.length = target.length
    // ease each point
    for (let i = 0; i < disp.length; i++) {
      disp[i] += (target[i] - disp[i]) * 0.08
    }

    ctx.clearRect(0, 0, w, h)
    if (disp.length < 2) {
      ctx.fillStyle = 'rgba(160,160,180,0.5)'
      ctx.font = '11px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('collecting difficulty…', w / 2, h / 2)
      return
    }

    const pad = { l: 6, r: 6, t: 10, b: 14 }
    const min = Math.min(...disp)
    const max = Math.max(...disp)
    const span = Math.max(1, max - min)
    const xOf = (i: number) => pad.l + (i / (disp.length - 1)) * (w - pad.l - pad.r)
    const yOf = (v: number) => h - pad.b - ((v - min) / span) * (h - pad.t - pad.b)

    // gradient fill
    const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b)
    grad.addColorStop(0, 'rgba(167,139,250,0.28)')
    grad.addColorStop(1, 'rgba(167,139,250,0)')
    ctx.beginPath()
    ctx.moveTo(xOf(0), h - pad.b)
    for (let i = 0; i < disp.length; i++) ctx.lineTo(xOf(i), yOf(disp[i]))
    ctx.lineTo(xOf(disp.length - 1), h - pad.b)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    // line
    ctx.beginPath()
    for (let i = 0; i < disp.length; i++) {
      const x = xOf(i)
      const y = yOf(disp[i])
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = '#a78bfa'
    ctx.lineWidth = 1.6
    ctx.stroke()

    // last point + halo
    const lx = xOf(disp.length - 1)
    const ly = yOf(disp[disp.length - 1])
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 500)
    ctx.beginPath()
    ctx.arc(lx, ly, 5 + pulse * 3, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(167,139,250,${0.25 - pulse * 0.15})`
    ctx.fill()
    ctx.beginPath()
    ctx.arc(lx, ly, 2.6, 0, Math.PI * 2)
    ctx.fillStyle = '#c4b5fd'
    ctx.fill()

    // min / max labels
    ctx.fillStyle = 'rgba(148,160,190,0.7)'
    ctx.font = '9px "JetBrains Mono", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(fmtCompact(max), pad.l + 2, pad.t + 2)
    ctx.fillText(fmtCompact(min), pad.l + 2, h - pad.b - 3)
    // latest value, right
    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(196,181,253,0.9)'
    ctx.fillText(fmtCompact(disp[disp.length - 1]), w - pad.r, pad.t + 2)
  }, [series])

  const latest = series.length ? series[series.length - 1] : null
  const first = series.length ? series[0] : null
  const delta = latest !== null && first !== null && first > 0 ? ((latest - first) / first) * 100 : null

  return (
    <div className="rounded-2xl glass-panel p-4 flex flex-col">
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          <Activity className="w-3.5 h-3.5 text-vault/80" />
          Difficulty Pressure
        </span>
        {delta !== null && (
          <span className={`text-[10px] font-mono ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(2)}% / window
          </span>
        )}
      </div>
      <div className="text-[10px] font-mono text-muted-foreground/60 mb-2">
        live sparkline · {series.length} blocks
      </div>
      <div className="relative w-full h-[110px]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  )
}

// ---- Block cadence histogram -------------------------------------------------

const BUCKETS = [
  { label: '<2s', lo: 0, hi: 2000 },
  { label: '2–4s', lo: 2000, hi: 4000 },
  { label: '4–6s', lo: 4000, hi: 6000 },
  { label: '6–8s', lo: 6000, hi: 8000 },
  { label: '8–12s', lo: 8000, hi: 12000 },
  { label: '12s+', lo: 12000, hi: Infinity },
]
const TARGET_BUCKET = 2 // 4–6s contains the 5s target

export function CadenceChart({ blocks }: { blocks: XelisBlock[] }) {
  const counts = useMemo(() => {
    const sorted = [...blocks].sort((a, b) => a.topoheight - b.topoheight)
    const arr = new Array(BUCKETS.length).fill(0)
    for (let i = 1; i < sorted.length; i++) {
      const dt = sorted[i].timestamp - sorted[i - 1].timestamp
      if (dt <= 0 || dt > 120_000) continue // guard against gaps/reorgs
      const idx = BUCKETS.findIndex((b) => dt >= b.lo && dt < b.hi)
      if (idx >= 0) arr[idx]++
    }
    return arr
  }, [blocks])

  const targetRef = useRef(counts)
  useEffect(() => { targetRef.current = counts }, [counts])
  const dispRef = useRef<number[]>(new Array(BUCKETS.length).fill(0))

  const canvasRef = useCanvas2D((ctx, w, h) => {
    const target = targetRef.current
    const disp = dispRef.current
    for (let i = 0; i < disp.length; i++) {
      disp[i] += (target[i] - disp[i]) * 0.09
    }

    ctx.clearRect(0, 0, w, h)
    const total = disp.reduce((s, v) => s + v, 0)
    const maxV = Math.max(1, ...disp)
    const padB = 18
    const gap = 8
    const bw = (w - gap * (BUCKETS.length - 1)) / BUCKETS.length

    BUCKETS.forEach((b, i) => {
      const x = i * (bw + gap)
      const bh = (disp[i] / maxV) * (h - padB - 8)
      const y = h - padB - bh
      const isTarget = i === TARGET_BUCKET
      const grad = ctx.createLinearGradient(0, y, 0, h - padB)
      if (isTarget) {
        grad.addColorStop(0, 'rgba(74,222,128,0.85)')
        grad.addColorStop(1, 'rgba(74,222,128,0.12)')
      } else {
        grad.addColorStop(0, 'rgba(103,232,249,0.7)')
        grad.addColorStop(1, 'rgba(103,232,249,0.08)')
      }
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.roundRect(x, y, bw, Math.max(bh, 2), 3)
      ctx.fill()

      // count above bar
      if (disp[i] >= 0.5) {
        ctx.fillStyle = isTarget ? 'rgba(134,239,172,0.95)' : 'rgba(165,243,252,0.8)'
        ctx.font = 'bold 9px "JetBrains Mono", monospace'
        ctx.textAlign = 'center'
        ctx.fillText(String(Math.round(disp[i])), x + bw / 2, y - 4)
      }
      // label below
      ctx.fillStyle = isTarget ? 'rgba(134,239,172,0.9)' : 'rgba(120,125,150,0.6)'
      ctx.font = '8px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(b.label, x + bw / 2, h - 5)
    })

    if (total < 1) {
      ctx.fillStyle = 'rgba(160,160,180,0.5)'
      ctx.font = '11px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('collecting cadence…', w / 2, h / 2)
    }
  }, [counts])

  return (
    <div className="rounded-2xl glass-panel p-4 flex flex-col">
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          <Timer className="w-3.5 h-3.5 text-cyan-300/80" />
          Block Cadence
        </span>
        <span className="text-[10px] font-mono text-emerald-300/80">target 5s</span>
      </div>
      <div className="text-[10px] font-mono text-muted-foreground/60 mb-2">
        real deltas between consecutive blocks
      </div>
      <div className="relative w-full h-[110px]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  )
}

function fmtCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(Math.round(n))
}
