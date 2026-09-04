'use client'

/**
 * NERVA Live Explorer — the network as it happens.
 *
 * Data source: the public explorer API (api.nerva.one, CORS-open), called
 * directly from the browser with polite polling (10s + jitter for the feed,
 * ~2min for the chart). The block-size trick (>90 bytes ⇒ contains txs)
 * keeps transaction fetches rare on this calm network.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radar, Search, RefreshCw, Copy, Check, ExternalLink, Boxes,
  Activity, Database, Zap, Layers, X, ChevronRight, Hash as HashIcon,
} from 'lucide-react'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip as ReTooltip, XAxis,
} from 'recharts'
import { useLiveInfo } from '@/components/nerva/live-info'
import { BlockDetail, TxDetail } from '@/components/nerva/explorer/details'
import { CopyButton, Mono } from '@/components/nerva/explorer/bits'
import {
  getBlockHeadersRange, formatXnv, formatHashrate, difficultyToHashrate,
  timeAgo, formatTimestamp, shortenHash, formatBytes, NERVA_LINKS,
  type NervaBlockHeader,
} from '@/lib/nerva/api'

/* ───────────── stats grid ───────────── */

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string; accent?: boolean
}) {
  return (
    <div className="panel-nerva rounded-xl px-4 py-3.5 flex items-center gap-3.5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${accent ? 'bg-[oklch(0.82_0.115_215)]/14' : 'bg-white/6'}`}>
        <Icon className={`w-4.5 h-4.5 w-[18px] h-[18px] ${accent ? 'text-[oklch(0.82_0.115_215)]' : 'text-white/60'}`} />
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[oklch(0.58_0.025_250)]">{label}</div>
        <div className={`font-mono font-bold tabular-nums text-[15px] ${accent ? 'text-[oklch(0.84_0.11_220)]' : 'text-white/90'}`}>{value}</div>
        {sub && <div className="font-mono text-[9px] text-[oklch(0.5_0.02_255)]">{sub}</div>}
      </div>
    </div>
  )
}

/* ───────────── difficulty chart ───────────── */

function DifficultyChart({ tip }: { tip: number }) {
  const [data, setData] = useState<{ h: number; d: number }[]>([])

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const end = tip
        const start = Math.max(0, tip - 119)
        const headers = await getBlockHeadersRange(start, end)
        if (alive) setData(headers.map((b) => ({ h: b.height, d: b.difficulty })))
      } catch { /* keep last */ }
    }
    void load()
    const id = setInterval(load, 120_000)
    return () => { alive = false; clearInterval(id) }
  }, [tip])

  return (
    <div className="panel-nerva rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[oklch(0.82_0.115_215)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.6_0.025_250)]">
            Difficulty · last 120 blocks
          </span>
        </div>
        <span className="font-mono text-[10px] text-[oklch(0.5_0.02_255)]">
          {data.length > 0 ? `~${formatHashrate(difficultyToHashrate(data[data.length - 1].d))} net hashrate` : '…'}
        </span>
      </div>
      <div className="mt-3 h-[92px]">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="nervaDiff" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.82 0.115 215)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="oklch(0.72 0.15 290)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <XAxis dataKey="h" hide domain={['dataMin', 'dataMax']} />
              <ReTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0].payload as { h: number; d: number }
                  return (
                    <div className="glass-nerva rounded-lg px-3 py-2 font-mono text-[10px] text-white/85">
                      <div className="text-[oklch(0.82_0.115_215)]">#{p.h.toLocaleString()}</div>
                      <div>diff {p.d.toLocaleString()}</div>
                      <div className="text-white/50">{formatHashrate(difficultyToHashrate(p.d))}</div>
                    </div>
                  )
                }}
              />
              <Area type="monotone" dataKey="d" stroke="oklch(0.82 0.115 215)" strokeWidth={1.6} fill="url(#nervaDiff)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center font-mono text-[10px] text-[oklch(0.5_0.02_255)]">
            loading difficulty history…
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────────── block feed ───────────── */

function BlockRow({ block, onOpen, selected }: { block: NervaBlockHeader; onOpen: (hash: string) => void; selected: boolean }) {
  const hasTx = (block.num_txes ?? 0) > 0
  return (
    <motion.button
      layout="position"
      initial={{ opacity: 0, y: -10, backgroundColor: 'oklch(0.82 0.115 215 / 0.12)' }}
      animate={{ opacity: 1, y: 0, backgroundColor: selected ? 'oklch(0.82 0.115 215 / 0.10)' : 'rgba(0,0,0,0)' }}
      transition={{ duration: 0.5 }}
      onClick={() => onOpen(block.hash)}
      className={`w-full grid grid-cols-[auto_1fr_auto] sm:grid-cols-[92px_1fr_84px_92px_70px_70px] items-center gap-3 px-4 py-3 text-left border-b border-white/6 hover:bg-white/[0.045] transition-colors group ${
        selected ? 'bg-[oklch(0.82_0.115_215)]/10' : ''
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Boxes className="w-3.5 h-3.5 text-[oklch(0.82_0.115_215)] shrink-0" />
        <Mono className="text-[12.5px] text-white/90 group-hover:text-[oklch(0.86_0.1_220)] font-semibold">
          {block.height.toLocaleString()}
        </Mono>
      </div>
      <div className="hidden sm:flex items-center gap-2 min-w-0">
        <HashIcon className="w-3.5 h-3.5 text-white/25 shrink-0" />
        <Mono className="text-[11px] text-white/55 truncate">{shortenHash(block.hash, 10, 8)}</Mono>
        <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${hasTx ? 'bg-[oklch(0.72_0.15_290)]/18 text-[oklch(0.8_0.13_290)]' : 'bg-white/6 text-white/35'}`}>
          {hasTx ? `${block.num_txes} tx` : 'coinbase'}
        </span>
      </div>
      <div className="text-right hidden sm:block">
        <Mono className="text-[11px] text-white/60">{formatBytes(block.block_size)}</Mono>
      </div>
      <div className="text-right hidden sm:block">
        <Mono className="text-[11px] text-[oklch(0.8_0.11_160)]/80">{formatXnv(block.reward, 4)}</Mono>
      </div>
      <div className="text-right">
        <Mono className="text-[11px] text-white/60">{(block.difficulty / 1000).toFixed(0)}k</Mono>
      </div>
      <div className="text-right">
        <Mono className="text-[10.5px] text-[oklch(0.55_0.02_255)]">{timeAgo(block.timestamp)}</Mono>
      </div>
    </motion.button>
  )
}

/* ───────────── the explorer page ───────────── */

type Selection =
  | { kind: 'none' }
  | { kind: 'block'; hash: string }
  | { kind: 'tx'; hash: string }

export function Explorer() {
  const { info, refresh } = useLiveInfo()
  const [blocks, setBlocks] = useState<NervaBlockHeader[]>([])
  const [selection, setSelection] = useState<Selection>({ kind: 'none' })
  const [query, setQuery] = useState('')
  const [searchError, setSearchError] = useState('')
  const [syncing, setSyncing] = useState(true)
  const searchParams = useSearchParams()
  const lastTip = useRef<number>(0)

  /* deep-link support: /nerva/explorer?block=… or ?tx=… */
  useEffect(() => {
    const b = searchParams.get('block')
    const t = searchParams.get('tx')
    if (b) setSelection({ kind: 'block', hash: b })
    else if (t) setSelection({ kind: 'tx', hash: t })
  }, [searchParams])

  /* feed loop */
  const loadFeed = useCallback(async () => {
    try {
      const { getLastBlockHeader } = await import('@/lib/nerva/api')
      const tip = await getLastBlockHeader()
      if (tip.height === lastTip.current && blocks.length > 0) return
      lastTip.current = tip.height
      const headers = await getBlockHeadersRange(Math.max(0, tip.height - 14), tip.height)
      setBlocks(headers.slice().reverse())
    } catch { /* offline */ } finally {
      setSyncing(false)
    }
  }, [blocks.length])

  useEffect(() => {
    void loadFeed()
    const id = setInterval(loadFeed, 10_000)
    return () => clearInterval(id)
  }, [loadFeed])

  /* search: block hash | tx hash | height */
  const runSearch = async () => {
    const q = query.trim()
    setSearchError('')
    if (!q) return
    if (/^\d+$/.test(q)) {
      const height = Number(q)
      try {
        const { getBlockHeaderByHeight } = await import('@/lib/nerva/api')
        const h = await getBlockHeaderByHeight(height)
        setSelection({ kind: 'block', hash: h.hash })
      } catch {
        setSearchError(`No block found at height ${q}`)
      }
    } else if (/^[0-9a-fA-F]{64}$/.test(q)) {
      // try block header first, then transaction
      try {
        const { getBlockHeaderByHash, getTransactions } = await import('@/lib/nerva/api')
        try {
          const bh = await getBlockHeaderByHash(q)
          if (bh?.hash) { setSelection({ kind: 'block', hash: q }); return }
        } catch { /* not a block */ }
        const txs = await getTransactions([q])
        if (txs.length > 0) setSelection({ kind: 'tx', hash: q })
        else setSearchError('Not found as a block or transaction')
      } catch {
        setSearchError('Not found as a block or transaction')
      }
    } else {
      setSearchError('Enter a 64-character hash or a block height')
    }
  }

  const mempool = info?.tx_pool_size ?? 0
  const hashrate = info ? difficultyToHashrate(info.difficulty) : null

  return (
    <div className="relative pt-28 pb-16 min-h-screen">
      <div className="absolute inset-0 circuit-bg opacity-30 pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        {/* header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <Radar className="w-5 h-5 text-[oklch(0.82_0.115_215)]" />
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Live Explorer</h1>
              <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[oklch(0.75_0.14_160)] px-2.5 py-1 rounded-full bg-[oklch(0.75_0.14_160)]/12 border border-[oklch(0.75_0.14_160)]/25">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[oklch(0.75_0.14_160)] opacity-70 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[oklch(0.75_0.14_160)]" />
                </span>
                {info?.status === 'OK' ? 'mainnet OK' : 'connecting…'}
              </span>
            </div>
            <p className="mt-2.5 text-[13.5px] text-[oklch(0.66_0.025_250)] max-w-xl">
              NERVA blocks, transactions and mempool, streamed straight from the public
              explorer API to your browser. No server, no cache, no keys.
            </p>
          </div>

          {/* search */}
          <div className="w-full md:w-[340px]">
            <div className="panel-nerva rounded-xl flex items-center gap-2 px-3.5 h-11">
              <Search className="w-4 h-4 text-white/35 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void runSearch() }}
                placeholder="Block height, block hash or tx hash…"
                className="flex-1 bg-transparent outline-none font-mono text-[12px] text-white/85 placeholder:text-white/30 min-w-0"
                aria-label="Search blocks and transactions"
              />
              <button
                onClick={() => { void runSearch() }}
                className="text-[oklch(0.82_0.115_215)] hover:text-[oklch(0.9_0.1_215)] transition-colors"
                aria-label="Search"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {searchError && (
              <div className="mt-1.5 font-mono text-[10px] text-[oklch(0.7_0.15_25)]">{searchError}</div>
            )}
          </div>
        </div>

        {/* stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Layers} label="Height" value={info ? info.height.toLocaleString() : '…'} accent />
          <StatCard icon={Zap} label="Hashrate" value={hashrate ? formatHashrate(hashrate) : '…'} sub="difficulty ÷ 60" />
          <StatCard icon={Activity} label="Difficulty" value={info ? info.difficulty.toLocaleString() : '…'} />
          <StatCard icon={Database} label="Transactions" value={info ? info.tx_count.toLocaleString() : '…'} sub="all time" />
          <StatCard icon={Radar} label="Mempool" value={`${mempool}`} sub={mempool > 0 ? 'pending' : 'empty'} accent={mempool > 0} />
          <StatCard icon={RefreshCw} label="Median block" value={info ? formatBytes(info.block_size_median) : '…'} sub="network median" />
        </div>

        <div className="mt-4">
          <DifficultyChart tip={info?.height ?? lastTip.current} />
        </div>

        {/* main two-column area */}
        <div className="mt-6 grid lg:grid-cols-[1fr_400px] gap-6 items-start">
          {/* block feed */}
          <div className="panel-nerva rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/8">
              <div className="flex items-center gap-2.5">
                <Boxes className="w-4 h-4 text-[oklch(0.82_0.115_215)]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.6_0.025_250)]">
                  Latest blocks
                </span>
                <span className="font-mono text-[10px] text-[oklch(0.5_0.02_255)]">
                  · auto-refresh 10s
                </span>
              </div>
              <button
                onClick={() => { void refresh(); void loadFeed() }}
                className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45 hover:text-[oklch(0.82_0.115_215)] transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="hidden sm:grid grid-cols-[92px_1fr_84px_92px_70px_70px] gap-3 px-4 py-2 border-b border-white/6 font-mono text-[8.5px] uppercase tracking-[0.16em] text-[oklch(0.5_0.02_255)]">
              <div>Height</div><div>Hash</div><div className="text-right">Size</div>
              <div className="text-right">Reward</div><div className="text-right">Diff</div><div className="text-right">Age</div>
            </div>
            <div>
              <AnimatePresence initial={false}>
                {blocks.length === 0 && (
                  <div className="px-4 py-8 font-mono text-[11px] text-[oklch(0.5_0.02_255)]">
                    {syncing ? 'syncing the chain tip…' : 'no data — network unreachable'}
                  </div>
                )}
                {blocks.map((b) => (
                  <BlockRow
                    key={b.hash}
                    block={b}
                    selected={selection.kind === 'block' && selection.hash === b.hash}
                    onOpen={(hash) => setSelection((s) => (s.kind === 'block' && s.hash === hash ? { kind: 'none' } : { kind: 'block', hash }))}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* detail panel */}
          <div className="lg:sticky lg:top-24">
            <AnimatePresence mode="wait">
              {selection.kind === 'none' && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="panel-nerva rounded-xl p-8 text-center"
                >
                  <HashIcon className="w-8 h-8 mx-auto text-white/15" />
                  <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[oklch(0.55_0.025_250)]">
                    Select a block
                  </div>
                  <p className="mt-2.5 text-[12.5px] text-[oklch(0.62_0.025_250)] leading-relaxed">
                    Click any block to inspect its header, miner transaction and — for
                    blocks with transactions — every transfer it contains, with payment-id
                    detection.
                  </p>
                  <Link
                    href={`/nerva/explorer?block=${blocks[0]?.hash ?? ''}`}
                    className="mt-5 inline-flex items-center gap-1.5 font-mono text-[11px] text-[oklch(0.82_0.115_215)] hover:text-[oklch(0.9_0.1_215)] transition-colors"
                    onClick={(e) => { if (blocks[0]) { e.preventDefault(); setSelection({ kind: 'block', hash: blocks[0].hash }) } }}
                  >
                    Open the latest block <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </motion.div>
              )}
              {selection.kind === 'block' && (
                <motion.div key={`b-${selection.hash}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                  <BlockDetail hash={selection.hash} onClose={() => setSelection({ kind: 'none' })} onOpenTx={(hash) => setSelection({ kind: 'tx', hash })} />
                </motion.div>
              )}
              {selection.kind === 'tx' && (
                <motion.div key={`t-${selection.hash}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                  <TxDetail hash={selection.hash} onClose={() => setSelection({ kind: 'none' })} onBackToBlock={(hash) => setSelection({ kind: 'block', hash })} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* footer note */}
        <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="font-mono text-[10px] text-[oklch(0.5_0.02_255)] uppercase tracking-[0.14em]">
            Data: api.nerva.one (public explorer API) · amounts of RingCT transfers are encrypted by design
          </div>
          <a
            href={NERVA_LINKS.explorer}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-white/50 hover:text-[oklch(0.82_0.115_215)] transition-colors uppercase tracking-[0.12em]"
          >
            Official explorer <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
