// POST /api/launch/sync — the archive's maintenance sweep (cron).
//
// One budgeted pass over the whole board: catch up every coin series
// from its stored trades, sample every pool-era asset, keep project
// curves warm. Called by the Vercel cron (vercel.json) and manually.
//
// Auth: when CRON_SECRET is set, the caller must send it as a Bearer
// token (Vercel cron does this automatically). Without CRON_SECRET the
// route is open — it only reads public chain data and writes our own
// archive, and the per-asset claims already prevent stampedes.

import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { runMaintenance, archiveStatus } from '@/lib/server/candle-archive'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // not configured — open by design
  const header = req.headers.get('authorization') ?? ''
  return header === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  // the sweep runs post-response — cron pings must not time out on us
  after(async () => {
    try {
      const summary = await runMaintenance(50_000)
      console.log('[sync] maintenance done:', JSON.stringify(summary))
    } catch (e: unknown) {
      console.error('[sync] maintenance failed:', e)
    }
  })
  const status = await archiveStatus().catch(() => ({ configured: false }))
  return NextResponse.json({ ok: true, kicked: true, status })
}

// GET = diagnostics only (what the archive holds right now)
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  const status = await archiveStatus().catch((e: unknown) => ({
    configured: true,
    error: String((e as Error)?.message ?? e),
  }))
  return NextResponse.json({ ok: true, status })
}
