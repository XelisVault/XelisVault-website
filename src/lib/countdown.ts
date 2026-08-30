'use client'

import { useState, useEffect, useMemo } from 'react'

/**
 * Shared launch countdown state — SINGLE SOURCE OF TRUTH.
 *
 * ⚠️ GOLDEN RULE: the launch date is LOCKED. Do not change it.
 *    Testnet launch: August 30, 2026 · 14:00 UTC
 */
export const LAUNCH_DATE = new Date('2026-08-30T14:00:00Z').getTime()
export const ANNOUNCE_DATE = new Date('2026-08-09T00:00:00Z').getTime()
export const TOTAL_DURATION = LAUNCH_DATE - ANNOUNCE_DATE

// sessionStorage keys
export const CELEBRATION_KEY = 'xv-launch-celebration-v2'
export const WELCOME_KEY = 'xv-welcome-played-v1'
const PREVIEW_LAUNCH_KEY = 'xv-preview-launch'
const PREVIEW_FINAL_KEY = 'xv-preview-final'
const PREVIEW_RAMP_KEY = 'xv-preview-ramp'
const PREVIEW_WELCOME_KEY = 'xv-preview-welcome'

export type PreviewMode = 'launch' | 'final' | 'ramp' | 'welcome' | null

/**
 * Read preview overrides from the URL (never persisted across browsers):
 *  ?preview=launch   → app is considered launched (owner testing)
 *  ?preview=final    → simulates the last ~9.5 seconds before launch
 *  ?preview=ramp     → ramps escalation intensity 0→1 over ~24s (visual QA)
 *  ?preview=welcome  → plays the late-comer welcome sequence
 */
function readPreviewMode(): PreviewMode {
  if (typeof window === 'undefined') return null
  try {
    const url = new URL(window.location.href)
    const p = url.searchParams.get('preview')
    const strip = () => {
      url.searchParams.delete('preview')
      window.history.replaceState({}, '', url.toString())
    }
    // an explicit ?preview=… param always wins for the session — clear the
    // sibling flags so an older preview mode can never shadow a newer one
    const clearSiblings = (...keep: string[]) => {
      ;[PREVIEW_LAUNCH_KEY, PREVIEW_FINAL_KEY, PREVIEW_RAMP_KEY, PREVIEW_WELCOME_KEY]
        .filter((k) => !keep.includes(k))
        .forEach((k) => sessionStorage.removeItem(k))
    }
    if (p === 'launch') {
      sessionStorage.setItem(PREVIEW_LAUNCH_KEY, '1')
      clearSiblings(PREVIEW_LAUNCH_KEY)
      strip()
      return 'launch'
    }
    if (p === 'final') {
      sessionStorage.setItem(PREVIEW_FINAL_KEY, '1')
      clearSiblings(PREVIEW_FINAL_KEY)
      strip()
      return 'final'
    }
    if (p === 'ramp') {
      sessionStorage.setItem(PREVIEW_RAMP_KEY, '1')
      clearSiblings(PREVIEW_RAMP_KEY)
      strip()
      return 'ramp'
    }
    if (p === 'welcome') {
      sessionStorage.setItem(PREVIEW_WELCOME_KEY, '1')
      clearSiblings(PREVIEW_WELCOME_KEY)
      strip()
      return 'welcome'
    }
    if (sessionStorage.getItem(PREVIEW_LAUNCH_KEY) === '1') return 'launch'
    if (sessionStorage.getItem(PREVIEW_FINAL_KEY) === '1') return 'final'
    if (sessionStorage.getItem(PREVIEW_RAMP_KEY) === '1') return 'ramp'
    if (sessionStorage.getItem(PREVIEW_WELCOME_KEY) === '1') return 'welcome'
    return null
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════════
//  ESCALATION ENGINE — "the closer we get, the more it lives"
// ═══════════════════════════════════════════════════════════════

export type EscalationPhase =
  | 'calm' // > 6h     — dormant
  | 'approach' // ≤ 6h  → 1h    — waking up
  | 'arming' // ≤ 1h   → 10min — systems arming
  | 'energizing' // ≤ 10min → 60s — energy surges
  | 'heartbeat' // ≤ 60s → 10s  — every beat counts
  | 'final' // ≤ 10s            — full-screen theatre
  | 'live' // launched           — open vault

const HOUR = 3_600_000
const MIN = 60_000

/** phase boundaries in ms-left */
const T_APPROACH = 6 * HOUR
const T_ARMING = 1 * HOUR
const T_ENERGIZING = 10 * MIN
const T_HEARTBEAT = 60_000
const T_FINAL = 10_000

/** continuous intensity 0→1 for a given msLeft */
function intensityFor(msLeft: number): number {
  if (msLeft <= 0) return 1
  const seg = (from: number, to: number, i0: number, i1: number) => {
    const t = Math.max(0, Math.min(1, (from - msLeft) / (from - to)))
    return i0 + (i1 - i0) * t
  }
  if (msLeft > T_APPROACH) return 0
  if (msLeft > T_ARMING) return seg(T_APPROACH, T_ARMING, 0, 0.3)
  if (msLeft > T_ENERGIZING) return seg(T_ARMING, T_ENERGIZING, 0.3, 0.55)
  if (msLeft > T_HEARTBEAT) return seg(T_ENERGIZING, T_HEARTBEAT, 0.55, 0.8)
  if (msLeft > T_FINAL) return seg(T_HEARTBEAT, T_FINAL, 0.8, 1)
  return 1
}

function phaseFor(msLeft: number): EscalationPhase {
  if (msLeft <= 0) return 'live'
  if (msLeft <= T_FINAL) return 'final'
  if (msLeft <= T_HEARTBEAT) return 'heartbeat'
  if (msLeft <= T_ENERGIZING) return 'energizing'
  if (msLeft <= T_ARMING) return 'arming'
  if (msLeft <= T_APPROACH) return 'approach'
  return 'calm'
}

/** Phase → [label, short badge] used across the dial & status strips */
export const PHASE_META: Record<EscalationPhase, { label: string; badge: string; hue: 'vault' | 'violet' | 'mix' | 'amber' }> = {
  calm: { label: 'Vault Sealing', badge: 'STANDBY', hue: 'vault' },
  approach: { label: 'Approaching Launch', badge: 'PHASE 1 · WAKE', hue: 'vault' },
  arming: { label: 'Arming Sequence', badge: 'PHASE 2 · ARMING', hue: 'violet' },
  energizing: { label: 'Network Charging', badge: 'PHASE 3 · SURGE', hue: 'mix' },
  heartbeat: { label: 'Vault Heartbeat', badge: 'PHASE 4 · CRITICAL', hue: 'amber' },
  final: { label: 'Final Sequence', badge: 'FINAL', hue: 'amber' },
  live: { label: 'Vault Open', badge: 'LIVE', hue: 'amber' },
}

// ═══════════════════════════════════════════════════════════════

export interface CountdownState {
  /** milliseconds left before launch (0 once launched) */
  msLeft: number
  /** true once the countdown reached zero (or preview=launch) */
  isLaunched: boolean
  /** true during the final 10 seconds before launch (or preview=final) */
  isFinalCountdown: boolean
  /** seconds left, rounded up — during final countdown this is the big digit */
  finalSeconds: number
  days: number
  hours: number
  minutes: number
  seconds: number
  /** overall sealing progress 0..1 since the announcement */
  progress: number
  launchDate: number
  preview: PreviewMode
  /** escalation intensity 0..1 — grows continuously as T-0 approaches */
  intensity: number
  /** discrete escalation phase (calm → live) */
  escalation: EscalationPhase
  /** true when ambient escalation effects should render (intensity > 0) */
  isEscalating: boolean
}

export function useCountdownState(): CountdownState {
  const [preview] = useState<PreviewMode>(readPreviewMode)
  const [mountedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(i)
  }, [])

  return useMemo<CountdownState>(() => {
    let msLeft: number
    let isLaunched: boolean

    if (preview === 'launch' || preview === 'welcome') {
      msLeft = 0
      isLaunched = true
    } else if (preview === 'final') {
      // simulate the last 9.5s from the moment the flag was set
      msLeft = Math.max(0, 9500 - (now - mountedAt))
      isLaunched = msLeft <= 0
    } else {
      msLeft = Math.max(0, LAUNCH_DATE - now)
      isLaunched = now >= LAUNCH_DATE
    }

    const isFinalCountdown = !isLaunched && msLeft <= 10_000
    const finalSeconds = Math.max(0, Math.ceil(msLeft / 1000))
    const progress = Math.max(0, Math.min(1, (TOTAL_DURATION - msLeft) / TOTAL_DURATION))

    // Escalation — preview=ramp sweeps the whole spectrum in ~24s
    let intensity: number
    if (preview === 'ramp' && !isLaunched) {
      intensity = Math.min(1, (now - mountedAt) / 24_000)
    } else if (preview === 'final') {
      intensity = 0.8 + 0.2 * (1 - Math.min(1, msLeft / 9500))
    } else {
      intensity = isLaunched ? 1 : intensityFor(msLeft)
    }
    let escalation: EscalationPhase
    if (isLaunched) {
      escalation = 'live'
    } else if (preview === 'ramp') {
      // derive the phase from the sweeping intensity, not from the clock
      escalation =
        intensity >= 1
          ? 'final'
          : intensity >= 0.8
            ? 'heartbeat'
            : intensity >= 0.55
              ? 'energizing'
              : intensity >= 0.3
                ? 'arming'
                : 'approach'
    } else {
      escalation = phaseFor(msLeft)
    }

    return {
      msLeft,
      isLaunched,
      isFinalCountdown,
      finalSeconds,
      days: Math.floor(msLeft / 86_400_000),
      hours: Math.floor((msLeft % 86_400_000) / 3_600_000),
      minutes: Math.floor((msLeft % 3_600_000) / 60_000),
      seconds: Math.floor((msLeft % 60_000) / 1000),
      progress,
      launchDate: LAUNCH_DATE,
      preview,
      intensity,
      escalation,
      isEscalating: intensity > 0 && !isLaunched,
    }
  }, [preview, now, mountedAt])
}

/** Cipher glyphs shared by the countdown & the celebration decode effects */
export const CIPHER_GLYPHS =
  '0123456789ABCDEF∆∇ΣΦΨΩαβγδλμπσ∂∫∏≈≠≡⊕⊗⨯⏃⏆'.split('')

export function randomGlyph(): string {
  return CIPHER_GLYPHS[Math.floor(Math.random() * CIPHER_GLYPHS.length)]
}

/** Deterministic PRNG (mulberry32) — stable particles across re-renders */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fire a global easter-egg event (toast + registry handled by <EasterEggs />) */
export function fireEgg(id: string, detail?: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('xv:egg', { detail: { id, detail } }))
}

/**
 * Inject an alpha into a COMPLETE color string, e.g.
 *   alpha('oklch(0.72 0.14 160)', 0.4) → 'oklch(0.72 0.14 160 / 0.4)'
 *
 * Why: `oklch(0.72 0.14 160) / 0.4` (slash OUTSIDE the parens) is invalid
 * CSS — browsers drop the whole declaration (stroke→none, box-shadow→none).
 * The alpha must live INSIDE the color function.
 */
export function alpha(color: string, a: number | string): string {
  return color.replace(/\)$/, ` / ${a})`)
}
