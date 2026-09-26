// Test — the chart loading gate & the "0 candles" rendering bug.
//
// Reproduces the EXACT live failure reported on mainnet (first visit):
//   the animated "scanning the chain" panel appears, disappears after
//   ~30 s, and a BROKEN chart with 0 CANDLES renders — while the chain
//   rebuild still needs another ~30 s to finish.
//
// Root cause (two bugs compounding):
//   1. RACE — the fast/deep scanners kept live-sampling the price into
//      the coin's EMPTY local series while the backfill walked the
//      chain. After 2 points (~15-45 s) `history.length >= 2` flipped
//      the chart on prematurely, killing the loading panel.
//   2. RENDER — with 2 points on the absolute grid and a histStart not
//      aligned to the candle buckets, toCandles() dropped BOTH buckets
//      (the live one: from > to; the first one: starts before
//      histStart) → ZERO candles rendered.
//
// The fixes under test:
//   • toCandles: buckets starting before data[0] open at the FIRST
//     KNOWN point (like an exchange's first candle of a new listing);
//     the live bucket always renders → never 0 candles again.
//   • isBackfillActive/isCurveChartReady: the sampler is HELD while a
//     rebuild runs, and the chart gate requires the rebuild to be
//     settled AND the series to cover the coin's birth — the loading
//     panel now covers the WHOLE walk (~1 min), as designed.
//
// Run: bun scripts/test-chart-gate.ts

import { toCandles } from '../src/components/launch/chart'
import { emptySeries, appendPoint } from '../src/lib/launch/persist'
import {
  isBackfillActive, seriesCoversBirth, isCurveChartReady,
  type CoinBackfillState,
} from '../src/lib/launch/community-store'

let passed = 0
let failed = 0
function ok(cond: boolean, label: string, detail?: string) {
  if (cond) {
    passed++
    console.log(`  ✓ ${label}`)
  } else {
    failed++
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

function bf(phase: CoinBackfillState['phase']): CoinBackfillState {
  return {
    phase, pages: 0, maxPages: 0, foundTrades: 0, totalTrades: 0,
    startedAt: Date.now(), finishedAt: null,
  }
}

console.log('\n── 1 · toCandles — the "0 candles" regression ──────────────────')

// The exact fresh-visitor numbers: 2 live points sampled 15 s apart on
// the default grid (intervalTopo 6), histStart NOT bucket-aligned.
// OLD code: live bucket from=17 > to=2 (dropped), first bucket starts
// at 205760 < histStart 205761 (dropped) → ZERO candles.
{
  const data = [1.0, 1.2]
  const candles = toCandles(data, 205761, 4)
  ok(candles.length >= 1, `2 misaligned points render ≥1 candle (got ${candles.length})`)
  ok(candles.every((k) => Number.isFinite(k.o) && Number.isFinite(k.h)
    && Number.isFinite(k.l) && Number.isFinite(k.c)), 'all OHLC values finite')
  ok(candles[candles.length - 1].closed === false, 'the newest candle is the live one')
}

// Brand-new coin born mid-bucket: 2 points at abs 101..102, chunk 4 —
// the only bucket (floor(102/4)=25, starts at 100 < 101) used to be
// dropped entirely → 0 candles on a coin that JUST launched.
{
  const candles = toCandles([0.5, 0.5], 101, 4)
  ok(candles.length >= 1, `brand-new coin mid-bucket renders ≥1 candle (got ${candles.length})`)
  if (candles.length > 0) {
    ok(candles[0].o === 0.5, 'the clamped first candle opens at the first KNOWN point')
  }
}

// Full series sanity: many candles, correct open/close, closed/live flags.
{
  const data = Array.from({ length: 300 }, (_, i) => 1 + Math.sin(i / 9) * 0.4)
  const candles = toCandles(data, 1000, 5)
  ok(candles.length === 60, `300 pts ÷ chunk 5 = 60 candles (got ${candles.length})`)
  ok(candles.slice(0, -1).every((k) => k.closed === true), 'every candle but the last is closed')
  ok(candles[candles.length - 1].closed === false, 'the last candle is live')
  ok(candles[1].o === data[5] && candles[1].c === data[9], 'candle 1 opens/closes on its own points')
  const anyZero = candles.some((k) => k.h < k.l || k.h < k.o || k.l > k.c)
  ok(!anyZero, 'OHLC invariants hold (h ≥ max(o,c), l ≤ min(o,c))')
}

// Frozen guarantee WITH the clamp: appending a point (same slot, then a
// new slot) never moves a CLOSED candle — even the clamped first one.
{
  const data = [1, 1.1, 0.9, 1.05, 1.2, 1.15]
  const before = toCandles(data, 101, 4) // first bucket clamped (starts at 100)
  const after = toCandles([...data, 1.3], 101, 4) // one more point appended
  const closedBefore = before.filter((k) => k.closed).map(({ id, o, h, l, c }) => ({ id, o, h, l, c }))
  const closedAfter = after.filter((k) => k.closed).map(({ id, o, h, l, c }) => ({ id, o, h, l, c }))
  ok(
    closedBefore.length > 0 && JSON.stringify(closedBefore) === JSON.stringify(closedAfter),
    'closed candles (incl. the clamped first) are FROZEN across appends',
  )
}

console.log('\n── 2 · seriesCoversBirth — fragment vs full history ─────────────')

// XVLT-like numbers: created at topo ~1 220 000, now ~1 235 000.
// A live-sampled fragment starts at floor(now/6)·6 ≈ 205 761 grid × 6
// topos ≈ 1 234 566 — way past the birth: NOT a full history.
ok(!seriesCoversBirth(205761, 6, 1220000), 'a fragment starting near NOW does not cover birth')
// A backfilled series starts at floor(created/interval)·interval ≤ birth.
ok(seriesCoversBirth(Math.floor(1220000 / 6), 6, 1220000), 'a series starting at the birth grid covers birth')
ok(seriesCoversBirth(Math.floor(1220000 / 6) + 1, 6, 1220000), 'one grid slot past birth still covers (2-slot tolerance)')
ok(!seriesCoversBirth(Math.floor(1220000 / 6) + 3, 6, 1220000), 'three slots past birth = fragment')
ok(seriesCoversBirth(0, 1, 0), 'degenerate: birth at 0 covered')

console.log('\n── 3 · isCurveChartReady — the gate the view asks ───────────────')

const coinOf = (histStart: number, intervalTopo: number | undefined, n: number, createdTopo = 1220000) => ({
  createdTopo,
  curve: n > 0
    ? { history: new Array(n).fill(1), histStart, intervalTopo }
    : undefined,
})

// fresh visitor: 0-1 points → panel (never a chart)
ok(!isCurveChartReady(coinOf(0, 6, 1), undefined), 'history < 2 → panel (fresh visit)')
// THE BUG: a live-sampled fragment + no backfill state yet — the OLD
// gate (`history.length >= 2`) rendered the chart here, with 0 candles
ok(!isCurveChartReady(coinOf(205761, 6, 4), undefined), 'fragment + backfill not armed yet → panel (was the bug)')
// fragment + active rebuild → panel (the whole point of the fix)
for (const phase of ['starting', 'scanning', 'rebuilding'] as const) {
  ok(!isCurveChartReady(coinOf(205761, 6, 400), bf(phase)), `fragment + ${phase} → panel`)
}
// full backfilled series + done → chart
ok(isCurveChartReady(coinOf(Math.floor(1220000 / 6), 6, 400), bf('done')), 'full series + done → chart')
// second visit: full persisted series, no backfill at all → chart, instantly
ok(isCurveChartReady(coinOf(Math.floor(1220000 / 6), 6, 400), undefined), 'full series + no backfill → chart (2nd visit instant)')
// full series + a NEW rebuild running (catch-up re-backfill) → panel
ok(!isCurveChartReady(coinOf(Math.floor(1220000 / 6), 6, 400), bf('scanning')), 'full series + scanning → panel (rebuild in flight)')
// full series + error → chart (real history beats an error panel)
ok(isCurveChartReady(coinOf(Math.floor(1220000 / 6), 6, 400), bf('error')), 'full series + error → chart (stale but real)')
// fragment + error → panel (the error branch of the loading panel)
ok(!isCurveChartReady(coinOf(205761, 6, 4), bf('error')), 'fragment + error → panel (honest error state)')
// pool coin (no curve) → the panel's pool branch handles it
ok(!isCurveChartReady({ createdTopo: 0 }, undefined), 'no curve (pool era) → panel pool branch')
// legacy shape without intervalTopo: trust the backfill gate alone
ok(isCurveChartReady({ createdTopo: 1220000, curve: { history: [1, 1, 1], histStart: 205761 } }, undefined),
  'legacy shape (no intervalTopo) + no backfill → chart')
ok(!isCurveChartReady({ createdTopo: 1220000, curve: { history: [1, 1, 1], histStart: 205761 } }, bf('scanning')),
  'legacy shape + scanning → panel')

console.log('\n── 4 · isBackfillActive — the sampler hold ──────────────────────')

ok(!isBackfillActive(undefined), 'no state → sampler runs')
ok(!isBackfillActive(null), 'null → sampler runs')
ok(!isBackfillActive(bf('done')), 'done → sampler runs (commit landed)')
ok(!isBackfillActive(bf('error')), 'error → sampler runs (retry in background)')
ok(isBackfillActive(bf('starting')), 'starting → HELD')
ok(isBackfillActive(bf('scanning')), 'scanning → HELD')
ok(isBackfillActive(bf('rebuilding')), 'rebuilding → HELD')

console.log('\n── 5 · the first-visit timeline (real functions, simulated) ─────')
// XVLT on a fresh device, ~59-67 s walk measured on mainnet:
//   t=0    deepScan maps the coin → 1 live point in an EMPTY series
//   t=0    focus → MODE A detected synchronously → bf 'starting'
//   t=15/30/45  fast cycles — sampler HELD (isBackfillActive)
//   t=60   backfill commits the FULL series → bf 'done' → chart lands
{
  const createdTopo = 1220000
  const intervalTopo = 6
  let series = emptySeries(1234560, intervalTopo)
  let bfState: CoinBackfillState | undefined = undefined
  const coinView = () => ({
    createdTopo,
    curve: series.history.length > 0
      ? { history: series.history, histStart: series.histStart, intervalTopo: series.intervalTopo }
      : undefined,
  })

  // t=0 — deepScan maps the coin (one live sample into the empty series)
  series = appendPoint(series, 0.42, 1234560)
  ok(series.history.length === 1, 't=0: the deep scan seeds exactly ONE live point')

  // t=0 — focus: MODE A is detected SYNCHRONOUSLY (history < 2)
  const modeA = !series || series.history.length < 2
    || !seriesCoversBirth(series.histStart, series.intervalTopo, createdTopo)
  ok(modeA, 't=0: MODE A detected synchronously (no await, no chart flash)')
  bfState = bf('starting')
  ok(!isCurveChartReady(coinView(), bfState), 't=0: panel up — not the chart')

  // t=15/30/45 — fast cycles with the sampler HELD
  const lenAt = series.history.length
  for (const t of [15, 30, 45]) {
    if (!isBackfillActive(bfState)) series = appendPoint(series, 0.42 + t / 1000, 1234560 + t)
  }
  ok(series.history.length === lenAt, 't=15/30/45: HELD sampler never appends (was the bug)')
  ok(!isCurveChartReady(coinView(), bfState), 't=30: panel STILL up (the animation stays the whole walk)')

  // counterfactual — the OLD behavior (sampler not held): the chart
  // flipped on at ~t=30 and rendered ZERO candles
  {
    let old = series
    old = appendPoint(old, 0.42, 1234560)
    old = appendPoint(old, 0.435, 1234578) // one grid slot later (~30 s)
    ok(old.history.length >= 2, 'counterfactual: old gate (length ≥ 2) flips the chart on at ~30 s')
    const oldCandles = toCandles(old.history, old.histStart, 4) // chunk 4 = 2m/30s
    ok(oldCandles.length >= 1,
      `counterfactual: with the toCandles fix the early chart would at least render ${oldCandles.length} candle(s) (was 0)`)
  }

  // t=60 — the backfill commits the FULL series (grid anchored at the birth)
  bfState = bf('done')
  const gBirth = Math.floor(createdTopo / intervalTopo)
  const gNow = Math.floor(1234620 / intervalTopo)
  const fullHistory = new Array(gNow - gBirth + 1).fill(0).map((_, i) => 0.4 + Math.sin(i / 40) * 0.15)
  series = {
    history: fullHistory, histStart: gBirth, points: gNow + 1,
    lastTopo: 1234620, intervalTopo, savedAt: Date.now(),
  }
  ok(isCurveChartReady(coinView(), bfState), 't=60: commit → the chart is READY')
  const candles = toCandles(series.history, series.histStart, 4)
  ok(candles.length >= 100, `t=60: the chart renders ${candles.length} candles (≥100)`)

  // t=75 — the next fast cycle samples live on TOP of the committed series
  series = appendPoint(series, 0.55, 1234635)
  ok(isCurveChartReady(coinView(), bfState), 't=75: live sampling continues on the full series → chart stays')
}

console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILURES'} — ${passed} passed, ${failed} failed\n`)
process.exit(failed === 0 ? 0 : 1)
