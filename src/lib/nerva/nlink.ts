/**
 * NervaLink — stateless payment links for NERVA (XNV).
 *
 * Design: the invoice lives entirely inside the link URL (base64url JSON).
 * No database, no server state, no keys — 100% Vercel-static compatible.
 *
 * Detection (Mode "public reference"): a random LONG payment id (32 bytes)
 * travels in the `nerva:` URI (`tx_payment_id`) and appears in clear inside
 * `tx_extra` of the paying transaction (tag 0x02 → sub-tag 0x00). The pay
 * page scans the mempool + recent blocks (blocks with size > 90 B only) for
 * that id. RingCT amounts are encrypted — detection confirms the reference,
 * not the exact amount (explained honestly in the UI).
 */

import { parseTxExtra } from './tx-extra'
import {
  getBlockCount,
  getBlock,
  getTransactions,
  getTransactionPool,
  getBlockHeadersRange,
  NERVA_CONSTANTS,
  type NervaBlockHeader,
} from './api'

/* ─────────────── invoice model ─────────────── */

export interface NervaInvoice {
  v: 1
  /** merchant standard address (starts with NV…) */
  a: string
  /** requested amount in atomic units (1e12) — 0 = free / open amount */
  amt: string
  /** short description (max 140 chars) */
  d?: string
  /** merchant display name */
  n?: string
  /** long payment id, 64 hex chars */
  pid: string
  /** network height when the link was created (scan window start) */
  h: number
  /** expiry, unix seconds */
  exp: number
}

export const NLINK_DESC_MAX = 140

/* ─────────────── encode / decode ─────────────── */

function b64urlEncode(s: string): string {
  const b64 = typeof btoa !== 'undefined' ? btoa(s) : Buffer.from(s, 'utf8').toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  return typeof atob !== 'undefined' ? atob(padded) : Buffer.from(padded, 'base64').toString('utf8')
}

export function encodeInvoice(inv: NervaInvoice): string {
  return b64urlEncode(JSON.stringify(inv))
}

export function decodeInvoice(token: string): NervaInvoice | null {
  try {
    const obj = JSON.parse(b64urlDecode(token))
    if (obj?.v !== 1 || typeof obj.a !== 'string' || typeof obj.pid !== 'string') return null
    if (!/^[0-9a-f]{64}$/i.test(obj.pid)) return null
    return {
      v: 1,
      a: obj.a,
      amt: String(obj.amt ?? '0'),
      d: typeof obj.d === 'string' ? obj.d.slice(0, NLINK_DESC_MAX) : undefined,
      n: typeof obj.n === 'string' ? obj.n.slice(0, 60) : undefined,
      pid: obj.pid.toLowerCase(),
      h: Number(obj.h) || 0,
      exp: Number(obj.exp) || 0,
    }
  } catch {
    return null
  }
}

/* ─────────────── payment id & URI ─────────────── */

/** random 32-byte payment id as 64 lowercase hex chars */
export function generatePaymentId(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** wallet address validation: NERVA standard = base58, ~95–110 chars, NV… */
export function isValidNervaAddress(addr: string): { ok: boolean; reason?: string } {
  const s = addr.trim()
  if (!s) return { ok: false, reason: 'Enter your NERVA address' }
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(s)) return { ok: false, reason: 'Invalid characters (base58 only)' }
  if (s.length < 90 || s.length > 120) return { ok: false, reason: `Address looks too short/long (${s.length} chars)` }
  if (!s.startsWith('NV')) return { ok: false, reason: 'Standard NERVA addresses start with “NV”' }
  return { ok: true }
}

/**
 * `nerva:` payment URI — format verified in wallet2::make_uri (nerva source):
 *   nerva:ADDRESS?tx_amount=X&tx_payment_id=HEX&tx_description=..&recipient_name=..
 */
export function buildNervaUri(inv: NervaInvoice): string {
  const params = new URLSearchParams()
  if (inv.amt !== '0') params.set('tx_amount', atomicToDisplay(inv.amt))
  params.set('tx_payment_id', inv.pid)
  if (inv.d) params.set('tx_description', inv.d.slice(0, 60))
  if (inv.n) params.set('recipient_name', inv.n.slice(0, 40))
  return `nerva:${inv.a}?${params.toString()}`
}

export function atomicToDisplay(atomic: string | bigint): string {
  const big = typeof atomic === 'bigint' ? atomic : BigInt(atomic)
  const base = 10n ** BigInt(NERVA_CONSTANTS.unitPlaces)
  const whole = big / base
  const frac = (big % base).toString().padStart(NERVA_CONSTANTS.unitPlaces, '0').replace(/0+$/, '')
  return `${whole.toString()}${frac ? '.' + frac : ''}`
}

/* ─────────────── QR (client-only, generated locally) ─────────────── */

export async function renderQrDataUrl(text: string, size = 320): Promise<string> {
  const QR = (await import('qrcode')).default
  return QR.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#060a14ff', light: '#eef4ffff' },
  })
}

/* ─────────────── detection (ExplorerDetector, client-side) ─────────────── */

export type InvoiceStatus = 'pending' | 'detected' | 'confirmed' | 'settled' | 'expired'

export interface DetectionResult {
  status: InvoiceStatus
  txHash?: string
  blockHeight?: number
  /** block timestamp (unix seconds) of the mined tx, when known */
  txTimestamp?: number
  inPool?: boolean
  confirmations: number
  checkedTxs: number
  scannedBlocks: number
  networkHeight: number
}

/** empty scan result (network unreachable) */
export function pendingResult(networkHeight = 0): DetectionResult {
  return { status: 'pending', confirmations: 0, checkedTxs: 0, scannedBlocks: 0, networkHeight }
}

/* ─────────────── local payment memory (localStorage, per payment id) ─────────────── */

/**
 * Once a payment is found, its tx hash + block height are remembered in
 * localStorage (keyed by payment id). The data NEVER leaves the browser —
 * it is a pure accelerator: reopening the link later shows the paid state
 * instantly while the page re-verifies it on-chain. Cross-device visitors
 * get the same answer through the full history scan below.
 */
export interface PaymentCacheEntry {
  txHash: string
  blockHeight?: number
  txTimestamp?: number
  inPool?: boolean
  status: InvoiceStatus
  confirmations: number
  networkHeight: number
  seenAt: number // unix ms of the last verification
}

const PAY_CACHE_PREFIX = 'nlink:pay:'

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function lsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* private mode / quota */ }
}

export function loadPaymentCache(pid: string): PaymentCacheEntry | null {
  const raw = lsGet(PAY_CACHE_PREFIX + pid)
  if (!raw) return null
  try {
    const obj = JSON.parse(raw)
    if (typeof obj?.txHash !== 'string' || !/^[0-9a-f]{64}$/i.test(obj.txHash)) return null
    return {
      txHash: obj.txHash,
      blockHeight: typeof obj.blockHeight === 'number' && obj.blockHeight > 0 ? obj.blockHeight : undefined,
      txTimestamp: typeof obj.txTimestamp === 'number' && obj.txTimestamp > 0 ? obj.txTimestamp : undefined,
      inPool: obj.inPool === true,
      status: ['detected', 'confirmed', 'settled'].includes(obj.status) ? obj.status : 'detected',
      confirmations: Number(obj.confirmations) || 0,
      networkHeight: Number(obj.networkHeight) || 0,
      seenAt: Number(obj.seenAt) || Date.now(),
    }
  } catch {
    return null
  }
}

export function savePaymentCache(pid: string, r: DetectionResult): void {
  if (!r.txHash) return
  lsSet(PAY_CACHE_PREFIX + pid, JSON.stringify({
    txHash: r.txHash,
    blockHeight: r.blockHeight,
    txTimestamp: r.txTimestamp,
    inPool: r.inPool,
    status: r.status,
    confirmations: r.confirmations,
    networkHeight: r.networkHeight,
    seenAt: Date.now(),
  } satisfies PaymentCacheEntry))
}

export function clearPaymentCache(pid: string): void {
  try { localStorage.removeItem(PAY_CACHE_PREFIX + pid) } catch { /* noop */ }
}

/* ─────────────── helpers ─────────────── */

/** status + confirmations of a mined tx from its height and the current tip */
function fromMinedHeight(height: number, tipHeight: number): { status: InvoiceStatus; confirmations: number } {
  const confirmations = Math.max(0, tipHeight - height + 1)
  if (confirmations >= NERVA_CONSTANTS.spendableAge) return { status: 'settled', confirmations }
  if (confirmations >= 1) return { status: 'confirmed', confirmations }
  return { status: 'detected', confirmations }
}

function txMatchesPaymentId(tx: unknown, pid: string): boolean {
  const extra = (tx as { json?: { extra?: unknown } })?.json?.extra
  if (!Array.isArray(extra)) return false
  const parsed = parseTxExtra(extra)
  return !!parsed.paymentIdLong && parsed.paymentIdLong.toLowerCase() === pid
}

/* ─────────────── scan engine ─────────────── */

export interface ScanProgress {
  scanned: number
  total: number
  phase: 'headers' | 'txs'
}

export interface ScanOptions {
  /** tx hash known to match from a previous poll or the local cache */
  knownTxHash?: string
  /** lowest height NOT yet scanned (caller's cursor + 1) — skips refetching history */
  scanFrom?: number
  /** deep-scan progress reporting for the UI */
  onProgress?: (p: ScanProgress) => void
  /** hard cap of the history window in blocks (default 15 days ≈ 21 600) */
  maxWindowBlocks?: number
  /** max tx-bearing blocks inspected in detail per scan (default 500) */
  maxDetailBlocks?: number
}

export interface ScanOutcome {
  result: DetectionResult
  /** height up to which headers were successfully scanned (cursor to persist) */
  scannedUpTo: number
}

const HEADER_PAGE = 100
const FETCH_CONCURRENCY = 3

/** paged + concurrent header fetch; returns headers and the contiguous success frontier */
async function fetchHeadersPaged(
  start: number,
  end: number,
  onProgress?: (p: ScanProgress) => void,
): Promise<{ headers: NervaBlockHeader[]; completeUpTo: number }> {
  const pages: { s: number; e: number }[] = []
  for (let s = start; s <= end; s += HEADER_PAGE) pages.push({ s, e: Math.min(end, s + HEADER_PAGE - 1) })
  if (pages.length === 0) return { headers: [], completeUpTo: start - 1 }

  const headers: NervaBlockHeader[] = []
  const okPages = new Set<number>()
  const total = end - start + 1
  let done = 0
  let next = 0

  const worker = async () => {
    while (next < pages.length) {
      const idx = next++
      const { s, e } = pages[idx]
      try {
        const hs = await getBlockHeadersRange(s, e)
        headers.push(...hs)
        okPages.add(idx)
      } catch { /* page unreachable — leaves a hole, cursor stops at the frontier */ }
      done++
      onProgress?.({ scanned: Math.min(done * HEADER_PAGE, total), total, phase: 'headers' })
    }
  }
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, pages.length) }, () => worker()))

  // contiguous prefix of successful pages defines the safe cursor
  let last = -1
  for (let i = 0; i < pages.length; i++) {
    if (okPages.has(i)) last = i
    else break
  }
  headers.sort((a, b) => a.height - b.height)
  return { headers, completeUpTo: last >= 0 ? pages[last].e : start - 1 }
}

/** fetch a list of tx-bearing blocks with bounded concurrency, collect their txs */
async function fetchBlockTxs(
  blocks: NervaBlockHeader[],
  onProgress?: (p: ScanProgress) => void,
): Promise<{ tx: unknown; height: number }[]> {
  const out: { tx: unknown; height: number }[] = []
  let done = 0
  let next = 0
  const worker = async () => {
    while (next < blocks.length) {
      const bh = blocks[next++]
      try {
        const block = await getBlock(bh.hash)
        const hashes: string[] = block?.json?.tx_hashes ?? []
        if (hashes.length > 0) {
          // mined txs are immutable → 10 min cache keeps repeat polls free
          const txs = await getTransactions(hashes, 600_000)
          for (const tx of txs) out.push({ tx, height: bh.height })
        }
      } catch { /* skip unreachable block */ }
      done++
      onProgress?.({ scanned: done, total: blocks.length, phase: 'txs' })
    }
  }
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, blocks.length) }, () => worker()))
  return out
}

/**
 * Scan the chain for the invoice's payment id.
 * Strategy (validated against the live network):
 *   1. mempool (get_transaction_pool) — always fresh
 *   2. direct verification of the known tx hash (from cache/poll) — works
 *      no matter how old the payment is, single authoritative call
 *   3. full history since link creation: every tx-bearing block in
 *      [max(inv.h, tip-window) .. tip] is inspected (paged, concurrent,
 *      progress-reported) — this is what makes a link revisited days later
 *      still resolve to "paid" instead of falling back to "listening"
 */
export async function detectPayment(inv: NervaInvoice, tipHeight: number, opts: ScanOptions = {}): Promise<ScanOutcome> {
  const maxWindow = opts.maxWindowBlocks ?? 21_600 // ≈ 15 days at 60 s blocks
  const maxDetail = opts.maxDetailBlocks ?? 500
  let checkedTxs = 0

  // 1 — mempool
  let pool: unknown[] = []
  try { pool = await getTransactionPool() } catch { /* pool unavailable */ }
  checkedTxs += pool.length
  for (const tx of pool) {
    if (txMatchesPaymentId(tx, inv.pid)) {
      const t = tx as { tx_hash?: string }
      return {
        result: {
          status: 'detected', txHash: t.tx_hash, inPool: true, confirmations: 0,
          checkedTxs, scannedBlocks: 0, networkHeight: tipHeight,
        },
        scannedUpTo: tipHeight,
      }
    }
  }

  // 2 — known tx: one call, definitive, age-independent
  if (opts.knownTxHash) {
    try {
      const [tx] = await getTransactions([opts.knownTxHash])
      if (tx && txMatchesPaymentId(tx, inv.pid)) {
        const height = Number(tx.block_height) || 0
        if (tx.in_pool !== true && height > 0) {
          const { status, confirmations } = fromMinedHeight(height, tipHeight)
          return {
            result: {
              status, txHash: tx.tx_hash, blockHeight: height,
              txTimestamp: Number(tx.block_timestamp) || undefined, inPool: false,
              confirmations, checkedTxs: checkedTxs + 1, scannedBlocks: 0, networkHeight: tipHeight,
            },
            scannedUpTo: tipHeight,
          }
        }
      }
    } catch { /* verification call failed — fall through to the history scan */ }
  }

  // 3 — history scan since the link was created
  const windowStart = inv.h > 0 ? Math.max(inv.h, tipHeight - maxWindow) : Math.max(0, tipHeight - 500)
  const scanFrom = Math.max(windowStart, opts.scanFrom ?? windowStart)
  let scannedBlocks = 0
  let scannedUpTo = scanFrom - 1

  if (tipHeight >= scanFrom) {
    const { headers, completeUpTo } = await fetchHeadersPaged(scanFrom, tipHeight, opts.onProgress)
    scannedBlocks = headers.length
    scannedUpTo = completeUpTo
    const withTxs = headers.filter(
      (bh) => bh.block_size > NERVA_CONSTANTS.txSizeThreshold && (bh.num_txes ?? 0) > 0
    )
    // newest-first would miss old payments — we inspect ALL tx-bearing blocks
    // up to the safety cap, oldest first for a chronological receipt
    const bounded = withTxs.slice(0, maxDetail)
    const entries = await fetchBlockTxs(bounded, opts.onProgress)
    checkedTxs += entries.length
    for (const { tx, height } of entries) {
      if (txMatchesPaymentId(tx, inv.pid)) {
        const t = tx as { tx_hash?: string; block_timestamp?: number }
        const { status, confirmations } = fromMinedHeight(height, tipHeight)
        return {
          result: {
            status, txHash: t.tx_hash, blockHeight: height,
            txTimestamp: Number(t.block_timestamp) || undefined, inPool: false,
            confirmations, checkedTxs, scannedBlocks, networkHeight: tipHeight,
          },
          scannedUpTo,
        }
      }
    }
  }

  return {
    result: { status: 'pending', confirmations: 0, checkedTxs, scannedBlocks, networkHeight: tipHeight },
    scannedUpTo,
  }
}

/** freshness of the invoice link itself */
export function invoicePhase(inv: NervaInvoice, nowMs = Date.now()): 'active' | 'expired' {
  return inv.exp > 0 && nowMs > inv.exp * 1000 ? 'expired' : 'active'
}

/** TTL presets in seconds */
export const TTL_OPTIONS = [
  { label: '1 hour', seconds: 3600 },
  { label: '24 hours', seconds: 86_400 },
  { label: '3 days', seconds: 3 * 86_400 },
  { label: '7 days', seconds: 7 * 86_400 },
] as const
