/**
 * CryptoNote primitives for NERVA — TypeScript port of the C++ source.
 *
 * Every function below was written against the actual nerva-project/nerva
 * code (master, verified 2026-09-05), NOT from secondary documentation:
 *
 *   · base58 (8-byte big-endian blocks → 11 chars, '1' padding)
 *       — src/common/base58.cpp (encode_block / decode_block / encode_addr)
 *   · address checksum = first 4 bytes of keccak(varint(tag)+keys)
 *       — tools::base58::encode_addr
 *   · CRYPTONOTE_PUBLIC_ADDRESS_BASE58_PREFIX = 0x3800 (standard, "NV…")
 *   · INTEGRATED prefix = 0x7081, SUBADDRESS prefix = 0x1080
 *       — src/cryptonote_config.h
 *   · account: spend = random scalar (reduced mod l, nonzero);
 *     view = sc_reduce32(keccak(spend))                    — account.cpp L158-166
 *     (generate_keys with recover=true: sec = recovery_key, then sc_reduce32)
 *   · derivation = compress(8 · viewPriv · txPubKey)       — crypto.cpp L225
 *       (ge_scalarmult then ge_mul8, then ge_tobytes)
 *   · Hs(derivation, out_index) = sc_reduce32(keccak(derivation || varint(out_index)))
 *       — crypto.cpp L240 derivation_to_scalar (write_varint, LE 7-bit chunks)
 *   · output key = spendPub + Hs(...)·G                    — crypto.cpp L252
 *   · mnemonic: 1626-word English list (verified byte-identical to
 *     nerva english.h), 4 bytes → 3 words base-1626 with carry encoding,
 *     25th word = checksum (CRC-32 of concatenated 3-letter prefixes,
 *     index mod 24)                              — electrum-words.cpp
 *     ⚠ 4-byte groups are read/written LITTLE-ENDIAN (SWAP32LE of a native
 *     uint32 read — electrum-words.cpp L399/L332): byte 0 is the least
 *     significant. Verified against the C++ source; a big-endian read
 *     silently produces a different seed on restore in the official wallet.
 *     Base58 address blocks, by contrast, stay BIG-endian (base58.cpp).
 *
 * Group order l = 2^252 + 27742317777372353535851937790883648493
 * (identical to ed25519 Point order exposed by @noble/curves).
 *
 * All byte strings are little-endian scalars (CryptoNote convention).
 * This module never touches the network — safe for offline key generation.
 */

import { keccak_256 } from '@noble/hashes/sha3.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import { NERVA_WORDLIST } from './wordlist'

/* ───────────────────────── low level ───────────────────────── */

const L = ed25519.Point.Fn.ORDER // group order, as bigint
const G = ed25519.Point.BASE

export function keccak(data: Uint8Array): Uint8Array {
  return keccak_256(data)
}

export function bytesToHex(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += b.toString(16).padStart(2, '0')
  return s
}

export function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]*$/i.test(hex) || hex.length % 2 !== 0) return null
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const a of arrays) { out.set(a, off); off += a.length }
  return out
}

/** LE 7-bit-chunk varint (tools::write_varint / get_varint_data) */
export function encodeVarint(value: number | bigint): number[] {
  let v = BigInt(value)
  if (v < 0n) v = 0n
  const out: number[] = []
  while (v >= 0x80n) {
    out.push(Number(v & 0x7fn) | 0x80)
    v >>= 7n
  }
  out.push(Number(v))
  return out
}

/** sc_reduce32: interpret 32 LE bytes as an integer, reduce mod l, re-encode */
export function scReduce32(bytes: Uint8Array): Uint8Array {
  let v = 0n
  for (let i = bytes.length - 1; i >= 0; i--) v = (v << 8n) | BigInt(bytes[i])
  let reduced = v % L
  const out = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    out[i] = Number(reduced & 0xffn)
    reduced >>= 8n
  }
  return out
}

/** uniform random scalar < l, never zero (random32_unbiased + sc_reduce32) */
export function randomScalar(): Uint8Array {
  for (;;) {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    let v = 0n
    for (let i = 31; i >= 0; i--) v = (v << 8n) | BigInt(bytes[i])
    if (v === 0n || v >= L) continue
    const out = new Uint8Array(32)
    let r = v
    for (let i = 0; i < 32; i++) { out[i] = Number(r & 0xffn); r >>= 8n }
    return out
  }
}

/** secret → public key (ge_scalarmult_base, plain scalar mult, no clamping) */
export function secretKeyToPublicKey(secret: Uint8Array): Uint8Array {
  let v = 0n
  for (let i = 31; i >= 0; i--) v = (v << 8n) | BigInt(secret[i])
  if (v === 0n || v >= L) throw new Error('invalid secret key scalar (must be 1..l-1)')
  return G.multiply(v).toBytes()
}

/* ───────────────────────── base58 (tools/base58.cpp) ───────────────────────── */

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const ALPHABET_MAP: Record<string, number> = {}
for (let i = 0; i < ALPHABET.length; i++) ALPHABET_MAP[ALPHABET[i]] = i

/** chars produced by an n-byte partial block (n = 1..8) */
const ENCODED_BLOCK_SIZES = [0, 2, 3, 5, 6, 7, 9, 10, 11]
/** bytes produced by an n-char partial block (index = char count; -1 = invalid) */
const DECODED_BLOCK_SIZES: number[] = new Array(12).fill(-1)
for (let n = 0; n <= 8; n++) DECODED_BLOCK_SIZES[ENCODED_BLOCK_SIZES[n]] = n

const FULL_BLOCK = 8
const FULL_ENCODED = 11

function encodeBlock(block: Uint8Array): string {
  // big-endian value of the block, written as base58 digits right-to-left;
  // untouched leading positions stay '1' (zero digits)
  let num = 0n
  for (const b of block) num = (num << 8n) | BigInt(b)
  const size = ENCODED_BLOCK_SIZES[block.length]
  const chars = new Array<string>(size).fill(ALPHABET[0])
  let i = size - 1
  while (num > 0n) {
    chars[i] = ALPHABET[Number(num % 58n)]
    num /= 58n
    i--
  }
  return chars.join('')
}

function decodeBlock(block: string): Uint8Array | null {
  const resSize = DECODED_BLOCK_SIZES[block.length]
  if (resSize < 0) return null
  let num = 0n
  for (const ch of block) {
    const digit = ALPHABET_MAP[ch]
    if (digit === undefined) return null
    num = num * 58n + BigInt(digit)
  }
  // partial block must not exceed its byte width
  if (block.length < FULL_ENCODED && num >= 1n << BigInt(8 * resSize)) return null
  const out = new Uint8Array(resSize)
  for (let i = resSize - 1; i >= 0; i--) {
    out[i] = Number(num & 0xffn)
    num >>= 8n
  }
  return out
}

export function base58Encode(data: Uint8Array): string {
  if (data.length === 0) return ''
  const fullCount = Math.floor(data.length / FULL_BLOCK)
  const lastSize = data.length % FULL_BLOCK
  let out = ''
  for (let i = 0; i < fullCount; i++) {
    out += encodeBlock(data.slice(i * FULL_BLOCK, (i + 1) * FULL_BLOCK))
  }
  if (lastSize > 0) {
    out += encodeBlock(data.slice(fullCount * FULL_BLOCK))
  }
  return out
}

export function base58Decode(enc: string): Uint8Array | null {
  if (enc.length === 0) return new Uint8Array(0)
  const fullCount = Math.floor(enc.length / FULL_ENCODED)
  const lastSize = enc.length % FULL_ENCODED
  const lastDecoded = DECODED_BLOCK_SIZES[lastSize]
  if (lastSize > 0 && lastDecoded < 0) return null
  const total = fullCount * FULL_BLOCK + (lastSize > 0 ? lastDecoded : 0)
  const out = new Uint8Array(total)
  let off = 0
  for (let i = 0; i < fullCount; i++) {
    const b = decodeBlock(enc.slice(i * FULL_ENCODED, (i + 1) * FULL_ENCODED))
    if (!b) return null
    out.set(b, off); off += FULL_BLOCK
  }
  if (lastSize > 0) {
    const b = decodeBlock(enc.slice(fullCount * FULL_ENCODED))
    if (!b) return null
    out.set(b, off)
  }
  return out
}

/* ───────────────────────── addresses ───────────────────────── */

export const NERVA_ADDRESS_PREFIX = 0x3800n   // standard  (addresses start "NV")
export const NERVA_INTEGRATED_PREFIX = 0x7081n // integrated (short pid embedded)
export const NERVA_SUBADDRESS_PREFIX = 0x1080n

export interface DecodedAddress {
  tag: bigint
  /** 32-byte spend public key */
  spendPub: Uint8Array
  /** 32-byte view public key */
  viewPub: Uint8Array
  /** 8-byte payment id (integrated addresses only) */
  paymentId: Uint8Array | null
}

/** tools::base58::encode_addr — keccak checksum, base58 */
export function encodeAddress(
  spendPub: Uint8Array,
  viewPub: Uint8Array,
  tag: bigint = NERVA_ADDRESS_PREFIX,
  paymentId?: Uint8Array,
): string {
  const data = concat(
    Uint8Array.from(encodeVarint(tag)),
    spendPub,
    viewPub,
    ...(paymentId ? [paymentId] : []),
  )
  const checksum = keccak(data).slice(0, 4)
  return base58Encode(concat(data, checksum))
}

export function decodeAddress(addr: string): DecodedAddress | null {
  const raw = base58Decode(addr.trim())
  if (!raw) return null
  // decode varint tag
  let tag = 0n
  let shift = 0n
  let i = 0
  for (; i < raw.length; i++) {
    const b = raw[i]
    tag |= BigInt(b & 0x7f) << shift
    shift += 7n
    if ((b & 0x80) === 0) { i++; break }
    if (i > 8) return null
  }
  const body = raw.slice(i)
  if (body.length < 4) return null
  const payload = body.slice(0, body.length - 4)
  const checksum = body.slice(body.length - 4)
  if (payload.length !== 64 && payload.length !== 72) return null
  // verify keccak checksum
  const expect = keccak(concat(raw.slice(0, i), payload)).slice(0, 4)
  for (let c = 0; c < 4; c++) if (expect[c] !== checksum[c]) return null
  const spendPub = payload.slice(0, 32)
  const viewPub = payload.slice(32, 64)
  const paymentId = payload.length === 72 ? payload.slice(64) : null
  return { tag, spendPub, viewPub, paymentId }
}

/* ───────────────────────── wallet generation ───────────────────────── */

export interface NervaWallet {
  /** 32-byte secret spend key (LE) */
  spend: Uint8Array
  /** 32-byte secret view key (LE) */
  view: Uint8Array
  spendPub: Uint8Array
  viewPub: Uint8Array
  address: string
  /** 25 words (24 + checksum), Electrum-style */
  mnemonic: string[]
}

/** account_base::generate — view = sc_reduce32(keccak(spend)) */
export function generateWallet(): NervaWallet {
  const spend = randomScalar()
  const view = scReduce32(keccak(spend))
  const spendPub = secretKeyToPublicKey(spend)
  const viewPub = secretKeyToPublicKey(view)
  const address = encodeAddress(spendPub, viewPub)
  return { spend, view, spendPub, viewPub, address, mnemonic: bytesToMnemonic(spend) }
}

/** rebuild keys + address from a 25-word (or 24, no checksum) mnemonic */
export function walletFromMnemonic(words: string[]): NervaWallet | null {
  const seed = mnemonicToBytes(words)
  if (!seed) return null
  const spend = scReduce32(seed)
  const view = scReduce32(keccak(spend))
  const spendPub = secretKeyToPublicKey(spend)
  const viewPub = secretKeyToPublicKey(view)
  return { spend, view, spendPub, viewPub, address: encodeAddress(spendPub, viewPub), mnemonic: bytesToMnemonic(spend) }
}

/* ───────────────────────── mnemonic (electrum-words.cpp) ───────────────────────── */

/** CRC-32 (IEEE, same as boost::crc_32_type / zlib) */
export function crc32(data: Uint8Array | string): number {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  let crc = 0xffffffff
  for (const b of bytes) {
    crc ^= b
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

const WORD_INDEX: Record<string, number> = {}
for (let i = 0; i < NERVA_WORDLIST.length; i++) WORD_INDEX[NERVA_WORDLIST[i]] = i

const WL = 1626
const UNIQUE_PREFIX = 3

/** 4 bytes (LE u32 — SWAP32LE native read, electrum-words.cpp L399) → 3 words, base-1626 with carry */
function tripleToWords(w0: number): string[] {
  const w1 = w0 % WL
  const w2 = ((Math.floor(w0 / WL) + w1) % WL)
  const w3 = ((Math.floor(w0 / (WL * WL)) + w2) % WL)
  return [NERVA_WORDLIST[w1], NERVA_WORDLIST[w2], NERVA_WORDLIST[w3]]
}

/** 3 word indices → LE u32 (electrum-words.cpp words_to_bytes), unique decode */
function wordsToTriple(w1: number, w2: number, w3: number): number | null {
  const w0 = w1 + WL * (((WL - w1) + w2) % WL) + WL * WL * (((WL - w2) + w3) % WL)
  if (w0 > 0xffffffff) return null
  if (w0 % WL !== w1) return null // "mumble mumble" check
  return w0
}

export function bytesToMnemonic(bytes: Uint8Array): string[] {
  if (bytes.length === 0 || bytes.length % 4 !== 0) return []
  const words: string[] = []
  for (let i = 0; i < bytes.length / 4; i++) {
    // LITTLE-ENDIAN u32: SWAP32LE(*(uint32_t*)(src + i*4)) on LE hardware
    // — byte 0 is the least significant (electrum-words.cpp L399)
    const w0 = ((bytes[i * 4 + 3] << 24) | (bytes[i * 4 + 2] << 16) | (bytes[i * 4 + 1] << 8) | bytes[i * 4]) >>> 0
    words.push(...tripleToWords(w0))
  }
  // checksum: crc32 of the concatenated 3-letter prefixes, mod word count
  const prefixes = words.map((w) => w.slice(0, UNIQUE_PREFIX)).join('')
  const idx = crc32(prefixes) % words.length
  words.push(words[idx])
  return words
}

/** find a word by full spelling or unique 3-letter prefix */
function wordIndex(word: string): number | null {
  const w = word.trim().toLowerCase()
  if (WORD_INDEX[w] !== undefined) return WORD_INDEX[w]
  const hits: number[] = []
  for (let i = 0; i < NERVA_WORDLIST.length; i++) {
    if (NERVA_WORDLIST[i].slice(0, UNIQUE_PREFIX) === w.slice(0, UNIQUE_PREFIX)) hits.push(i)
  }
  return hits.length === 1 ? hits[0] : null
}

export function mnemonicToBytes(words: string[]): Uint8Array | null {
  const clean = words.map((w) => w.trim().toLowerCase()).filter((w) => w.length > 0)
  if (clean.length !== 24 && clean.length !== 25) return null
  const hasChecksum = clean.length === 25

  const indices: number[] = []
  for (const w of clean) {
    const idx = wordIndex(w)
    if (idx === null) return null
    indices.push(idx)
  }

  if (hasChecksum) {
    // checksum word must share its 3-letter prefix with words[crc % 24]
    const data = indices.slice(0, 24)
    const prefixes = data.map((i) => NERVA_WORDLIST[i].slice(0, UNIQUE_PREFIX)).join('')
    const expectIdx = crc32(prefixes) % 24
    if (NERVA_WORDLIST[indices[24]].slice(0, UNIQUE_PREFIX) !== NERVA_WORDLIST[data[expectIdx]].slice(0, UNIQUE_PREFIX)) {
      return null
    }
    indices.length = 24
  }

  const out = new Uint8Array(indices.length / 3 * 4)
  for (let i = 0; i < indices.length / 3; i++) {
    const w0 = wordsToTriple(indices[i * 3], indices[i * 3 + 1], indices[i * 3 + 2])
    if (w0 === null) return null
    const v = w0 >>> 0
    // LITTLE-ENDIAN write: w[0] = SWAP32LE(w[0]); dst.append(&w[0], 4)
    // — least significant byte first (electrum-words.cpp L332)
    out[i * 4] = v & 0xff
    out[i * 4 + 1] = (v >>> 8) & 0xff
    out[i * 4 + 2] = (v >>> 16) & 0xff
    out[i * 4 + 3] = (v >>> 24) & 0xff
  }
  return out
}

/* ───────────────────────── watch-only derivations (crypto.cpp) ───────────────────────── */

/**
 * generate_key_derivation: compress(8 · viewPriv · txPubKey).
 * Mirrors ge_scalarmult → ge_mul8 → ge_tobytes. Returns null when the
 * tx pubkey does not decompress to a valid point (ge_frombytes_vartime != 0).
 *
 * The math is symmetric (8 · sec · pub): pass (txPub, viewSec) to scan as
 * the receiver, or (viewPub, txSec) to verify as the payer.
 */
export function generateKeyDerivation(txPubKey: Uint8Array, viewPriv: Uint8Array): Uint8Array | null {
  try {
    let a = 0n
    for (let i = 31; i >= 0; i--) a = (a << 8n) | BigInt(viewPriv[i])
    const p = ed25519.Point.fromBytes(txPubKey).multiply(a).multiply(8n)
    return p.toBytes()
  } catch {
    return null
  }
}

/** device_default.cpp L41 — extra byte hashed with the derivation */
export const ENCRYPTED_PAYMENT_ID_TAIL = 0x8d

/**
 * XOR with the payment-id key: keccak(derivation || 0x8d)[0..8]
 * — device_default.cpp L339-354 encrypt_payment_id / decrypt_payment_id.
 * Encryption and decryption are the same symmetric XOR.
 */
export function cryptShortPaymentId(pid8: Uint8Array, derivation: Uint8Array): Uint8Array {
  const hash = keccak(concat(derivation, Uint8Array.of(ENCRYPTED_PAYMENT_ID_TAIL)))
  const out = new Uint8Array(8)
  for (let i = 0; i < 8; i++) out[i] = pid8[i] ^ hash[i]
  return out
}

/** derivation_to_scalar: sc_reduce32(keccak(derivation || varint(out_index))) */
export function derivationToScalar(derivation: Uint8Array, outputIndex: number): Uint8Array {
  const data = concat(derivation, Uint8Array.from(encodeVarint(outputIndex)))
  return scReduce32(keccak(data))
}

/**
 * derive_public_key: output key = spendPub + Hs(derivation, index)·G.
 * Watch-only: compare with the one-time key in vout[].target.key.
 */
export function deriveOutputKey(derivation: Uint8Array, outputIndex: number, spendPub: Uint8Array): Uint8Array | null {
  try {
    const s = derivationToScalar(derivation, outputIndex)
    let sv = 0n
    for (let i = 31; i >= 0; i--) sv = (sv << 8n) | BigInt(s[i])
    const base = ed25519.Point.fromBytes(spendPub)
    // Hs == 0 (probability ~2^-252) → output key equals the spend pubkey itself
    if (sv === 0n) return base.toBytes()
    return base.add(G.multiply(sv)).toBytes()
  } catch {
    return null
  }
}

/** check a secret view key against an address (viewPub == viewPriv·G) */
export function viewKeyMatches(viewPriv: Uint8Array, viewPub: Uint8Array): boolean {
  try {
    const derived = secretKeyToPublicKey(viewPriv)
    if (derived.length !== viewPub.length) return false
    for (let i = 0; i < 32; i++) if (derived[i] !== viewPub[i]) return false
    return true
  } catch {
    return false
  }
}

/** parse a 64-hex-char secret key string */
export function parseSecretKeyHex(hex: string): Uint8Array | null {
  const b = hexToBytes(hex.trim())
  if (!b || b.length !== 32) return null
  return b
}
