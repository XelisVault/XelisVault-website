// Explorer data layer — typed fetchers over the public XELIS nodes.
// All atomic amounts are integer units with 8 decimals (1 XET = 1e8).
// Timestamps in blocks are MILLISECONDS (verified live).
// Every fetcher targets the explorer's ACTIVE network (mainnet by default).

import { rpcCall } from './rpc'
import { getActiveNetwork, networkConfig } from './networks'

// ---- Types (coded against live daemon v1.25 responses) ----

export type BlockType = 'Normal' | 'Sync' | 'Side' | 'Orphaned'

export interface XelisBlock {
  block_type: BlockType
  cumulative_difficulty: string
  dev_reward: number
  difficulty: string
  extra_nonce: string
  hash: string
  height: number
  miner: string
  miner_reward: number
  nonce: number
  reward: number
  supply: number
  timestamp: number
  tips: string[]
  topoheight: number
  total_fees: number | null
  total_fees_burned: number | null
  total_size_in_bytes: number
  txs_hashes: string[]
  transactions?: XelisTransaction[]
  version: number
  event?: string // present on WS pushes
}

export type TxData =
  | { transfers: { asset: string; destination: string; extra_data?: any; commitment?: number[]; sender_handle?: number[]; receiver_handle?: number[] }[] }
  | { burn: { asset: string; amount: number } }
  | { multi_sig: { participants: string[]; threshold: number } }
  | { invoke_contract: { contract: string; deposits: Record<string, any>; entry_id: number; max_gas: number; parameters: any[]; permission: string } }
  | { deploy_contract: { module: string; invoke: any } }

export interface XelisTransaction {
  hash: string
  source: string
  fee: number
  fee_limit?: number
  fee_paid?: number
  fee_refund?: number
  size: number
  nonce: number
  version: number
  first_seen: number | null
  in_mempool: boolean
  executed_in_block?: string | null
  blocks?: string[]
  reference?: { hash: string; topoheight: number } | null
  multisig?: any
  data?: TxData
  range_proof?: any
  signature?: string
  source_commitments?: any[]
}

export interface PeerInfo {
  addr: string
  bytes_recv: number
  bytes_sent: number
  connected_on: number
  cumulative_difficulty: string
  height: number
  id: number
  last_ping: number
  local_port: number
  pruned_topoheight: number | null
  tag: string | null
  top_block_hash: string
  topoheight: number
  version: string
}

export interface AssetInfo {
  asset: string
  decimals: number
  max_supply: { fixed: number } | { mintable: number } | 'none' | string
  name: string
  ticker: string
  owner: 'none' | { creator?: any; owner?: any }
  topoheight: number
}

export const XEL_ASSET = '0'.repeat(64)
export const ATOMIC_DECIMALS = 8

// ---- Fetchers ----

const NET = () => getActiveNetwork()

export function getBlocksRangeByTopo(startTopo: number, endTopo: number, includeTxs = false): Promise<XelisBlock[]> {
  return rpcCall<XelisBlock[]>('get_blocks_range_by_topoheight', {
    start_topoheight: startTopo,
    end_topoheight: endTopo,
    include_txs: includeTxs,
  }, { retries: 2, network: NET() })
}

export function getBlockByHash(hash: string, includeTxs = false): Promise<XelisBlock> {
  return rpcCall<XelisBlock>('get_block_by_hash', { hash, include_txs: includeTxs }, { retries: 2, network: NET() })
}

export function getBlockAtTopo(topoheight: number, includeTxs = false): Promise<XelisBlock> {
  return rpcCall<XelisBlock>('get_block_at_topoheight', { topoheight, include_txs: includeTxs }, { retries: 2, network: NET() })
}

export function getBlocksAtHeight(height: number, includeTxs = false): Promise<XelisBlock[]> {
  return rpcCall<XelisBlock[]>('get_blocks_at_height', { height, include_txs: includeTxs }, { retries: 2, network: NET() })
}

export function getTxByHash(hash: string): Promise<XelisTransaction> {
  return rpcCall<XelisTransaction>('get_transaction', { hash }, { retries: 2, network: NET() })
}

export function getMempoolSummary(): Promise<{ total: number; transactions: any[] }> {
  return rpcCall('get_mempool_summary', undefined, { retries: 2, cacheTtlMs: 3000, network: NET() })
}

export function getFeeRates(): Promise<{ low: number; medium: number; high: number; default: number }> {
  return rpcCall('get_estimated_fee_rates', undefined, { retries: 2, cacheTtlMs: 30000, network: NET() })
}

export function getPeersList(): Promise<{ peers: PeerInfo[]; total_peers: number; hidden_peers: number }> {
  return rpcCall('get_peers', undefined, { retries: 2, cacheTtlMs: 10000, network: NET() })
}

export function getDifficultyInfo(): Promise<{ difficulty: string; hashrate: string; hashrate_formatted: string }> {
  return rpcCall('get_difficulty', undefined, { retries: 2, cacheTtlMs: 15000, network: NET() })
}

export function getAssetsList(): Promise<AssetInfo[]> {
  return rpcCall('get_assets', undefined, { retries: 2, cacheTtlMs: 120000, network: NET() })
}

export function getCount(kind: 'transactions' | 'accounts' | 'assets' | 'contracts'): Promise<number> {
  return rpcCall(`count_${kind}`, undefined, { retries: 2, cacheTtlMs: 30000, network: NET() })
}

export function getAddressNonce(address: string): Promise<{ nonce: number; topoheight: number; previous_topoheight: number }> {
  return rpcCall('get_nonce', { address }, { retries: 2, network: NET() })
}

export function getRegistrationTopoheight(address: string): Promise<number> {
  return rpcCall('get_account_registration_topoheight', { address }, { retries: 2, network: NET() })
}

export function getAccountAssets(address: string): Promise<string[]> {
  return rpcCall('get_account_assets', { address }, { retries: 2, network: NET() })
}

export function getEncryptedBalance(address: string, asset = XEL_ASSET): Promise<any> {
  return rpcCall('get_balance', { address, asset }, { retries: 1, network: NET() })
}

export function getAccountHistory(address: string): Promise<any[]> {
  return rpcCall('get_account_history', { address }, { retries: 1, network: NET() })
}

export function validateAddress(address: string): Promise<any> {
  return rpcCall('validate_address', { address, allow_integrated: true }, { retries: 1, network: NET() })
}

// ---- Explorer deep links (network-aware) ----

export function explorerBlockUrl(hash: string): string {
  return `${networkConfig().explorer}/block/${hash}`
}

export function explorerAssetUrl(asset: string): string {
  return `${networkConfig().explorer}/asset/${asset}`
}

// ---- Formatters ----

const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** atomic units → XET string, trimmed smartly (e.g. 0.48, 131,617.11) */
export function fmtXEL(atomics: number | string | null | undefined, opts: { group?: boolean; trim?: boolean } = {}): string {
  if (atomics === null || atomics === undefined) return '—'
  const n = typeof atomics === 'string' ? parseInt(atomics, 10) : atomics
  if (!isFinite(n)) return '—'
  const xel = n / 1e8
  if (opts.trim && Math.abs(xel) >= 1) return nf0.format(xel)
  return nf2.format(xel)
}

export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n)) return '—'
  return nf0.format(n)
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** address / hash → short form */
export function shortHash(h: string | null | undefined, head = 10, tail = 6): string {
  if (!h) return '—'
  if (h.length <= head + tail + 1) return h
  return `${h.slice(0, head)}…${h.slice(-tail)}`
}

export function fmtAge(timestampMs: number): string {
  const s = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${String(m % 60).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s % 60).padStart(2, '0')}s`
  return `${s}s`
}

/** fee rate (atomic/byte) → XEL per KB */
export function feeRateToXelPerKb(rate: number): string {
  return (rate / 1e8 * 1024).toFixed(4)
}

/** Decode tx `data` into a human description */
export function describeTxData(data?: TxData): { kind: string; summary: string; detail: string[] } {
  if (!data) return { kind: 'Unknown', summary: 'no payload', detail: [] }
  if ('transfers' in data) {
    const t = data.transfers
    return {
      kind: 'Transfer',
      summary: t.length === 1 ? `1 sealed transfer` : `${t.length} sealed transfers`,
      detail: t.map((x) => `${shortHash(x.destination, 12, 8)} · amount sealed`),
    }
  }
  if ('burn' in data) {
    return {
      kind: 'Burn',
      summary: `${fmtXEL(data.burn.amount)} XET burned`,
      detail: [`asset ${shortHash(data.burn.asset, 10, 6)}`],
    }
  }
  if ('invoke_contract' in data) {
    const ic = data.invoke_contract
    return {
      kind: 'Contract Call',
      summary: `entry #${ic.entry_id} · ${shortHash(ic.contract, 10, 6)}`,
      detail: [
        `max gas ${nf0.format(ic.max_gas)}`,
        `params ${ic.parameters?.length ?? 0} · permission ${ic.permission}`,
        Object.keys(ic.deposits ?? {}).length ? 'public deposits attached' : 'no public deposits',
      ],
    }
  }
  if ('deploy_contract' in data) {
    return { kind: 'Deploy', summary: `module ${shortHash(data.deploy_contract.module, 10, 6)}`, detail: [] }
  }
  if ('multi_sig' in data) {
    const ms = data.multi_sig
    return { kind: 'Multisig', summary: `threshold ${ms.threshold}/${ms.participants.length}`, detail: [] }
  }
  return { kind: 'Unknown', summary: 'unrecognized payload', detail: [] }
}
