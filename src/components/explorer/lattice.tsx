'use client'

// The Lattice — live BlockDAG visualization on canvas.
//
// Every block on XELIS can extend several tips, and several blocks can share
// the same HEIGHT (forks are kept, not discarded). We lay blocks out as:
//   x = block height (auto-scrolling treadmill, eased)
//   y = lane within that height (forks stack downward)
// and we draw the tip links as curves — the actual DAG shape, live.
//
// Colors: Normal = vault purple · Sync = cyan · Side = amber (30% reward) · Orphaned = red.

import { useEffect, useRef, useState, useCallback } from 'react'
import { Box, Maximize2, Minimize2 } from 'lucide-react'
import { XelisBlock, fmtXEL, shortHash } from '@/lib/xelis/explorer'
import { SocketStatus } from '@/lib/xelis/node-ws'
import { Lattice3D } from './lattice-3d'

const MODE_KEY = 'observatory-lattice-mode'

const TYPE_COLORS: Record<string, { main: string; fill: string }> = {
  Normal: { main: '#a78bfa', fill: 'rgba(167,139,250,0.16)' },
  Sync: { main: '#67e8f9', fill: 'rgba(103,232,249,0.16)' },
  Side: { main: '#fbbf24', fill: 'rgba(251,191,36,0.16)' },
  Orphaned: { main: '#f87171', fill: 'rgba(248,113,113,0.16)' },
}

interface NodeLayout {
  block: XelisBlock
  x: number
  y: number
  size: number
}

interface HoverState {
  block: XelisBlock
  x: number
  y: number
  maxX: number
}

export function Lattice({
  blocks,
  stableHeight,
  status,
  onSelect,
}: {
  blocks: XelisBlock[]
  stableHeight: number | null
  status: SocketStatus | 'boot'
  onSelect: (b: XelisBlock) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hover, setHover] = useState<HoverState | null>(null)
  const [mode, setMode] = useState<'2d' | '3d'>('2d')
  const [isFs, setIsFs] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // restore view mode preference (deferred to a frame to avoid sync setState)
  useEffect(() => {
    let v: string | null = null
    try {
      v = localStorage.getItem(MODE_KEY)
    } catch { /* noop */ }
    if (v !== '3d') return
    const raf = requestAnimationFrame(() => setMode('3d'))
    return () => cancelAnimationFrame(raf)
  }, [])
  const switchMode = (m: '2d' | '3d') => {
    setMode(m)
    try { localStorage.setItem(MODE_KEY, m) } catch { /* noop */ }
  }

  const toggleFs = useCallback(() => {
    if (!document.fullscreenElement) panelRef.current?.requestFullscreen().catch(() => {})
    else document.exitFullscreen().catch(() => {})
  }, [])
  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const blocksRef = useRef(blocks)
  const stableRef = useRef(stableHeight)
  // sync latest props into refs for the rAF loop (effects, never render)
  useEffect(() => { blocksRef.current = blocks }, [blocks])
  useEffect(() => { stableRef.current = stableHeight }, [stableHeight])

  const seenRef = useRef<Set<string>>(new Set())
  const pulsesRef = useRef<Map<string, number>>(new Map()) // hash -> t0
  const nodesRef = useRef<NodeLayout[]>([])
  const viewRef = useRef<{ hMin: number } | null>(null)
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })

  // Detect newly-arrived blocks → spawn pulse rings
  useEffect(() => {
    for (const b of blocks) {
      if (!seenRef.current.has(b.hash)) {
        seenRef.current.add(b.hash)
        pulsesRef.current.set(b.hash, performance.now())
      }
    }
  }, [blocks])

  const hitTest = useCallback((mx: number, my: number): XelisBlock | null => {
    for (const n of nodesRef.current) {
      const half = n.size / 2 + 4
      if (mx >= n.x - half && mx <= n.x + half && my >= n.y - half && my <= n.y + half) return n.block
    }
    return null
  }, [])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      sizeRef.current = { w: rect.width, h: rect.height, dpr }
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const { w, h, dpr } = sizeRef.current
      const now = performance.now()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const all = blocksRef.current
      if (all.length === 0) {
        // Listening state
        ctx.fillStyle = 'rgba(160,160,180,0.5)'
        ctx.font = '11px "JetBrains Mono", monospace'
        ctx.textAlign = 'center'
        ctx.fillText('listening for blocks…', w / 2, h / 2)
        return
      }

      // ---- Layout ----
      const padX = w < 640 ? 30 : 46
      const padTop = 26
      const rulerH = 26
      const usableH = h - padTop - rulerH
      const N = Math.max(8, Math.min(34, Math.floor((w - padX * 2) / 42)))
      const colW = (w - padX * 2) / (N - 1)
      const nodeSize = w < 640 ? 24 : 30

      const maxH = Math.max(...all.map((b) => b.height))
      const minH = Math.max(0, maxH - N + 1)
      // eased treadmill origin
      if (viewRef.current === null) viewRef.current = { hMin: minH }
      const v = viewRef.current
      v.hMin += (minH - v.hMin) * 0.14
      if (Math.abs(minH - v.hMin) < 0.01) v.hMin = minH

      // group by height within window
      const byHeight = new Map<number, XelisBlock[]>()
      for (const b of all) {
        if (b.height < minH - 1 || b.height > maxH) continue
        const arr = byHeight.get(b.height) ?? []
        arr.push(b)
        byHeight.set(b.height, arr)
      }
      for (const [, arr] of byHeight) arr.sort((a, b) => a.topoheight - b.topoheight)

      let maxLanes = 1
      for (const [, arr] of byHeight) maxLanes = Math.max(maxLanes, arr.length)
      const laneSpacing = maxLanes > 3 ? Math.min(44, (usableH * 0.6) / (maxLanes - 1)) : 44
      const cy = padTop + usableH * 0.42

      const byHash = new Map<string, NodeLayout>()
      const nodes: NodeLayout[] = []
      const xOf = (height: number) => padX + (height - v.hMin) * colW

      for (const [height, arr] of byHeight) {
        const x = xOf(height)
        arr.forEach((b, lane) => {
          const y = cy + lane * laneSpacing
          const n: NodeLayout = { block: b, x, y, size: nodeSize }
          nodes.push(n)
          byHash.set(b.hash, n)
        })
      }
      nodesRef.current = nodes

      // ---- Finality frontier ----
      // Blocks left of the stable height are final. On testnet the stable
      // height lags ~250 heights behind the tip, so the line often sits off
      // screen — we clamp it to the left edge and show the distance instead.
      const stable = stableRef.current
      if (stable !== null) {
        const inWindow = stable >= v.hMin && stable <= maxH + 1
        const fx = inWindow ? xOf(stable) : padX - 18
        ctx.save()
        ctx.strokeStyle = 'rgba(74,222,128,0.35)'
        ctx.setLineDash([5, 6])
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(fx, padTop - 8)
        ctx.lineTo(fx, h - rulerH + 2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = 'rgba(74,222,128,0.8)'
        ctx.font = '9px "JetBrains Mono", monospace'
        ctx.textAlign = 'left'
        if (inWindow) {
          ctx.fillText('finality frontier', fx + 6, padTop - 12)
        } else {
          const gap = Math.max(0, Math.round(v.hMin - stable))
          ctx.fillText(`← finality ${gap.toLocaleString()} heights away`, fx + 5, padTop - 12)
        }
        ctx.restore()
      }

      // ---- Tip edges ----
      ctx.lineWidth = 1.2
      for (const n of nodes) {
        for (const tip of n.block.tips ?? []) {
          const t = byHash.get(tip)
          if (!t) continue
          const recent = now - (pulsesRef.current.get(n.block.hash) ?? 0) < 3000
          const c = TYPE_COLORS[n.block.block_type] ?? TYPE_COLORS.Normal
          ctx.strokeStyle = recent ? c.main.replace(')', ',0.6)').replace('rgb', 'rgba') : 'rgba(148,140,190,0.22)'
          if (recent) {
            ctx.strokeStyle = n.block.block_type === 'Side' ? 'rgba(251,191,36,0.55)' : 'rgba(167,139,250,0.5)'
          }
          ctx.beginPath()
          ctx.moveTo(n.x - n.size / 2, n.y)
          ctx.bezierCurveTo(n.x - colW * 0.5, n.y, t.x + colW * 0.5, t.y, t.x + t.size / 2, t.y)
          ctx.stroke()
        }
      }

      // ---- Pulse rings ----
      for (const [hash, t0] of pulsesRef.current) {
        const age = (now - t0) / 1000
        if (age > 1.4) {
          pulsesRef.current.delete(hash)
          continue
        }
        const n = byHash.get(hash)
        if (!n) continue
        const p = age / 1.4
        const b = n.block
        const c = TYPE_COLORS[b.block_type] ?? TYPE_COLORS.Normal
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.size / 2 + 4 + p * 26, 0, Math.PI * 2)
        ctx.strokeStyle = c.main
        ctx.globalAlpha = (1 - p) * 0.7
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      // ---- Nodes ----
      ctx.textAlign = 'center'
      const showTopoLabels = colW >= 44 // 6-digit labels need room on narrow screens
      for (const n of nodes) {
        const b = n.block
        const c = TYPE_COLORS[b.block_type] ?? TYPE_COLORS.Normal
        const t0 = pulsesRef.current.get(b.hash)
        const age = t0 ? (now - t0) / 1000 : Infinity
        const scale = age < 0.6 ? 0.55 + 0.45 * (age / 0.6) : 1
        const s = n.size * scale
        const hovered = hover?.block.hash === b.hash

        ctx.save()
        if (age < 8) {
          ctx.shadowColor = c.main
          ctx.shadowBlur = 14 * Math.max(0, 1 - age / 8)
        }
        ctx.beginPath()
        const r = 7
        const x0 = n.x - s / 2
        const y0 = n.y - s / 2
        ctx.roundRect(x0, y0, s, s, r)
        ctx.fillStyle = c.fill
        ctx.fill()
        ctx.lineWidth = hovered ? 2 : 1.4
        ctx.strokeStyle = hovered ? '#ffffff' : c.main
        ctx.stroke()
        ctx.restore()

        // topoheight label (skipped on narrow canvases — tap a block instead)
        if (showTopoLabels) {
          ctx.fillStyle = 'rgba(148,160,190,0.75)'
          ctx.font = '9px "JetBrains Mono", monospace'
          ctx.fillText(b.topoheight >= 0 ? String(b.topoheight) : 'orph', n.x, n.y + s / 2 + 12)
        }

        // tx badge
        const txs = b.txs_hashes?.length ?? 0
        if (txs > 0) {
          ctx.beginPath()
          ctx.arc(n.x + s / 2 + 1, n.y - s / 2 + 1, 7.5, 0, Math.PI * 2)
          ctx.fillStyle = c.main
          ctx.fill()
          ctx.fillStyle = '#0b0714'
          ctx.font = 'bold 9px "JetBrains Mono", monospace'
          ctx.fillText(String(txs), n.x + s / 2 + 1, n.y - s / 2 + 4)
        }

        // side-block marker (30% reward)
        if (b.block_type === 'Side') {
          ctx.fillStyle = 'rgba(251,191,36,0.9)'
          ctx.font = '8px "JetBrains Mono", monospace'
          ctx.fillText('30%', n.x, n.y + s / 2 + 23)
        }
      }

      // ---- Height ruler ----
      const rulerStep = Math.max(1, Math.ceil(70 / colW)) // ≥ ~70px between labels
      ctx.fillStyle = 'rgba(120,125,150,0.35)'
      ctx.strokeStyle = 'rgba(120,125,150,0.3)'
      for (let hh = Math.ceil(v.hMin); hh <= maxH; hh++) {
        const x = xOf(hh)
        // tick every column
        ctx.beginPath()
        ctx.moveTo(x, h - rulerH + 4)
        ctx.lineTo(x, h - rulerH + 8)
        ctx.stroke()
        // label only when spaced enough
        if ((hh - Math.ceil(v.hMin)) % rulerStep === 0) {
          ctx.fillStyle = 'rgba(120,125,150,0.55)'
          ctx.font = '9px "JetBrains Mono", monospace'
          ctx.textAlign = 'center'
          ctx.fillText(String(hh), x, h - 10)
        }
      }
      // live arrow at right edge
      ctx.fillStyle = 'rgba(167,139,250,0.8)'
      ctx.textAlign = 'right'
      ctx.fillText('now →', w - 8, h - 10)
    }
    raf = requestAnimationFrame(draw)

    // pointer events
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const hit = hitTest(mx, my)
      canvas.style.cursor = hit ? 'pointer' : 'default'
      setHover(hit ? { block: hit, x: mx, y: my, maxX: rect.width } : null)
    }
    const onLeave = () => setHover(null)
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top)
      if (hit) onSelect(hit)
    }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    canvas.addEventListener('click', onClick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
      canvas.removeEventListener('click', onClick)
    }
  }, [hitTest, hover, onSelect])

  const statusLabel =
    status === 'live' ? 'LIVE · WEBSOCKET' : status === 'connecting' ? 'CONNECTING…' : status === 'reconnecting' ? 'RECONNECTING…' : status === 'boot' ? 'SYNCING…' : 'POLLING'

  return (
    <div
      ref={panelRef}
      className={`relative overflow-hidden ${
        isFs ? 'fixed inset-0 z-50 bg-[#0b0714] flex flex-col' : 'rounded-2xl glass-panel'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between gap-2 px-4 md:px-5 pt-4 pb-2 ${isFs ? 'shrink-0' : ''}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">The Lattice</span>
          <span className="text-[10px] text-muted-foreground/70 hidden lg:inline">— live BlockDAG topology</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 2D / 3D segmented control */}
          <div className="flex items-center rounded-full border border-border bg-card/60 p-0.5">
            {(['2d', '3d'] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[10px] font-mono uppercase tracking-wider transition-all ${
                  mode === m ? 'bg-vault/20 text-vault' : 'text-muted-foreground hover:text-foreground'
                }`}
                title={m === '3d' ? '3D constellation, drag to orbit, scroll to zoom' : '2D canvas view'}
              >
                {m === '3d' && <Box className="w-3 h-3" />}
                {m}
              </button>
            ))}
          </div>
          <span className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground whitespace-nowrap">{statusLabel}</span>
          </span>
          <button
            onClick={toggleFs}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-vault hover:border-vault/40 transition-colors"
            title={isFs ? 'Exit cinema mode' : 'Cinema mode (fullscreen)'}
          >
            {isFs ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 md:px-5 pb-2 text-[10px] font-mono text-muted-foreground ${isFs ? 'shrink-0' : ''}`}>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[3px]" style={{ background: '#a78bfa' }} /> normal</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[3px]" style={{ background: '#67e8f9' }} /> sync</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[3px]" style={{ background: '#fbbf24' }} /> side · 30%</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[3px] border border-red-400/60" /> orphaned</span>
        <span className="hidden md:inline text-muted-foreground/60">· forked blocks share a height · x = height · click a block</span>
        {mode === '3d' && <span className="text-vault/70">· drag to orbit · scroll to zoom</span>}
      </div>

      {/* Canvas area */}
      <div className={`relative w-full ${isFs ? 'flex-1 min-h-0' : 'h-[320px] md:h-[430px]'}`}>
        {mode === '2d' ? (
          <div ref={wrapRef} className="absolute inset-0">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

            {/* Tooltip */}
            {hover && (
              <div
                className="pointer-events-none absolute z-20 rounded-xl glass-panel px-3 py-2.5 text-[11px] font-mono leading-relaxed shadow-2xl"
                style={{
                  left: Math.min(Math.max(hover.x + 14, 8), Math.max(hover.maxX - 210, 8)),
                  top: Math.max(hover.y - 14, 8),
                  width: 200,
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-vault font-semibold">{hover.block.topoheight >= 0 ? `#${hover.block.topoheight}` : 'orphaned'}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider"
                    style={{
                      color: TYPE_COLORS[hover.block.block_type]?.main,
                      background: (TYPE_COLORS[hover.block.block_type]?.fill ?? 'rgba(167,139,250,0.16)') as string,
                    }}
                  >
                    {hover.block.block_type}
                  </span>
                </div>
                <div className="text-muted-foreground">height {hover.block.height} · {hover.block.txs_hashes?.length ?? 0} txs</div>
                <div className="text-muted-foreground">reward {fmtXEL(hover.block.reward)} XET</div>
                <div className="text-muted-foreground truncate">{shortHash(hover.block.miner, 14, 8)}</div>
                <div className="text-vault/70 mt-1 text-[9px] uppercase tracking-wider">click to inspect</div>
              </div>
            )}
          </div>
        ) : (
          <Lattice3D blocks={blocks} stableHeight={stableHeight} onSelect={onSelect} />
        )}
      </div>
    </div>
  )
}
