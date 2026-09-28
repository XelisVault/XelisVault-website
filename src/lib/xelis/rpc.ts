// XELIS JSON-RPC client (browser) — reads from public XELIS nodes.
// Port of the CLI's _post/_is_transient/_with_retries logic (protocol.py).
//
// IMPORTANT RPC quirks (verified live):
//  - get_info takes NO params (sending {} → UNEXPECTED_PARAMS on some versions)
//  - public nodes may answer HTML (rate limit) → retry with backoff
//  - "nonce already used" / "expected" → transient, retry
//  - "not enough funds" → permanent error
//  - batch_limit = 20 on the public nodes
//
// Networks: every call can target mainnet or testnet (opts.network).
// The Vault app defaults to testnet; the Observatory explorer defaults to
// mainnet (see networks.ts).

import { NetworkId, NETWORKS, networkConfig } from './networks'

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

/** Resolve the HTTP endpoint for a call (defaults to testnet for app modules). */
function endpointFor(net?: NetworkId): string {
  return net ? NETWORKS[net].http : PUBLIC_NODE_HTTP
}

export async function rpcCall<T = any>(
  method: string,
  params?: Record<string, any> | any[],
  opts: { retries?: number; cacheTtlMs?: number; network?: NetworkId } = {}
): Promise<T> {
  const { retries = 3, cacheTtlMs = 0, network } = opts
  const cacheKey = cacheTtlMs > 0 ? `${network ?? 'testnet'}:${method}:${JSON.stringify(params ?? null)}` : ''

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
      const res = await fetch(endpointFor(network), {
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

// ---- JSON-RPC batch (verified live: node.xelis.io answers arrays, batch_limit = 20) ----

export interface BatchCall {
  method: string
  params?: Record<string, any> | any[]
}

export interface BatchResult {
  result?: any
  error?: { message: string }
}

/** Max requests per batched POST (public nodes: `batch_limit` = 20). */
export const BATCH_LIMIT = 20

/**
 * Send up to BATCH_LIMIT JSON-RPC requests in ONE HTTP POST.
 * Responses are matched by id (order is NOT guaranteed). Per-item errors are
 * returned as { error } entries, never thrown — the caller decides what a
 * failed cell means. Transport failures (5xx / HTML / network) retry the
 * whole batch with backoff, then throw.
 */
async function rpcBatchOnce(
  calls: BatchCall[],
  network?: NetworkId,
): Promise<BatchResult[]> {
  if (calls.length === 0) return []
  const payload = calls.map((c, i) => {
    const req: Record<string, any> = { jsonrpc: '2.0', id: 1000 + i, method: c.method }
    if (c.params !== undefined && c.method !== 'get_info') req.params = c.params
    return req
  })
  await rateLimitGate() // ONE gate per HTTP request, not per cell
  const res = await fetch(endpointFor(network), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok && res.status >= 500) throw new RPCError(`batch: HTTP ${res.status}`, true)
  let data: any
  try {
    data = await res.json()
  } catch {
    // HTML response (rate limit / CF) → transient
    throw new RPCError('batch: non-JSON response (rate limited?)', true)
  }
  if (!Array.isArray(data)) {
    // Some proxies strip JSON-RPC batching — bail out to the sequential path
    throw new RPCError('batch: response is not an array', false)
  }
  const byId = new Map<number, BatchResult>()
  for (const item of data) {
    if (item && typeof item.id === 'number') {
      byId.set(item.id, item.error ? { error: item.error } : { result: item.result })
    }
  }
  return calls.map((_, i) => byId.get(1000 + i) ?? { error: { message: 'missing batch response' } })
}

/**
 * Batched sweep for ANY calls (block ranges, tx lookups…). Any number of
 * calls; misses are fetched in chunks of BATCH_LIMIT with retries, in
 * chunk-parallel waves when the caller passes more than one chunk. If the
 * endpoint refuses batches, falls back to individual rpcCalls. Returns one
 * entry per input call, in input order — { result } or { error }, never
 * throws.
 */
export async function rpcBatchCached(
  calls: BatchCall[],
  opts: { retries?: number; network?: NetworkId } = {},
): Promise<BatchResult[]> {
  const { retries = 2, network } = opts
  const out: BatchResult[] = new Array(calls.length)
  const missIdx: number[] = calls.map((_, i) => i)

  // fetch misses in batches of BATCH_LIMIT, up to 3 POSTs concurrently
  const chunks: number[][] = []
  for (let m = 0; m < missIdx.length; m += BATCH_LIMIT) {
    chunks.push(missIdx.slice(m, m + BATCH_LIMIT))
  }
  for (let g = 0; g < chunks.length; g += 3) {
    const group = chunks.slice(g, g + 3)
    await Promise.all(group.map(async (chunkIdx) => {
      const chunk = chunkIdx.map((i) => calls[i])
      let settled = false
      for (let attempt = 0; attempt < Math.max(1, retries) && !settled; attempt++) {
        try {
          const res = await rpcBatchOnce(chunk, network)
          res.forEach((r, k) => { out[chunkIdx[k]] = r })
          settled = true
        } catch (e: any) {
          const transient = e instanceof RPCError ? e.transient : true
          if (!transient || attempt === Math.max(1, retries) - 1) {
            // Batch refused / dead — sequential fallback so a bad proxy never
            // breaks a whole sweep
            const results = await Promise.all(
              chunk.map((c) =>
                rpcCall(c.method, c.params, { retries: 1, network })
                  .then((result) => ({ result }))
                  .catch((error) => ({ error: { message: String(error?.message ?? error) } })),
              ),
            )
            results.forEach((r, k) => { out[chunkIdx[k]] = r })
            settled = true
          } else {
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
          }
        }
      }
    }))
  }
  return out
}

// Convenience wrappers -------------------------------------------------

export async function getTopoheight(net?: NetworkId): Promise<number> {
  return rpcCall<number>('get_topoheight', undefined, { retries: 2, cacheTtlMs: 4000, network: net })
}

/** Network-aware chain info (the explorer uses this with its active network). */
export async function getChainInfo(net: NetworkId): Promise<NetworkInfo> {
  return rpcCall<NetworkInfo>('get_info', undefined, { retries: 2, cacheTtlMs: 5000, network: net })
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

// Deep links into the OFFICIAL explorer — follow the explorer's active network
// (mainnet by default; see networks.ts).

export function explorerTxUrl(txHash: string): string {
  return `${networkConfig().explorer}/?tab=tx#tx=${txHash}`
}

export function explorerAddressUrl(address: string): string {
  return `${networkConfig().explorer}/?tab=account#account=${address}`
}

export function explorerContractUrl(hash: string): string {
  return `${networkConfig().explorer}/?tab=contract#contract=${hash}`
}

/** Exposed for diagnostics only */
export function getRPCStats() {
  return { totalRequests: requestCounter, cacheSize: cache.size }
}
