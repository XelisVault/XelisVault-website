// CommunityLaunch — ON-CHAIN HISTORY BACKFILL (C101).
//
// The chain stores the PRESENT (reserves, scores) — but every trade
// that ever touched the factory is public: contract invokes carry
// their entry, typed params and deposits in clear. So a brand-new
// visitor can rebuild the ENTIRE price history of any coin:
//
//   get_contract_transactions(factory)  → every tx hash, newest first
//   get_transactions (batches of 20)    → entry id, params, deposits
//   get_block_by_hash (one per block)   → the topoheight of each trade
//   replay (xr, yr) from (0, y0)        → the exact integer curve math
//   sample at intervalTopo spacing      → a ChartSeries, flat between
//                                         trades (which is the truth:
//                                         the price only moves on
//                                         trades)
//
// CALIBRATION — the replay's final (xr, yr) is checked against the
// live storage read. If the two fee models (fee-out vs fee-stays)
// both fail to reproduce the live state, the backfill returns null:
// we abstain rather than show a wrong chart.
//
// Cost control: the number of replayed trades is capped (the most
// recent ones), blocks are cached per hash, and every RPC goes
// through the shared rate-limited client (14 req/s, batch ≤ 20).

import { rpcCall } from '@/lib/xelis/rpc'
import { COMMUNITY_CONTRACT, XEL_ASSET } from './protocol'
import {
  coinBuyTokensOut, coinSellXelOut, coinSpotPrice,
} from './community-math'
import { toHuman, feeTake } from './chain-math'
import type { ChartSeries } from './persist'

const TX_BATCH = 20
/** Replay at most this many MOST RECENT trades (chart-relevant). */
export const MAX_TRADES = 800
/** Hard cap on scanned factory txs — RPC budget per backfill run. */
const MAX_SCAN = 4000
/** Series cap — the chart decimates beyond this anyway (persist.ts). */
const MAX_POINTS = 3200

// ── Raw shapes (node JSON-RPC) ───────────────────────────────────────

interface RawTx {
  hash: string
  executed_in_block: string | null
  data?: { invoke_contract?: {
    entry_id: number
    parameters?: { value?: { value?: unknown } }[]
    deposits?: Record<string, { public?: number | string }>
  } }
}

interface RawBlock { topoheight: number }

// ── Inputs / output ─────────────────────────────────────────────────

export interface BackfillInput {
  cid: number
  /** current topoheight (call getTopoheight first) */
  currentTopo: number
  createdTopo: number
  /** initial inventory y0, ATOMIC */
  y0: bigint
  /** launch depth vx, ATOMIC */
  vx: bigint
  graduated: boolean
  graduatedTopo: number
  curveFeeBps: number
  graduatedFeeBps: number
  /** live atomic reserves — the calibration targets */
  liveXr: bigint
  liveYr: bigint
}

/** One trade, resolved and ordered. */
interface Trade {
  topo: number
  kind: 'buy' | 'sell'
  /** XEL attached (buy) or tokens attached (sell), ATOMIC */
  amount: bigint
}

// ── Fetch + resolve ─────────────────────────────────────────────────

/** Every transaction that ever invoked the factory. */
async function fetchFactoryTxHashes(currentTopo: number): Promise<string[]> {
  const res = await rpcCall<string[]>(
    'get_contract_transactions',
    { contract: COMMUNITY_CONTRACT, topoheight: currentTopo },
    { retries: 3, network: 'mainnet' },
  )
  return Array.isArray(res) ? res : []
}

function depositPublic(deposits: Record<string, { public?: number | string }> | undefined, asset: string): bigint | null {
  const d = deposits?.[asset]
  if (d == null || d.public == null) return null
  try { return BigInt(d.public) } catch { return null }
}

/** Parse the factory txs into this coin's ordered trades. */
async function resolveTrades(hashes: string[], cid: number): Promise<Trade[]> {
  const trades: Trade[] = []
  const blockCache = new Map<string, number>()

  // the node's ordering is not guaranteed — collect EVERYTHING (up to
  // the scan budget), sort by topoheight, keep the most recent
  const scan = hashes.slice(0, MAX_SCAN)
  for (let i = 0; i < scan.length; i += TX_BATCH) {
    const batch = scan.slice(i, i + TX_BATCH)
    const txs = await rpcCall<RawTx[]>(
      'get_transactions', { tx_hashes: batch }, { retries: 2, network: 'mainnet' },
    )
    if (!Array.isArray(txs)) continue
    for (const tx of txs) {
      const inv = tx.data?.invoke_contract
      if (!inv || (inv.entry_id !== 16 && inv.entry_id !== 17)) continue
      const rawCid = inv.parameters?.[0]?.value?.value
      if (rawCid == null || Number(rawCid) !== cid) continue

      const deposits = inv.deposits
      let kind: 'buy' | 'sell'
      let amount: bigint | null
      if (inv.entry_id === 16) {
        kind = 'buy'
        amount = depositPublic(deposits, XEL_ASSET)
      } else {
        kind = 'sell'
        // the attached deposit IS the coin's asset — the one key that
        // is not XEL
        const key = Object.keys(deposits ?? {}).find((k) => k !== XEL_ASSET)
        amount = key ? depositPublic(deposits, key) : null
      }
      if (amount == null || amount <= 0n) continue
      if (!tx.executed_in_block) continue

      let topo = blockCache.get(tx.executed_in_block)
      if (topo == null) {
        const block = await rpcCall<RawBlock>(
          'get_block_by_hash', { hash: tx.executed_in_block }, { retries: 2, network: 'mainnet' },
        ).catch(() => null)
        if (!block || typeof block.topoheight !== 'number') continue
        topo = block.topoheight
        blockCache.set(tx.executed_in_block, topo)
      }
      trades.push({ topo, kind, amount })
    }
  }

  trades.sort((a, b) => a.topo - b.topo) // oldest → newest
  // keep the most recent slice when over the cap
  return trades.length > MAX_TRADES ? trades.slice(trades.length - MAX_TRADES) : trades
}

// ── Replay ──────────────────────────────────────────────────────────

interface ReplayStep { topo: number; price: number }

/** Replay the curve state across the trades under one fee model.
 *  feeToCurve=false: the fee leaves the curve (buy: net joins the
 *  reserves, sell: the gross leaves). feeToCurve=true: the fee stays
 *  (buy: the whole deposit joins, sell: only the net payout leaves). */
function replay(
  trades: Trade[], in0: { y0: bigint; vx: bigint; graduated: boolean; graduatedTopo: number; curveFeeBps: number; graduatedFeeBps: number },
  feeToCurve: boolean,
): { steps: ReplayStep[]; xr: bigint; yr: bigint } {
  let xr = 0n
  let yr = in0.y0
  const steps: ReplayStep[] = []
  for (const t of trades) {
    const bps = in0.graduated && t.topo >= in0.graduatedTopo
      ? Math.min(in0.graduatedFeeBps, in0.curveFeeBps)
      : in0.curveFeeBps
    if (t.kind === 'buy') {
      const net = feeToCurve ? t.amount : t.amount - feeTake(t.amount, bps)
      const out = coinBuyTokensOut(xr, yr, in0.y0, in0.vx, net)
      xr += net
      yr -= out
    } else {
      const gross = coinSellXelOut(xr, yr, in0.y0, in0.vx, t.amount)
      const leave = feeToCurve ? gross - feeTake(gross, bps) : gross
      xr -= leave
      yr += t.amount
    }
    steps.push({ topo: t.topo, price: toHuman(coinSpotPrice(xr, yr, in0.y0, in0.vx)) })
  }
  return { steps, xr, yr }
}

function closeEnough(replayed: bigint, live: bigint): boolean {
  const tolerance = live > 0n ? live / 500n + 10n : 10n // 0.2% + dust
  const d = replayed > live ? replayed - live : live - replayed
  return d <= tolerance
}

// ── The backfill ────────────────────────────────────────────────────

/**
 * Rebuild a coin's curve price series from the chain itself.
 * Returns null when the history can't be reconstructed faithfully
 * (no calibration match, node hiccup, …) — callers keep whatever
 * local series they already have.
 */
export async function backfillCoinCurveSeries(coin: BackfillInput): Promise<ChartSeries | null> {
  try {
    // sanity: nothing to rebuild
    if (coin.currentTopo <= coin.createdTopo || coin.y0 <= 0n) return null

    const hashes = await fetchFactoryTxHashes(coin.currentTopo)
    if (hashes.length === 0) return null
    const trades = await resolveTrades(hashes, coin.cid)

    // calibration: pick the fee model that reproduces the LIVE state
    let steps: ReplayStep[] | null = null
    for (const feeToCurve of [false, true]) {
      const r = replay(trades, coin, feeToCurve)
      if (closeEnough(r.xr, coin.liveXr) && closeEnough(r.yr, coin.liveYr)) {
        steps = r.steps
        break
      }
    }
    if (!steps) return null // abstain — never show a wrong chart

    // ── sample the series ──
    // the price only moves on trades: flat between them, starting at
    // the birth price spot(0, y0) = vx / (2·y0)
    const birth = toHuman(coinSpotPrice(0n, coin.y0, coin.y0, coin.vx))
    let interval = 6
    while ((coin.currentTopo - coin.createdTopo) / interval > MAX_POINTS) interval *= 2

    const nSlots = Math.floor((coin.currentTopo - coin.createdTopo) / interval) + 1
    const history: number[] = new Array(Math.min(nSlots, MAX_POINTS))
    let price = birth
    let ti = 0
    for (let i = 0; i < history.length; i++) {
      const slotTopo = coin.createdTopo + i * interval
      while (ti < steps.length && steps[ti].topo <= slotTopo) {
        price = steps[ti].price
        ti++
      }
      history[i] = price
    }

    return {
      history,
      histStart: 0,
      points: history.length,
      lastTopo: coin.createdTopo + (history.length - 1) * interval,
      intervalTopo: interval,
      savedAt: Date.now(),
    }
  } catch {
    return null // node error, shape drift, … — keep the local series
  }
}
