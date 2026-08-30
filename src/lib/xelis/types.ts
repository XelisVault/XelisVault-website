// XELIS ValueCell — builders & parser
// Port of the official CLI's protocol.py (parse_cell + val_* builders).
// Storage keys/values and tx parameters are exchanged as JSON "ValueCell" trees.
// CRITICAL: u64/u128 arrive as STRINGS (64/128-bit safe) — parse with BigInt.

export type PrimitiveType =
  | 'null' | 'boolean' | 'u8' | 'u16' | 'u32' | 'u64' | 'u128' | 'u256'
  | 'string' | 'range' | 'opaque'

export interface ValueCell {
  type: 'primitive' | 'bytes' | 'object' | 'map'
  value: any
}

// ---- Builders (for tx parameters & storage keys) ----

function prim(type: PrimitiveType, value: any): ValueCell {
  return { type: 'primitive', value: { type, value } }
}

export const valU8 = (n: number | bigint | string): ValueCell => prim('u8', Number(n))
export const valU16 = (n: number | bigint | string): ValueCell => prim('u16', Number(n))
export const valU32 = (n: number | bigint | string): ValueCell => prim('u32', Number(n))
export const valU64 = (n: number | bigint | string): ValueCell => prim('u64', BigInt(n).toString())
export const valU128 = (n: number | bigint | string): ValueCell => prim('u128', BigInt(n).toString())
export const valBool = (b: boolean): ValueCell => prim('boolean', b)
export const valStr = (s: string): ValueCell => prim('string', s)
export const valHash = (h: string): ValueCell => prim('opaque', { type: 'Hash', value: h })
export const valAddr = (a: string): ValueCell => prim('opaque', { type: 'Address', value: a })
export const valBytes = (hex: string): ValueCell => ({ type: 'bytes', value: hex })
// An array parameter is encoded as an "object" cell containing the list
export const valArray = (cells: ValueCell[]): ValueCell => ({ type: 'object', value: cells })

// Storage key helpers
export const keyStr = (s: string): ValueCell => valStr(s)

// ---- Parser (storage reads → JS values) ----
// Returns: number | bigint | boolean | string | null | arrays of those.
export function parseCell(cell: any): any {
  if (cell == null) return null
  const t = cell.type
  if (t === 'primitive') {
    const v = cell.value ?? {}
    const vt = v.type
    const val = v.value
    switch (vt) {
      case 'u8': case 'u16': case 'u32':
        return Number(val)
      case 'u64': case 'u128': case 'u256': case 'amount': case 'balance': case 'nonce': case 'fee':
        // served as string for precision — keep as BigInt
        return BigInt(val)
      case 'boolean':
        return Boolean(val)
      case 'string':
        return val
      case 'opaque':
        // Hash / Address / PublicKey
        return val && typeof val === 'object' ? val.value : val
      case 'null':
        return null
      default:
        return val
    }
  }
  if (t === 'bytes') return cell.value // hex string
  if (t === 'object') {
    // Silex struct → ordered list of fields (decode by position)
    const items = cell.value ?? []
    return items.map((i: any) => parseCell(i))
  }
  if (t === 'map') {
    const pairs = cell.value ?? []
    const out: Record<string, any> = {}
    for (const pair of pairs) {
      if (Array.isArray(pair) && pair.length === 2) {
        out[String(parseCell(pair[0]))] = parseCell(pair[1])
      }
    }
    return out
  }
  return null
}

// ---- Amount formatting (all XELIS assets use 8 decimals) ----

export const DECIMALS = 8
export const ATOMIC = 100_000_000n

export function toAtomic(amount: number | string | bigint): bigint {
  // Input in human units (e.g. 1.5 XEL) → atomic bigint
  const s = typeof amount === 'string' ? amount : amount.toString()
  const [int, frac = ''] = s.split('.')
  const fracPadded = (frac + '0'.repeat(DECIMALS)).slice(0, DECIMALS)
  return BigInt(int + fracPadded)
}

export function fromAtomic(atomic: bigint | number | string | null | undefined): number {
  if (atomic == null) return 0
  try {
    const b = BigInt(atomic)
    return Number(b) / Number(ATOMIC)
  } catch {
    return 0
  }
}

export function formatAmount(atomic: bigint | number | string | null | undefined, maxFractionDigits = 2): string {
  const v = fromAtomic(atomic)
  return v.toLocaleString('en-US', { maximumFractionDigits: maxFractionDigits })
}

export function shortenHash(hash: string | null | undefined, size = 8): string {
  if (!hash) return ''
  return `${hash.slice(0, size)}...${hash.slice(-size)}`
}

export function shortenAddress(addr: string | null | undefined): string {
  if (!addr) return ''
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}
