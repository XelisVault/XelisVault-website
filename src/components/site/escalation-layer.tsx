'use client'

import { useEffect, useRef } from 'react'
import { useCountdownState } from '@/lib/countdown'

/**
 * ═══════════════════════════════════════════════════════════════════
 *  ESCALATION LAYER — global ambient energy that grows with T-0
 * ═══════════════════════════════════════════════════════════════════
 *
 *  The closer the launch, the more the whole site "lives":
 *
 *  · ENERGY IN-FLOW  particles stream from the screen edges toward the
 *                    center (the vault), faster & denser over time
 *  · COLOR SHIFT     violet (calm) → amber (critical)
 *  · SURGES          from T-10min, every whole second emits an energy
 *                    pulse ring from the center
 *  · HEARTBEAT       from T-60s, the screen vignette beats with a
 *                    double-thump on every second
 *
 *  Single canvas + rAF, mix-blend-screen, pointer-events-none.
 *  Respects prefers-reduced-motion · pauses when the tab is hidden.
 */

const VIOLET = { r: 148, g: 100, b: 255 } // oklch(0.62 0.22 295)
const AMBER = { r: 255, g: 196, b: 106 } // oklch(0.8 0.17 65)

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
function rgba(c: { r: number; g: number; b: number }, alpha: number) {
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${alpha})`
}

interface Particle {
  x: number
  y: number
  px: number
  py: number
  vx: number
  vy: number
  size: number
  alpha: number
  glyph: string | null
  jitterSeed: number
  dead: boolean
}

interface Ring {
  r: number
  alpha: number
  speed: number
}

export function EscalationLayer() {
  const { intensity, isEscalating, isLaunched } = useCountdownState()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const vignetteRef = useRef<HTMLDivElement>(null)
  const intensityRef = useRef(intensity)
  const activeRef = useRef(isEscalating)

  intensityRef.current = intensity
  activeRef.current = isEscalating

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (reduced) return
    const canvas = canvasRef.current
    const vignette = vignetteRef.current
    if (!canvas || !vignette) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let running = true
    let W = 0
    let H = 0
    let dpr = 1
    let monoFont = '"JetBrains Mono", monospace'
    try {
      const v = getComputedStyle(document.body).getPropertyValue('--font-jetbrains')
      if (v && v.trim().length > 2) monoFont = v.trim()
    } catch {
      /* fallback above */
    }

    const particles: Particle[] = []
    const rings: Ring[] = []
    const GLYPHS = '0123456789ABCDEF∆ΣΦΨΩαβγλπσ≈≠≡⊕⊗'

    const resize = () => {
      dpr = Math.min(1.75, window.devicePixelRatio || 1)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const spawnEdge = (): Particle => {
      // random point on a screen edge
      const edge = Math.floor(Math.random() * 4)
      let x = 0
      let y = 0
      if (edge === 0) {
        x = Math.random() * W
        y = -20
      } else if (edge === 1) {
        x = W + 20
        y = Math.random() * H
      } else if (edge === 2) {
        x = Math.random() * W
        y = H + 20
      } else {
        x = -20
        y = Math.random() * H
      }
      return {
        x,
        y,
        px: x,
        py: y,
        vx: 0,
        vy: 0,
        size: 1.2 + Math.random() * 2.2,
        alpha: 0.25 + Math.random() * 0.5,
        glyph: Math.random() < 0.16 ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] : null,
        jitterSeed: Math.random() * 1000,
        dead: false,
      }
    }

    let lastSecond = -1
    let lastVignetteUpdate = 0

    const frame = (t: number) => {
      if (!running) return
      raf = requestAnimationFrame(frame)
      if (document.hidden) return

      const inten = intensityRef.current
      const active = activeRef.current
      if (!active) {
        ctx.clearRect(0, 0, W, H)
        vignette.style.opacity = '0'
        return
      }

      // ── attractor: screen center with organic drift ──
      const cx = W / 2 + Math.sin(t / 3400) * W * 0.06
      const cy = H / 2 + Math.cos(t / 4100) * H * 0.06

      // ── target particle budget from intensity & viewport ──
      const budget = Math.floor(
        Math.min(130, (18 + inten * 115) * Math.min(1.35, (W * H) / (1440 * 900)))
      )
      while (particles.length < budget) particles.push(spawnEdge())
      if (particles.length > budget + 14) particles.splice(0, particles.length - budget - 14)

      ctx.clearRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'

      const speedMul = 0.35 + inten * 1.75
      const col = {
        r: lerp(VIOLET.r, AMBER.r, inten),
        g: lerp(VIOLET.g, AMBER.g, inten),
        b: lerp(VIOLET.b, AMBER.b, inten),
      }

      for (const p of particles) {
        p.px = p.x
        p.py = p.y
        const dx = cx - p.x
        const dy = cy - p.y
        const dist = Math.hypot(dx, dy) || 1
        // acceleration toward the vault + swirl
        const swirl = Math.sin(t / 900 + p.jitterSeed) * 0.55 * (0.4 + inten)
        const ax = (dx / dist) * speedMul + (-dy / dist) * swirl
        const ay = (dy / dist) * speedMul + (dx / dist) * swirl
        p.vx = p.vx * 0.86 + ax * 0.14
        p.vy = p.vy * 0.86 + ay * 0.14
        p.x += p.vx
        p.y += p.vy

        if (dist < 70 + inten * 40 || p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) {
          p.dead = true
        }
        const a = p.alpha * (0.35 + inten * 0.65)
        if (p.glyph) {
          ctx.globalAlpha = a * 0.8
          ctx.fillStyle = rgba(col, 1)
          ctx.font = `${9 + p.size * 3}px ${monoFont}`
          ctx.fillText(p.glyph, p.x, p.y)
        } else {
          ctx.globalAlpha = a
          ctx.strokeStyle = rgba(col, 1)
          ctx.lineWidth = p.size
          ctx.beginPath()
          ctx.moveTo(p.px, p.py)
          ctx.lineTo(p.x, p.y)
          ctx.stroke()
        }
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].dead) particles.splice(i, 1)
      }

      // ── second-boundary surges & heartbeat ──
      const sec = Math.floor(t / 1000)
      let thump = 0
      if (sec !== lastSecond) {
        if (lastSecond !== -1 && inten >= 0.5) {
          rings.push({ r: 30, alpha: 0.32 + inten * 0.3, speed: 3.2 + inten * 4.5 })
          if (inten >= 0.85) rings.push({ r: 12, alpha: 0.4, speed: 6.5 })
        }
        lastSecond = sec
      }
      // double-thump profile within the current second
      const msInSec = t % 1000
      if (inten >= 0.72) {
        if (msInSec < 130) thump = 1 - msInSec / 130
        else if (msInSec > 210 && msInSec < 340) thump = 0.55 * (1 - (msInSec - 210) / 130)
      }

      // ── surge rings ──
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i]
        ring.r += ring.speed
        ring.alpha *= 0.955
        if (ring.alpha < 0.01 || ring.r > Math.max(W, H)) {
          rings.splice(i, 1)
          continue
        }
        ctx.globalAlpha = ring.alpha
        ctx.strokeStyle = rgba(col, 1)
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.arc(cx, cy, ring.r, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'

      // ── vignette heartbeat (throttled DOM writes) ──
      if (t - lastVignetteUpdate > 70) {
        lastVignetteUpdate = t
        const base = 0.1 + inten * 0.24
        const beat = thump * inten * 0.38
        vignette.style.opacity = String(Math.min(0.85, base + beat))
        const c = rgba(col, 1)
        vignette.style.background = `radial-gradient(ellipse at ${Math.round((cx / W) * 100)}% ${Math.round((cy / H) * 100)}%, transparent 42%, ${c.replace(/[\d.]+\)$/, `${(0.16 + inten * 0.2).toFixed(2)})`)} 100%)`
      }
    }
    raf = requestAnimationFrame(frame)

    const onVisibility = () => {
      if (!document.hidden && !running) {
        running = true
        raf = requestAnimationFrame(frame)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduced])

  if (isLaunched) return null

  return (
    <div className="fixed inset-0 z-[2] pointer-events-none" aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 mix-blend-screen" />
      <div ref={vignetteRef} className="absolute inset-0" style={{ opacity: 0 }} />
      {reduced && isEscalating && (
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(180,140,255,0.12) 100%)',
          }}
        />
      )}
    </div>
  )
}
