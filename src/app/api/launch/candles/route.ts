// GET /api/launch/candles?series=coin:42 — the VaultLaunch candle archive.
//
// Serves a chart series (client ChartSeries shape) from the Neon
// PostgreSQL archive in ONE request — the visitor never walks the chain
// themselves. When the archive has no series yet (or it went stale),
// the route kicks the sync in `after()` (post-response) and answers
// immediately; the client polls until `status: "ready"`. Walks are
// resumable and claimed atomically, so a stampede of visitors on a
// brand-new coin pays the walk exactly once, together.
//
// Without DATABASE_URL the route answers { status: "unconfigured" } and
// the client falls back to the legacy in-browser backfill — the site
// stays 100% functional either way.

import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import {
  parseSeriesParam, serveArchiveSeries, runAssetSync, archiveStatus,
} from '@/lib/server/candle-archive'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get('series') ?? ''
  const parsed = parseSeriesParam(param)
  if (!parsed) {
    return NextResponse.json(
      { ok: false, status: 'error', error: 'invalid series param (expected coin:42 | coinpool:42 | curve:3 | pool:3)' },
      { status: 400 },
    )
  }

  try {
    const served = await serveArchiveSeries(parsed.kind, parsed.id)

    if (served.kick) {
      // no series yet, or stale — run the sync AFTER the response so the
      // visitor is never blocked by a first-visit walk
      after(async () => {
        try {
          await runAssetSync(parsed.kind, parsed.id, 50_000)
        } catch (e: unknown) {
          console.error('[candles] after() sync failed:', e)
        }
      })
    }

    return NextResponse.json(
      {
        ok: served.ok,
        status: served.status,
        ageS: served.ageS,
        progress: served.progress,
        phase: served.phase,
        series: served.series,
      },
      { headers: { 'cache-control': 'no-store' } },
    )
  } catch (e: unknown) {
    console.error('[candles] serve failed:', e)
    return NextResponse.json(
      { ok: false, status: 'error', error: String((e as Error)?.message ?? e) },
      { status: 500 },
    )
  }
}
