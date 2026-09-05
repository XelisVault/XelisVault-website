'use client'

/**
 * useNervaPrice — live XNV market price, shared across the NERVA tools.
 *
 * Single request loop for the whole app (module-level singleton): the POS,
 * price tags, checkout and watch pages all display the exact same quote at
 * the same instant. Data comes from our own /api/nerva/price aggregator
 * (CoinGecko → CoinPaprika fallback), never straight from an exchange —
 * so CORS, rate limits and API changes are handled server-side.
 *
 * USD is the reference currency (the whole crypto market quotes in USD):
 * it is always available and shown first. EUR rides along as the secondary
 * display currency.
 */

import { useEffect, useState } from 'react'

export interface NervaPrice {
  /** human-readable source label, e.g. "CoinGecko" */
  source: string
  /** USD per 1 XNV — the reference quote, always present */
  usd: number
  /** EUR per 1 XNV (when the source provides it) */
  eur: number | null
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
    const usd = Number(j.usd)
    if (!Number.isFinite(usd) || usd <= 0) throw new Error('bad payload')
    snapshot = {
      source: typeof j.source === 'string' ? j.source : '—',
      usd,
      eur: Number.isFinite(Number(j.eur)) && Number(j.eur) > 0 ? Number(j.eur) : null,
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
 * Atomic XNV (1e12) → fiat display string using a numeric rate.
 * Pure integer math: the rate is scaled by 1e6 (rateScaled), atomic ×
 * rateScaled is divided by 1e12 to micro-fiat, then rounded to cents —
 * no float drift, no precision loss on small XNV-sized rates.
 */
function xnvAtomicToFiat(amountAtomic: string | bigint, ratePerXnv: number): string | null {
  if (!Number.isFinite(ratePerXnv) || ratePerXnv <= 0) return null
  try {
    const big = typeof amountAtomic === 'bigint' ? amountAtomic : BigInt(amountAtomic)
    if (big < 0n) return null
    const rateScaled = BigInt(Math.round(ratePerXnv * 1e6))
    if (rateScaled <= 0n) return null
    // microFiat = atomic × rate × 1e6 = (atomic × rateScaled) / 1e12
    const micro = (big * rateScaled) / 10n ** 12n
    const cents = Math.round(Number(micro) / 1e4)
    const fiat = cents / 100
    if (!Number.isFinite(fiat)) return null
    return fiat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  } catch {
    return null
  }
}

/** Atomic XNV → USD display string (reference currency). */
export function xnvAtomicToUsd(amountAtomic: string | bigint, usdPerXnv: number): string | null {
  return xnvAtomicToFiat(amountAtomic, usdPerXnv)
}

/** Atomic XNV → EUR display string (secondary currency). */
export function xnvAtomicToEur(amountAtomic: string | bigint, eurPerXnv: number): string | null {
  return xnvAtomicToFiat(amountAtomic, eurPerXnv)
}

/** fiat (USD or EUR) → atomic XNV for a numeric rate (integer atomic). */
export function fiatToXnvAtomic(fiat: number, ratePerXnv: number): bigint | null {
  if (!Number.isFinite(fiat) || !Number.isFinite(ratePerXnv) || ratePerXnv <= 0 || fiat <= 0) return null
  try {
    // atomic = fiat / rate × 1e12 — scale fiat to micro units to stay integral
    const fiatMicro = BigInt(Math.round(fiat * 1e6))
    const rateScaled = BigInt(Math.round(ratePerXnv * 1e6))
    return (fiatMicro * 10n ** 12n) / (rateScaled * 10n ** 6n)
  } catch {
    return null
  }
}

/** USD → atomic XNV (alias of fiatToXnvAtomic for readability). */
export function usdToXnvAtomic(usd: number, usdPerXnv: number): bigint | null {
  return fiatToXnvAtomic(usd, usdPerXnv)
}

/** EUR → atomic XNV. */
export function eurToXnvAtomic(eur: number, eurPerXnv: number): bigint | null {
  return fiatToXnvAtomic(eur, eurPerXnv)
}

/** "1 XNV = $0.0778 · €0.0712 · CoinGecko · 12:03" style caption (USD first) */
export function priceCaption(p: NervaPrice): string {
  const time = new Date(p.updatedAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const usd = p.usd.toLocaleString('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
  const eur = p.eur
    ? p.eur.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
    : null
  return `1 XNV = $${usd}${eur ? ` · €${eur}` : ''} · ${p.source} · ${time}${p.stale ? ' · cached' : ''}`
}
