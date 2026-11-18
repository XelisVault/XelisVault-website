// Sanity checks of the OHLC candle engine (bun scripts/test-ohlc.ts):
//   1. toCandles with per-slot OHLC → true wicks survive bucketing
//   2. toCandles without OHLC → legacy flat-close behavior unchanged
//   3. dead-time merge keeps wick slots unmerged, merges true flats
//   4. appendPoint maintains ohlc on the live sampling path
//   5. decimation merges pairs and keeps the extremes
//   6. sampleSeries sets endTsMs only for frozen series
import { appendPoint, emptySeries, type ChartSeries } from '../src/lib/launch/persist'
import { toCandles } from '../src/components/launch/chart'
import { sampleSeries } from '../src/lib/launch/community-backfill'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  if (!cond) { failures++; console.log(`  FAIL  ${name} ${detail}`) }
  else console.log(`  ok    ${name}`)
}

// ── 1 + 2 + 3: toCandles ────────────────────────────────────────────
const data = [10, 10, 12, 11, 11, 9, 9, 9, 10]
const ohlc = data.map((v) => ({ o: v, h: v, l: v, c: v }))
// slot 1 saw a spike to 15 and a dip to 8 (intra-slot variation)
ohlc[1] = { o: 10, h: 15, l: 8, c: 10 }
const withOhlc = toCandles(data, 0, 1, ohlc)
const without = toCandles(data, 0, 1)

// close-only: every slot is a flat candle; only EQUAL consecutive flats
// merge → [10,10] [12] [11,11] [9,9,9] [10] = 5 candles
check('legacy close-only: equal flats collapse, steps stay', without.length === 5, `got ${without.length}`)
const legacy = without.find((c) => c.h === 10 && c.l === 10)
check('legacy flat run kept at 10 (span 2)', legacy != null && legacy.span === 2, `span=${legacy?.span}`)
check('legacy step candles 12 and 11 present',
  without.some((c) => c.o === 12 && c.c === 12) && without.some((c) => c.o === 11 && c.c === 11))

check('ohlc: wick candle h=15 l=8 exists', withOhlc.some((c) => c.h === 15 && c.l === 8))
check('ohlc: wick candle is NOT merged into the flat run', withOhlc.length > without.length, `got ${withOhlc.length}`)
const wickCandle = withOhlc.find((c) => c.h === 15)
check('ohlc: wick candle opens/closes at 10', wickCandle != null && wickCandle.o === 10 && wickCandle.c === 10)

// bucketing chunk=3: slots 0-2 merge into ONE candle with the true extremes
const bucketed = toCandles(data, 0, 3, ohlc)
check('bucket chunk=3 → 3 candles', bucketed.length === 3, `got ${bucketed.length}`)
check('first bucket aggregates h=15 l=8', bucketed[0] != null && bucketed[0].h === 15 && bucketed[0].l === 8)
check('first bucket opens at first slot open, closes at last slot close',
  bucketed[0] != null && bucketed[0].o === 10 && bucketed[0].c === 12)

// ── 4: appendPoint maintains ohlc ───────────────────────────────────
let s: ChartSeries = { ...emptySeries(100, 10), ohlc: undefined }
s = appendPoint(s, 5, 100)      // slot 10 opens at 5
check('appendPoint: first point creates a flat cell',
  s.ohlc?.length === 1 && s.ohlc[0].o === 5 && s.ohlc[0].c === 5)
s = appendPoint(s, 7, 105)      // same slot (interval 10) — h extends
check('appendPoint: same-slot sample extends h',
  s.ohlc?.length === 1 && s.ohlc[0].h === 7 && s.ohlc[0].l === 5 && s.ohlc[0].c === 7)
s = appendPoint(s, 4, 108)      // same slot again — l extends
check('appendPoint: same-slot dip extends l',
  s.ohlc?.length === 1 && s.ohlc[0].l === 4 && s.ohlc[0].c === 4)
s = appendPoint(s, 4, 130)      // new slot (13) — flat-fills slot 11-12, opens 13
check('appendPoint: slot advance flat-fills gaps',
  s.ohlc?.length === 4 && s.ohlc[1].o === 4 && s.ohlc[1].h === 4 && s.ohlc[2].o === 4)
check('appendPoint: history stays aligned with closes',
  s.history.length === s.ohlc?.length && s.history.every((v, i) => v === s.ohlc![i].c))

// ── 5: decimation keeps extremes ────────────────────────────────────
let big: ChartSeries = { ...emptySeries(0, 1) }
big = appendPoint(big, 100, 1)
for (let topo = 2; topo <= 7200; topo += 2) {
  // alternate quiet runs and spikes so pairs carry real extremes
  const v = topo % 200 < 100 ? 100 : topo % 400 < 200 ? 130 : 70
  big = appendPoint(big, v, topo)
}
check('decimation triggered (interval doubled)', big.intervalTopo >= 2 && big.history.length <= 3600,
  `interval=${big.intervalTopo} len=${big.history.length}`)
check('decimated history/ohlc aligned', big.history.length === big.ohlc?.length)
check('decimated extremes survive', (() => {
  const hi = Math.max(...big.ohlc!.map((c) => c.h))
  const lo = Math.min(...big.ohlc!.map((c) => c.l))
  return hi === 130 && lo === 70
})(), `h=${Math.max(...big.ohlc!.map((c) => c.h))} l=${Math.min(...big.ohlc!.map((c) => c.l))}`)

// ── 6: sampleSeries frozen anchor ───────────────────────────────────
const steps = [
  { topo: 50, tsMs: 100_000, price: 1.5 },
  { topo: 150, tsMs: 600_000, price: 2.5 },
]
const liveSeries = sampleSeries({
  cid: 1, currentTopo: 200, createdTopo: 0,
  y0: 1_000_000n, vx: 1_000n, graduated: false, graduatedTopo: 0,
  curveFeeBps: 100, graduatedFeeBps: 50, totalTrades: 2,
  liveXr: 10n, liveYr: 900_000n,
}, steps, 10n, 900_000n)
check('live series: no endTsMs', liveSeries.endTsMs == null)
check('live series: ohlc aligned with closes', liveSeries.ohlc?.length === liveSeries.history.length)

const frozenSeries = sampleSeries({
  cid: 1, currentTopo: 200, createdTopo: 0,
  y0: 1_000_000n, vx: 1_000n, graduated: false, graduatedTopo: 0,
  curveFeeBps: 100, graduatedFeeBps: 50, totalTrades: 2,
  liveXr: 10n, liveYr: 900_000n,
  frozen: true, endTsMs: 1_234_567,
}, steps, 10n, 900_000n)
check('frozen series: endTsMs set exactly', frozenSeries.endTsMs === 1_234_567)
// steps at topos 50 and 150 land in grid slots 50 and 150 (interval 1)
check('frozen series: slot 50 closes at the first step', frozenSeries.ohlc![50].c === 1.5)
check('frozen series: slot 150 closes at the second step', frozenSeries.ohlc![150].c === 2.5)
check('frozen series: slot 50 opened at the carried birth price',
  frozenSeries.ohlc![50].o > 0 && frozenSeries.ohlc![50].o !== 1.5)
// tail slots flat at 2.5
check('frozen series: tail flat-carries the last price', frozenSeries.ohlc![frozenSeries.ohlc!.length - 1].c === 2.5)

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECKS FAILED`)
process.exit(failures === 0 ? 0 : 1)
