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
const PREVIEW_LAUNCH_KEY = 'xv-preview-launch'
const PREVIEW_FINAL_KEY = 'xv-preview-final'

export type PreviewMode = 'launch' | 'final' | null

/**
 * Read preview overrides from the URL (never persisted across browsers):
 *  ?preview=launch → app is considered launched (owner testing)
 *  ?preview=final  → simulates the last ~9.5 seconds before launch
 */
function readPreviewMode(): PreviewMode {
  if (typeof window === 'undefined') return null
  try {
    const url = new URL(window.location.href)
    const p = url.searchParams.get('preview')
    if (p === 'launch') {
      sessionStorage.setItem(PREVIEW_LAUNCH_KEY, '1')
      url.searchParams.delete('preview')
      window.history.replaceState({}, '', url.toString())
      return 'launch'
    }
    if (p === 'final') {
      sessionStorage.setItem(PREVIEW_FINAL_KEY, '1')
      url.searchParams.delete('preview')
      window.history.replaceState({}, '', url.toString())
      return 'final'
    }
    if (sessionStorage.getItem(PREVIEW_LAUNCH_KEY) === '1') return 'launch'
    if (sessionStorage.getItem(PREVIEW_FINAL_KEY) === '1') return 'final'
    return null
  } catch {
    return null
  }
}

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

    if (preview === 'launch') {
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
