// VaultLaunch — client bridge to the server candle archive.
//
// Server-first hydration: before ANY in-browser chain walk, ask
// /api/launch/candles — when the archive already holds the coin's
// series the FULL history arrives in one request (the walk was paid
// once, server-side, by the first visitor). While a first walk runs
// server-side the endpoint answers `syncing` + progress and this
// helper polls it, driving the chart's loading panel. When the archive
// is absent (no DATABASE_URL) or unreachable, callers fall back to the
// legacy in-browser backfill — the site never depends on it.

import type { ChartSeries } from './persist'

export type ArchiveStatus =
  | 'ready'        // series served
  | 'syncing'      // a server-side walk is running (progress 0..1)
  | 'missing'      // asset unknown on chain / nothing to serve yet
  | 'frozen'       // curve closed (migrated) — series served as-is
  | 'unconfigured' // no DATABASE_URL on the server
  | 'error'

export interface ArchiveResponse {
  ok: boolean
  status: ArchiveStatus
  series?: ChartSeries
  ageS?: number
  progress?: number
  phase?: string
  error?: string
}

export interface FetchArchiveOpts {
  /** poll interval while the server walks (default 2 500 ms) */
  pollMs?: number
  /** give up after this long and let the caller fall back (default 20 000) */
  maxWaitMs?: number
  /** live progress → the chart's loading panel */
  onProgress?: (r: ArchiveResponse) => void
}

async function getOnce(kind: string, id: string): Promise<ArchiveResponse | null> {
  try {
    const res = await fetch(
      `/api/launch/candles?series=${encodeURIComponent(`${kind}:${id}`)}`,
      { cache: 'no-store' },
    )
    if (!res.ok) return null
    const data = (await res.json()) as ArchiveResponse
    if (!data || typeof data.status !== 'string') return null
    return data
  } catch {
    return null // network error / route down → caller falls back
  }
}

function usableSeries(r: ArchiveResponse | null): ChartSeries | null {
  if (!r) return null
  if (r.status !== 'ready' && r.status !== 'frozen') return null
  const s = r.series
  if (!s || !Array.isArray(s.history) || s.history.length < 2) return null
  if (typeof s.histStart !== 'number' || typeof s.intervalTopo !== 'number' || s.intervalTopo < 1) return null
  return s
}

/**
 * Fetch a series from the archive. Returns the series when served
 * (ready or frozen), polls while a server-side first walk runs (up to
 * `maxWaitMs`), and returns null as soon as the caller should fall
 * back to the legacy in-browser backfill.
 */
export async function fetchArchiveSeries(
  kind: string,
  id: string,
  opts: FetchArchiveOpts = {},
): Promise<ChartSeries | null> {
  const { pollMs = 2_500, maxWaitMs = 20_000, onProgress } = opts
  const deadline = Date.now() + Math.max(0, maxWaitMs)

  let r = await getOnce(kind, id)
  const s = usableSeries(r)
  if (s) return s

  // a server-side walk is running — poll it, surfacing the progress
  while (
    r &&
    r.status === 'syncing' &&
    Date.now() < deadline
  ) {
    onProgress?.(r)
    await new Promise((resolve) => setTimeout(resolve, pollMs))
    r = await getOnce(kind, id)
    const again = usableSeries(r)
    if (again) return again
  }

  return usableSeries(r)
}

/** One archive GET, no polling — lets a caller distinguish "the
 *  server is walking right now" (keep the panel, don't burn the
 *  browser) from "the archive has nothing" (walk locally). */
export async function fetchArchiveStatus(
  kind: string,
  id: string,
): Promise<ArchiveResponse | null> {
  return getOnce(kind, id)
}
