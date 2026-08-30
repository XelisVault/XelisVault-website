'use client'

// useExplorerLive — the Observatory's data engine.
//
// Bootstrap: 40 recent blocks (2 range calls of 20) + chain stats.
// Live:      WebSocket `new_block` pushes (full block embedded, zero extra RPC).
// Safety:    get_top_block polling every 15s (dedup by hash) keeps the feed
//            alive even if the socket silently dies behind a proxy.
// Session:   "witness" counters — what YOU observed live since page open.

import { useEffect, useRef, useState, useCallback } from 'react'
import { getNetworkInfo, NetworkInfo, rpcCall } from '@/lib/xelis/rpc'
import {
  XelisBlock,
  PeerInfo,
  AssetInfo,
  getBlocksRangeByTopo,
  getDifficultyInfo,
  getPeersList,
  getMempoolSummary,
  getFeeRates,
  getAssetsList,
  getCount,
} from '@/lib/xelis/explorer'
import { NodeSocket, SocketStatus, NodeEventPayload } from '@/lib/xelis/node-ws'

const MAX_BLOCKS = 140
const BOOTSTRAP_BLOCKS = 40
const RANGE_BATCH = 20

export interface SessionStats {
  startedAt: number
  blocksWitnessed: number
  sideBlocks: number
  txsSealed: number
  xelBurned: number // atomic
  biggestTxs: number
  biggestTopo: number | null
}

const emptySession = (): SessionStats => ({
  startedAt: Date.now(),
  blocksWitnessed: 0,
  sideBlocks: 0,
  txsSealed: 0,
  xelBurned: 0,
  biggestTxs: 0,
  biggestTopo: null,
})

export interface ExplorerLive {
  ready: boolean
  socketStatus: SocketStatus | 'boot'
  blocks: XelisBlock[] // newest first
  info: NetworkInfo | null
  difficulty: { difficulty: string; hashrate: string; hashrate_formatted: string } | null
  peers: { peers: PeerInfo[]; total_peers: number; hidden_peers: number } | null
  mempool: { total: number } | null
  feeRates: { low: number; medium: number; high: number; default: number } | null
  assets: AssetInfo[]
  txCount: number | null
  accountCount: number | null
  session: SessionStats
  mempoolBlips: { id: number; at: number }[]
  refreshStats: () => void
}

export function useExplorerLive(opts: { onNewBlock?: (b: XelisBlock) => void; onMempoolTx?: () => void } = {}): ExplorerLive {
  const [ready, setReady] = useState(false)
  const [socketStatus, setSocketStatus] = useState<SocketStatus | 'boot'>('boot')
  const [blocks, setBlocks] = useState<XelisBlock[]>([])
  const [info, setInfo] = useState<NetworkInfo | null>(null)
  const [difficulty, setDifficulty] = useState<ExplorerLive['difficulty']>(null)
  const [peers, setPeers] = useState<ExplorerLive['peers']>(null)
  const [mempool, setMempool] = useState<ExplorerLive['mempool']>(null)
  const [feeRates, setFeeRates] = useState<ExplorerLive['feeRates']>(null)
  const [assets, setAssets] = useState<AssetInfo[]>([])
  const [txCount, setTxCount] = useState<number | null>(null)
  const [accountCount, setAccountCount] = useState<number | null>(null)
  const [session, setSession] = useState<SessionStats>(emptySession)
  const [mempoolBlips, setMempoolBlips] = useState<{ id: number; at: number }[]>([])

  const optsRef = useRef(opts)
  optsRef.current = opts
  const seenHashes = useRef<Set<string>>(new Set())
  const knownTopos = useRef<Set<number>>(new Set())
  const blipId = useRef(0)

  const ingestBlock = useCallback((block: XelisBlock, live: boolean) => {
    if (seenHashes.current.has(block.hash)) return
    seenHashes.current.add(block.hash)
    knownTopos.current.add(block.topoheight)

    setBlocks((prev) => {
      const next = [block, ...prev]
      next.sort((a, b) => b.topoheight - a.topoheight)
      return next.slice(0, MAX_BLOCKS)
    })

    if (live) {
      setSession((s) => {
        const txs = block.txs_hashes?.length ?? 0
        return {
          ...s,
          blocksWitnessed: s.blocksWitnessed + 1,
          sideBlocks: s.sideBlocks + (block.block_type === 'Side' ? 1 : 0),
          txsSealed: s.txsSealed + txs,
          xelBurned: s.xelBurned + (block.total_fees_burned ?? 0),
          biggestTxs: Math.max(s.biggestTxs, txs),
          biggestTopo: txs > s.biggestTxs ? block.topoheight : s.biggestTopo,
        }
      })
      optsRef.current.onNewBlock?.(block)
    }
  }, [])

  const refreshStats = useCallback(() => {
    getNetworkInfo().then(setInfo).catch(() => {})
    getDifficultyInfo().then(setDifficulty).catch(() => {})
    getMempoolSummary().then((m) => setMempool({ total: m.total })).catch(() => {})
    getFeeRates().then(setFeeRates).catch(() => {})
    getPeersList().then(setPeers).catch(() => {})
    getCount('transactions').then(setTxCount).catch(() => {})
    getCount('accounts').then(setAccountCount).catch(() => {})
  }, [])

  // ---- Bootstrap + WS + polling ----
  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const [netInfo, diff, peerData, mem, fees, assetList, txs, accounts] = await Promise.all([
          getNetworkInfo(),
          getDifficultyInfo().catch(() => null),
          getPeersList().catch(() => null),
          getMempoolSummary().catch(() => null),
          getFeeRates().catch(() => null),
          getAssetsList().catch(() => []),
          getCount('transactions').catch(() => null),
          getCount('accounts').catch(() => null),
        ])
        if (cancelled) return
        setInfo(netInfo)
        if (diff) setDifficulty(diff)
        if (peerData) setPeers(peerData)
        if (mem) setMempool({ total: mem.total })
        if (fees) setFeeRates(fees)
        if (assetList) setAssets(assetList)
        if (txs !== null) setTxCount(txs)
        if (accounts !== null) setAccountCount(accounts)

        const topo = netInfo.topoheight
        const ranges: Promise<XelisBlock[]>[] = []
        for (let end = topo; end > topo - BOOTSTRAP_BLOCKS && end >= 0; end -= RANGE_BATCH) {
          const start = Math.max(0, end - RANGE_BATCH + 1)
          ranges.push(getBlocksRangeByTopo(start, end, false))
        }
        const chunks = await Promise.all(ranges)
        if (cancelled) return
        const all = chunks.flat().sort((a, b) => b.topoheight - a.topoheight)
        all.forEach((b) => {
          seenHashes.current.add(b.hash)
          knownTopos.current.add(b.topoheight)
        })
        setBlocks(all.slice(0, MAX_BLOCKS))
      } catch {
        /* keep skeleton */
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    bootstrap()

    // WebSocket — live pushes
    const socket = new NodeSocket()
    socket.onStatus(setSocketStatus)
    const offEvents = socket.on((e: NodeEventPayload) => {
      if (e.event === 'new_block') {
        const { event: _e, ...block } = e as any
        ingestBlock(block as XelisBlock, true)
      } else if (e.event === 'transaction_added_in_mempool') {
        const id = ++blipId.current
        setMempoolBlips((prev) => [...prev.slice(-8), { id, at: Date.now() }])
        optsRef.current.onMempoolTx?.()
        getMempoolSummary().then((m) => setMempool({ total: m.total })).catch(() => {})
      } else if (e.event === 'stable_height_changed') {
        getNetworkInfo().then(setInfo).catch(() => {})
      }
    })
    socket.connect()
    // subscribe after a tick so onopen handlers are attached
    const subTimer = setTimeout(() => {
      socket.subscribe('new_block')
      socket.subscribe('transaction_added_in_mempool')
      socket.subscribe('stable_height_changed')
    }, 600)

    // Safety net: poll the top block — dedup via seenHashes. Also catches up
    // missed topoheights after a silent socket drop.
    const pollTop = setInterval(async () => {
      try {
        const topoheight = await rpcCall<number>('get_topoheight', undefined, { retries: 1 })
        const latest = await rpcCall<XelisBlock>('get_block_at_topoheight', { topoheight, include_txs: false }, { retries: 1 })
        ingestBlock(latest, !seenHashes.current.has(latest.hash))
        // fill a gap of up to 5 missed topos (e.g. after reconnect)
        for (let t = topoheight - 1; t > topoheight - 5 && t >= 0; t--) {
          if (knownTopos.current.has(t)) break
          try {
            const missed = await rpcCall<XelisBlock>('get_block_at_topoheight', { topoheight: t, include_txs: false }, { retries: 1 })
            ingestBlock(missed, false)
          } catch { break }
        }
      } catch { /* node hiccup */ }
    }, 15000)

    // Periodic stats refresh
    const statsTimer = setInterval(refreshStats, 20000)

    return () => {
      cancelled = true
      clearTimeout(subTimer)
      clearInterval(pollTop)
      clearInterval(statsTimer)
      offEvents()
      socket.close()
    }
  }, [ingestBlock, refreshStats])

  return {
    ready,
    socketStatus,
    blocks,
    info,
    difficulty,
    peers,
    mempool,
    feeRates,
    assets,
    txCount,
    accountCount,
    session,
    mempoolBlips,
    refreshStats,
  }
}
