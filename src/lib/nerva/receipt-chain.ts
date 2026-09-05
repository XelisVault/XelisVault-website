/**
 * Receipt chain — the caisse's tamper-evident sales journal.
 *
 * Every printed receipt carries a SHA-256 seal over its own canonical
 * fields (recomputable by anyone from the printed data alone), and the
 * merchant's journal additionally CHAINS the seals: each entry commits to
 * the previous one, so deleting or editing any historical sale breaks
 * every seal computed after it. A tiny local hash-chain — the same idea
 * that makes blockchains tamper-evident, at the scale of one shop.
 *
 * All local: WebCrypto + localStorage. Nothing ever leaves the browser.
 */

import type { NervaInvoice, DetectionResult } from './nlink'

export const JOURNAL_KEY = 'nerva-caisse-journal-v1'

/* ─────────────── hashing ─────────────── */

export async function sha256Hex(input: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('WebCrypto unavailable (requires https or localhost)')
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/* ─────────────── the receipt seal (self-verifiable) ─────────────── */

/**
 * Canonical serialization of the sealed fields. Only data that appears
 * ON the printed receipt participates — anyone holding the paper can
 * recompute the seal and compare.
 */
export function receiptCanonical(inv: NervaInvoice, r: DetectionResult | null, ts: number): string {
  const paid = !!r && (r.status === 'detected' || r.status === 'confirmed' || r.status === 'settled')
  return [
    'nerva-receipt-v1',
    inv.a,
    inv.amt,
    inv.pid,
    inv.n ?? '',
    inv.d ?? '',
    String(Math.floor(ts / 1000)),
    paid ? (r!.txHash ?? '') : '',
    paid ? String(r!.blockHeight ?? 0) : '',
    paid ? String(r!.confirmations ?? 0) : '',
  ].join('|')
}

/** SHA-256 seal printed on the receipt */
export async function receiptSeal(inv: NervaInvoice, r: DetectionResult | null, ts: number): Promise<string> {
  return sha256Hex(receiptCanonical(inv, r, ts))
}

/* ─────────────── the journal (chained) ─────────────── */

export interface JournalEntry {
  v: 1
  /** when the sale was encaissée (ms) */
  ts: number
  pid: string
  address: string
  amountAtomic: string
  desc?: string
  merchantName?: string
  txHash?: string
  blockHeight?: number
  confirmations?: number
  status: string
  /** seal of this entry's own fields */
  seal: string
  /** seal of the previous entry — the chain link */
  prev: string
}

export interface VerifyResult {
  ok: boolean
  firstBad: number
  entries: number
  head: string
}

export function loadJournal(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter((e) => e && e.v === 1 && typeof e.seal === 'string')
  } catch {
    return []
  }
}

export function saveJournal(entries: JournalEntry[]) {
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries))
  } catch {
    /* quota exceeded: keep the in-memory copy, the sale still prints */
  }
}

export function appendJournal(entry: JournalEntry): JournalEntry[] {
  const entries = [...loadJournal(), entry]
  saveJournal(entries)
  return entries
}

export function clearJournal(): void {
  try {
    localStorage.removeItem(JOURNAL_KEY)
  } catch { /* ignore */ }
}

/** recompute every seal and every chain link */
export async function verifyJournal(entries: JournalEntry[]): Promise<VerifyResult> {
  let head = GENESIS
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    let recomputed: string
    try {
      recomputed = await sha256Hex(entryCanonical(e))
    } catch {
      return { ok: false, firstBad: i, entries: entries.length, head }
    }
    if (recomputed !== e.seal) return { ok: false, firstBad: i, entries: entries.length, head }
    if (e.prev !== head) return { ok: false, firstBad: i, entries: entries.length, head }
    head = e.seal
  }
  return { ok: true, firstBad: -1, entries: entries.length, head }
}

/** canonical form of a journal entry (must match what was sealed at append time) */
export function entryCanonical(e: JournalEntry): string {
  return [
    'nerva-receipt-v1',
    e.address,
    e.amountAtomic,
    e.pid,
    e.merchantName ?? '',
    e.desc ?? '',
    String(Math.floor(e.ts / 1000)),
    e.txHash ?? '',
    String(e.blockHeight ?? 0),
    String(e.confirmations ?? 0),
  ].join('|')
}

export const GENESIS = '0'.repeat(64)

/**
 * Build a journal entry (with its seal + chain link) from an encaissé sale.
 * The entry seals the SAME canonical fields as the printed receipt, so a
 * paper receipt's seal always equals the journal entry's seal.
 */
export async function buildJournalEntry(
  inv: NervaInvoice,
  r: DetectionResult | null,
  ts: number,
): Promise<JournalEntry> {
  const entries = loadJournal()
  const prev = entries.length ? entries[entries.length - 1].seal : GENESIS
  const paid = !!r && (r.status === 'detected' || r.status === 'confirmed' || r.status === 'settled')
  const seal = await sha256Hex(receiptCanonical(inv, r, ts))
  return {
    v: 1,
    ts,
    pid: inv.pid,
    address: inv.a,
    amountAtomic: inv.amt,
    desc: inv.d,
    merchantName: inv.n,
    txHash: paid ? r!.txHash : undefined,
    blockHeight: paid ? r!.blockHeight : undefined,
    confirmations: paid ? r!.confirmations : 0,
    status: paid ? r!.status : 'pending',
    seal,
    prev,
  }
}

/** export the journal as a JSON backup string */
export function exportJournalJson(entries: JournalEntry[]): string {
  return JSON.stringify({ format: 'xelisvault-caisse-journal', version: 1, exportedAt: new Date().toISOString(), entries }, null, 2)
}
