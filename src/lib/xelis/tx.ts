// Transaction lifecycle helpers — port of the CLI's wait_confirm / revert_reason.
//
// Key insights from the CLI (protocol.py / xvault.py):
//  - After broadcast, poll daemon get_transaction every ~3s until it appears
//    (executed_in_block / topoheight present). Timeout ~120s.
//  - A MINED transaction can still have REVERTED: contract logs are written
//    asynchronously. Poll get_contract_logs(tx_hash) up to ~8s and look for
//    { type: "exit_error", value: { err: { message } } }.
//  - "not enough funds" is permanent; nonce errors are transient.

import { rpcCall } from './rpc'

export interface TxStatus {
  hash: string
  state: 'pending' | 'executed' | 'reverted' | 'not_found' | 'timeout'
  topoheight?: number
  blockHash?: string
  revertReason?: string
}

export async function waitForTransaction(
  hash: string,
  opts: { timeoutMs?: number; pollMs?: number; onPoll?: (elapsed: number) => void } = {}
): Promise<TxStatus> {
  const { timeoutMs = 120_000, pollMs = 3000 } = opts
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const tx = await rpcCall<any>('get_transaction', { hash }, { retries: 1 })
      if (tx && (tx.executed_in_block || tx.topoheight != null || tx.block_topoheight != null)) {
        // Executed — check for a revert (logs land asynchronously)
        const revert = await getRevertReason(hash)
        if (revert) {
          return { hash, state: 'reverted', revertReason: revert, topoheight: tx.block_topoheight ?? tx.topoheight }
        }
        return {
          hash,
          state: 'executed',
          topoheight: tx.block_topoheight ?? tx.topoheight,
          blockHash: tx.executed_in_block,
        }
      }
    } catch (e: any) {
      const msg = String(e?.message || '')
      if (msg.includes('not found')) {
        // still in mempool — keep waiting
      } else if (msg.includes('not enough funds')) {
        return { hash, state: 'reverted', revertReason: 'Not enough funds' }
      }
    }
    opts.onPoll?.(Date.now() - start)
    await new Promise((r) => setTimeout(r, pollMs))
  }
  return { hash, state: 'timeout' }
}

/** Returns the contract revert message if the tx failed, null otherwise. */
export async function getRevertReason(hash: string, waitMs = 8000): Promise<string | null> {
  const start = Date.now()
  while (Date.now() - start < waitMs) {
    let logs: any[] = []
    try {
      const res = await rpcCall<any>('get_contract_logs', { caller: hash }, { retries: 1 })
      logs = Array.isArray(res) ? res : []
    } catch {
      logs = []
    }
    for (const log of logs) {
      if (log?.type === 'exit_error') {
        const err = log.value?.err?.message ?? log.value?.err?.error ?? log.value?.err
        if (err) return String(err)
      }
    }
    if (logs.length > 0) return null // logs landed, no exit_error
    await new Promise((r) => setTimeout(r, 1500))
  }
  return null
}

/** Human-friendly message for common XELIS Vault revert strings. */
export function humanizeRevert(reason: string): string {
  const r = reason.toLowerCase()
  const map: Array<[string, string]> = [
    ['insstake', 'Insufficient stake: the minimum miner stake is 1,000 VLT'],
    ['notminer', 'You are not a registered miner'],
    ['alreadysub', 'Already submitted in this cycle'],
    ['toosoon', 'Too soon: cooldown or rate limit in effect'],
    ['oorange', 'Value out of allowed range'],
    ['cbpaused', 'Circuit breaker paused: volatility too high'],
    ['insliquidity', 'Insufficient liquidity for this operation'],
    ['notenough', 'Not enough funds for fees + deposits'],
    ['minout', 'Minimum output not reached (slippage protection)'],
    ['notadmin', 'Admin-only entry'],
    ['paused', 'Contract is paused'],
    ['crtoolow', 'Collateral ratio too low (minimum 200%)'],
    ['vaultnotfound', 'Vault not found'],
    ['notowner', 'You are not the owner of this vault'],
    ['nonce', 'Nonce error, please retry'],
    ['selfaccept', 'You cannot accept your own offer'],
    ['alreadyvoted', 'Already voted on this proposal'],
    ['locked', 'Position is locked'],
    ['cliffnotpassed', 'Vesting cliff not passed yet'],
    ['executed', 'Already executed'],
    ['ratelimit', 'Rate limited, wait before retrying'],
    ['notrelayer', 'Not a registered relayer'],
    ['insfaucetxel', 'Faucet XEL reserve too low'],
    ['maxsupply', 'Maximum supply reached'],
  ]
  for (const [needle, msg] of map) {
    if (r.includes(needle)) return msg
  }
  return reason
}
