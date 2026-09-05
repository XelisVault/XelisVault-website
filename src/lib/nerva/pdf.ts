/**
 * NervaLink PDF generator — receipts (80 mm thermal-style) and price-tag
 * sheets (A4). Zero external dependency at build time: a tiny PDF 1.4
 * writer emitting base-14 fonts (Courier + Helvetica, WinAnsiEncoding so
 * French accents print), vector rectangles for QR modules (crisp at any
 * dpi, no rasterised image), and dashed crop marks for the tag sheets.
 *
 * Everything runs client-side; nothing ever leaves the browser.
 *
 * Pure module: no DOM access (Blob/download helpers are separate), so the
 * generator is testable from bun/node directly.
 */

import { atomicToDisplay, type NervaInvoice, type DetectionResult } from './nlink'
import { shortenHash, NERVA_CONSTANTS } from './api'
import { receiptSeal } from './receipt-chain'

/* French date formatting, deterministic (the api.ts one is en-US) */
const FR_MONTHS = ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
function frDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* ─────────────── CP1252 (WinAnsi) text encoding ─────────────── */

const CP1252_EXTRA: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
}

/** map a JS string to CP1252 bytes (unencodable chars become '?') */
function toCp1252(s: string): string {
  let out = ''
  for (const ch of s) {
    const c = ch.codePointAt(0)!
    if (c >= 0x20 && c <= 0xff) out += ch
    else if (CP1252_EXTRA[c] !== undefined) out += String.fromCharCode(CP1252_EXTRA[c])
    else if (c === 0x0a || c === 0x0d) out += ' ' // newlines are handled by the caller
    else if (c === 0x202f || c === 0x00a0) out += ' '
    else out += '?'
  }
  return out
}

function pdfEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

/* ─────────────── font metrics ─────────────── */

export type FontKey = 'F1' | 'F2' | 'F3' | 'F4'

const FONT_NAMES: Record<FontKey, string> = {
  F1: 'Courier',
  F2: 'Courier-Bold',
  F3: 'Helvetica',
  F4: 'Helvetica-Bold',
}

/** Helvetica AFM widths (per mille) for ASCII 32..126 */
const HELV = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, // space / ..  /0
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, // 0..? @ missing tail
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, // A..O
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, // P..Z [ \ ]
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, // a..o
  556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 333, 260, 333, 584, 750, 750, // p..z { | } ~
]

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function charWidthMille(font: FontKey, ch: string): number {
  if (font === 'F1' || font === 'F2') return 600
  const base = stripDiacritics(ch)
  const c = base.charCodeAt(0)
  if (c >= 32 && c <= 126) return HELV[c - 32]
  return 556
}

export function textWidth(s: string, font: FontKey, size: number): number {
  let m = 0
  for (const ch of toCp1252(s)) m += charWidthMille(font, ch)
  return (m / 1000) * size
}

/** greedy wrap to a max width */
export function wrapText(s: string, font: FontKey, size: number, maxWidth: number, maxLines = 8): string[] {
  const words = s.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const probe = cur ? `${cur} ${w}` : w
    if (textWidth(probe, font, size) <= maxWidth || !cur) {
      // hard-break a single monster word (hashes, urls)
      if (!cur && textWidth(probe, font, size) > maxWidth) {
        let piece = ''
        for (const ch of probe) {
          if (textWidth(piece + ch, font, size) > maxWidth) { lines.push(piece); piece = ch }
          else piece += ch
        }
        cur = piece
        continue
      }
      cur = probe
    } else {
      lines.push(cur)
      cur = w
    }
    if (lines.length >= maxLines) break
  }
  if (cur && lines.length < maxLines) lines.push(cur)
  return lines
}

/* ─────────────── drawing primitives (top-down coordinates) ─────────────── */

type Prim =
  | { t: 'text'; x: number; y: number; s: string; font: FontKey; size: number; gray?: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number; gray?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; gray?: number; w?: number; dash?: [number, number] }
  | { t: 'qr'; x: number; y: number; size: number; modules: { size: number; data: Uint8Array } }

interface QrMatrix { size: number; data: Uint8Array }

/** local QR matrix via the `qrcode` package (client-side, vector output) */
export async function qrMatrix(text: string, level: 'L' | 'M' | 'Q' | 'H' = 'M'): Promise<QrMatrix> {
  const QR = (await import('qrcode')).default
  const qr = QR.create(text, { errorCorrectionLevel: level })
  const m = qr.modules as unknown as QrMatrix
  return { size: m.size, data: m.data }
}

class Page {
  prims: Prim[] = []
  constructor(public w: number, public h: number) {}

  text(x: number, yTop: number, s: string, font: FontKey, size: number, gray = 0) {
    this.prims.push({ t: 'text', x, y: yTop, s: toCp1252(s), font, size, gray })
  }
  center(yTop: number, s: string, font: FontKey, size: number, gray = 0, x0 = 0, x1 = this.w) {
    const wid = textWidth(s, font, size)
    const cx = (x0 + x1 - wid) / 2
    this.text(cx, yTop, s, font, size, gray)
  }
  rect(x: number, yTop: number, w: number, h: number, gray = 0) {
    this.prims.push({ t: 'rect', x, y: yTop, w, h, gray })
  }
  hline(x0: number, x1: number, yTop: number, gray = 0.75, w = 0.6, dash?: [number, number]) {
    this.prims.push({ t: 'line', x1: x0, y1: yTop, x2: x1, y2: yTop, gray, w, dash })
  }
  rectOutline(x: number, yTop: number, w: number, h: number, gray = 0.55, lw = 0.6, dash: [number, number] = [3, 2]) {
    this.hline(x, x + w, yTop, gray, lw, dash)
    this.hline(x, x + w, yTop + h, gray, lw, dash)
    this.prims.push({ t: 'line', x1: x, y1: yTop, x2: x, y2: yTop + h, gray, w: lw, dash })
    this.prims.push({ t: 'line', x1: x + w, y1: yTop, x2: x + w, y2: yTop + h, gray, w: lw, dash })
  }
  qr(x: number, yTop: number, size: number, modules: QrMatrix) {
    this.prims.push({ t: 'qr', x, y: yTop, size, modules })
  }
}

/* ─────────────── PDF serialization ─────────────── */

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString()
}

function pageContentOps(page: Page): string {
  const H = page.h
  const ops: string[] = ['0 g 0 G']
  for (const p of page.prims) {
    if (p.t === 'text') {
      const y = H - p.y - p.size * 0.8 // baseline ≈ top of the line box
      const color = p.gray ? `${fmt(p.gray)} g` : '0 g'
      ops.push(`${color} BT /${p.font} ${fmt(p.size)} Tf ${fmt(p.x)} ${fmt(y)} Td (${pdfEscape(p.s)}) Tj ET 0 g`)
    } else if (p.t === 'rect') {
      const y = H - p.y - p.h
      ops.push(`${p.gray ? fmt(p.gray) : '0'} g ${fmt(p.x)} ${fmt(y)} ${fmt(p.w)} ${fmt(p.h)} re f 0 g`)
    } else if (p.t === 'line') {
      const y1 = H - p.y1
      const y2 = H - p.y2
      const dash = p.dash ? `[${p.dash[0]} ${p.dash[1]}] 0 d` : '[] 0 d'
      ops.push(`${p.gray ?? 0} G ${fmt(p.w ?? 0.6)} w ${dash} ${fmt(p.x1)} ${fmt(y1)} m ${fmt(p.x2)} ${fmt(y2)} l S [] 0 d 0 G`)
    } else if (p.t === 'qr') {
      const m = p.modules
      const cell = p.size / m.size
      const overlap = Math.min(0.02, cell * 0.02)
      const parts: string[] = []
      for (let r = 0; r < m.size; r++) {
        for (let c = 0; c < m.size; c++) {
          if (m.data[r * m.size + c]) {
            const x = p.x + c * cell
            const yTop = p.y + r * cell
            const y = H - yTop - cell
            parts.push(`${fmt(x)} ${fmt(y)} ${fmt(cell + overlap)} ${fmt(cell + overlap)} re f`)
          }
        }
      }
      ops.push('0 g', ...parts, '0 G')
    }
  }
  return ops.join('\n')
}

/** assemble a complete PDF from fully-measured pages */
export function serializePdf(pages: { w: number; h: number; ops: string }[]): Uint8Array {
  const objects: string[] = []
  const nPages = pages.length
  // object ids: 1 catalog, 2 pages tree, then per page: page obj + content obj, then 4 fonts
  const pageObjIds = pages.map((_, i) => 3 + i * 2)
  const fontStart = 3 + nPages * 2

  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`
  const kids = pageObjIds.map((id) => `${id} 0 R`).join(' ')
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${nPages} >>`

  pages.forEach((p, i) => {
    const pageId = pageObjIds[i]
    const contentId = pageId + 1
    const fonts =
      `/Font << /F1 ${fontStart} 0 R /F2 ${fontStart + 1} 0 R /F3 ${fontStart + 2} 0 R /F4 ${fontStart + 3} 0 R >>`
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(p.w)} ${fmt(p.h)}] /Resources << ${fonts} >> /Contents ${contentId} 0 R >>`
    objects[contentId] = `<< /Length ${p.ops.length} >>\nstream\n${p.ops}\nendstream`
  })

  for (const [i, name] of (['F1', 'F2', 'F3', 'F4'] as FontKey[]).entries()) {
    objects[fontStart + i] =
      `<< /Type /Font /Subtype /Type1 /BaseFont /${FONT_NAMES[name]} /Encoding /WinAnsiEncoding >>`
  }

  // serialize with xref offsets (all strings are latin1-safe: 1 char = 1 byte)
  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  for (let id = 1; id < objects.length; id++) {
    if (objects[id] === undefined) continue
    offsets[id] = out.length
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }
  const xrefPos = out.length
  const maxId = objects.length - 1
  out += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`
  for (let id = 1; id <= maxId; id++) {
    out += offsets[id] !== undefined
      ? `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
      : `0000000000 65535 f \n`
  }
  out += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`

  const bytes = new Uint8Array(out.length)
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff
  return bytes
}

/* ─────────────── the receipt (80 mm thermal-style) ─────────────── */

export interface ReceiptExtras {
  /** checkout URL re-verifying this sale on-chain */
  verifyUrl?: string
  /** generated at (ms), defaults to now */
  generatedAt?: number
}

const R_W = 226.77 // 80 mm
const R_MX = 16
const R_IW = R_W - 2 * R_MX

function dashedRule(page: Page, y: number) {
  page.hline(R_MX, R_W - R_MX, y, 0.6, 0.6, [2, 2.5])
}

export async function buildReceiptPdf(
  inv: NervaInvoice,
  r: DetectionResult | null,
  extras: ReceiptExtras = {},
): Promise<Uint8Array> {
  const now = extras.generatedAt ?? Date.now()
  const paid = !!r && (r.status === 'detected' || r.status === 'confirmed' || r.status === 'settled')
  const settled = r?.status === 'settled'

  // plan first: list of lines so the height is known before serialization
  const page = new Page(R_W, 1000) // provisional height; real one computed at the end
  let y = 18

  // header
  page.center(y, 'XELISVAULT', 'F2', 11)
  y += 13
  page.center(y, 'NERVA · CAISSE NERVALINK', 'F1', 7.5, 0.35)
  y += 17
  page.center(y, inv.n || 'REÇU DE PAIEMENT', 'F2', 10)
  y += 12
  page.center(y, 'paiement en XNV · pair-à-pair', 'F1', 7, 0.35)
  y += 12
  dashedRule(page, y)
  y += 11

  // meta
  const date = new Date(now)
  const metaRow = (label: string, value: string) => {
    page.text(R_MX, y, label, 'F1', 7, 0.35)
    page.text(R_W - R_MX - textWidth(value, 'F1', 7), y, value, 'F1', 7)
    y += 9.5
  }
  metaRow('Date', frDate(Math.floor(now / 1000)))
  metaRow('Référence', shortenHash(inv.pid, 16, 6))
  if (inv.d) {
    const lines = wrapText(inv.d, 'F1', 7, R_IW - 52, 3)
    lines.forEach((ln, i) => {
      if (i === 0) page.text(R_MX, y, 'Note', 'F1', 7, 0.35)
      page.text(R_MX + 52, y, ln, 'F1', 7)
      y += 9.5
    })
  }
  y += 3
  dashedRule(page, y)
  y += 12

  // amount block
  const amountStr = inv.amt === '0' ? 'MONTANT LIBRE' : `${atomicToDisplay(inv.amt)} XNV`
  const aSize = inv.amt === '0' ? 11 : 13
  page.center(y, amountStr, 'F2', aSize)
  y += aSize + 8
  if (inv.amt === '0') {
    page.center(y, 'le client choisit la somme', 'F1', 7, 0.35)
    y += 10
  }

  // status
  const statusLabel = settled ? 'RÉGLÉ · 10/10 CONFIRMATIONS'
    : paid ? `PAYÉ · ${r!.confirmations}/${NERVA_CONSTANTS.spendableAge} CONFIRMATIONS`
    : 'EN ATTENTE DE PAIEMENT'
  page.center(y, statusLabel, 'F2', 8.5, settled ? 0 : 0.25)
  y += 12
  if (paid && r) {
    metaRow('Statut', r.inPool ? 'mempool · vu par le réseau' : settled ? 'règlé, dépensable' : 'confirmé en bloc')
    if (r.blockHeight && !r.inPool) metaRow('Bloc', `#${r.blockHeight.toLocaleString('fr-FR')}`)
    if (r.txTimestamp) metaRow('Payé le', frDate(r.txTimestamp))
    if (r.txHash) {
      for (const ln of wrapText(r.txHash, 'F1', 6.5, R_IW, 2)) {
        page.text(R_MX, y, ln, 'F1', 6.5, 0.3)
        y += 8.5
      }
    }
  }
  y += 3
  dashedRule(page, y)
  y += 11

  // seal
  const seal = await receiptSeal(inv, r, now)
  page.text(R_MX, y, 'Empreinte SHA-256 du reçu', 'F1', 6.5, 0.35)
  y += 9
  for (const ln of wrapText(seal, 'F1', 6.5, R_IW, 2)) {
    page.text(R_MX, y, ln, 'F1', 6.5, 0.15)
    y += 8.5
  }
  y += 4

  // verification QR
  if (extras.verifyUrl) {
    const qrSize = 84
    const qx = (R_W - qrSize) / 2
    const m = await qrMatrix(extras.verifyUrl, 'M')
    page.qr(qx, y, qrSize, m)
    y += qrSize + 8
    page.center(y, 're-scannez pour re-vérifier', 'F1', 6.5, 0.35)
    y += 8
    page.center(y, 'ce paiement sur la chaîne', 'F1', 6.5, 0.35)
    y += 10
  }

  dashedRule(page, y)
  y += 10

  // honesty footer
  for (const ln of wrapText(
    'Reçu généré localement dans votre navigateur — aucune donnée envoyée à un serveur. Montants RingCT chiffrés sur la chaîne : le montant exact se vérifie dans le wallet du destinataire.',
    'F1', 6.3, R_IW, 6,
  )) {
    page.center(y, ln, 'F1', 6.3, 0.3)
    y += 8
  }
  y += 6
  page.center(y, 'xelisvault.network', 'F2', 8)
  y += 12

  // finalize with the real height
  const H = y
  const finalPage = new Page(R_W, H)
  finalPage.prims = page.prims
  return serializePdf([{ w: R_W, h: H, ops: pageContentOps(finalPage) }])
}

/* ─────────────── price-tag sheets (A4, 2 x 5) ─────────────── */

export interface TagSpec {
  /** product name, printed bold */
  name: string
  /** atomic XNV amount (string) */
  amountAtomic: string
  /** optional fiat equivalent, display only */
  eur?: string
  /** unique payment reference carried by the tag QR */
  pid: string
  /** receiving address */
  address: string
  /** merchant name */
  merchantName?: string
}

const A4_W = 595.28
const A4_H = 841.89
const TAG_W = 260
const TAG_H = 148
const TAG_GX = 24
const TAG_GY = 14
const TAG_MX = (A4_W - 2 * TAG_W - TAG_GX) / 2
const TAG_MY = 28

export async function buildTagsPdf(tags: TagSpec[]): Promise<Uint8Array> {
  const pages: { w: number; h: number; ops: string }[] = []
  const perPage = 10

  for (let base = 0; base < tags.length; base += perPage) {
    const batch = tags.slice(base, base + perPage)
    const page = new Page(A4_W, A4_H)

    // QR matrices are generated up-front (async), then drawn synchronously
    const qrs = await Promise.all(batch.map((tag) => {
      const uri = `nerva:${tag.address}?tx_amount=${atomicToDisplay(tag.amountAtomic)}&tx_payment_id=${tag.pid}&tx_description=${encodeURIComponent(tag.name.slice(0, 60))}`
      return qrMatrix(uri, 'M')
    }))

    batch.forEach((tag, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = TAG_MX + col * (TAG_W + TAG_GX)
      const yTop = TAG_MY + row * (TAG_H + TAG_GY)

      // cut line
      page.rectOutline(x, yTop, TAG_W, TAG_H, 0.55, 0.6, [3, 2])

      // QR: nerva: URI (wallet-native), left side of the tag
      const qrSize = 100
      const qx = x + 22
      const qy = yTop + (TAG_H - qrSize) / 2
      page.qr(qx, qy, qrSize, qrs[i])

      // right column text
      const tx = x + 22 + qrSize + 18
      const tw = TAG_W - (22 + qrSize + 18) - 16
      let ty = yTop + 20

      for (const ln of wrapText(tag.name.toUpperCase(), 'F4', 13, tw, 2)) {
        page.text(tx, ty, ln, 'F4', 13)
        ty += 16
      }
      ty += 6
      const price = `${atomicToDisplay(tag.amountAtomic)} XNV`
      page.text(tx, ty, price, 'F4', 17)
      ty += 21
      if (tag.eur) {
        page.text(tx, ty, `~ ${tag.eur} EUR`, 'F3', 10.5, 0.35)
        ty += 13
      }
      ty += 4
      page.text(tx, ty, 'Scannez pour payer en NERVA', 'F3', 8, 0.25)
      ty += 11
      page.text(tx, ty, 'wallet NervaOne, CLI ou compatible', 'F3', 6.5, 0.4)
      ty += 9

      // footer strip inside the tag
      page.text(x + 16, yTop + TAG_H - 16, (tag.merchantName ? `${tag.merchantName} · ` : '') + 'XelisVault NervaLink', 'F3', 6.5, 0.4)
      page.text(x + TAG_W - 16 - textWidth(`réf ${shortenHash(tag.pid, 8, 4)}`, 'F3', 6.5), yTop + TAG_H - 16, `réf ${shortenHash(tag.pid, 8, 4)}`, 'F3', 6.5, 0.4)
    })

    pages.push({ w: A4_W, h: A4_H, ops: pageContentOps(page) })
  }

  return serializePdf(pages)
}

/* ─────────────── browser helpers (DOM, deliberately separate) ─────────────── */

export function pdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(pdfBlob(bytes))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 8000)
}

/** print via a hidden iframe; falls back to opening the blob in a new tab */
export function printPdf(bytes: Uint8Array) {
  const url = URL.createObjectURL(pdfBlob(bytes))
  try {
    const f = document.createElement('iframe')
    f.style.position = 'fixed'
    f.style.right = '0'
    f.style.bottom = '0'
    f.style.width = '0'
    f.style.height = '0'
    f.style.border = '0'
    f.src = url
    f.onload = () => {
      try {
        f.contentWindow?.focus()
        f.contentWindow?.print()
      } catch {
        window.open(url, '_blank')
      }
      setTimeout(() => { f.remove(); URL.revokeObjectURL(url) }, 60000)
    }
    document.body.appendChild(f)
  } catch {
    window.open(url, '_blank')
  }
}
