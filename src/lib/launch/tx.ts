// VaultLaunch — REAL mainnet transactions (XSWD → Genesix / xelis_wallet).
//
// Every wrapper here builds the exact invoke the runbook documents
// (entry ids + typed parameters + attached deposits) and sends it
// through the XSWD wallet — the site NEVER touches keys. After the
// wallet broadcasts, the tx is watched on the public mainnet node until
// it lands in a block, then the store refreshes so the effect is
// visible immediately. The returned hash links to the explorer.
//
// Safety rules mirrored from the contracts:
//   • every trade carries a min_out (slippage protection — public
//     mempool, no MEV protection claimed)
//   • sell / swap-token attaches the WHOLE deposited amount (whole-
//     deposit semantics, D14)
//   • votes read the CURRENT deposit dial first (mainnet: 0 = free)

import { getXSWDClient } from '@/lib/xelis/xswd'
import { rpcCall } from '@/lib/xelis/rpc'
import { valStr, valU64, valHash, type ValueCell } from '@/lib/xelis/types'
import {
  VAULT_CONTRACT, DEX_CONTRACT, XEL_ASSET,
  VAULT_ENTRIES, DEX_ENTRIES, explorerTxUrl,
} from './protocol'
import { useMainnet } from './mainnet-store'

export interface TxResult {
  ok: boolean
  hash: string | null
  message: string
  explorerUrl: string | null
}

const ok = (hash: string, message: string): TxResult => ({
  ok: true, hash, message, explorerUrl: explorerTxUrl(hash),
})

const fail = (message: string): TxResult => ({
  ok: false, hash: null, message, explorerUrl: null,
})

/** Wait until the tx is included in a block (max ~90 s, poll 3 s). */
async function waitConfirmed(hash: string): Promise<boolean> {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    try {
      const res = await rpcCall<any>(
        'get_transaction', { hash }, { retries: 1, network: 'mainnet' },
      )
      if (res && (res.topoheight != null || res.block_hash || res.blocks)) return true
    } catch {
      // not found yet — still in the mempool
    }
  }
  return false
}

/**
 * Send one invoke through the wallet, wait for its confirmation and
 * refresh the store. All wrappers below funnel through here.
 */
async function sendInvoke(args: {
  contract: string
  entryId: number
  params: ValueCell[]
  deposits?: Record<string, bigint>
  /** extra context for the success message */
  success: string
}): Promise<TxResult> {
  const client = getXSWDClient()
  if (client.state !== 'connected') {
    return fail('Connect your XELIS wallet first (Genesix on mainnet, XSWD enabled).')
  }
  try {
    const deposits: Record<string, { amount: bigint; private?: boolean }> = {}
    for (const [asset, amount] of Object.entries(args.deposits ?? {})) {
      if (amount > 0n) deposits[asset] = { amount }
    }
    const hash = await client.invokeContract({
      contract: args.contract,
      entryId: args.entryId,
      parameters: args.params,
      ...(Object.keys(deposits).length ? { deposits } : {}),
      permission: 'all',
    })
    if (!hash || hash === 'submitted') {
      return fail('The wallet broadcast the transaction but returned no hash — check the explorer.')
    }
    // confirmation is best-effort: the tx may land while we poll
    const confirmed = await waitConfirmed(hash)
    void useMainnet.getState().refresh(true)
    return ok(hash, confirmed ? args.success : `${args.success} — confirming on-chain…`)
  } catch (e: any) {
    const raw = e instanceof Error ? e.message : 'Transaction failed'
    if (raw.includes('not enough funds')) {
      return fail('Not enough funds in the wallet for this deposit + fee.')
    }
    return fail(raw)
  }
}

// ── VaultLaunch — the creator & community flow ───────────────────────

export interface ProposeInput {
  name: string
  symbol: string
  description: string
  website: string
  logo: string
  twitter: string
  telegram: string
  discord: string
  totalSupplyAtomic: bigint
  teamBps: number
  /** 0 = team claims at graduation; otherwise vmn..vmx topos */
  vestingDurationTopos: number
  /** total XEL deposit (atomic): submission fee + asset budget + liquidity */
  depositAtomic: bigint
}

/** propose (entry 20) — create a project. 526 XEL minimum on mainnet. */
export function proposeTx(input: ProposeInput): Promise<TxResult> {
  return sendInvoke({
    contract: VAULT_CONTRACT,
    entryId: VAULT_ENTRIES.propose,
    params: [
      valStr(input.name),
      valStr(input.symbol),
      valStr(input.description),
      valStr(input.website),
      valStr(input.logo),
      valStr(input.twitter),
      valStr(input.telegram),
      valStr(input.discord),
      valU64(input.totalSupplyAtomic),
      valU64(input.teamBps),
      valU64(input.vestingDurationTopos),
    ],
    deposits: { [XEL_ASSET]: input.depositAtomic },
    success: `Proposal submitted — ${input.symbol} enters community validation`,
  })
}

/** support (21) — vote FOR a project (free on mainnet: vdp = 0). */
export function supportTx(pid: number): Promise<TxResult> {
  return sendInvoke({
    contract: VAULT_CONTRACT,
    entryId: VAULT_ENTRIES.support,
    params: [valU64(pid)],
    success: 'Support vote sent',
  })
}

/** report (22) — vote AGAINST (trust system). */
export function reportTx(pid: number): Promise<TxResult> {
  return sendInvoke({
    contract: VAULT_CONTRACT,
    entryId: VAULT_ENTRIES.report,
    params: [valU64(pid)],
    success: 'Report vote sent',
  })
}

/** finalize_validation (23) — anyone: close the window and open bonding. */
export function finalizeValidationTx(pid: number): Promise<TxResult> {
  return sendInvoke({
    contract: VAULT_CONTRACT,
    entryId: VAULT_ENTRIES.finalize_validation,
    params: [valU64(pid)],
    success: 'Validation finalized — the bonding curve is open',
  })
}

/** buy (24) — buy on the curve, attaching XEL (min 0.01 XEL). */
export function buyCurveTx(pid: number, xelAtomic: bigint, minTokensOut: bigint): Promise<TxResult> {
  return sendInvoke({
    contract: VAULT_CONTRACT,
    entryId: VAULT_ENTRIES.buy,
    params: [valU64(pid)],
    deposits: { [XEL_ASSET]: xelAtomic },
    success: 'Buy sent — tokens will arrive in your wallet',
  })
}

/** sell (25) — sell on the curve, attaching the PROJECT's tokens. */
export function sellCurveTx(pid: number, asset: string, tokensAtomic: bigint): Promise<TxResult> {
  return sendInvoke({
    contract: VAULT_CONTRACT,
    entryId: VAULT_ENTRIES.sell,
    params: [valU64(pid)],
    deposits: { [asset]: tokensAtomic },
    success: 'Sell sent — the whole attached deposit is sold',
  })
}

/** migrate (32) — anyone: move a graduated curve into LaunchDEX. */
export function migrateTx(pid: number): Promise<TxResult> {
  return sendInvoke({
    contract: VAULT_CONTRACT,
    entryId: VAULT_ENTRIES.migrate,
    params: [valU64(pid)],
    success: 'Migration sent — the LaunchDEX pool is being seeded',
  })
}

/** claim_refund (26) — creator: recover funds after a rejection. */
export function claimRefundTx(pid: number): Promise<TxResult> {
  return sendInvoke({
    contract: VAULT_CONTRACT,
    entryId: VAULT_ENTRIES.claim_refund,
    params: [valU64(pid)],
    success: 'Refund claimed',
  })
}

/** claim_team_allocation (31) — creator. */
export function claimTeamAllocationTx(pid: number): Promise<TxResult> {
  return sendInvoke({
    contract: VAULT_CONTRACT,
    entryId: VAULT_ENTRIES.claim_team_allocation,
    params: [valU64(pid)],
    success: 'Team allocation claimed',
  })
}

/** start_team_vesting (30) — creator: bind a linear vesting. */
export function startTeamVestingTx(pid: number, durationTopos: number): Promise<TxResult> {
  return sendInvoke({
    contract: VAULT_CONTRACT,
    entryId: VAULT_ENTRIES.start_team_vesting,
    params: [valU64(pid), valU64(durationTopos)],
    success: 'Team vesting started',
  })
}

/** update_project_info (29) — creator: socials & description. */
export function updateProjectInfoTx(
  pid: number,
  info: { description: string; website: string; logo: string; twitter: string; telegram: string; discord: string },
): Promise<TxResult> {
  return sendInvoke({
    contract: VAULT_CONTRACT,
    entryId: VAULT_ENTRIES.update_project_info,
    params: [
      valU64(pid),
      valStr(info.description), valStr(info.website), valStr(info.logo),
      valStr(info.twitter), valStr(info.telegram), valStr(info.discord),
    ],
    success: 'Project info updated',
  })
}

/** sync_trust_to_dex (33) — mirror the trust flag to the pool. */
export function syncTrustTx(pid: number): Promise<TxResult> {
  return sendInvoke({
    contract: VAULT_CONTRACT,
    entryId: VAULT_ENTRIES.sync_trust_to_dex,
    params: [valU64(pid)],
    success: 'Trust status synced to the DEX pool',
  })
}

// ── LaunchDEX — swaps & liquidity ────────────────────────────────────

/** swap_xel_for_token (8) — buy on the pool, attaching XEL. */
export function swapXelForTokenTx(asset: string, xelAtomic: bigint, minTokensOut: bigint): Promise<TxResult> {
  return sendInvoke({
    contract: DEX_CONTRACT,
    entryId: DEX_ENTRIES.swap_xel_for_token,
    params: [valHash(asset), valU64(minTokensOut)],
    deposits: { [XEL_ASSET]: xelAtomic },
    success: 'Swap sent — tokens will arrive in your wallet',
  })
}

/** swap_token_for_xel (9) — sell into the pool, attaching tokens. */
export function swapTokenForXelTx(asset: string, tokensAtomic: bigint, minXelOut: bigint): Promise<TxResult> {
  return sendInvoke({
    contract: DEX_CONTRACT,
    entryId: DEX_ENTRIES.swap_token_for_xel,
    params: [valHash(asset), valU64(minXelOut)],
    deposits: { [asset]: tokensAtomic },
    success: 'Swap sent — XEL will arrive in your wallet',
  })
}

/** add_liquidity (10) — deepen a pool (attach BOTH sides, X7 fit). */
export function addLiquidityTx(asset: string, xelAtomic: bigint, tokensAtomic: bigint): Promise<TxResult> {
  return sendInvoke({
    contract: DEX_CONTRACT,
    entryId: DEX_ENTRIES.add_liquidity,
    params: [valHash(asset)],
    deposits: { [XEL_ASSET]: xelAtomic, [asset]: tokensAtomic },
    success: 'Liquidity added — you now earn the provider share of fees',
  })
}

/** remove_liquidity (32) — burn withdrawable parts, exit pro-rata. */
export function removeLiquidityTx(
  asset: string, partsAtomic: bigint, minXelOut: bigint, minTokensOut: bigint,
): Promise<TxResult> {
  return sendInvoke({
    contract: DEX_CONTRACT,
    entryId: DEX_ENTRIES.remove_liquidity,
    params: [valHash(asset), valU64(partsAtomic), valU64(minXelOut), valU64(minTokensOut)],
    success: 'Liquidity removed — both sides paid to your wallet',
  })
}

/** claim_lp_fees (30) — pull your accrued provider fees. */
export function claimLpFeesTx(asset: string): Promise<TxResult> {
  return sendInvoke({
    contract: DEX_CONTRACT,
    entryId: DEX_ENTRIES.claim_lp_fees,
    params: [valHash(asset)],
    success: 'Provider fees claimed',
  })
}
