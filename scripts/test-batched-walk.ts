// LIVE test — the BATCHED chain walk, on mainnet.
//
// Reproduces the exact MODE A backfill the store runs for XVLT (cid 1)
// and measures what the user actually waits for:
//   • the batched walk (20 range calls = 400 heights per POST, waves of
//     3 POSTs) must cover the coin's ENTIRE life — XVLT at 43 h needed
//     ~1 380 pages, far beyond the old 600-page budget (~19 h), so the
//     old walk ALWAYS ended in the partial backward anchor
//   • the calibration proof must still hold EXACTLY (xr replayed ==
//     xr live, diff 0) — batching may not lose a single trade
//   • the walk must find ALL trades (found == on-chain counter)
//   • the resulting series must render as MERGED candles
//     (dead-time compression), not the wall of flat dojis
//
// Run: bun scripts/test-batched-walk.ts [cid]

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

console.log(`\n── live backfill cid ${CID} — batched walk (400 heights/POST) ──`)

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
const ageH = ((topo - coin.createdTopo) * 5 / 3600).toFixed(1)
console.log(`  coin ${coin.symbol}: created topo ${coin.createdTopo} (age ${ageH} h), tip ${topo}, ` +
  `trades ${coin.trades}, status ${coin.status}`)
console.log(`  live reserves xr=${coin.xr} yr=${coin.yr}`)

// ── the walk, with live progress ──
let lastProgress = {
  pages: 0, maxPages: 0, found: 0, monotonic: true, events: 0, maxPagesStable: true,
}
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
    if (lastProgress.maxPages > 0 && p.maxPages !== lastProgress.maxPages) {
      lastProgress.maxPagesStable = false
    }
    lastProgress.pages = p.pages
    lastProgress.maxPages = p.maxPages
    lastProgress.found = p.foundTrades
  },
})
const walkMs = Date.now() - t0

console.log(`\n── results ──`)
ok(series != null && series.history.length >= 2, `series rebuilt (${series?.history.length ?? 0} points)`)
ok(lastProgress.monotonic, `progress is monotonic across ${lastProgress.events} events ` +
  `(pages ${lastProgress.pages}/${lastProgress.maxPages}, found ${lastProgress.found}/${coin.trades})`)
ok(lastProgress.maxPagesStable, `maxPages is the REAL total (${lastProgress.maxPages} pages), stable across events`)
ok(lastProgress.found >= coin.trades, `ALL trades found (${lastProgress.found}/${coin.trades}) — the old budget could not reach birth`)
console.log(`  ⏱ backfill (walk + window + replay): ${(walkMs / 1000).toFixed(1)} s` +
  ` — the old one-page-per-request pattern was ~2 pages/s (~80 s+ for this coin, partial)`)

// calibration: the replayed end state must reproduce the live reserves
// exactly (the stored st is the replay's end state)
if (series?.st) {
  const xrDiff = series.st.xr === coin.xr.toString() ? 0n
    : BigInt(series.st.xr) > coin.xr ? BigInt(series.st.xr) - coin.xr : coin.xr - BigInt(series.st.xr)
  ok(xrDiff === 0n, `calibration EXACT — replayed xr === live xr (diff ${xrDiff})`)
}

// coverage: the series must start at the coin's birth (full history)
if (series) {
  const birthGrid = Math.floor(coin.createdTopo / series.intervalTopo)
  ok(series.histStart <= birthGrid + 1,
    `series covers birth (histStart ${series.histStart} ≤ birth grid ${birthGrid} @ interval ${series.intervalTopo})`)
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
  // a coin whose trades never moved the price (dust buys) legitimately
  // renders as ONE flat candle — activity is only required when the
  // series itself has price variation
  const minP = Math.min(...series.history)
  const maxP = Math.max(...series.history)
  if (maxP > minP) {
    ok(active >= 1, `at least one activity candle (${active})`)
  } else {
    ok(candles.length === 1, `never-moving price renders as ONE flat candle (${candles.length})`)
  }
  const spansSum = candles.reduce((s, k) => s + k.span, 0)
  ok(spansSum === rawBuckets, `spans account for every raw bucket (${spansSum} === ${rawBuckets})`)
  ok(candles[candles.length - 1].closed === false, 'the newest candle is live')
}

console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILURES'} — ${passed} passed, ${failed} failed\n`)
process.exit(failed === 0 ? 0 : 1)
