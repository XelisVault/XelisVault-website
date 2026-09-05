'use client'

/**
 * useNervaPrice — live XNV market price, shared across the NERVA tools.
 *
 * Single request loop for the whole app (module-level singleton): the POS,
 * price tags, checkout and watch pages all display the exact same quote at
 * the same instant. Data comes from our own /api/nerva/price aggregator
 * (CoinGecko → CoinPaprika fallback), never straight from an exchange —
 * so CORS, rate limits and API changes are handled server-side.
 */

import { useEffect, useState } from 'react'

export interface NervaPrice {
  /** human-readable source label, e.g. "CoinGecko" */
  source: string
  /** EUR per 1 XNV */
  eur: number
  /** USD per 1 XNV (when the source provides it) */
  usd: number | null
  /** BTC per 1 XNV (when the source provides it) */
  btc: number | null
  /** unix ms of the quote */
  updatedAt: number
  /** true when served from the outage cache */
  stale: boolean
}

const POLL_MS = 60_000
const VISIBILITY_MAX_AGE_MS = 45_000

let snapshot: NervaPrice | null = null
let listeners = new Set<(p: NervaPrice | null) => void>()
let timer: ReturnType<typeof setInterval> | null = null
let inflight = false

async function tick(): Promise<void> {
  if (inflight) return
  inflight = true
  try {
    const res = await fetch('/api/nerva/price', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const j = (await res.json()) as Record<string, unknown>
    const eur = Number(j.eur)
    if (!Number.isFinite(eur) || eur <= 0) throw new Error('bad payload')
    snapshot = {
      source: typeof j.source === 'string' ? j.source : '—',
      eur,
      usd: Number.isFinite(Number(j.usd)) && Number(j.usd) > 0 ? Number(j.usd) : null,
      btc: Number.isFinite(Number(j.btc)) && Number(j.btc) > 0 ? Number(j.btc) : null,
      updatedAt: Number(j.updatedAt) || Date.now(),
      stale: j.stale === true,
    }
    for (const l of listeners) l(snapshot)
  } catch {
    /* keep the last snapshot; the next poll retries */
  } finally {
    inflight = false
  }
}

function ensureLoop() {
  if (timer || typeof window === 'undefined') return
  void tick()
  timer = setInterval(() => void tick(), POLL_MS)
  document.addEventListener('visibilitychange', () => {
    if (
      document.visibilityState === 'visible' &&
      (!snapshot || Date.now() - snapshot.updatedAt > VISIBILITY_MAX_AGE_MS)
    ) {
      void tick()
    }
  })
}

function stopLoopIfIdle() {
  if (listeners.size === 0 && timer) {
    clearInterval(timer)
    timer = null
  }
}

export function useNervaPrice(): { price: NervaPrice | null; refresh: () => void } {
  const [price, setPrice] = useState<NervaPrice | null>(() => snapshot)

  useEffect(() => {
    const listener = (p: NervaPrice | null) => setPrice(p)
    listeners.add(listener)
    ensureLoop()
    return () => {
      listeners.delete(listener)
      stopLoopIfIdle()
    }
  }, [])

  return { price, refresh: () => void tick() }
}

/* ─────────────── formatting / conversion helpers ─────────────── */

/**
 * Atomic XNV (1e12) → EUR display string using a numeric EUR/XNV rate.
 * Pure integer math: the rate is scaled by 1e6 (rateScaled), atomic ×
 * rateScaled is divided by 1e12 to micro-EUR, then rounded to cents —
 * no float drift, no precision loss on small XNV-sized rates.
 */
export function xnvAtomicToEur(amountAtomic: string | bigint, eurPerXnv: number): string | null {
  if (!Number.isFinite(eurPerXnv) || eurPerXnv <= 0) return null
  try {
    const big = typeof amountAtomic === 'bigint' ? amountAtomic : BigInt(amountAtomic)
    if (big < 0n) return null
    const rateScaled = BigInt(Math.round(eurPerXnv * 1e6))
    if (rateScaled <= 0n) return null
    // microEUR = atomic × rate × 1e6 = (atomic × rateScaled) / 1e12
    const microEur = (big * rateScaled) / 10n ** 12n
    // cents = microEUR / 1e4, rounded; EUR = cents / 100
    const cents = Math.round(Number(microEur) / 1e4)
    const eur = cents / 100
    if (!Number.isFinite(eur)) return null
    return eur.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  } catch {
    return null
  }
}

/** EUR → atomic XNV for a numeric rate (integer atomic, banker-ish rounding). */
export function eurToXnvAtomic(eur: number, eurPerXnv: number): bigint | null {
  if (!Number.isFinite(eur) || !Number.isFinite(eurPerXnv) || eurPerXnv <= 0 || eur <= 0) return null
  try {
    // atomic = eur / rate × 1e12 — scale eur to micro-cents to stay integral
    const eurMicro = BigInt(Math.round(eur * 1e6))
    const rateScaled = BigInt(Math.round(eurPerXnv * 1e6))
    return (eurMicro * 10n ** 12n) / (rateScaled * 10n ** 6n)
  } catch {
    return null
  }
}

/** "1 XNV = €0.0778 · CoinGecko · 12:03" style caption */
export function priceCaption(p: NervaPrice): string {
  const time = new Date(p.updatedAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const rate = p.eur.toLocaleString('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
  return `1 XNV = €${rate} · ${p.source} · ${time}${p.stale ? ' · cached' : ''}`
}
