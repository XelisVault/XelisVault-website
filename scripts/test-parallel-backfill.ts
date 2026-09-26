// LIVE test — the PARALLEL chain walk + the MERGED candles, on mainnet.
//
// Reproduces the exact MODE A backfill the store runs for XVLT (cid 1)
// and measures what the user actually waits for:
//   • sequential walk (measured ~59-67 s in previous sessions)
//     vs the new concurrent waves of 4 pages — expect roughly half
//   • the calibration proof must still hold EXACTLY (xr replayed ==
//     xr live, diff 0) — parallelism may not lose a single trade
//   • the resulting series must render as a handful of MERGED candles
//     (dead-time compression), not the wall of flat dojis
//
// Run: bun scripts/test-parallel-backfill.ts

import { getTopoheight } from '../src/lib/xelis/rpc'
import { fetchCoin } from '../src/lib/launch/community-reader'
import { fetchCommunityParams } from '../src/lib/launch/protocol'
import { backfillCoinCurveSeries } from '../src/lib/launch/community-backfill'
import { toCandles } from '../src/components/launch/chart'
import { seriesPointSeconds } from '../src/lib/launch/persist'

const CID = Number(process.argv[2] ?? 1) // XVLT by default

let passed = 0
let failed = 0
function ok(cond: boolean, label: string, detail?: string) {
  if (cond) { passed++; console.log(`  ✓ ${label}`) }
  else { failed++; console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`) }
}

console.log(`\n── live backfill cid ${CID} — parallel walk + merged candles ──`)

const t0 = Date.now()
const [topo, coin, params] = await Promise.all([
  getTopoheight('mainnet'),
  fetchCoin(CID),
  fetchCommunityParams(),
])
if (!topo || !coin) {
  console.log('node unreachable or coin missing — abort')
  process.exit(1)
}
console.log(`  coin ${coin.symbol}: created topo ${coin.createdTopo}, tip ${topo}, ` +
  `trades ${coin.trades}, status ${coin.status}`)
console.log(`  live reserves xr=${coin.xr} yr=${coin.yr}`)

// ── the walk, with live progress ──
let lastProgress = { pages: 0, found: 0, monotonic: true, events: 0 }
const series = await backfillCoinCurveSeries({
  cid: CID,
  currentTopo: topo,
  createdTopo: coin.createdTopo,
  y0: coin.y0,
  vx: coin.vx,
  graduated: coin.graduated,
  graduatedTopo: coin.graduatedTopo,
  curveFeeBps: params.curveFeeBps,
  graduatedFeeBps: params.graduatedFeeBps,
  totalTrades: coin.trades,
  liveXr: coin.xr,
  liveYr: coin.yr,
  onProgress: (p) => {
    lastProgress.events++
    if (p.pages < lastProgress.pages || p.foundTrades < lastProgress.found) {
      lastProgress.monotonic = false
    }
    lastProgress.pages = p.pages
    lastProgress.found = p.foundTrades
  },
})
const walkMs = Date.now() - t0

console.log(`\n── results ──`)
ok(series != null && series.history.length >= 2, `series rebuilt (${series?.history.length ?? 0} points)`)
ok(lastProgress.monotonic, `progress is monotonic across ${lastProgress.events} events (walk pages ${lastProgress.pages}, found ${lastProgress.found}/${coin.trades})`)
console.log(`  ⏱ backfill (walk + window + replay): ${(walkMs / 1000).toFixed(1)} s` +
  ` — sequential was ~2 pages/s (59-67 s for a younger XVLT in earlier sessions)`)

// calibration: the replayed end state must reproduce the live reserves
// exactly (the stored st is the replay's end state)
if (series?.st) {
  const xrDiff = series.st.xr === coin.xr.toString() ? 0n
    : BigInt(series.st.xr) > coin.xr ? BigInt(series.st.xr) - coin.xr : coin.xr - BigInt(series.st.xr)
  ok(xrDiff === 0n, `calibration EXACT — replayed xr === live xr (diff ${xrDiff})`)
}

// merged candles: the default 2 m interval on this series
if (series) {
  const pointSeconds = seriesPointSeconds(series, 5)
  const chunk = Math.max(1, Math.round(120 / pointSeconds))
  const candles = toCandles(series.history, series.histStart, chunk)
  const rawBuckets = Math.floor((series.histStart + series.history.length - 1) / chunk)
    - Math.floor(series.histStart / chunk) + 1
  const flat = candles.filter((k) => k.h === k.l).length
  const active = candles.length - flat
  console.log(`  chart: ${candles.length} merged candles (was ${rawBuckets} raw buckets)` +
    ` — ${active} with activity, ${flat} quiet runs`)
  ok(candles.length < rawBuckets, `dead-time compression active (${candles.length} < ${rawBuckets})`)
  ok(active >= 1, `at least one activity candle (${active})`)
  const spansSum = candles.reduce((s, k) => s + k.span, 0)
  ok(spansSum === rawBuckets, `spans account for every raw bucket (${spansSum} === ${rawBuckets})`)
  ok(candles[candles.length - 1].closed === false, 'the newest candle is live')
}

console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILURES'} — ${passed} passed, ${failed} failed\n`)
process.exit(failed === 0 ? 0 : 1)
