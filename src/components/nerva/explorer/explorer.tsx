'use client'

/**
 * NERVA Live Explorer: the network as it happens.
 *
 * Data source: the public explorer API (api.nerva.one, CORS-open), called
 * directly from the browser with polite polling (10s + jitter for the feed,
 * ~2min for the chart). The block-size trick (>90 bytes means it holds
 * transactions) keeps transaction fetches rare on this calm network.
 *
 * Design: flat, dense, terminal-grade. Steel blue on navy, 6px corners,
 * tabular numerals, a next-block countdown, no decorative noise.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radar, Search, RefreshCw, ExternalLink, Boxes,
  Activity, Database, Zap, Layers, X, ChevronRight, Hash as HashIcon,
  Timer, Radio,
} from 'lucide-react'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip as ReTooltip, XAxis,
} from 'recharts'
import { useLiveInfo } from '@/components/nerva/live-info'
import { BlockDetail, TxDetail } from '@/components/nerva/explorer/details'
import { CopyButton, Mono } from '@/components/nerva/explorer/bits'
import {
  getBlockHeadersRange, formatXnv, formatHashrate, difficultyToHashrate,
  timeAgo, shortenHash, formatBytes, NERVA_LINKS,
  type NervaBlockHeader,
} from '@/lib/nerva/api'

const STEEL = 'oklch(0.78 0.06 237)'
const STEEL_SOLID = 'oklch(0.66 0.083 233)'

/* ───────────── stats grid ───────────── */

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string; accent?: boolean
}) {
  return (
    <div className="panel-nerva rounded-md px-4 py-3.5 flex items-center gap-3.5">
      <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${accent ? 'bg-[oklch(0.78_0.06_237)]/12' : 'bg-white/[0.05]'}`}>
        <Icon className={`w-[17px] h-[17px] ${accent ? 'text-[oklch(0.78_0.06_237)]' : 'text-white/55'}`} />
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[oklch(0.55_0.012_250)]">{label}</div>
        <div className={`font-mono font-semibold tabular-nums text-[15px] ${accent ? 'text-[oklch(0.8_0.055_237)]' : 'text-white/90'}`}>{value}</div>
        {sub && <div className="font-mono text-[9px] text-[oklch(0.5_0.01_250)]">{sub}</div>}
      </div>
    </div>
  )
}

/* ───────────── next-block countdown: 60s target ───────────── */

function NextBlockCountdown({ tipTimestamp }: { tipTimestamp?: number }) {
  const [now, setNow] = useState(() => Date.now() / 1000)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() / 1000), 1000)
    return () => clearInterval(id)
  }, [])

  const elapsed = tipTimestamp ? now - tipTimestamp : 0
  const remaining = Math.max(0, 60 - elapsed)
  const pct = tipTimestamp ? Math.min(100, Math.max(0, (elapsed / 60) * 100)) : 0
  const due = tipTimestamp != null && elapsed > 60

  return (
    <div className="panel-nerva rounded-md p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[oklch(0.55_0.012_250)] flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5" /> Next block expected
        </span>
        <span className={`font-mono font-semibold text-[15px] tabular-nums ${due ? 'text-[oklch(0.72_0.12_160)]' : 'text-white/90'}`}>
          {tipTimestamp ? (due ? 'due' : `${Math.floor(remaining)}s`) : '···'}
        </span>
      </div>
      <div className="mt-3 h-1 rounded-sm bg-white/[0.07] overflow-hidden">
        <div
          className="h-full rounded-sm transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct}%`, background: due ? STEEL_SOLID : 'oklch(0.78 0.06 237 / 0.75)' }}
        />
      </div>
      <div className="mt-2.5 flex justify-between font-mono text-[9px] text-[oklch(0.5_0.01_250)]">
        <span>target: 60s</span>
        <span>{tipTimestamp ? `mined ${timeAgo(tipTimestamp)}` : 'syncing'}</span>
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
    <div className="panel-nerva rounded-md p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[oklch(0.78_0.06_237)]" />
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[oklch(0.58_0.012_250)]">
            Difficulty · last 120 blocks
          </span>
        </div>
        <span className="font-mono text-[9.5px] text-[oklch(0.5_0.01_250)]">
          {data.length > 0 ? `~${formatHashrate(difficultyToHashrate(data[data.length - 1].d))} net hashrate` : '…'}
        </span>
      </div>
      <div className="mt-3 h-[92px]">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="nervaDiff" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={STEEL} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={STEEL} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="h" hide domain={['dataMin', 'dataMax']} />
              <ReTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0].payload as { h: number; d: number }
                  return (
                    <div className="rounded-md border border-[oklch(0.92_0.008_250/0.15)] bg-[oklch(0.14_0.018_255/0.95)] px-3 py-2 font-mono text-[10px] text-white/85">
                      <div className="text-[oklch(0.78_0.06_237)]">#{p.h.toLocaleString()}</div>
                      <div>diff {p.d.toLocaleString()}</div>
                      <div className="text-white/50">{formatHashrate(difficultyToHashrate(p.d))}</div>
                    </div>
                  )
                }}
              />
              <Area type="monotone" dataKey="d" stroke={STEEL} strokeWidth={1.4} fill="url(#nervaDiff)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center font-mono text-[10px] text-[oklch(0.5_0.01_250)]">
            loading difficulty history…
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────────── block feed ───────────── */

function BlockRow({ block, onOpen, selected, isNew }: { block: NervaBlockHeader; onOpen: (hash: string) => void; selected: boolean; isNew: boolean }) {
  const hasTx = (block.num_txes ?? 0) > 0
  return (
    <motion.button
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      onClick={() => onOpen(block.hash)}
      className={`w-full grid grid-cols-[auto_1fr_auto] sm:grid-cols-[92px_1fr_84px_92px_70px_70px] items-center gap-3 px-4 py-3 text-left border-b border-[oklch(0.92_0.008_250/0.07)] hover:bg-white/[0.04] transition-colors group ${
        selected ? 'bg-[oklch(0.78_0.06_237)]/8' : ''
      }`}
      style={isNew ? { animation: 'nerva-row-flash 1.6s ease-out 1' } : undefined}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isNew ? 'bg-[oklch(0.72_0.12_160)] animate-pulse' : 'bg-[oklch(0.78_0.06_237/0.5)]'}`} />
        <Mono className="text-[12.5px] text-white/90 group-hover:text-[oklch(0.83_0.055_237)] font-semibold">
          {block.height.toLocaleString()}
        </Mono>
      </div>
      <div className="hidden sm:flex items-center gap-2 min-w-0">
        <Mono className="text-[11px] text-white/55 truncate">{shortenHash(block.hash, 10, 8)}</Mono>
        <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-sm border ${hasTx ? 'bg-[oklch(0.62_0.08_306)]/14 text-[oklch(0.74_0.07_306)] border-[oklch(0.62_0.08_306)]/25' : 'bg-white/[0.04] text-white/35 border-white/[0.08]'}`}>
          {hasTx ? `${block.num_txes} tx` : 'coinbase'}
        </span>
      </div>
      <div className="text-right hidden sm:block">
        <Mono className="text-[11px] text-white/60">{formatBytes(block.block_size)}</Mono>
      </div>
      <div className="text-right hidden sm:block">
        <Mono className="text-[11px] text-[oklch(0.72_0.12_160)]/85">{formatXnv(block.reward, 4)}</Mono>
      </div>
      <div className="text-right">
        <Mono className="text-[11px] text-white/60">{(block.difficulty / 1000).toFixed(0)}k</Mono>
      </div>
      <div className="text-right">
        <Mono className="text-[10.5px] text-[oklch(0.5_0.01_250)]">{timeAgo(block.timestamp)}</Mono>
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
  const [seenHeights, setSeenHeights] = useState<Set<number>>(() => new Set())
  const [flashHeights, setFlashHeights] = useState<Set<number>>(() => new Set())
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
      const headers = await getBlockHeadersRange(Math.max(0, tip.height - 14), tip.height)
      const fresh = headers.slice().reverse()
      const known = seenHeights
      const freshFlash = new Set<number>()
      for (const b of fresh) {
        if (known.size > 0 && !known.has(b.height)) freshFlash.add(b.height)
      }
      setBlocks(fresh)
      setSeenHeights(new Set(fresh.map((b) => b.height)))
      setFlashHeights(freshFlash)
      lastTip.current = tip.height
    } catch { /* offline */ } finally {
      setSyncing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const tipTimestamp = useMemo(() => (blocks.length > 0 ? blocks[0].timestamp : undefined), [blocks])

  return (
    <div className="relative pt-28 pb-16 min-h-screen">
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        {/* header + search toolbar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <Radar className="w-5 h-5 text-[oklch(0.78_0.06_237)]" />
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Block explorer</h1>
              <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[oklch(0.72_0.12_160)] px-2.5 py-1 rounded-sm bg-[oklch(0.72_0.12_160)]/10 border border-[oklch(0.72_0.12_160)]/25">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[oklch(0.72_0.12_160)] opacity-70 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.12_160)]" />
                </span>
                {info?.status === 'OK' ? 'mainnet OK' : 'connecting…'}
              </span>
            </div>
            <p className="mt-2.5 text-[13.5px] text-[oklch(0.68_0.012_250)] max-w-xl">
              NERVA blocks, transactions and mempool, streamed straight from the public
              explorer API to your browser. No server, no cache, no keys.
            </p>
          </div>

          {/* search */}
          <div className="w-full md:w-[380px]">
            <div className="panel-nerva rounded-md flex items-stretch h-11 overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 min-w-0 flex-1">
                <Search className="w-4 h-4 text-white/35 shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void runSearch() }}
                  placeholder="Block height, block hash or tx hash"
                  className="flex-1 bg-transparent outline-none font-mono text-[12px] text-white/85 placeholder:text-white/30 min-w-0"
                  aria-label="Search blocks and transactions"
                />
              </div>
              <button
                onClick={() => { void runSearch() }}
                className="px-4 bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] font-semibold text-[12.5px] hover:bg-[oklch(0.7_0.08_236)] transition-colors"
                aria-label="Search"
              >
                Search
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
          <StatCard icon={Radio} label="Median block" value={info ? formatBytes(info.block_size_median) : '…'} sub="network median" />
        </div>

        {/* chart + countdown */}
        <div className="mt-4 grid lg:grid-cols-[1fr_320px] gap-4">
          <DifficultyChart tip={info?.height ?? lastTip.current} />
          <NextBlockCountdown tipTimestamp={tipTimestamp} />
        </div>

        {/* main two-column area */}
        <div className="mt-6 grid lg:grid-cols-[1fr_400px] gap-6 items-start">
          {/* block feed */}
          <div className="panel-nerva rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[oklch(0.92_0.008_250/0.1)]">
              <div className="flex items-center gap-2.5">
                <Boxes className="w-4 h-4 text-[oklch(0.78_0.06_237)]" />
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[oklch(0.58_0.012_250)]">
                  Latest blocks
                </span>
                <span className="font-mono text-[9.5px] text-[oklch(0.5_0.01_250)]">
                  · auto-refresh 10s
                </span>
              </div>
              <button
                onClick={() => { void refresh(); void loadFeed() }}
                className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/45 hover:text-[oklch(0.78_0.06_237)] transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="hidden sm:grid grid-cols-[92px_1fr_84px_92px_70px_70px] gap-3 px-4 py-2 border-b border-[oklch(0.92_0.008_250/0.08)] font-mono text-[8.5px] uppercase tracking-[0.16em] text-[oklch(0.5_0.01_250)]">
              <div>Height</div><div>Hash</div><div className="text-right">Size</div>
              <div className="text-right">Reward</div><div className="text-right">Diff</div><div className="text-right">Age</div>
            </div>
            <div>
              <AnimatePresence initial={false}>
                {blocks.length === 0 && (
                  <div className="px-4 py-8 font-mono text-[11px] text-[oklch(0.5_0.01_250)]">
                    {syncing ? 'syncing the chain tip…' : 'no data, network unreachable'}
                  </div>
                )}
                {blocks.map((b) => (
                  <BlockRow
                    key={b.hash}
                    block={b}
                    isNew={flashHeights.has(b.height)}
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
                  className="panel-nerva rounded-md p-8 text-center"
                >
                  <HashIcon className="w-8 h-8 mx-auto text-white/15" />
                  <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[oklch(0.55_0.012_250)]">
                    Select a block
                  </div>
                  <p className="mt-2.5 text-[12.5px] text-[oklch(0.65_0.012_250)] leading-relaxed">
                    Click any block to inspect its header, miner transaction and, for
                    blocks with transactions, every transfer it contains, with
                    payment-id detection.
                  </p>
                  <Link
                    href={`/nerva/explorer?block=${blocks[0]?.hash ?? ''}`}
                    className="mt-5 inline-flex items-center gap-1.5 font-mono text-[11px] text-[oklch(0.78_0.06_237)] hover:text-[oklch(0.86_0.05_237)] transition-colors"
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
          <div className="font-mono text-[10px] text-[oklch(0.5_0.01_250)] uppercase tracking-[0.14em]">
            Data: api.nerva.one (public explorer API) · RingCT transfer amounts are encrypted by design
          </div>
          <a
            href={NERVA_LINKS.explorer}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-white/50 hover:text-[oklch(0.78_0.06_237)] transition-colors uppercase tracking-[0.12em]"
          >
            Official explorer <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
