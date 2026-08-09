/**
 * XELIS Mnemonic Module
 * Faithful TypeScript port of xelis_wallet/src/mnemonics/mod.rs
 *
 * XELIS uses a custom 25-word mnemonic scheme (NOT BIP39):
 *  - 24 words carry the 32-byte private key (8 groups of 3 words = 24 words)
 *  - 1 word is a CRC32 checksum
 *  - Each 4-byte chunk of the key → 3 words via modular arithmetic on a 1626-word list
 *  - Checksum = CRC32(prefix chars of all 24 words) % 24
 *
 * Source: xelis-blockchain/xelis_wallet/src/mnemonics/mod.rs
 *
 * IMPORTANT: This module ONLY converts between bytes ↔ words. It does NOT
 * derive the public key or address — that requires Ristretto255 scalar
 * inversion, which we delegate to the daemon (Phase 1) or WASM (Phase 2).
 */

import wordlist from './english-wordlist.json'

const WORDS_LIST = 1626
const KEY_SIZE = 32
const SEED_LENGTH = 24 // 24 data words + 1 checksum word = 25 total
const PREFIX_LENGTH = 3 // English prefix length for checksum

assert(wordlist.length === WORDS_LIST, `Wordlist must have ${WORDS_LIST} words, got ${wordlist.length}`)

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

// Standard CRC32 (IEEE 802.3 polynomial 0xEDB88320) — matches Rust's crc32fast::hash.
// Precomputed table for performance.
const CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c
  }
  return table
})()

function crc32(bytes: Uint8Array): bigint {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  // crc32fast::hash returns u32, so we mask to 32 bits and invert (standard final XOR)
  return BigInt((crc ^ 0xffffffff) >>> 0)
}

/**
 * Calculate the checksum index for the 24 data words.
 * Uses the first `PREFIX_LENGTH` characters of each word, concatenated,
 * then CRC32'd, then mod 24.
 *
 * Direct port of calculate_checksum_index() in mod.rs
 */
function calculateChecksumIndex(words: string[]): number {
  if (words.length !== SEED_LENGTH) {
    throw new Error(`Expected ${SEED_LENGTH} words, got ${words.length}`)
  }

  const chars: string[] = []
  for (const word of words) {
    const lower = word.toLowerCase()
    const prefix = lower.slice(0, PREFIX_LENGTH)
    chars.push(prefix)
  }
  const value = chars.join('')
  const checksum = crc32(new TextEncoder().encode(value))
  return Number(checksum % BigInt(SEED_LENGTH))
}

/**
 * Convert a 32-byte private key to a 25-word mnemonic (English).
 *
 * Direct port of key_to_words_with_language() in mod.rs
 *
 * Algorithm:
 *   For each 4-byte chunk (little-endian u32) of the key:
 *     a = val % 1626
 *     b = ((val / 1626) + a) % 1626
 *     c = ((val / 1626 / 1626) + b) % 1626
 *   → 3 words from the wordlist
 *   Then append a checksum word.
 */
export function privateKeyToMnemonic(privateKey: Uint8Array): string[] {
  if (privateKey.length !== KEY_SIZE) {
    throw new Error(`Private key must be ${KEY_SIZE} bytes, got ${privateKey.length}`)
  }

  const dataWords: string[] = []
  // 8 groups of 4 bytes → 8 × 3 = 24 words
  for (let i = 0; i < KEY_SIZE; i += 4) {
    const val = privateKey[i]
      | (privateKey[i + 1] << 8)
      | (privateKey[i + 2] << 16)
      | (privateKey[i + 3] << 24)
    // Use BigInt for the divisions to avoid float precision issues with large u32
    const valBig = BigInt(val >>> 0) // unsigned
    const wlBig = BigInt(WORDS_LIST)

    const a = Number(valBig % wlBig)
    const b = Number(((valBig / wlBig) + BigInt(a)) % wlBig)
    const c = Number(((valBig / wlBig / wlBig) + BigInt(b)) % wlBig)

    dataWords.push(wordlist[a])
    dataWords.push(wordlist[b])
    dataWords.push(wordlist[c])
  }

  // Append checksum word (25th word = duplicate of one of the 24)
  const checksumIdx = calculateChecksumIndex(dataWords)
  const checksumWord = dataWords[checksumIdx]
  return [...dataWords, checksumWord]
}

/**
 * Convert a 24 or 25 word mnemonic back to a 32-byte private key.
 *
 * Direct port of words_to_key() in mod.rs
 *
 * Accepts 24 words (no checksum) or 25 words (with checksum).
 * If 25 words, the checksum is verified.
 */
export function mnemonicToPrivateKey(words: string[]): Uint8Array {
  if (words.length !== SEED_LENGTH && words.length !== SEED_LENGTH + 1) {
    throw new Error(`Expected ${SEED_LENGTH} or ${SEED_LENGTH + 1} words, got ${words.length}`)
  }

  // Find word indices in the English wordlist
  const indices: number[] = []
  const lookup = new Map<string, number>()
  for (let i = 0; i < wordlist.length; i++) lookup.set(wordlist[i], i)

  for (let i = 0; i < SEED_LENGTH; i++) {
    const word = words[i].trim().toLowerCase()
    const idx = lookup.get(word)
    if (idx === undefined) {
      throw new Error(`Unknown word at position ${i + 1}: "${words[i]}"`)
    }
    indices.push(idx)
  }

  // Verify checksum if we have 25 words
  if (words.length === SEED_LENGTH + 1) {
    const expectedChecksumIdx = calculateChecksumIndex(words.slice(0, SEED_LENGTH).map(w => w.trim()))
    const expectedChecksumWord = words[expectedChecksumIdx].trim().toLowerCase()
    const providedChecksumWord = words[SEED_LENGTH].trim().toLowerCase()
    if (expectedChecksumWord !== providedChecksumWord) {
      throw new Error(
        `Invalid checksum word. Expected "${words[expectedChecksumIdx]}", got "${words[SEED_LENGTH]}". ` +
        `This seed phrase has a typo or is from a different wordlist.`
      )
    }
  }

  // Reverse the modular arithmetic: 3 indices → 4 bytes
  // val = a + 1626 * (((1626 - a) + b) % 1626) + 1626 * 1626 * (((1626 - b) + c) % 1626)
  const key = new Uint8Array(KEY_SIZE)
  for (let i = 0; i < SEED_LENGTH; i += 3) {
    const a = indices[i]
    const b = indices[i + 1]
    const c = indices[i + 2]

    const wlBig = BigInt(WORDS_LIST)
    const aBig = BigInt(a)
    const bBig = BigInt(b)
    const cBig = BigInt(c)

    const valBig =
      aBig +
      wlBig * ((wlBig - aBig + bBig) % wlBig) +
      wlBig * wlBig * ((wlBig - bBig + cBig) % wlBig)

    // Sanity check: val % WORDS_LIST should equal a
    if (Number(valBig % wlBig) !== a) {
      throw new Error(`Word list sanity check failed at word group ${i / 3 + 1}`)
    }

    const val = Number(valBig & BigInt(0xffffffff))
    // Write as little-endian u32
    const offset = (i / 3) * 4
    key[offset] = val & 0xff
    key[offset + 1] = (val >>> 8) & 0xff
    key[offset + 2] = (val >>> 16) & 0xff
    key[offset + 3] = (val >>> 24) & 0xff
  }

  return key
}

/**
 * Generate a fresh random 32-byte private key using the browser's
 * cryptographically secure random number generator (Web Crypto API).
 */
export function generateRandomPrivateKey(): Uint8Array {
  const key = new Uint8Array(KEY_SIZE)
  crypto.getRandomValues(key)
  // Ensure non-zero (PrivateKey::from_bytes rejects zero)
  if (key.every(b => b === 0)) {
    return generateRandomPrivateKey() // astronomically unlikely
  }
  return key
}

/**
 * Generate a fresh 25-word mnemonic.
 */
export function generateMnemonic(): string[] {
  return privateKeyToMnemonic(generateRandomPrivateKey())
}

/**
 * Validate a mnemonic phrase. Returns { valid, error }.
 */
export function validateMnemonic(words: string[]): { valid: boolean; error?: string } {
  try {
    if (words.length !== 25 && words.length !== 24) {
      return { valid: false, error: `Expected 24 or 25 words, got ${words.length}` }
    }
    mnemonicToPrivateKey(words)
    return { valid: true }
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Invalid mnemonic' }
  }
}

/**
 * Split a mnemonic string into words (handles spaces, newlines, commas).
 */
export function parseMnemonicString(input: string): string[] {
  return input
    .trim()
    .split(/[\s,]+/)
    .filter(w => w.length > 0)
}

/**
 * Join words into a display-friendly string (numbered for easy copying).
 */
export function formatMnemonicForDisplay(words: string[]): string {
  return words.map((w, i) => `${String(i + 1).padStart(2, ' ')}. ${w}`).join('\n')
}

/**
 * Join words into a single string (space-separated, for storage/transfer).
 */
export function mnemonicToString(words: string[]): string {
  return words.join(' ')
}
