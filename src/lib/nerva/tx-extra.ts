/**
 * tx_extra parser — CryptoNote TLV structure, verified against nerva source
 * (src/cryptonote_basic/tx_extra.h) and a real coinbase fixture:
 *
 *   0x00 : padding (N zero bytes)
 *   0x01 : tx pubkey (32 bytes) — always present, used for DH derivation
 *   0x02 : nonce (varint length + payload):
 *            0x00 + 32 bytes  → LONG payment id, in clear
 *            0x01 + 8 bytes   → SHORT payment id, encrypted
 *   0x03 : merge mining tag
 *   0x04 : additional pubkeys
 *
 * The explorer API returns `extra` already parsed as a byte array.
 */

export interface ParsedTxExtra {
  txPubkey: Uint8Array | null
  /** long payment id (64 hex chars) found in clear — null if absent */
  paymentIdLong: string | null
  /** short/encrypted payment id raw bytes (8) — needs view key to decrypt */
  paymentIdShort: Uint8Array | null
  mergeMining: boolean
  additionalPubkeys: boolean
}

export function bytesToHex(bytes: Uint8Array | number[]): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function readVarint(bytes: number[], offset: number): [value: number, bytesRead: number] {
  let result = 0
  let shift = 0
  let i = offset
  while (i < bytes.length) {
    const b = bytes[i]
    result |= (b & 0x7f) << shift
    i++
    if ((b & 0x80) === 0) break
    shift += 7
    if (shift > 35) break // guard against malformed varints
  }
  return [result, i - offset]
}

export function parseTxExtra(extra: number[] | Uint8Array | undefined | null): ParsedTxExtra {
  const out: ParsedTxExtra = {
    txPubkey: null,
    paymentIdLong: null,
    paymentIdShort: null,
    mergeMining: false,
    additionalPubkeys: false,
  }
  if (!extra || extra.length === 0) return out
  const bytes = Array.from(extra)

  let i = 0
  while (i < bytes.length) {
    const tag = bytes[i]
    i++
    if (tag === 0x01) {
      if (i + 32 <= bytes.length) out.txPubkey = Uint8Array.from(bytes.slice(i, i + 32))
      i += 32
    } else if (tag === 0x02) {
      const [len, n] = readVarint(bytes, i)
      i += n
      const nonce = bytes.slice(i, i + len)
      i += len
      if (nonce.length > 0) {
        if (nonce[0] === 0x00 && nonce.length >= 33) {
          out.paymentIdLong = bytesToHex(nonce.slice(1, 33))
        } else if (nonce[0] === 0x01 && nonce.length >= 9) {
          out.paymentIdShort = Uint8Array.from(nonce.slice(1, 9))
        }
      }
    } else if (tag === 0x00) {
      while (i < bytes.length && bytes[i] === 0x00) i++
    } else if (tag === 0x03) {
      out.mergeMining = true
      const [len, n] = readVarint(bytes, i)
      i += n + len
    } else if (tag === 0x04) {
      out.additionalPubkeys = true
      const [len, n] = readVarint(bytes, i)
      i += n + len
    } else {
      break // unknown tag — stop parsing (defensive)
    }
  }
  return out
}
