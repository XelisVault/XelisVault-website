/**
 * NervaLink — stateless payment links for NERVA (XNV).
 *
 * Design: the invoice lives entirely inside the link URL (base64url JSON).
 * No database, no server state, no keys — 100% Vercel-static compatible.
 *
 * ── Invoice v2 (integrated mode, current) ─────────────────────────────
 * v1 shipped a 32-byte LONG payment id in the `nerva:` URI. That mechanism
 * is dead: nerva-wallet refuses unencrypted long ids by default
 * (--long-payment-id-support defaults to FALSE, simplewallet.cpp L157) and
 * no live transaction carries one anymore (verified on-chain 2026-09-06:
 * every recent tx uses an ENCRYPTED SHORT id — most of them dummy ids
 * auto-added by construct_tx_with_tx_key, cryptonote_tx_utils.cpp L280+).
 *
 * v2 embeds a random 8-byte payment id inside an INTEGRATED address
 * (tag 0x7081). Every default NERVA wallet encrypts and includes it
 * automatically when paying an integrated address (tx_extra 0x02 → 0x01),
 * so payments actually flow. Detection then works on three levels:
 *
 *   · Payer declaration — "I paid, here is my tx hash": the page fetches
 *     the tx and checks it exists and carries an encrypted id. With the
 *     optional transaction secret key (wallet `get_tx_key`), the payer
 *     gets a full cryptographic proof: pid = enc ⊕ keccak(D‖0x8d)[0..8],
 *     D = 8·txKey·viewPub — no merchant secret involved.
 *   · Merchant auto-detection — the merchant's secret view key (caisse
 *     config) scans the chain: D = 8·viewKey·txPub, decrypt, match pid8.
 *     Exactly what an official wallet does, in the browser.
 *   · Legacy long-id scan — kept for v1 links created before the switch.
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
import {
  decodeAddress, encodeAddress, bytesToHex, hexToBytes,
  NERVA_ADDRESS_PREFIX, NERVA_INTEGRATED_PREFIX,
  generateKeyDerivation, cryptShortPaymentId, parseSecretKeyHex,
  viewKeyMatches,
} from './cryptonote'

/* ─────────────── invoice model ─────────────── */

export interface NervaInvoice {
  v: 1 | 2
  /** merchant standard address (starts with NV…) */
  a: string
  /** requested amount in atomic units (1e12) — 0 = free / open amount */
  amt: string
  /** short description (max 140 chars) */
  d?: string
  /** merchant display name */
  n?: string
  /** v1: long payment id, 64 hex chars (legacy links only) */
  pid?: string
  /** v2: short payment id, 16 hex chars — embedded in the integrated address */
  pid8?: string
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
    if (typeof obj?.a !== 'string') return null
    if (obj.v === 2) {
      if (typeof obj.pid8 !== 'string' || !/^[0-9a-f]{16}$/i.test(obj.pid8)) return null
      return {
        v: 2,
        a: obj.a,
        amt: String(obj.amt ?? '0'),
        d: typeof obj.d === 'string' ? obj.d.slice(0, NLINK_DESC_MAX) : undefined,
        n: typeof obj.n === 'string' ? obj.n.slice(0, 60) : undefined,
        pid8: String(obj.pid8).toLowerCase(),
        h: Number(obj.h) || 0,
        exp: Number(obj.exp) || 0,
      }
    }
    // v1 legacy: 64-hex long payment id
    if (obj?.v !== 1 || typeof obj.pid !== 'string' || !/^[0-9a-f]{64}$/i.test(obj.pid)) return null
    return {
      v: 1,
      a: obj.a,
      amt: String(obj.amt ?? '0'),
      d: typeof obj.d === 'string' ? obj.d.slice(0, NLINK_DESC_MAX) : undefined,
      n: typeof obj.n === 'string' ? obj.n.slice(0, 60) : undefined,
      pid: String(obj.pid).toLowerCase(),
      h: Number(obj.h) || 0,
      exp: Number(obj.exp) || 0,
    }
  } catch {
    return null
  }
}

/* ─────────────── payment id & addresses ─────────────── */

/** random 8-byte payment id as 16 lowercase hex chars (v2 integrated mode) */
export function generatePaymentId8(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** legacy: random 32-byte payment id as 64 lowercase hex chars (v1 links) */
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
 * Integrated address for a v2 invoice: the merchant standard address with
 * the 8-byte payment id embedded (tag 0x7081 — get_account_integrated_
 * address_as_str). This is the address the payer actually pays: every
 * default wallet then encrypts and includes the id automatically.
 */
export function buildIntegratedAddress(inv: NervaInvoice): string | null {
  if (inv.v !== 2 || !inv.pid8) return null
  const decoded = decodeAddress(inv.a)
  if (!decoded || decoded.tag !== NERVA_ADDRESS_PREFIX) return null
  const pidBytes = hexToBytes(inv.pid8)
  if (!pidBytes || pidBytes.length !== 8) return null
  return encodeAddress(decoded.spendPub, decoded.viewPub, NERVA_INTEGRATED_PREFIX, pidBytes)
}

/** view-preflight: check a merchant view key really matches the address */
export function viewKeyMatchesAddress(viewKeyHex: string, address: string): { ok: boolean; reason?: string } {
  const sec = parseSecretKeyHex(viewKeyHex)
  if (!sec) return { ok: false, reason: 'View key must be 64 hex characters' }
  const decoded = decodeAddress(address)
  if (!decoded || decoded.tag !== NERVA_ADDRESS_PREFIX) return { ok: false, reason: 'Invalid standard address' }
  if (!viewKeyMatches(sec, decoded.viewPub)) {
    return { ok: false, reason: 'This view key does not match the receiving address' }
  }
  return { ok: true }
}

/**
 * `nerva:` payment URI.
 * v2: integrated address + NO tx_payment_id (the wallet refuses a separate
 *     id alongside an integrated one — wallet2::parse_uri).
 * v1: standard address + long tx_payment_id (legacy wallets only).
 * Format verified in wallet2::make_uri / parse_uri:
 *   nerva:ADDRESS?tx_amount=X&tx_payment_id=HEX&tx_description=..&recipient_name=..
 */
export function buildNervaUri(inv: NervaInvoice): string {
  const target = inv.v === 2 ? buildIntegratedAddress(inv) ?? inv.a : inv.a
  const params = new URLSearchParams()
  if (inv.amt !== '0') params.set('tx_amount', atomicToDisplay(inv.amt))
  if (inv.v === 1 && inv.pid) params.set('tx_payment_id', inv.pid)
  if (inv.d) params.set('tx_description', inv.d.slice(0, 60))
  if (inv.n) params.set('recipient_name', inv.n.slice(0, 40))
  return `nerva:${target}?${params.toString()}`
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

/* ─────────────── detection model ─────────────── */

export type InvoiceStatus = 'pending' | 'declared' | 'detected' | 'confirmed' | 'settled' | 'expired'

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
  /** how the payment was tied to this invoice */
  match?: 'long-pid' | 'pid8-merchant' | 'pid8-txkey' | 'payer-declared'
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
  match?: DetectionResult['match']
  /** payer-provided transaction secret key (self-proof), when supplied */
  txKey?: string
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
      status: ['declared', 'detected', 'confirmed', 'settled'].includes(obj.status) ? obj.status : 'detected',
      match: obj.match,
      txKey: typeof obj.txKey === 'string' && /^[0-9a-f]{64}$/i.test(obj.txKey) ? obj.txKey : undefined,
      confirmations: Number(obj.confirmations) || 0,
      networkHeight: Number(obj.networkHeight) || 0,
      seenAt: Number(obj.seenAt) || Date.now(),
    }
  } catch {
    return null
  }
}

export function savePaymentCache(pid: string, r: DetectionResult, txKey?: string): void {
  if (!r.txHash) return
  lsSet(PAY_CACHE_PREFIX + pid, JSON.stringify({
    txHash: r.txHash,
    blockHeight: r.blockHeight,
    txTimestamp: r.txTimestamp,
    inPool: r.inPool,
    status: r.status,
    match: r.match,
    txKey: /^[0-9a-f]{64}$/i.test(txKey ?? '') ? txKey : undefined,
    confirmations: r.confirmations,
    networkHeight: r.networkHeight,
    seenAt: Date.now(),
  } satisfies PaymentCacheEntry))
}

export function clearPaymentCache(pid: string): void {
  try { localStorage.removeItem(PAY_CACHE_PREFIX + pid) } catch { /* noop */ }
}

/** invoice key used for the local cache (pid8 for v2, pid for v1) */
export function invoiceCacheKey(inv: NervaInvoice): string {
  return inv.v === 2 ? `pid8:${inv.pid8}` : `pid:${inv.pid ?? inv.a}`
}

/* ─────────────── helpers ─────────────── */

/** status + confirmations of a mined tx from its height and the current tip */
function fromMinedHeight(height: number, tipHeight: number): { status: InvoiceStatus; confirmations: number } {
  const confirmations = Math.max(0, tipHeight - height + 1)
  if (confirmations >= NERVA_CONSTANTS.spendableAge) return { status: 'settled', confirmations }
  if (confirmations >= 1) return { status: 'confirmed', confirmations }
  return { status: 'detected', confirmations }
}

function txMatchesLongPid(tx: unknown, pid: string): boolean {
  const extra = (tx as { json?: { extra?: unknown } })?.json?.extra
  if (!Array.isArray(extra)) return false
  const parsed = parseTxExtra(extra)
  return !!parsed.paymentIdLong && parsed.paymentIdLong.toLowerCase() === pid
}

interface ExtraInfo {
  txPubkey: Uint8Array | null
  encryptedPid: Uint8Array | null
}

function parseExtraInfo(tx: unknown): ExtraInfo {
  const extra = (tx as { json?: { extra?: unknown } })?.json?.extra
  if (!Array.isArray(extra)) return { txPubkey: null, encryptedPid: null }
  const parsed = parseTxExtra(extra)
  return { txPubkey: parsed.txPubkey, encryptedPid: parsed.paymentIdShort }
}

/* ─────────────── payer declaration (v2) ─────────────── */

export interface DeclaredVerification {
  ok: boolean
  reason?: string
  result?: DetectionResult
}

/**
 * Verify a payer-declared payment for a v2 invoice.
 *
 * With just the tx hash: sanity checks (exists, in window, carries an
 * encrypted payment id) → status 'declared' (payer-claimed).
 * With the transaction secret key too (`get_tx_key` in the wallet):
 * full proof — D = 8·txKey·viewPub (viewPub from the merchant address),
 * pid = enc ⊕ keccak(D‖0x8d)[0..8], must equal the invoice pid8 →
 * detected/confirmed/settled with match 'pid8-txkey'.
 */
export async function verifyDeclaredPayment(
  inv: NervaInvoice,
  txHash: string,
  opts: { txKey?: string; tipHeight: number },
): Promise<DeclaredVerification> {
  const hash = txHash.trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(hash)) return { ok: false, reason: 'Transaction hash must be 64 hex characters' }
  const tip = opts.tipHeight

  let tx: unknown
  try {
    const [t] = await getTransactions([hash])
    tx = t
  } catch {
    return { ok: false, reason: 'The explorer is unreachable right now — try again' }
  }
  if (!tx) return { ok: false, reason: 'Transaction not found — is it confirmed by the network yet?' }

  const t = tx as { tx_hash?: string; block_height?: number; block_timestamp?: number; in_pool?: boolean }
  const { encryptedPid } = parseExtraInfo(tx)
  if (!encryptedPid) {
    return { ok: false, reason: 'This transaction carries no payment reference — it cannot be tied to this invoice' }
  }

  const height = Number(t.block_height) || 0
  const inPool = t.in_pool === true
  if (!inPool && height > 0 && inv.h > 0 && height < inv.h) {
    return { ok: false, reason: 'This transaction was mined before the invoice was created' }
  }

  // payer-supplied transaction secret key → full cryptographic proof
  const txKeyHex = (opts.txKey ?? '').trim().toLowerCase()
  if (/^[0-9a-f]{64}$/.test(txKeyHex) && inv.v === 2 && inv.pid8) {
    const txKey = hexToBytes(txKeyHex)
    const decoded = decodeAddress(inv.a)
    if (txKey && decoded) {
      const D = generateKeyDerivation(decoded.viewPub, txKey) // 8·txKey·viewPub
      if (D) {
        const pid = cryptShortPaymentId(encryptedPid, D)
        const pidHex = bytesToHex(pid)
        if (pidHex !== inv.pid8) {
          return { ok: false, reason: 'The transaction key does not match this invoice (reference mismatch)' }
        }
        const { status, confirmations } = inPool
          ? { status: 'detected' as InvoiceStatus, confirmations: 0 }
          : fromMinedHeight(height, tip)
        return {
          ok: true,
          result: {
            status, txHash: hash, blockHeight: height || undefined,
            txTimestamp: Number(t.block_timestamp) || undefined, inPool,
            confirmations, checkedTxs: 1, scannedBlocks: 0, networkHeight: tip,
            match: 'pid8-txkey',
          },
        }
      }
    }
  }

  // declaration without proof: honest 'declared' state
  return {
    ok: true,
    result: {
      status: 'declared', txHash: hash, blockHeight: height || undefined,
      txTimestamp: Number(t.block_timestamp) || undefined, inPool,
      confirmations: inPool ? 0 : Math.max(0, tip - height + 1),
      checkedTxs: 1, scannedBlocks: 0, networkHeight: tip,
      match: 'payer-declared',
    },
  }
}

/* ─────────────── scan engine (shared) ─────────────── */

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

/** does this tx pay THIS invoice? merchant mode decrypts the integrated pid8 */
function txPaysInvoice(
  tx: unknown,
  inv: NervaInvoice,
  viewPriv: Uint8Array | null,
): (DetectionResult & { txHash: string }) | null {
  const t = tx as { tx_hash?: string }

  // v1: clear long payment id
  if (inv.v === 1 && inv.pid && txMatchesLongPid(tx, inv.pid)) {
    return {
      status: 'detected', txHash: t.tx_hash ?? '', inPool: true, confirmations: 0,
      checkedTxs: 0, scannedBlocks: 0, networkHeight: 0, match: 'long-pid',
    }
  }

  // v2: encrypted short payment id — needs the merchant view key
  if (inv.v === 2 && inv.pid8 && viewPriv) {
    const { txPubkey, encryptedPid } = parseExtraInfo(tx)
    if (txPubkey && encryptedPid) {
      const D = generateKeyDerivation(txPubkey, viewPriv) // 8·viewKey·txPub
      if (D) {
        const pid = cryptShortPaymentId(encryptedPid, D)
        if (bytesToHex(pid) === inv.pid8) {
          return {
            status: 'detected', txHash: t.tx_hash ?? '', inPool: true, confirmations: 0,
            checkedTxs: 0, scannedBlocks: 0, networkHeight: 0, match: 'pid8-merchant',
          }
        }
      }
    }
  }
  return null
}

/**
 * Scan the chain for a payment matching the invoice.
 *   · v1 links: looks for the legacy clear long payment id.
 *   · v2 links with a view key (merchant): decrypts every integrated
 *     payment id and matches pid8 — works with every default wallet.
 *   · v2 links without a view key (payer device): the history scan cannot
 *     see references (they are encrypted) — declare via tx hash instead
 *     (verifyDeclaredPayment); mempool/knownTx still resolve prior hits.
 */
export async function detectPayment(
  inv: NervaInvoice,
  tipHeight: number,
  opts: ScanOptions & { viewKey?: Uint8Array | null } = {},
): Promise<ScanOutcome> {
  const maxWindow = opts.maxWindowBlocks ?? 21_600 // ≈ 15 days at 60 s blocks
  const maxDetail = opts.maxDetailBlocks ?? 500
  let checkedTxs = 0
  const viewPriv = opts.viewKey ?? null

  // 1 — mempool
  let pool: unknown[] = []
  try { pool = await getTransactionPool() } catch { /* pool unavailable */ }
  checkedTxs += pool.length
  for (const tx of pool) {
    const m = txPaysInvoice(tx, inv, viewPriv)
    if (m) {
      const t = tx as { tx_hash?: string }
      return {
        result: {
          status: 'detected', txHash: t.tx_hash, inPool: true, confirmations: 0,
          checkedTxs, scannedBlocks: 0, networkHeight: tipHeight, match: m.match,
        },
        scannedUpTo: tipHeight,
      }
    }
  }

  // 2 — known tx: one call, definitive, age-independent
  if (opts.knownTxHash) {
    try {
      const [tx] = await getTransactions([opts.knownTxHash])
      if (tx) {
        const m = txPaysInvoice(tx, inv, viewPriv)
        // v2 declared payments keep their declared state when re-verified
        const declared = inv.v === 2 && !m
        if (m || declared) {
          const height = Number(tx.block_height) || 0
          if (tx.in_pool !== true && height > 0) {
            const { status, confirmations } = fromMinedHeight(height, tipHeight)
            return {
              result: {
                status: declared && !m ? 'declared' : status, txHash: tx.tx_hash, blockHeight: height,
                txTimestamp: Number(tx.block_timestamp) || undefined, inPool: false,
                confirmations, checkedTxs: checkedTxs + 1, scannedBlocks: 0, networkHeight: tipHeight,
                match: m?.match ?? 'payer-declared',
              },
              scannedUpTo: tipHeight,
            }
          }
          // still in pool
          const t = tx as { tx_hash?: string }
          return {
            result: {
              status: declared && !m ? 'declared' : 'detected', txHash: tx.tx_hash ?? t.tx_hash,
              inPool: true, confirmations: 0,
              checkedTxs: checkedTxs + 1, scannedBlocks: 0, networkHeight: tipHeight,
              match: m?.match ?? 'payer-declared',
            },
            scannedUpTo: tipHeight,
          }
        }
      }
    } catch { /* verification call failed — fall through to the history scan */ }
  }

  // 3 — history scan (v1 long ids, or v2 with the merchant view key)
  const canScanHistory = inv.v === 1 || (inv.v === 2 && !!viewPriv)
  const windowStart = inv.h > 0 ? Math.max(inv.h, tipHeight - maxWindow) : Math.max(0, tipHeight - 500)
  const scanFrom = canScanHistory ? Math.max(windowStart, opts.scanFrom ?? windowStart) : tipHeight + 1
  let scannedBlocks = 0
  let scannedUpTo = scanFrom - 1

  if (canScanHistory && tipHeight >= scanFrom) {
    const { headers, completeUpTo } = await fetchHeadersPaged(scanFrom, tipHeight, opts.onProgress)
    scannedBlocks = headers.length
    scannedUpTo = completeUpTo
    const withTxs = headers.filter(
      (bh) => bh.block_size > NERVA_CONSTANTS.txSizeThreshold && (bh.num_txes ?? 0) > 0,
    )
    // newest-first would miss old payments — we inspect ALL tx-bearing blocks
    // up to the safety cap, oldest first for a chronological receipt
    const bounded = withTxs.slice(0, maxDetail)
    const entries = await fetchBlockTxs(bounded, opts.onProgress)
    checkedTxs += entries.length
    for (const { tx, height } of entries) {
      const m = txPaysInvoice(tx, inv, viewPriv)
      if (m) {
        const t = tx as { tx_hash?: string; block_timestamp?: number }
        const { status, confirmations } = fromMinedHeight(height, tipHeight)
        return {
          result: {
            status, txHash: t.tx_hash, blockHeight: height,
            txTimestamp: Number(t.block_timestamp) || undefined, inPool: false,
            confirmations, checkedTxs, scannedBlocks, networkHeight: tipHeight, match: m.match,
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
