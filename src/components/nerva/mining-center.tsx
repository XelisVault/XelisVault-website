'use client'

/**
 * NERVA mining center — live network telemetry + solo mining calculator.
 *
 * Math is honest: CryptoNote difficulty D = expected hashes per block, so
 *   blocks/day = hashrate × 86400 / D
 *   P(≥1 block in t) = 1 − e^(−λ·t/24h)  (Poisson arrivals)
 *   median time to first block = ln(2)/λ
 * Solo mining on NERVA is a lottery: we show the variance, not a fake salary.
 */

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Cpu, Gauge, Blocks, Coins, Timer, Waves, Calculator, Pickaxe,
  TerminalSquare, AlertTriangle, RefreshCw, ArrowUpRight, Activity,
} from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import {
  useLiveInfo,
} from '@/components/nerva/live-info'
import {
  getBlockHeadersRange,
  formatXnv, formatHashrate, formatTimestamp, timeAgo,
  difficultyToHashrate, estimateSupply, NERVA_CONSTANTS, NERVA_LINKS,
  type NervaBlockHeader,
} from '@/lib/nerva/api'

const CHART_BLOCKS = 720 // ~12h of headers

function MonoLabel({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[oklch(0.55_0.01_250)]">{children}</div>
}

function StatTile({ icon: Icon, label, value, sub, accent = false }: {
  icon: React.ElementType; label: string; value: string; sub?: string; accent?: boolean
}) {
  return (
    <div className={`rounded-md border px-4 py-4 min-w-0 ${
      accent ? 'border-[oklch(0.78_0.06_237)]/30 bg-[oklch(0.78_0.06_237)]/[0.06]' : 'border-white/8 bg-white/[0.02]'
    }`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 shrink-0 ${accent ? 'text-[oklch(0.78_0.06_237)]' : 'text-white/35'}`} />
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[oklch(0.55_0.01_250)] truncate">{label}</span>
      </div>
      <div className="mt-2.5 font-mono text-[18px] font-semibold text-white tabular-nums truncate">{value}</div>
      {sub && <div className="mt-1 font-mono text-[9.5px] text-[oklch(0.62_0.01_250)] truncate">{sub}</div>}
    </div>
  )
}

/* ───────────────── the calculator ───────────────── */

const UNIT_FACTORS: Record<string, number> = { 'H/s': 1, 'kH/s': 1e3, 'MH/s': 1e6 }
const PRESETS = [
  { label: 'Laptop CPU ≈ 800 H/s', h: 800 },
  { label: 'Desktop (Ryzen 5/i5) ≈ 2.5 kH/s', h: 2500 },
  { label: 'High-end (Ryzen 9) ≈ 6 kH/s', h: 6000 },
]

function fmtDuration(days: number): string {
  if (!isFinite(days)) return 'never'
  const h = days * 24
  if (h < 1) return `${(h * 60).toFixed(0)} min`
  if (h < 48) return `${h.toFixed(1)} h`
  if (days < 60) return `${days.toFixed(1)} days`
  if (days < 730) return `${(days / 30.4).toFixed(1)} months`
  return `${(days / 365.25).toFixed(1)} years`
}

function CalculatorCard({ difficulty, rewardXnv }: { difficulty: number; rewardXnv: number }) {
  const [hr, setHr] = useState('2500')
  const [unit, setUnit] = useState('kH/s')

  const hashrate = useMemo(() => {
    const v = parseFloat(hr.replace(',', '.'))
    if (!isFinite(v) || v <= 0) return 0
    return v * (UNIT_FACTORS[unit] ?? 1)
  }, [hr, unit])

  const net = difficultyToHashrate(difficulty)
  const lambda = hashrate > 0 && difficulty > 0 ? (hashrate * 86400) / difficulty : 0 // blocks/day
  const p24 = lambda > 0 ? 1 - Math.exp(-lambda) : 0
  const p7 = lambda > 0 ? 1 - Math.exp(-lambda * 7) : 0
  const xnvDay = lambda * rewardXnv
  const share = net > 0 ? (hashrate / net) * 100 : 0
  const median = lambda > 0 ? Math.LN2 / lambda : Infinity

  return (
    <div className="rounded-md border border-[oklch(0.78_0.06_237)]/25 bg-[oklch(0.78_0.06_237)]/[0.04] p-6">
      <div className="flex items-center gap-2.5">
        <Calculator className="w-4.5 h-4.5 text-[oklch(0.78_0.06_237)]" />
        <h3 className="text-[16px] font-semibold text-white">Solo mining calculator</h3>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="font-mono text-[9px] uppercase tracking-[0.16em] text-[oklch(0.55_0.01_250)]" htmlFor="hr">
            Your hashrate
          </label>
          <div className="mt-2 flex rounded-md border border-white/12 overflow-hidden focus-within:border-[oklch(0.78_0.06_237)]/50 transition-colors">
            <input
              id="hr"
              inputMode="decimal"
              value={hr}
              onChange={(e) => setHr(e.target.value.replace(/[^\d.,]/g, ''))}
              className="flex-1 min-w-0 bg-transparent px-3.5 h-11 font-mono text-[14px] text-white outline-none tabular-nums"
              aria-label="Your hashrate"
            />
            <div className="flex border-l border-white/10">
              {Object.keys(UNIT_FACTORS).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`px-3 h-11 font-mono text-[11px] transition-colors ${
                    unit === u ? 'bg-[oklch(0.78_0.06_237)]/15 text-[oklch(0.88_0.1_225)]' : 'text-white/45 hover:text-white/80'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => { setHr(String(p.h)); setUnit(p.h >= 1000 ? 'kH/s' : 'H/s'); if (p.h >= 1000) setHr(String(p.h / 1000)) }}
                className="px-2.5 h-7 rounded-sm border border-white/10 bg-white/[0.03] font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/55 hover:border-[oklch(0.78_0.06_237)]/40 hover:text-white/85 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="rounded-md bg-[oklch(0.12_0.018_255)] px-4 py-3.5">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[oklch(0.55_0.01_250)]">Expected reward</div>
          <div className="mt-1.5 font-mono text-[17px] font-semibold text-[oklch(0.85_0.08_140)] tabular-nums">
            {xnvDay >= 0.01 ? xnvDay.toFixed(2) : xnvDay.toExponential(1)} <span className="text-[11px] text-white/40">XNV/day</span>
          </div>
          <div className="mt-1 font-mono text-[9.5px] text-[oklch(0.62_0.01_250)]">{lambda > 0 ? `${lambda < 0.01 ? lambda.toExponential(1) : lambda.toFixed(lambda < 1 ? 3 : 2)} blocks/day · ${share.toFixed(2)}% of network` : '—'}</div>
        </div>
        <div className="rounded-md bg-[oklch(0.12_0.018_255)] px-4 py-3.5">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[oklch(0.55_0.01_250)]">P(≥1 block in 24 h)</div>
          <div className="mt-1.5 font-mono text-[17px] font-semibold text-[oklch(0.88_0.1_225)] tabular-nums">{(p24 * 100).toFixed(p24 < 0.1 ? 2 : 1)}%</div>
          <div className="mt-1 font-mono text-[9.5px] text-[oklch(0.62_0.01_250)]">7 days: {(p7 * 100).toFixed(p7 < 0.1 ? 2 : 1)}%</div>
        </div>
        <div className="rounded-md bg-[oklch(0.12_0.018_255)] px-4 py-3.5">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[oklch(0.55_0.01_250)]">Median wait for a block</div>
          <div className="mt-1.5 font-mono text-[17px] font-semibold text-white tabular-nums">{fmtDuration(median)}</div>
          <div className="mt-1 font-mono text-[9.5px] text-[oklch(0.62_0.01_250)]">coin reward {rewardXnv.toFixed(3)} XNV + fees</div>
        </div>
      </div>

      <div className="mt-5 flex gap-2.5 rounded-md border border-[oklch(0.7_0.15_45)]/25 bg-[oklch(0.7_0.15_45)]/[0.05] px-4 py-3">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-[oklch(0.75_0.15_60)]" />
        <p className="text-[12px] leading-relaxed text-[oklch(0.75_0.01_250)]">
          Averages lie here: solo mining is a lottery. You may find zero blocks for
          weeks and then one full block lands at once — the 24 h probability is the
          honest number to watch. NERVA has no pools by design, so there is no
          steady trickle, ever.
        </p>
      </div>
    </div>
  )
}

/* ───────────────── page ───────────────── */

export function MiningCenter() {
  const { info, refresh } = useLiveInfo()
  const [recent, setRecent] = useState<NervaBlockHeader[]>([])
  const [chart, setChart] = useState<{ height: number; difficulty: number }[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const tip = info?.height ?? 0
      const end = tip > 0 ? tip : 0
      const start = Math.max(0, end - 59)
      const [recentHeaders, c1, c2, c3, c4, c5, c6, c7, c8] = await Promise.all([
        getBlockHeadersRange(start, end),
        ...Array.from({ length: 8 }, (_, i) => {
          const s = Math.max(0, end - CHART_BLOCKS + i * (CHART_BLOCKS / 8))
          const e = Math.max(0, end - CHART_BLOCKS + (i + 1) * (CHART_BLOCKS / 8) - 1)
          return s <= e ? getBlockHeadersRange(Math.round(s), Math.round(e)) : Promise.resolve([])
        }),
      ])
      setRecent(recentHeaders.slice().reverse()) // newest first
      setChart([...c1, ...c2, ...c3, ...c4, ...c5, ...c6, ...c7, ...c8]
        .filter((h) => h && typeof h.height === 'number')
        .sort((a, b) => a.height - b.height)
        .map((h) => ({ height: h.height, difficulty: Number(h.difficulty) })))
    } catch {
      /* keep whatever we had */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [info?.height !== undefined]) // initial load once info lands
  // re-load on manual refresh only (headers are 60s-cached server-side of the browser)

  const stats = useMemo(() => {
    if (recent.length < 2) return null
    const gaps: number[] = []
    for (let i = 0; i + 1 < recent.length; i++) {
      const gap = Math.abs(recent[i].timestamp - recent[i + 1].timestamp)
      if (gap > 0 && gap < 3600) gaps.push(gap)
    }
    const avg = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0
    const rewards = recent.map((h) => Number(h.reward))
    const avgReward = rewards.length ? rewards.reduce((a, b) => a + b, 0) / rewards.length : 0
    return { avgBlockTime: avg, gaps, avgReward }
  }, [recent])

  const netHashrate = info ? difficultyToHashrate(info.difficulty) : 0
  const rewardXnv = stats ? Number(formatXnv(Math.round(stats.avgReward))) : NERVA_CONSTANTS.tailReward
  const supply = info ? estimateSupply(info.height) : 0

  const chartMin = chart.length ? Math.min(...chart.map((c) => c.difficulty)) : 0
  const chartMax = chart.length ? Math.max(...chart.map((c) => c.difficulty)) : 1

  return (
    <div className="pt-32 sm:pt-36 pb-24">
      <div className="mx-auto max-w-6xl px-5 md:px-8">

        {/* hero */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <MonoLabel>Mining · Network</MonoLabel>
          <h1 className="mt-4 text-3xl sm:text-[42px] leading-[1.05] font-bold text-white">
            One CPU, one vote —<br />
            <span className="text-[oklch(0.78_0.06_237)]">the NERVA mining center</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[oklch(0.72_0.012_250)]">
            Live network telemetry and an honest solo-mining calculator. NERVA is
            mined only with CPUs — CryptoNight-Adaptive v6, no pools, no ASICs — so
            the machine you are reading this on is the hardware class that secures
            the chain. These are the odds it actually plays at.
          </p>
        </motion.div>

        {/* stat tiles */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-9 grid grid-cols-2 md:grid-cols-4 gap-3.5"
        >
          <StatTile icon={Activity} label="Network hashrate" value={formatHashrate(netHashrate)} sub={`≈ difficulty / 60 s target`} accent />
          <StatTile icon={Gauge} label="Difficulty" value={info ? info.difficulty.toLocaleString() : '····'} sub={info ? `LWMA @ height ${info.height.toLocaleString()}` : undefined} />
          <StatTile icon={Timer} label="Avg block time (60)" value={stats ? `${stats.avgBlockTime.toFixed(1)} s` : '····'} sub="target 60 s" />
          <StatTile icon={Coins} label="Reward / block" value={`${rewardXnv.toFixed(3)} XNV`} sub="tail emission 0.3 + fees" />
          <StatTile icon={Blocks} label="Height" value={info ? info.height.toLocaleString() : '····'} sub={info ? `${info.tx_count.toLocaleString()} txs total` : undefined} />
          <StatTile icon={Waves} label="Mempool" value={info ? `${info.tx_pool_size}` : '····'} sub="pending transactions" />
          <StatTile icon={Pickaxe} label="Supply (est.)" value={`${(supply / 1e6).toFixed(2)}M XNV`} sub="mined to date" />
          <StatTile icon={Cpu} label="Algorithm" value="CN-Adaptive v6" sub="CPU only · fork v13" />
        </motion.div>

        {/* difficulty chart */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.16 }}
          className="mt-10 rounded-md border border-white/8 bg-white/[0.02] p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Waves className="w-4 h-4 text-[oklch(0.78_0.06_237)]" />
              <h2 className="text-[15px] font-semibold text-white">Difficulty — last ~12 h</h2>
            </div>
            <button
              onClick={() => { void refresh(); void load() }}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm border border-white/10 font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/55 hover:text-white/90 hover:border-white/25 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              refresh
            </button>
          </div>
          <div className="mt-4 h-[180px]">
            {chart.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="diffFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.78 0.06 237 / 0.35)" />
                      <stop offset="100%" stopColor="oklch(0.78 0.06 237 / 0.02)" />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="height"
                    tick={{ fill: 'oklch(0.55 0.01 250)', fontSize: 9, fontFamily: 'monospace' }}
                    tickFormatter={(v: number) => (v / 1000).toFixed(0) + 'k'}
                    axisLine={{ stroke: 'oklch(0.3 0.01 250)' }}
                    tickLine={false}
                    minTickGap={40}
                  />
                  <YAxis
                    domain={[Math.max(0, chartMin * 0.95), chartMax * 1.05]}
                    tick={{ fill: 'oklch(0.55 0.01 250)', fontSize: 9, fontFamily: 'monospace' }}
                    tickFormatter={(v: number) => (v / 1e6).toFixed(2) + 'M'}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={{ background: 'oklch(0.12 0.018 255)', border: '1px solid oklch(0.3 0.01 250)', borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }}
                    labelStyle={{ color: 'oklch(0.62 0.01 250)' }}
                    formatter={(v: number) => [v.toLocaleString(), 'difficulty']}
                    labelFormatter={(v: number) => `block ${v.toLocaleString()}`}
                  />
                  <Area type="monotone" dataKey="difficulty" stroke="oklch(0.78 0.06 237)" strokeWidth={1.5} fill="url(#diffFill)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
                {loading ? 'loading headers…' : 'no data'}
              </div>
            )}
          </div>
        </motion.div>

        {/* calculator */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10"
        >
          <CalculatorCard difficulty={info?.difficulty ?? 0} rewardXnv={rewardXnv} />
        </motion.div>

        {/* recent blocks */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.24 }}
          className="mt-10 rounded-md border border-white/8 bg-white/[0.02] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2.5">
            <Blocks className="w-4 h-4 text-[oklch(0.78_0.06_237)]" />
            <h2 className="text-[15px] font-semibold text-white">Recent blocks</h2>
            <span className="font-mono text-[9.5px] text-[oklch(0.55_0.01_250)] ml-auto uppercase tracking-[0.14em]">newest first · last 60</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="font-mono text-[9px] uppercase tracking-[0.14em] text-[oklch(0.55_0.01_250)]">
                  <th className="px-5 py-2.5 font-normal">Height</th>
                  <th className="px-3 py-2.5 font-normal">Found</th>
                  <th className="px-3 py-2.5 font-normal">Reward</th>
                  <th className="px-3 py-2.5 font-normal">Tx</th>
                  <th className="px-3 py-2.5 font-normal">Size</th>
                  <th className="px-5 py-2.5 font-normal">Hash</th>
                </tr>
              </thead>
              <tbody>
                {recent.slice(0, 15).map((h) => (
                  <tr key={h.hash} className="border-t border-white/5 hover:bg-white/[0.025] transition-colors">
                    <td className="px-5 py-2.5 font-mono text-[11.5px] text-[oklch(0.83_0.055_237)] tabular-nums">
                      <Link href={`/nerva/explorer?block=${h.hash}`} className="hover:underline">{h.height.toLocaleString()}</Link>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10.5px] text-white/55">{timeAgo(h.timestamp)}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[oklch(0.85_0.08_140)] tabular-nums">{formatXnv(Number(h.reward), 4)}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-white/70 tabular-nums">{h.num_txes}</td>
                    <td className="px-3 py-2.5 font-mono text-[10.5px] text-white/50 tabular-nums">{(h.block_size / 1024).toFixed(2)} kB</td>
                    <td className="px-5 py-2.5 font-mono text-[10.5px] text-white/40">
                      <Link href={`/nerva/explorer?block=${h.hash}`} className="hover:text-white/70 transition-colors">{h.hash.slice(0, 14)}…</Link>
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
                    {loading ? 'loading…' : 'unreachable'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* how to mine */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.28 }}
          className="mt-10 grid lg:grid-cols-[1.2fr_1fr] gap-6"
        >
          <div className="rounded-md border border-white/8 bg-white/[0.02] p-6">
            <div className="flex items-center gap-2.5">
              <TerminalSquare className="w-4 h-4 text-[oklch(0.78_0.06_237)]" />
              <h2 className="text-[16px] font-semibold text-white">Start mining in two commands</h2>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-[oklch(0.7_0.01_250)]">
              Mining lives inside the official wallet — solo, to your own address,
              no account anywhere. The commands below are the wallet&apos;s own
              (<span className="font-mono text-[11px] text-[oklch(0.83_0.055_237)]">simplewallet.cpp</span>):
            </p>
            <div className="mt-4 space-y-2.5 font-mono text-[11.5px]">
              <div className="rounded-sm bg-[oklch(0.12_0.018_255)] border border-white/6 px-4 py-3 text-[oklch(0.83_0.055_237)]">
                <span className="text-white/40">$</span> nerva-wallet-cli
              </div>
              <div className="rounded-sm bg-[oklch(0.12_0.018_255)] border border-white/6 px-4 py-3 text-[oklch(0.83_0.055_237)]">
                <span className="text-white/40">[wallet: …]:</span> start_mining 4 bg_mining
              </div>
              <div className="rounded-sm bg-[oklch(0.12_0.018_255)] border border-white/6 px-4 py-3 text-[oklch(0.83_0.055_237)]">
                <span className="text-white/40">[wallet: …]:</span> stop_mining
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-[oklch(0.62_0.01_250)]">
              Threads first (leave one core free), <span className="font-mono text-[11px]">bg_mining</span> throttles
              when you use the machine. <span className="text-white/75">NervaOne</span> bundles wallet + miner behind
              one install. Solo means your node, your template, your block.
            </p>
          </div>
          <div className="rounded-md border border-white/8 bg-white/[0.02] p-6 flex flex-col">
            <div className="flex items-center gap-2.5">
              <Pickaxe className="w-4 h-4 text-[oklch(0.78_0.06_237)]" />
              <h2 className="text-[16px] font-semibold text-white">Why solo only?</h2>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-[oklch(0.7_0.01_250)]">
              Pools centralise hashrate, censor transactions and re-centralise a
              decentralised chain. NERVA removed the incentive entirely: a coin
              mined by a thousand laptops beats one mined by a warehouse.
            </p>
            <ul className="mt-4 space-y-2.5 text-[12.5px] text-[oklch(0.72_0.012_250)]">
              <li className="flex gap-2.5"><span className="text-[oklch(0.78_0.06_237)]">→</span> full node required to mine — security follows</li>
              <li className="flex gap-2.5"><span className="text-[oklch(0.78_0.06_237)]">→</span> CryptoNight-Adaptive v6 resists GPU/ASIC</li>
              <li className="flex gap-2.5"><span className="text-[oklch(0.78_0.06_237)]">→</span> block found = full reward, no pool fee</li>
              <li className="flex gap-2.5"><span className="text-[oklch(0.78_0.06_237)]">→</span> variance is the price of decentralisation</li>
            </ul>
            <div className="mt-auto pt-5">
              <a
                href="https://docs.nerva.one/overview/mining/"
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[oklch(0.78_0.06_237)] hover:text-[oklch(0.85_0.07_237)] transition-colors"
              >
                official mining guide <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
