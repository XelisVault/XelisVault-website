/**
 * NERVA public explorer API client.
 *
 * Verified live on 2026-09-05 against https://api.nerva.one (CORS: *):
 *   endpoint=get_info | get_block_count | get_last_block_header |
 *   get_block_header_by_height | get_block_header_by_hash | get_block |
 *   get_block_headers_range | get_transactions | get_transaction_pool
 *
 * Facts baked in (from nerva.one explorer bundle + C++ source):
 *   - 1 XNV = 1e12 atomic units (12 decimals)
 *   - block target: 60 s · tail reward: 0.3 XNV/block
 *   - a coinbase-only block is 86 bytes; block_size > 90 ⇒ contains txs
 *   - hashrate ≈ difficulty / 60 (H/s) on CryptoNight-Adaptive v6
 */

const PRIMARY = 'https://api.nerva.one/daemon/explorer/index.php'
const FALLBACK = 'https://explorer.nerva.one/api/rpc'

export const NERVA_CONSTANTS = {
  symbol: 'XNV',
  unitPlaces: 12,
  blockTarget: 60,
  tailReward: 0.3,
  coinbaseOnlySize: 86,
  txSizeThreshold: 90,
  spendableAge: 10,
  coinbaseMaturity: 20,
  ringSize: 5,
} as const

/* ────────────────────────── types ────────────────────────── */

export interface NervaInfo {
  height: number
  difficulty: number
  target: number
  tx_count: number
  tx_pool_size: number
  status: string
  top_block_hash: string
  mainnet: boolean
  offline: boolean
  block_size_median: number
  incoming_connections_count: number
  outgoing_connections_count: number
  version: string
}

export interface NervaBlockHeader {
  height: number
  hash: string
  prev_hash: string
  timestamp: number
  difficulty: number
  cumulative_difficulty: number
  block_size: number
  block_weight: number
  num_txes: number
  reward: number // atomic units
  nonce: number
  orphan_status: boolean
  major_version: number
  minor_version: number
  depth: number
  miner_tx_hash?: string
}

export interface NervaVinGen { gen: { height: number } }
export interface NervaVout {
  amount: number // atomic (0 for RingCT transfers)
  target?: { key?: string }
}
export interface NervaTxJson {
  version: number
  unlock_time: number
  vin: NervaVinGen[]
  vout: NervaVout[]
  extra: number[] // tx_extra, already parsed as byte array by the explorer
  rct_signatures?: { type?: number }
}
export interface NervaTransaction {
  tx_hash: string
  block_height?: number
  block_timestamp?: number
  in_pool?: boolean
  double_spend_seen?: boolean
  output_indices?: number[]
  json: NervaTxJson
}
export interface NervaBlock {
  blob?: string
  block_header: NervaBlockHeader
  json?: { miner_tx: unknown; tx_hashes?: string[] }
  miner_tx_hash?: string
}

/* ────────────────────────── fetch core ────────────────────────── */

type CacheEntry = { at: number; data: unknown }
const cache = new Map<string, CacheEntry>()

async function nervaFetch(endpoint: string, params: Record<string, string | string[]> = {}, ttlMs = 0): Promise<any> {
  const qs = new URLSearchParams()
  qs.set('endpoint', endpoint)
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) for (const item of v) qs.append(k, item)
    else qs.set(k, v)
  }
  const key = qs.toString()

  if (ttlMs > 0) {
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < ttlMs) return hit.data
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    let res: Response
    try {
      res = await fetch(`${PRIMARY}?${key}`, { signal: controller.signal, cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch {
      // mirror fallback (explorer.nerva.one proxies the same backend)
      res = await fetch(`${FALLBACK}?${key}`, { signal: controller.signal, cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }
    const data = await res.json()
    if (ttlMs > 0) cache.set(key, { at: Date.now(), data })
    return data
  } finally {
    clearTimeout(timeout)
  }
}

/* ────────────────────────── endpoints ────────────────────────── */

/**
 * Network info. NOTE: raw `get_info.height` is the NEXT block height
 * (blocks mined = height-1, verified live vs get_last_block_header);
 * we normalize `height` to the last MINED block for coherent math.
 */
export async function getInfo(): Promise<NervaInfo> {
  const d = await nervaFetch('get_info', {}, 15_000)
  return {
    ...d,
    difficulty: Number(d.difficulty),
    height: Math.max(0, Number(d.height) - 1),
    tx_count: Number(d.tx_count),
  }
}

/** Height of the last MINED block (raw count is next-block height). */
export async function getBlockCount(): Promise<number> {
  const d = await nervaFetch('get_block_count', {}, 10_000)
  const raw = Number(d.count ?? d.height ?? 0)
  return Math.max(0, raw - 1)
}

export async function getLastBlockHeader(): Promise<NervaBlockHeader> {
  const d = await nervaFetch('get_last_block_header')
  return d.block_header
}

export async function getBlockHeaderByHeight(height: number): Promise<NervaBlockHeader> {
  const d = await nervaFetch('get_block_header_by_height', { height: String(height) })
  return d.block_header
}

export async function getBlockHeaderByHash(hash: string): Promise<NervaBlockHeader> {
  const d = await nervaFetch('get_block_header_by_hash', { hash })
  return d.block_header
}

/**
 * Range of headers, max ~100-120 per call. Returns [] when the range is empty.
 * Defensive: the API rejects end-heights beyond the mined tip
 * ("Invalid start/end heights") — we retry once with end-1, then give up.
 */
export async function getBlockHeadersRange(start: number, end: number): Promise<NervaBlockHeader[]> {
  if (end < start) return []
  const fetchRange = (s: number, e: number) =>
    nervaFetch('get_block_headers_range', { start: String(s), end: String(e) })
  let d = await fetchRange(start, end)
  if (d?.error && end > start) {
    d = await fetchRange(start, end - 1)
  }
  return Array.isArray(d?.headers) ? d.headers : []
}

export async function getBlock(hash: string): Promise<NervaBlock> {
  return nervaFetch('get_block', { hash })
}

export async function getTransactions(hashes: string[]): Promise<NervaTransaction[]> {
  if (hashes.length === 0) return []
  const d = await nervaFetch('get_transactions', { 'hash[]': hashes })
  // response is a plain array at the root (verified live)
  return Array.isArray(d) ? d : (d?.transactions ?? [])
}

/** Mempool — may be an empty object when the pool is empty (observed live). */
export async function getTransactionPool(): Promise<NervaTransaction[]> {
  const d = await nervaFetch('get_transaction_pool')
  if (Array.isArray(d)) return d
  if (Array.isArray(d?.transactions)) return d.transactions
  return []
}

/* ────────────────────────── formatting helpers ────────────────────────── */

/** atomic units (1e12) → display string, trims trailing zeros */
export function formatXnv(atomic: number | bigint, maxDecimals: number = NERVA_CONSTANTS.unitPlaces): string {
  const big = typeof atomic === 'bigint' ? atomic : BigInt(Math.round(atomic))
  const neg = big < 0n
  const abs = neg ? -big : big
  const base = 10n ** BigInt(NERVA_CONSTANTS.unitPlaces)
  const whole = abs / base
  const frac = (abs % base).toString().padStart(NERVA_CONSTANTS.unitPlaces, '0')
  const fracTrim = frac.slice(0, maxDecimals).replace(/0+$/, '')
  return `${neg ? '-' : ''}${whole.toString()}${fracTrim ? '.' + fracTrim : ''}`
}

/** display amount string → atomic BigInt */
export function parseXnv(display: string): bigint | null {
  const s = display.trim()
  if (!/^\d*(\.\d*)?$/.test(s) || s === '' || s === '.') return null
  const [w, f = ''] = s.split('.')
  const frac = (f + '0'.repeat(NERVA_CONSTANTS.unitPlaces)).slice(0, NERVA_CONSTANTS.unitPlaces)
  return BigInt(w || '0') * 10n ** BigInt(NERVA_CONSTANTS.unitPlaces) + BigInt(frac || '0')
}

export function shortenHash(hash: string, head = 8, tail = 6): string {
  if (!hash) return ''
  if (hash.length <= head + tail + 3) return hash
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`
}

export function formatHashrate(hs: number): string {
  if (hs >= 1e9) return `${(hs / 1e9).toFixed(2)} GH/s`
  if (hs >= 1e6) return `${(hs / 1e6).toFixed(2)} MH/s`
  if (hs >= 1e3) return `${(hs / 1e3).toFixed(1)} kH/s`
  return `${Math.round(hs)} H/s`
}

/** difficulty / 60s target = effective network hashrate (CryptoNight) */
export function difficultyToHashrate(difficulty: number): number {
  return difficulty / NERVA_CONSTANTS.blockTarget
}

export function timeAgo(unixSeconds: number, now = Date.now() / 1000): string {
  const d = Math.max(0, Math.floor(now - unixSeconds))
  if (d < 60) return `${d}s ago`
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

export function formatTimestamp(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(2)} kB`
}

/** approx supply: ~18.44M mined by early 2021 + 0.3/block since tail */
export function estimateSupply(height: number): number {
  const TAIL_START = 4_104_000 // ≈ early 2021 at 60s blocks — approximation, labeled as such
  const TAIL_BASE = 18_440_000
  if (height <= TAIL_START) return TAIL_BASE
  return TAIL_BASE + (height - TAIL_START) * NERVA_CONSTANTS.tailReward
}

export const NERVA_LINKS = {
  site: 'https://nerva.one/',
  docs: 'https://docs.nerva.one/',
  explorer: 'https://explorer.nerva.one/',
  nodeMap: 'https://map.nerva.one/',
  github: 'https://github.com/nerva-project',
  discord: 'https://discord.gg/ufysfvcFwe',
  daemonRpc: 'https://docs.nerva.one/developer/daemon-rpc/',
  walletRpc: 'https://docs.nerva.one/developer/wallet-rpc/',
} as const
