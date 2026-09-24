// VaultLaunch — price-series persistence (localStorage).
//
// The chain stores the PRESENT (reserves, scores) but not a tick-by-tick
// price history. The app therefore samples the on-chain spot price on
// every poll cycle and appends it to a local series, one series per
// project (curve era) and per pool (DEX era). The series survive page
// refreshes, tab closes and reboots through localStorage — closing a
// tab for an hour and coming back shows the hour of candles that were
// missed (flat fill while away), not a blank chart.
//
// Series shape (compatible with the chart's absolute bucket anchoring):
//   history[]     price points, oldest → newest
//   histStart     absolute index of history[0] (frozen-candle guarantee)
//   points        total points ever emitted
//   lastTopo      topoheight of the last sample (gap detection)
//   intervalTopo  target spacing between points, in topos
//
// Memory policy: when a series crosses MAX_POINTS, it is decimated 2:1
// (every other point kept) and the interval doubles — the chart
// re-labels itself through `pointSeconds`, so a decimated series shows
// the same history with half the resolution instead of growing forever.

export interface ChartSeries {
  history: number[]
  histStart: number
  points: number
  lastTopo: number
  intervalTopo: number
  savedAt: number
}

const NS = 'xv-launch-chart-v2'
const MAX_POINTS = 3600
/** Max flat-fill points inserted after a gap (≈ 30 min at 6-topo interval). */
const MAX_FILL = 120

function keyOf(kind: string, id: string): string {
  return `${NS}:${kind}:${id}`
}

/** Load a persisted series (never throws — corrupt data is discarded). */
export function loadSeries(kind: string, id: string): ChartSeries | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(keyOf(kind, id))
    if (!raw) return null
    const s = JSON.parse(raw) as ChartSeries
    if (
      !s || !Array.isArray(s.history) || s.history.length === 0 ||
      typeof s.histStart !== 'number' || typeof s.points !== 'number' ||
      typeof s.lastTopo !== 'number' || typeof s.intervalTopo !== 'number' ||
      s.intervalTopo < 1
    ) return null
    return s
  } catch {
    return null
  }
}

/** Persist a series (never throws — quota errors are silently ignored). */
export function saveSeries(kind: string, id: string, s: ChartSeries): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(keyOf(kind, id), JSON.stringify(s))
  } catch {
    // quota exceeded / private mode — charts just won't persist
  }
}

/** Drop a series (status changes that make it meaningless). */
export function dropSeries(kind: string, id: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(keyOf(kind, id))
  } catch { /* ignore */ }
}

export function emptySeries(topo: number, intervalTopo = 6): ChartSeries {
  return { history: [], histStart: 0, points: 0, lastTopo: topo, intervalTopo, savedAt: 0 }
}

/** Seconds between two points — drives the chart's time axis labels. */
export function seriesPointSeconds(s: ChartSeries, topoSeconds: number): number {
  return Math.max(1, s.intervalTopo * topoSeconds)
}

/**
 * Append a price sample at `topo` with gap handling and decimation.
 * Returns the updated series (mutates a copy — safe for React state).
 */
export function appendPoint(
  s: ChartSeries,
  price: number,
  topo: number,
): ChartSeries {
  const next: ChartSeries = { ...s, history: [...s.history] }
  const gapTopos = topo - next.lastTopo
  const gapPoints = Math.floor(gapTopos / next.intervalTopo) - 1

  if (next.history.length === 0) {
    next.history.push(price)
    next.points += 1
    next.histStart = 0
    next.lastTopo = topo
    return next
  }

  if (gapPoints >= 1) {
    if (gapPoints <= MAX_FILL) {
      // Flat candles for the time we were away — the chart stays honest
      // about the timeline without a hole in it.
      const last = next.history[next.history.length - 1]
      for (let i = 0; i < gapPoints; i++) {
        next.history.push(last)
        next.points += 1
      }
    } else {
      // Long absence: jump the anchor instead of filling hours of noise.
      next.points += gapPoints
    }
  }

  next.history.push(price)
  next.points += 1
  next.lastTopo = topo

  // Decimate 2:1 when the cap is crossed (resolution halves, history doubles in span).
  if (next.history.length > MAX_POINTS) {
    const kept: number[] = []
    for (let i = 0; i < next.history.length; i += 2) kept.push(next.history[i])
    // always keep the newest point (the live edge)
    const newest = next.history[next.history.length - 1]
    if (kept[kept.length - 1] !== newest) kept.push(newest)
    next.history = kept
    next.intervalTopo *= 2
  }

  next.histStart = next.points - next.history.length
  next.savedAt = Date.now()
  return next
}
