// Backfill the VaultLaunch candle archive (Neon) — run with bun:
//
//   bun scripts/backfill-candles.ts 1 2
//
// Runs the PRODUCTION sync engine (syncCoinCurve) for the given coin
// cids, in a resumable loop with a generous per-invocation budget:
//   • MIGRATED coins (XVLT): the walk covers the curve's whole life
//     (birth → migration) and calibrates against the migration
//     snapshot (migratedXel/migratedTokens) — the finished series is
//     frozen and served whole to every visitor, "remis d'un coup".
//   • LIVE coins (XELFAN): the normal full rebuild — replaces any
//     older garbage series (the flat-birth-line bug) with the
//     calibrated history.
//
// No claim is taken (claimSync is the route's stampede guard): the
// loop simply re-invokes syncCoinCurve, which resumes from the stored
// walk frontier after every budget cut. Trades, series and sync state
// land in the DB through the exact production code path.
//
// The final report re-verifies the result INDEPENDENTLY: it reloads
// the stored trades, replays the curve and checks the calibration
// against the chain's live/migration reserves.

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ── load DATABASE_URL from .env.local (bun doesn't auto-load it, and
// the sandbox's ambient DATABASE_URL is an unrelated SQLite path —
// the repo's own value must WIN) ────────────────────────────────────
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
try {
  const env = readFileSync(join(root, '.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/)
    if (m) process.env[m[1]] = m[2] // FORCE — repo value wins
  }
} catch { /* fall back to the ambient env */ }

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set (expected in .env.local or the env)')
  process.exit(1)
}

const { db, getSyncRow, getSeriesRow, rowToSeries } = await import('@/lib/server/db')
const { syncCoinCurve, loadStoredTrades } = await import('@/lib/server/candle-archive')
const { fetchCoin } = await import('@/lib/launch/community-reader')
const { fetchCommunityParams } = await import('@/lib/launch/protocol')
const { replayCurve, closeEnough } = await import('@/lib/launch/community-backfill')

const cids = process.argv.slice(2).map(Number).filter(Number.isFinite)
if (cids.length === 0) {
  console.error('usage: bun scripts/backfill-candles.ts <cid> [cid…]   (e.g. `bun scripts/backfill-candles.ts 1 2`)')
  process.exit(1)
}

const sql = db()
if (!sql) {
  console.error('Neon client unavailable — check DATABASE_URL')
  process.exit(1)
}

const BUDGET_MS = 55_000

for (const cid of cids) {
  const raw = await fetchCoin(cid).catch(() => null)
  if (!raw) {
    console.error(`\n(cid ${cid}) — coin unreadable on mainnet, skipping`)
    continue
  }
  console.log(`\n════════ coin ${cid} — ${raw.symbol} (${raw.name}) ════════`)
  console.log(`  status=${raw.status} trades=${raw.trades} created=${raw.createdTopo}` +
    `${raw.migrated ? ` migrated=${raw.migratedTopo}` : ''}`)

  let round = 0
  let outcome: Awaited<ReturnType<typeof syncCoinCurve>> | null = null
  const t0 = Date.now()
  while (round < 40) {
    round++
    outcome = await syncCoinCurve(cid, { budgetMs: BUDGET_MS })
    const row = await getSyncRow(sql, `coin:${cid}`).catch(() => null)
    const found = row?.found_trades ?? '?'
    const total = row?.total_trades ?? raw.trades
    const frontier = row?.walked_to_height ?? '?'
    const hi = row?.covered_to_height ?? '?'
    console.log(
      `  [round ${round}] status=${outcome.status}` +
      ` phase=${row?.phase ?? outcome.phase ?? '-'}` +
      ` trades=${found}/${total}` +
      ` frontier(height)=${frontier}..${hi}` +
      ` progress=${((row?.progress ?? outcome.progress ?? 0) * 100).toFixed(0)}%` +
      ` ${((Date.now() - t0) / 1000).toFixed(0)}s`,
    )
    if (outcome.status !== 'syncing') break
  }

  // ── the independent verification: reload trades, replay, calibrate ──
  const asset = `coin:${cid}`
  const seriesRow = await getSeriesRow(sql, asset).catch(() => null)
  const trades = await loadStoredTrades(sql, asset).catch(() => [])
  console.log(`\n  ── verification (${asset}) ──`)
  if (!seriesRow) {
    console.log('  NO series stored — outcome:', JSON.stringify(outcome?.status))
    continue
  }
  const series = rowToSeries(seriesRow)
  const targetXr = raw.migrated ? raw.migratedXel : raw.xr
  const targetYr = raw.migrated ? raw.migratedTokens : raw.yr
  const params = await fetchCommunityParams().catch(() => null)
  const curveFeeBps = params?.curveFeeBps ?? 1000
  const graduatedFeeBps = params?.graduatedFeeBps ?? 1000
  console.log(`  params (live):        curveFeeBps=${curveFeeBps} graduatedFeeBps=${graduatedFeeBps}`)
  const replay = replayCurve(trades, {
    y0: raw.y0, vx: raw.vx,
    graduated: raw.graduated, graduatedTopo: raw.graduatedTopo,
    curveFeeBps, graduatedFeeBps,
  })
  const okXr = closeEnough(replay.xr, targetXr)
  const okYr = closeEnough(replay.yr, targetYr)
  const withWicks = series.ohlc
    ? series.ohlc.filter((c) => c.h > c.l).length
    : 0
  const prices = series.history.filter((v) => v > 0)
  console.log(`  stored trades:        ${trades.length} / on-chain counter ${raw.trades}`)
  console.log(`  calibration:          xr ${okXr ? 'OK' : 'MISS'} (${replay.xr} vs ${targetXr})` +
    `, yr ${okYr ? 'OK' : 'MISS'} (${replay.yr} vs ${targetYr})`)
  console.log(`  series:               ${series.history.length} slots, interval ${series.intervalTopo} topos,` +
    ` topoSeconds ${series.topoSeconds?.toFixed(3)}`)
  console.log(`  grid:                 histStart ${series.histStart} (topo ${series.histStart * series.intervalTopo})` +
    ` → lastTopo ${series.lastTopo}${raw.migrated ? ` (migration ${raw.migratedTopo})` : ''}`)
  console.log(`  endTsMs:              ${series.endTsMs ? new Date(series.endTsMs).toISOString() : '(live series)'}`)
  console.log(`  ohlc:                 ${series.ohlc ? `${series.ohlc.length} cells, ${withWicks} with wicks (h > l)` : 'NONE'}`)
  if (prices.length > 0) {
    console.log(`  price range:          ${Math.min(...prices).toExponential(3)} … ${Math.max(...prices).toExponential(3)} XEL`)
  }
  console.log(`  status:               ${outcome?.status} — the archive now serves this in ONE request`)
}

console.log('\ndone.')
process.exit(0)
