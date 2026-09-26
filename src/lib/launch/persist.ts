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
//   points        total grid points ever emitted (= lastGrid + 1)
//   lastTopo      topoheight of the last sample (gap detection)
//   intervalTopo  target spacing between points, in topos
//   topoSeconds   OPTIONAL calibrated seconds/topo from real block
//                 timestamps (community series) — defaults to the
//                 caller's chain constant when absent
//   st            OPTIONAL replayed curve state at the last sample —
//                 lets a catch-up continue the EXACT integer replay
//                 from where the series stopped (community coins)
//
// Grid semantics (v3): a point index IS floor(topo / intervalTopo) —
// the grid is anchored to the chain itself (topo 0), not to the
// session. Two computers sampling the same chain derive the SAME
// buckets, and a closed candle is frozen forever. Samples that land
// in the slot of the previous point merely update the live point;
// a slot advance flat-fills the gap (the price only moves on trades).
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
  topoSeconds?: number
  /** replayed curve state (atomic, as strings) as of lastTopo */
  st?: { xr: string; yr: string }
  savedAt: number
}

/** v3 = absolute-grid series (community coins & pools). The v2 keys
 *  of the pre-grid series are left in place (other kinds keep them) —
 *  a v3 read of a v2-era coin finds nothing and re-backfills from the
 *  chain, which is exactly what we want. */
const NS_V3 = 'xv-launch-chart-v3'
const NS_V2 = 'xv-launch-chart-v2'
const MAX_POINTS = 3600

function keyOf(kind: string, id: string): string {
  const ns = kind === 'coin' || kind === 'coinpool' ? NS_V3 : NS_V2
  return `${ns}:${kind}:${id}`
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

/** Seconds between two points — drives the chart's time axis labels.
 *  Uses the series' own calibrated seconds/topo when present (the
 *  5 s chain constant drifts a few % on mainnet). */
export function seriesPointSeconds(s: ChartSeries, topoSeconds: number): number {
  const perTopo = s.topoSeconds != null && Number.isFinite(s.topoSeconds)
    ? s.topoSeconds
    : topoSeconds
  return Math.max(1, s.intervalTopo * Math.max(1, perTopo))
}

/**
 * Append a price sample at `topo` on the ABSOLUTE grid
 * (index = floor(topo / intervalTopo)):
 *   • sample in the previous point's slot → update that point in place
 *     (the live candle moves, closed candles never do)
 *   • slot advanced → flat-fill the missed slots with the last price
 *     (the price only moves on trades — a flat gap is the truth), then
 *     push; decimation caps memory the same way as before
 * Returns the updated series (never mutates the input). Out-of-order
 * or stale samples (grid not advanced, older topo) are ignored.
 */
export function appendPoint(
  s: ChartSeries,
  price: number,
  topo: number,
): ChartSeries {
  const interval = Math.max(1, s.intervalTopo)
  const g = Math.floor(topo / interval)

  if (s.history.length === 0) {
    return {
      ...s,
      history: [price],
      histStart: g,
      points: g + 1,
      lastTopo: topo,
      savedAt: Date.now(),
    }
  }

  const gLast = Math.floor(s.lastTopo / interval)
  if (g < gLast) return s // stale / out of order — ignore

  if (g === gLast) {
    // same slot — the live point tracks the newest price
    const history = [...s.history]
    history[history.length - 1] = price
    return { ...s, history, lastTopo: topo, savedAt: Date.now() }
  }

  // the grid advanced: flat-fill the missed slots, then push
  const fill = g - gLast - 1
  let history = [...s.history]
  const last = history[history.length - 1]
  for (let i = 0; i < fill; i++) history.push(last)
  history.push(price)

  const points = s.points + fill + 1
  let finalInterval = interval

  // Decimate 2:1 until back under the cap (each pass halves the
  // resolution and doubles the span; the newest point is always kept)
  while (history.length > MAX_POINTS) {
    const kept: number[] = []
    for (let i = 0; i < history.length; i += 2) kept.push(history[i])
    const newest = history[history.length - 1]
    if (kept[kept.length - 1] !== newest) kept.push(newest)
    history = kept
    finalInterval *= 2
  }

  return {
    ...s,
    history,
    points,
    lastTopo: topo,
    intervalTopo: finalInterval,
    histStart: points - history.length,
    savedAt: Date.now(),
  }
}
