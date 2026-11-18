// VaultLaunch candle archive — Neon PostgreSQL layer (server only).
//
// WHY THIS EXISTS — the chain stores the PRESENT (reserves, counters),
// not a tick-by-tick price history. Until now every visitor rebuilt
// candle history THEMSELVES by walking the mainnet blocks in their
// browser (~10-25 s for a young coin, forever-degraded for an old one,
// and a hung request could freeze the whole poller). This module moves
// the walk to the SERVER and PERSISTS the result: the first visitor of
// a coin pays the walk ONCE, everybody else gets the whole series in
// one request ("remis d'un coup").
//
// Four tables, one row per (kind, id) series:
//   candle_assets — chain identity + curve params of the asset
//   candle_trades — every buy/sell invoke ever walked (the raw truth:
//                   a full rebuild later is a replay, not a re-walk)
//   candle_series — the packed Float64 history, exactly the shape the
//                   client's ChartSeries expects (persist.ts)
//   candle_sync   — claim + progress + walk frontier (resumable walks)
//
// The engine reuses the app's own isomorphic readers
// (src/lib/launch/*) — same keys, same integer math, same calibration
// proof as the in-browser backfill, so both sources always agree.

import { neon } from '@neondatabase/serverless'

/** The Neon HTTP query function (tagged-template SQL). */
export type SqlFn = ReturnType<typeof neon>

let cached: SqlFn | null | undefined

/** Lazily-created Neon HTTP client. `null` = DATABASE_URL absent. */
export function db(): SqlFn | null {
  if (cached !== undefined) return cached
  const url = process.env.DATABASE_URL
  if (!url) {
    cached = null
    return null
  }
  try {
    cached = neon(url)
    return cached
  } catch {
    // Malformed URL — treat as unconfigured rather than crashing a route
    cached = null
    return null
  }
}

// ── Schema (idempotent, one statement per entry — the HTTP driver
// runs single statements) ───────────────────────────────────────────

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS candle_assets (
     asset          TEXT PRIMARY KEY,
     kind           TEXT NOT NULL,
     cid            INTEGER,
     ticker         TEXT,
     name           TEXT,
     created_topo   BIGINT NOT NULL DEFAULT 0,
     meta           JSONB NOT NULL DEFAULT '{}',
     updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS candle_trades (
     asset   TEXT NOT NULL,
     hash    TEXT NOT NULL,
     topo    BIGINT NOT NULL,
     ts_ms   BIGINT NOT NULL,
     kind    TEXT NOT NULL,
     amount  TEXT NOT NULL,
     PRIMARY KEY (asset, hash)
   )`,
  `CREATE INDEX IF NOT EXISTS candle_trades_asset_topo ON candle_trades (asset, topo)`,
  `CREATE TABLE IF NOT EXISTS candle_series (
     asset         TEXT PRIMARY KEY,
     interval_topo INTEGER NOT NULL,
     topo_seconds  DOUBLE PRECISION NOT NULL,
     hist_start    BIGINT NOT NULL,
     points        INTEGER NOT NULL,
     history       BYTEA NOT NULL,
     last_topo     BIGINT NOT NULL,
     state         JSONB,
     updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS candle_sync (
     asset             TEXT PRIMARY KEY,
     status            TEXT NOT NULL DEFAULT 'idle',
     phase             TEXT,
     progress          DOUBLE PRECISION NOT NULL DEFAULT 0,
     walked_to_height  BIGINT,
     covered_to_height BIGINT,
     walk_complete     BOOLEAN NOT NULL DEFAULT false,
     total_trades      INTEGER NOT NULL DEFAULT 0,
     found_trades      INTEGER NOT NULL DEFAULT 0,
     last_error        TEXT,
     claimed_until     TIMESTAMPTZ,
     updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
]

let schemaReady: Promise<boolean> | null = null

/** Create the tables once per process (idempotent, safe to race). */
export function ensureSchema(): Promise<boolean> {
  if (!schemaReady) {
    const client = db()
    schemaReady = client
      ? (async () => {
          for (const stmt of SCHEMA_STATEMENTS) {
            await client.query(stmt)
          }
          return true
        })().catch((e: unknown) => {
          console.error('[candle-archive] schema init failed:', e)
          schemaReady = null // retry on the next call
          return false
        })
      : Promise.resolve(false)
  }
  return schemaReady
}

// ── History packing (Float64Array ↔ BYTEA) ──────────────────────────

export function packHistory(history: number[]): Buffer {
  return Buffer.from(new Float64Array(history).buffer)
}

export function unpackHistory(buf: Buffer | Uint8Array | string): number[] {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'hex') : Buffer.from(buf)
  if (b.byteLength === 0 || b.byteLength % 8 !== 0) return []
  return Array.from(new Float64Array(b.buffer, b.byteOffset, b.byteLength / 8))
}

// ── Row shapes ──────────────────────────────────────────────────────

export interface AssetRow {
  asset: string
  kind: string
  cid: number | null
  ticker: string | null
  name: string | null
  created_topo: number
  meta: Record<string, unknown>
  updated_at: string
}

export interface SeriesRow {
  asset: string
  interval_topo: number
  topo_seconds: number
  hist_start: number
  points: number
  history: Buffer | Uint8Array | string
  last_topo: number
  state: { xr: string; yr: string } | null
  updated_at: string
}

export interface SyncRow {
  asset: string
  status: string
  phase: string | null
  progress: number
  walked_to_height: number | null
  covered_to_height: number | null
  walk_complete: boolean
  total_trades: number
  found_trades: number
  last_error: string | null
  claimed_until: string | null
  updated_at: string
}

// ── Series row ↔ client ChartSeries ─────────────────────────────────

import type { ChartSeries } from '@/lib/launch/persist'

export function rowToSeries(row: SeriesRow): ChartSeries {
  return {
    history: unpackHistory(row.history),
    histStart: row.hist_start,
    points: row.points,
    lastTopo: row.last_topo,
    intervalTopo: row.interval_topo,
    topoSeconds: row.topo_seconds,
    st: row.state ?? undefined,
    savedAt: new Date(row.updated_at).getTime(),
  }
}

export function saveSeriesRow(
  client: SqlFn,
  asset: string,
  s: ChartSeries,
): Promise<unknown> {
  return client`
    INSERT INTO candle_series
      (asset, interval_topo, topo_seconds, hist_start, points, history, last_topo, state, updated_at)
    VALUES
      (${asset}, ${s.intervalTopo}, ${s.topoSeconds ?? 5}, ${s.histStart},
       ${s.points}, ${packHistory(s.history)}, ${s.lastTopo},
       ${s.st ? JSON.stringify(s.st) : null}, now())
    ON CONFLICT (asset) DO UPDATE SET
      interval_topo = EXCLUDED.interval_topo,
      topo_seconds = EXCLUDED.topo_seconds,
      hist_start = EXCLUDED.hist_start,
      points = EXCLUDED.points,
      history = EXCLUDED.history,
      last_topo = EXCLUDED.last_topo,
      state = EXCLUDED.state,
      updated_at = now()
  `
}

export async function getSeriesRow(
  client: SqlFn,
  asset: string,
): Promise<SeriesRow | null> {
  const rows = (await client`
    SELECT asset, interval_topo, topo_seconds, hist_start, points,
           history, last_topo, state, updated_at
    FROM candle_series WHERE asset = ${asset} LIMIT 1
  `) as unknown as SeriesRow[]
  return rows[0] ?? null
}

export async function getAssetRow(
  client: SqlFn,
  asset: string,
): Promise<AssetRow | null> {
  const rows = (await client`
    SELECT asset, kind, cid, ticker, name, created_topo, meta, updated_at
    FROM candle_assets WHERE asset = ${asset} LIMIT 1
  `) as unknown as AssetRow[]
  return rows[0] ?? null
}

export async function getSyncRow(
  client: SqlFn,
  asset: string,
): Promise<SyncRow | null> {
  const rows = (await client`
    SELECT asset, status, phase, progress, walked_to_height, covered_to_height,
           walk_complete, total_trades, found_trades, last_error, claimed_until,
           updated_at
    FROM candle_sync WHERE asset = ${asset} LIMIT 1
  `) as unknown as SyncRow[]
  return rows[0] ?? null
}

/**
 * Atomic sync claim — only one worker per asset at a time. A claim is
 * honoured for CLAIM_MS; stale claims (worker killed mid-walk) expire on
 * their own and the next request resumes from the persisted frontier.
 */
const CLAIM_SECONDS = 120

export async function claimSync(
  client: SqlFn,
  asset: string,
): Promise<boolean> {
  const rows = (await client`
    INSERT INTO candle_sync (asset, status, phase, claimed_until, updated_at)
    VALUES (${asset}, 'syncing', 'starting', now() + (${CLAIM_SECONDS} || ' seconds')::interval, now())
    ON CONFLICT (asset) DO UPDATE SET
      status = 'syncing',
      phase = 'starting',
      claimed_until = now() + (${CLAIM_SECONDS} || ' seconds')::interval,
      updated_at = now()
    WHERE candle_sync.status != 'syncing'
       OR candle_sync.claimed_until IS NULL
       OR candle_sync.claimed_until < now()
    RETURNING asset
  `) as unknown as { asset: string }[]
  return rows.length > 0
}

export function releaseSync(
  client: SqlFn,
  asset: string,
  status: 'ready' | 'error' | 'idle',
  extra: { phase?: string; progress?: number; error?: string } = {},
): Promise<unknown> {
  // upsert-safe: a release may arrive for a row that was never claimed
  // (direct sync calls) — INSERT the row rather than silently no-opping
  return client`
    INSERT INTO candle_sync (asset, status, phase, progress, last_error, claimed_until, updated_at)
    VALUES (${asset}, ${status}, ${extra.phase ?? null},
            ${extra.progress ?? (status === 'ready' ? 1 : 0)},
            ${extra.error ?? null}, NULL, now())
    ON CONFLICT (asset) DO UPDATE SET
      status = ${status},
      phase = ${extra.phase ?? null},
      progress = ${extra.progress ?? (status === 'ready' ? 1 : 0)},
      last_error = ${extra.error ?? null},
      claimed_until = NULL,
      updated_at = now()
  `
}

/** Persist a walk's live progress + resume frontier (crash-safe).
 *  Upsert-safe for the same reason as releaseSync. */
export function progressSync(
  client: SqlFn,
  asset: string,
  p: {
    phase?: string
    progress?: number
    walked_to_height?: number | null
    covered_to_height?: number | null
    walk_complete?: boolean
    total_trades?: number
    found_trades?: number
  },
): Promise<unknown> {
  return client`
    INSERT INTO candle_sync (asset, status, phase, progress, walked_to_height,
                             covered_to_height, walk_complete, total_trades,
                             found_trades, updated_at)
    VALUES (${asset}, 'syncing', ${p.phase ?? null}, ${p.progress ?? 0},
            ${p.walked_to_height ?? null}, ${p.covered_to_height ?? null},
            ${p.walk_complete ?? false}, ${p.total_trades ?? 0},
            ${p.found_trades ?? 0}, now())
    ON CONFLICT (asset) DO UPDATE SET
      phase = COALESCE(${p.phase ?? null}, candle_sync.phase),
      progress = COALESCE(${p.progress ?? null}, candle_sync.progress),
      walked_to_height = COALESCE(${p.walked_to_height ?? null}, candle_sync.walked_to_height),
      covered_to_height = COALESCE(${p.covered_to_height ?? null}, candle_sync.covered_to_height),
      walk_complete = COALESCE(${p.walk_complete ?? null}, candle_sync.walk_complete),
      total_trades = COALESCE(${p.total_trades ?? null}, candle_sync.total_trades),
      found_trades = COALESCE(${p.found_trades ?? null}, candle_sync.found_trades),
      updated_at = now()
  `
}
