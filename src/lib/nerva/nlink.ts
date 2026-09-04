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

/**
 * Scan the chain for the invoice's payment id.
 * Strategy (validated against the live network):
 *   1. mempool (get_transaction_pool)
 *   2. blocks since invoice creation, filtered by block_size > 90
 *      (a coinbase-only block is 86 B — skip those)
 */
export async function detectPayment(inv: NervaInvoice, tipHeight: number): Promise<DetectionResult> {
  const candidates: { tx: any; inPool: boolean; height: number }[] = []
  let scannedBlocks = 0

  // 1 — mempool
  let pool: any[] = []
  try { pool = await getTransactionPool() } catch { /* pool unavailable */ }
  for (const tx of pool) candidates.push({ tx, inPool: true, height: 0 })

  // 2 — blocks with transactions since the link was created
  const start = Math.max(inv.h, tipHeight - 500) // sane scan window (cap at ~8h)
  if (tipHeight > start) {
    const headers = await getBlockHeadersRange(start, tipHeight)
    scannedBlocks = headers.length
    const withTxs = headers.filter(
      (bh) => bh.block_size > NERVA_CONSTANTS.txSizeThreshold && (bh.num_txes ?? 0) > 0
    )
    // fetch each interesting block's tx list (a calm network has very few)
    for (const bh of withTxs.slice(-30)) {
      try {
        const block = await getBlock(bh.hash)
        const hashes = block?.json?.tx_hashes ?? []
        if (hashes.length > 0) {
          const txs = await getTransactions(hashes)
          for (const tx of txs) candidates.push({ tx, inPool: false, height: bh.height })
        }
      } catch { /* skip unreachable block */ }
    }
  }

  // 3 — match the payment id in tx_extra
  for (const { tx, inPool, height } of candidates) {
    const extra = tx?.json?.extra
    if (!Array.isArray(extra)) continue
    const parsed = parseTxExtra(extra)
    if (parsed.paymentIdLong && parsed.paymentIdLong.toLowerCase() === inv.pid) {
      const confirmations = inPool ? 0 : Math.max(0, tipHeight - height + 1)
      let status: InvoiceStatus = 'detected'
      if (!inPool && confirmations >= 1) status = 'confirmed'
      if (!inPool && confirmations >= NERVA_CONSTANTS.spendableAge) status = 'settled'
      return {
        status,
        txHash: tx.tx_hash,
        blockHeight: inPool ? undefined : height,
        inPool,
        confirmations,
        checkedTxs: candidates.length,
        scannedBlocks,
        networkHeight: tipHeight,
      }
    }
  }

  return {
    status: 'pending',
    confirmations: 0,
    checkedTxs: candidates.length,
    scannedBlocks,
    networkHeight: tipHeight,
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
