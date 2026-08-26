// Central contract invocation helper.
// Resolves: contract name → live hash (registry) and entry fn → compiled chunk ID,
// then builds the invoke_contract transaction through XSWD and tracks it.

import { resolveContract } from './contracts'
import { entryId } from './chunk-ids'
import { getXSWDClient } from './xswd'
import { waitForTransaction, humanizeRevert, type TxStatus } from './tx'
import { VLT_ASSET, XEL_ASSET, XUSD_ASSET } from './contracts'
import type { ValueCell } from './types'

// Gas presets (from the CLI's constants: simple=500k, standard=5M, heavy=10M+)
export const GAS = {
  SIMPLE: 500_000,
  STANDARD: 5_000_000,
  HEAVY: 10_000_000,
  VERY_HEAVY: 20_000_000,
  EXTREME: 30_000_000,
} as const

export interface InvokeOptions {
  params?: ValueCell[]
  deposits?: Record<string, { amount: bigint | number; private?: boolean }>
  maxGas?: number
  fee?: number            // atomic XEL (default 1_000_000 = 0.01 XEL)
  permission?: 'none' | 'all'
  wait?: boolean          // wait for confirmation & revert check (default true)
}

export interface InvokeResult extends TxStatus {
  ok: boolean
  error?: string          // humanized error
}

/**
 * Invoke a contract entry by NAME (e.g. invoke('PSM', 'mint', {...})).
 * Requires an active XSWD connection — the wallet signs and broadcasts.
 */
export async function invoke(contractName: string, fn: string, opts: InvokeOptions = {}): Promise<InvokeResult> {
  const xswd = getXSWDClient()
  if (xswd.state !== 'connected') {
    return { hash: '', state: 'reverted', ok: false, error: 'Wallet not connected' }
  }

  const [contract, eid] = await Promise.all([
    resolveContract(contractName),
    Promise.resolve(entryId(contractName, fn)),
  ])
  if (eid < 0) {
    return { hash: '', state: 'reverted', ok: false, error: `Unknown entry: ${contractName}.${fn}` }
  }

  try {
    const hash = await xswd.invokeContract({
      contract,
      entryId: eid,
      parameters: opts.params ?? [],
      deposits: opts.deposits,
      maxGas: opts.maxGas ?? GAS.STANDARD,
      fee: opts.fee ?? 1_000_000,
      permission: opts.permission ?? 'all',
    })

    if (opts.wait === false) {
      return { hash, state: 'pending', ok: true }
    }

    const status = await waitForTransaction(hash)
    const ok = status.state === 'executed'
    return {
      ...status,
      ok,
      error: ok ? undefined : status.state === 'reverted'
        ? humanizeRevert(status.revertReason ?? 'Transaction reverted')
        : status.state === 'timeout'
          ? 'Transaction is still pending — check the explorer in a moment'
          : 'Transaction not found',
    }
  } catch (e: any) {
    const raw = String(e?.message || 'Transaction failed')
    return { hash: '', state: 'reverted', ok: false, error: humanizeRevert(raw) }
  }
}

/** Convenience: VLT deposit builder (used by miner register, governance stake, …) */
export function depositVlt(amountAtomic: bigint | number) {
  return { [VLT_ASSET]: { amount: amountAtomic } }
}

/** Convenience: XEL deposit builder (vault collateral, PSM mint, …) */
export function depositXel(amountAtomic: bigint | number) {
  return { [XEL_ASSET]: { amount: amountAtomic } }
}

/** Convenience: xUSD deposit builder (repay, PSM redeem, savings, …) */
export function depositXusd(amountAtomic: bigint | number) {
  return { [XUSD_ASSET]: { amount: amountAtomic } }
}
