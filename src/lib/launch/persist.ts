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
//   history[]     price points, oldest → newest (= the CLOSE of each slot)
//   ohlc[]        OPTIONAL per-slot open/high/low/close, 1:1 with history —
//                 the candle renderer draws TRUE wicks from it (a slot's
//                 intra-variation — a dip recovered inside the slot — is
//                 information a close-only series loses). Maintained by
//                 appendPoint (live sampling) and by the chain rebuilds
//                 (every trade step lands in its slot); absent on legacy
//                 series, where the chart falls back to close-derived
//                 flat candles.
//   histStart     absolute index of history[0] (frozen-candle guarantee)
//   points        newest point's absolute grid index + 1, in the
//                 CURRENT interval's units (= lastGrid + 1; recomputed
//                 whenever decimation doubles the interval)
//   lastTopo      topoheight of the last sample (gap detection)
//   intervalTopo  target spacing between points, in topos
//   topoSeconds   OPTIONAL calibrated seconds/topo from real block
//                 timestamps (community series) — defaults to the
//                 caller's chain constant when absent
//   endTsMs       OPTIONAL wall-clock anchor of the LAST point — set
//                 ONLY on FROZEN series (a migrated coin's curve ended
//                 at the migration block; "now" would lie by weeks).
//                 Live series leave it absent: the live edge is now.
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

export interface Ohlc {
  o: number
  h: number
  l: number
  c: number
}

export interface ChartSeries {
  history: number[]
  /** per-slot OHLC, 1:1 with history (history[i] === ohlc[i].c) */
  ohlc?: Ohlc[]
  histStart: number
  /** newest point's absolute grid index + 1, in intervalTopo units */
  points: number
  lastTopo: number
  intervalTopo: number
  topoSeconds?: number
  /** wall-clock of the last point — frozen series only (see header) */
  endTsMs?: number
  /** TRUE when the series is a BACKWARD-ANCHORED fallback (an old
   *  coin the walk budget couldn't fully cover): the recent history is
   *  exact but the deep past is flat — the archive's full walk must
   *  replace it when it can. Set by the client backfill only; a
   *  server/calibrated series never carries it. */
  degraded?: boolean
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

/** A flat cell at `p` — the price never moved inside the slot. */
function flatCell(p: number): Ohlc {
  return { o: p, h: p, l: p, c: p }
}

/** Cells for a series' history — the true per-slot ohlc when present,
 *  FLAT cells derived from the closes otherwise (a close-only history
 *  carries no wick information: a flat cell per close is exactly what
 *  it knows). This way every series CONVERGES to the ohlc shape: the
 *  first appendPoint maintains cells even when none were stored. */
function cellsOf(s: ChartSeries): Ohlc[] {
  if (s.ohlc && s.ohlc.length === s.history.length) return s.ohlc
  return s.history.map((v) => flatCell(v))
}

/** 2:1 decimation of an ohlc array — each kept slot ABSORBS its dropped
 *  neighbour (o = kept.o, c = dropped.c, h/l = extremes of both), so a
 *  wick survives decimation instead of vanishing with the dropped slot.
 *  `history` is then re-derived from the merged closes so
 *  history[i] === ohlc[i].c always holds. */
function decimateOhlc(ohlc: Ohlc[]): Ohlc[] {
  const kept: Ohlc[] = []
  for (let i = 0; i < ohlc.length; i += 2) {
    const a = ohlc[i]
    const b = ohlc[i + 1]
    if (b == null) { kept.push({ ...a }); continue }
    kept.push({
      o: a.o,
      c: b.c,
      h: Math.max(a.h, b.h),
      l: Math.min(a.l, b.l),
    })
  }
  const newest = ohlc[ohlc.length - 1]
  if (kept[kept.length - 1].c !== newest.c) kept.push({ ...newest })
  return kept
}

/**
 * Append a price sample at `topo` on the ABSOLUTE grid
 * (index = floor(topo / intervalTopo)):
 *   • sample in the previous point's slot → update that point in place
 *     (the live candle moves, closed candles never do)
 *   • slot advanced → flat-fill the missed slots with the last price
 *     (the price only moves on trades — a flat gap is the truth), then
 *     push; decimation caps memory the same way as before
 * The per-slot ohlc array rides along: a same-slot sample extends the
 * live slot's high/low, a new slot opens flat at the carried price —
 * so a live-sampled series carries true intra-slot wicks too.
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
  const ohlc = cellsOf(s)

  if (s.history.length === 0) {
    return {
      ...s,
      history: [price],
      ohlc: [flatCell(price)],
      histStart: g,
      points: g + 1,
      lastTopo: topo,
      savedAt: Date.now(),
    }
  }

  const gLast = Math.floor(s.lastTopo / interval)
  if (g < gLast) return s // stale / out of order — ignore

  if (g === gLast) {
    // same slot — the live point tracks the newest price, and the
    // slot's high/low extend to include it (a dip that recovers inside
    // the slot stays visible as a wick)
    const history = [...s.history]
    history[history.length - 1] = price
    let nextOhlc: Ohlc[] | undefined
    if (ohlc) {
      const cell = ohlc[ohlc.length - 1]
      nextOhlc = [...ohlc]
      nextOhlc[nextOhlc.length - 1] = {
        o: cell.o,
        h: Math.max(cell.h, price),
        l: Math.min(cell.l, price),
        c: price,
      }
    }
    return { ...s, history, ohlc: nextOhlc, lastTopo: topo, savedAt: Date.now() }
  }

  // the grid advanced: flat-fill the missed slots, then push
  const fill = g - gLast - 1
  let history = [...s.history]
  let nextOhlc = ohlc ? [...ohlc] : undefined
  const last = history[history.length - 1]
  for (let i = 0; i < fill; i++) {
    history.push(last)
    nextOhlc?.push(flatCell(last))
  }
  history.push(price)
  nextOhlc?.push(flatCell(price))

  let finalInterval = interval

  // Decimate 2:1 until back under the cap (each pass halves the
  // resolution and doubles the span; the newest point is always kept).
  // The ohlc path merges PAIRS (extremes survive); the legacy path
  // keeps the even indices exactly as before.
  while (history.length > MAX_POINTS) {
    if (nextOhlc && nextOhlc.length === history.length) {
      nextOhlc = decimateOhlc(nextOhlc)
      history = nextOhlc.map((c) => c.c)
    } else {
      const kept: number[] = []
      for (let i = 0; i < history.length; i += 2) kept.push(history[i])
      const newest = history[history.length - 1]
      if (kept[kept.length - 1] !== newest) kept.push(newest)
      history = kept
      nextOhlc = undefined
    }
    finalInterval *= 2
  }

  // Re-anchor the counters in the FINAL interval's units. The old code
  // carried `points` over from the pre-decimation grid and derived
  // histStart from it, so a decimated series reported a histStart
  // thousands of slots past its true position: seriesCoversBirth()
  // then failed and EVERY session re-triggered a full chain rebuild
  // for the coin (the "the chart re-scans on every visit" bug). The
  // series spans grid indices [histStart, gNow] — both in
  // current-interval units; history[0]'s absolute topo is unchanged by
  // decimation (index 0 is always kept), so birth coverage survives.
  const gNow = Math.floor(topo / finalInterval)
  const points = gNow + 1

  return {
    ...s,
    history,
    ohlc: nextOhlc && nextOhlc.length === history.length ? nextOhlc : undefined,
    points,
    lastTopo: topo,
    intervalTopo: finalInterval,
    histStart: points - history.length,
    savedAt: Date.now(),
  }
}
