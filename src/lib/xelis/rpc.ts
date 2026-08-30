// XELIS JSON-RPC client (browser) — reads from the public testnet node.
// Port of the CLI's _post/_is_transient/_with_retries logic (protocol.py).
//
// IMPORTANT RPC quirks (verified live):
//  - get_info takes NO params (sending {} → UNEXPECTED_PARAMS on some versions)
//  - public nodes may answer HTML (rate limit) → retry with backoff
//  - "nonce already used" / "expected" → transient, retry
//  - "not enough funds" → permanent error
//  - batch_limit = 20 on the public testnet node

export const PUBLIC_NODE_HTTP = 'https://testnet-node.xelis.io/json_rpc'
export const EXPLORER_URL = 'https://testnet-explorer.xelis.io'
export const FAUCET_URL = 'https://faucet.xelis.io'

class RPCError extends Error {
  transient: boolean
  constructor(message: string, transient = false) {
    super(message)
    this.transient = transient
  }
}

function isTransient(method: string, msg: string): boolean {
  const m = msg.toLowerCase()
  if (m.includes('nonce') && (m.includes('already used') || m.includes('expected'))) return true
  if (m.includes('proof verification error')) return true
  if (method === 'get_transaction' && m.includes('not found')) return false
  if (m.includes('contract not found')) return true
  return false
}

// ---- Tiny TTL cache for reads ----
const cache = new Map<string, { value: any; expires: number }>()

export function clearRPCCache(prefix?: string) {
  if (!prefix) { cache.clear(); return }
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k)
  }
}

let rpcId = 1
let requestCounter = 0
let lastRequestTimes: number[] = []

// Simple rate limiter: max 14 requests / 1s window (the public node comfortably
// handles 15+ parallel reads; we stay a notch under)
async function rateLimitGate(): Promise<void> {
  const now = Date.now()
  lastRequestTimes = lastRequestTimes.filter((t) => now - t < 1000)
  if (lastRequestTimes.length >= 14) {
    const wait = 1000 - (now - lastRequestTimes[0]) + 20
    await new Promise((r) => setTimeout(r, Math.max(wait, 30)))
    return rateLimitGate()
  }
  lastRequestTimes.push(Date.now())
}

export async function rpcCall<T = any>(
  method: string,
  params?: Record<string, any> | any[],
  opts: { retries?: number; cacheTtlMs?: number } = {}
): Promise<T> {
  const { retries = 3, cacheTtlMs = 0 } = opts
  const cacheKey = cacheTtlMs > 0 ? `${method}:${JSON.stringify(params ?? null)}` : ''

  if (cacheKey && cache.has(cacheKey)) {
    const hit = cache.get(cacheKey)!
    if (hit.expires > Date.now()) return hit.value
  }

  const payload: Record<string, any> = { jsonrpc: '2.0', id: rpcId++, method }
  // get_info must NOT carry params — see header note
  if (params !== undefined && !(method === 'get_info')) payload.params = params

  let lastError: Error | null = null
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await rateLimitGate()
      requestCounter++
      const res = await fetch(PUBLIC_NODE_HTTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok && res.status >= 500) throw new RPCError(`${method}: HTTP ${res.status}`, true)
      let data: any
      try {
        data = await res.json()
      } catch {
        // HTML response (rate limit / CF) → transient
        throw new RPCError(`${method}: non-JSON response (rate limited?)`, true)
      }
      if (data.error) {
        throw new RPCError(
          `${method}: ${data.error.message ?? JSON.stringify(data.error)}`,
          isTransient(method, data.error.message ?? '')
        )
      }
      const result = data.result
      if (cacheKey) cache.set(cacheKey, { value: result, expires: Date.now() + cacheTtlMs })
      return result as T
    } catch (e: any) {
      lastError = e
      const transient = e instanceof RPCError ? e.transient : true // network errors → retry
      if (!transient || attempt === retries - 1) break
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1) * (attempt + 1))) // quadratic backoff
    }
  }
  throw lastError ?? new Error(`${method}: failed`)
}

// Convenience wrappers -------------------------------------------------

export async function getTopoheight(): Promise<number> {
  return rpcCall<number>('get_topoheight', undefined, { retries: 2, cacheTtlMs: 4000 })
}

export interface NetworkInfo {
  average_block_time: number
  block_time_target: number
  height: number
  topoheight: number
  stable_topoheight: number
  circulating_supply: number
  emitted_supply: number
  burned_supply: number
  maximum_supply: number
  mempool_size: number
  network: string
  difficulty: string
  [k: string]: any
}

export async function getNetworkInfo(): Promise<NetworkInfo> {
  return rpcCall<NetworkInfo>('get_info', undefined, { retries: 2, cacheTtlMs: 5000 })
}

export async function getEstimatedFeeRates(): Promise<{ low: number; medium: number; high: number; default: number }> {
  return rpcCall('get_estimated_fee_rates', undefined, { retries: 2, cacheTtlMs: 30000 })
}

export function explorerTxUrl(txHash: string): string {
  return `${EXPLORER_URL}/?tab=tx#tx=${txHash}`
}

export function explorerAddressUrl(address: string): string {
  return `${EXPLORER_URL}/?tab=account#account=${address}`
}

export function explorerContractUrl(hash: string): string {
  return `${EXPLORER_URL}/?tab=contract#contract=${hash}`
}

/** Exposed for diagnostics only */
export function getRPCStats() {
  return { totalRequests: requestCounter, cacheSize: cache.size }
}
