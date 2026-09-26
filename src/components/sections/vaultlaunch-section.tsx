'use client'

// VaultLaunch — the launchpad section of the homepage.
//
// House style: ivory MAISON skin, Fraunces display, hairline rules, editorial
// numbered steps (like the rest of the site). It explains the full lifecycle
// in detail and runs a self-contained graphic demo of the bonding curve:
// simulated buys walk the price up, graduation triggers the atomic migration,
// the seed locks forever.

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Reveal } from '@/components/site/reveal'

// ─────────────────────────────────────────────────────────────────
// Curve math (mirror of the on-chain formulas, see DEX.md / LAUNCHPAD.md)
// Mainnet gmu = 2: a 500 XEL seed graduates at 1,000 XEL of reserves.
// ─────────────────────────────────────────────────────────────────
const SEED = 500
const TARGET = SEED * 2 // 1,000 XEL: graduation (mainnet gmu = ×2)
const FEE_BPS = 50

function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buyOut(xelIn: number, reserves: number, circulating: number) {
  const net = xelIn * (1 - FEE_BPS / 10_000)
  return (circulating * net) / (reserves + net)
}

// ─────────────────────────────────────────────────────────────────
// The graphic demo: a bonding curve running live in the section
// ─────────────────────────────────────────────────────────────────
type DemoPhase = 'idle' | 'running' | 'graduating' | 'migrated'

function CurveDemo() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const inView = useInView(wrapRef, { once: true, margin: '-120px' })

  const [phase, setPhase] = useState<DemoPhase>('idle')
  const [reserves, setReserves] = useState(640)
  const [history, setHistory] = useState<number[]>(() => {
    // deterministic pre-history so the chart is never empty at rest
    const rnd = mulberry32(2026)
    let r = 640
    const pts: number[] = []
    for (let i = 0; i < 26; i++) {
      const net = (18 + rnd() * 34) * 0.995
      r += net
      const c = 25_000 - i * 26
      pts.push(r / c)
    }
    return pts
  })

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const migratedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // start when the section enters the viewport
  useEffect(() => {
    if (!inView || phase !== 'idle') return
    setPhase('running')
  }, [inView, phase])

  // the simulation loop
  useEffect(() => {
    if (phase !== 'running') return
    const rnd = mulberry32(Date.now() % 100_000)
    timerRef.current = setInterval(() => {
      setReserves((r) => {
        const isBuy = rnd() < 0.82
        const xelIn = isBuy ? 26 + rnd() * 74 : -(10 + rnd() * 26)
        const next = Math.max(560, r + xelIn)
        const circulating = Math.max(21_000, 25_000 - (next - 640) * 1.05)
        setHistory((h) => [...h, next / circulating].slice(-80))
        if (next >= TARGET) {
          if (timerRef.current) clearInterval(timerRef.current)
          setPhase('graduating')
          migratedTimeout.current = setTimeout(() => setPhase('migrated'), 3400)
        }
        return next
      })
    }, 300)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (migratedTimeout.current) clearTimeout(migratedTimeout.current)
    }
  }, [])

  function replay() {
    if (timerRef.current) clearInterval(timerRef.current)
    setReserves(640)
    setHistory((h) => h.slice(0, 26))
    setPhase('running')
  }

  // chart geometry
  const width = 640
  const height = 210
  const min = history.length ? Math.min(...history) : 0
  const max = history.length ? Math.max(...history) : 1
  const lo = min - (max - min) * 0.15
  const hi = max + (max - min) * 0.15
  const pts = history.map((v, i) => ({
    x: (i / Math.max(1, history.length - 1)) * (width - 8) + 4,
    y: height - ((v - lo) / (hi - lo)) * height,
  }))
  const line = pts.length
    ? `M ${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`
    : ''
  const area = pts.length > 1
    ? `${line} L ${pts[pts.length - 1].x.toFixed(1)},${height} L ${pts[0].x.toFixed(1)},${height} Z`
    : ''
  const head = pts[pts.length - 1]
  const price = history[history.length - 1] ?? 0
  const first = history[0] ?? price
  const change = first > 0 ? ((price - first) / first) * 100 : 0
  const progress = Math.min(1, reserves / TARGET)

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative border border-foreground/15 bg-card shadow-maison">
        {/* header strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/10 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center border border-vault/40 bg-vault/10 font-mono text-sm text-vault">✦</span>
            <div>
              <div className="text-sm font-semibold tracking-tight">NOVA <span className="font-mono text-[10px] font-normal text-muted-foreground">NovaPrivacy · demo project</span></div>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                {phase === 'migrated' ? 'LaunchDEX · XEL / NOVA' : 'bonding curve · fee 0.50%'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-xl font-semibold tabular-nums">
              {price < 1 ? price.toFixed(4) : price.toFixed(3)} <span className="font-mono text-[10px] font-normal text-muted-foreground">XEL</span>
            </div>
            <div className={`font-mono text-[10px] tabular-nums ${change >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(1)}% · simulated
            </div>
          </div>
        </div>

        {/* chart */}
        <div className="relative px-2 pt-3">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-[210px] w-full" role="img" aria-label="Simulated bonding curve price">
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke="oklch(0.225 0.008 80 / 0.08)" strokeDasharray="2 6" strokeWidth={1} />
            ))}
            {area && <path d={area} fill="oklch(0.52 0.09 70 / 0.08)" />}
            <motion.path
              d={line}
              fill="none"
              stroke={phase === 'migrated' ? 'oklch(0.48 0.07 210)' : 'oklch(0.52 0.09 70)'}
              strokeWidth={2}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
            />
            {head && phase !== 'migrated' && (
              <rect x={head.x - 3} y={head.y - 3} width={6} height={6} fill="oklch(0.52 0.09 70)">
                <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />
              </rect>
            )}
          </svg>

          {/* graduation overlay states */}
          {phase === 'graduating' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-[2px]"
            >
              <div className="border border-vault/40 bg-card px-8 py-6 text-center shadow-maison">
                <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-vault">2× crossed</div>
                <div className="mt-2 font-display text-2xl font-semibold">Graduation.</div>
                <div className="mt-3 space-y-1.5 font-mono text-[10px] text-muted-foreground">
                  {['collecting curve reserves…', 'seeding the LaunchDEX pool…', 'locking the seed forever…'].map((s, i) => (
                    <motion.div key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.9 }}>
                      <span className="mr-2 text-vault">▪</span>{s}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'migrated' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-card/85 backdrop-blur-[2px]"
            >
              <div className="border border-xusd/40 bg-card px-8 py-5 text-center shadow-maison">
                <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-xusd">migration complete</div>
                <div className="mt-2 font-display text-2xl font-semibold">On LaunchDEX.</div>
                <div className="mt-2 max-w-xs font-mono text-[10px] leading-relaxed text-muted-foreground">
                  the seed is protocol-locked forever · swaps pay 0.30%, half to providers
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* reserves strip */}
        <div className="border-t border-foreground/10 px-5 py-4">
          {phase !== 'migrated' ? (
            <>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-muted-foreground">
                  graduation at {TARGET.toLocaleString()} XEL reserves
                  <span className="text-foreground"> · {Math.round(reserves).toLocaleString()} now</span>
                </span>
                <span className="font-semibold text-vault">{(progress * 100).toFixed(1)}%</span>
              </div>
              <div className="mt-2 h-[3px] w-full bg-foreground/10">
                <motion.div
                  className="h-full bg-vault"
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ type: 'spring', stiffness: 50, damping: 16 }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-muted-foreground">
                <span>migrate() is permissionless: anyone can trigger it at 2×</span>
                <span>{Math.max(0, TARGET - reserves).toFixed(0)} XEL of buys to go</span>
              </div>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
              {/* the seed floor */}
              <div>
                <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                  <span className="text-vault">▣ seed locked forever · {Math.round(reserves * 0.995).toLocaleString()} XEL</span>
                  <span>provider depth · exitable any time</span>
                </div>
                <div className="mt-2 flex h-3 overflow-hidden border border-foreground/15">
                  <motion.div
                    className="h-full bg-vault"
                    initial={{ width: '100%' }}
                    animate={{ width: '72%' }}
                    transition={{ duration: 1.2, ease: [0.21, 0.47, 0.32, 0.98] }}
                  />
                  <motion.div
                    className="h-full bg-xusd/50"
                    initial={{ width: '0%' }}
                    animate={{ width: '28%' }}
                    transition={{ duration: 1.2, ease: [0.21, 0.47, 0.32, 0.98] }}
                  />
                </div>
              </div>
              <button
                onClick={replay}
                className="justify-self-start border border-foreground/20 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-vault hover:text-vault sm:justify-self-end"
              >
                ↻ replay the curve
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-center font-mono text-[10px] leading-relaxed text-muted-foreground">
        Simulation with fictional data · the math is the exact on-chain curve
        (out = C·net/(R+net), integer-exact in the contract)
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Lifecycle steps
// ─────────────────────────────────────────────────────────────────
const STEPS: { n: string; title: string; body: string; stat: string; statLabel: string }[] = [
  {
    n: '01',
    title: 'Propose',
    body: 'A builder deposits 526 XEL minimum: a 25 XEL submission fee, a 1 XEL asset budget and a 500 XEL seed. Anything above the minimum becomes extra curve liquidity — and a seed of 2,000 XEL or more graduates directly. Rejected proposals are refunded in full.',
    stat: '526 XEL',
    statLabel: 'minimum deposit',
  },
  {
    n: '02',
    title: 'The community decides',
    body: 'Every proposal faces a vote window of about one hour: one address one vote, voting is FREE on mainnet (the sybil dial sits at 0), 80% approval to pass. The team vesting plan is declared at propose and bound by the contract — the community votes on the exact schedule, not a promise.',
    stat: '1h / 80%',
    statLabel: 'window / approval',
  },
  {
    n: '03',
    title: 'Bonding curve',
    body: 'Accepted projects mint a REAL confidential XELIS asset — fixed max supply enforced by the protocol itself, buyers hold their tokens in their own wallets from the first second. Price is reserves over circulating supply, every trade pays 0.50%, and sells are never gated: not by trust, not by pause.',
    stat: '0.50%',
    statLabel: 'curve fee, both sides',
  },
  {
    n: '04',
    title: 'Graduation',
    body: 'At 2× the seed in reserves (1,000 XEL on a minimum seed) anyone can call migrate(): curve reserves and token inventory move atomically into a LaunchDEX pool, a one-time 0.5% fee funds the protocol, and the trading fee drops to 0.25% forever.',
    stat: '2×',
    statLabel: 'graduation trigger',
  },
  {
    n: '05',
    title: 'LaunchDEX, forever',
    body: 'The migration seed is protocol-locked for life: no admin, no emergency role, nobody can ever withdraw it. Providers who deepen the pool earn 50% of every swap fee, pro-rata, and can exit at any time, both sides, price-neutral.',
    stat: '∞',
    statLabel: 'seed liquidity lifetime',
  },
]

function StepCard({ step, i }: { step: (typeof STEPS)[number]; i: number }) {
  return (
    <Reveal delay={i * 0.07}>
      <div className="group relative h-full border border-foreground/12 bg-card/60 p-6 transition-colors hover:border-vault/40">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] tracking-[0.2em] text-vault">{step.n}</span>
          <span className="font-display text-2xl font-semibold text-gradient-vault tabular-nums">{step.stat}</span>
        </div>
        <div className="mt-1 text-right font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground">{step.statLabel}</div>
        <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">{step.title}</h3>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-vault transition-all duration-500 group-hover:w-full" aria-hidden />
      </div>
    </Reveal>
  )
}

// ─────────────────────────────────────────────────────────────────
// Numbers band
// ─────────────────────────────────────────────────────────────────
const FIGURES: { v: string; label: string; sub: string }[] = [
  { v: '0.50%', label: 'Curve Fee', sub: 'both sides, buys and sells' },
  { v: '2×', label: 'Graduation', sub: 'reserves over seed' },
  { v: '526', label: 'Min Deposit (XEL)', sub: '25 fee + 1 budget + 500 seed' },
  { v: '1h / 80%', label: 'Community Vote', sub: 'free · one address one vote' },
  { v: '0.30%', label: 'DEX Fee', sub: '50% to providers, pro-rata' },
  { v: '0', label: 'Rug Paths', sub: 'the seed never leaves' },
]

// ─────────────────────────────────────────────────────────────────
// Section
// ─────────────────────────────────────────────────────────────────
export function VaultLaunchSection() {
  return (
    <section
      id="vaultlaunch"
      className="relative py-20 md:py-28 px-5 md:px-8 bg-background overflow-hidden"
    >
      <div className="absolute inset-0 bg-dots opacity-30" />
      <div className="absolute top-1/4 right-1/4 w-[520px] h-[520px] rounded-full bg-vault/6 blur-[150px]" />
      <div className="absolute bottom-1/4 left-1/5 w-[420px] h-[420px] rounded-full bg-xusd/6 blur-[130px]" />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="max-w-3xl">
          <Reveal>
            <div className="inline-flex items-center gap-2.5 rounded-none border border-emerald-600/40 bg-emerald-500/10 px-3.5 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-emerald-700">
                Live on mainnet · since 23.09.2026
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1]">
              <span className="text-gradient-vault">VaultLaunch</span>
              <br />
              <span className="text-muted-foreground">Nothing launches without you.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
              A community-validated launchpad and a permanent-liquidity DEX, deployed
              and verified on the XELIS mainnet since <span className="text-foreground">23.09.2026</span>.
              Projects propose, holders vote, survivors trade on a bonding curve, and
              graduation migrates everything into a pool whose seed is locked for life.
              And since <span className="text-foreground">25.09.2026</span>, the{' '}
              <span className="text-vlt">community track</span>: anyone launches a real XELIS
              asset for ≈ 2 XEL on a virtual-reserve curve — no vote, no founder liquidity,
              the same locked-seed graduation. No pre-mines, no hidden team allocations,
              no rug geometry: the anti-rug floor is math, not a promise.
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="/launch"
                className="group inline-flex h-12 items-center bg-vault px-7 text-sm font-semibold text-primary-foreground transition-all hover:bg-vault/90 hover:shadow-[0_12px_40px_-10px_var(--vault)]"
              >
                Open the Launchpad
                <span className="ml-2 font-mono transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a
                href="/launch?view=coin-launch"
                className="group inline-flex h-12 items-center border border-vlt/60 px-7 text-sm font-semibold text-vlt transition-colors hover:bg-vlt/10"
              >
                Launch a coin · ≈ 2 XEL
                <span className="ml-2 font-mono transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a
                href="/launch?view=create"
                className="group inline-flex h-12 items-center border border-vault/50 px-7 text-sm font-semibold text-vault transition-colors hover:bg-vault/10"
              >
                Launch a project
                <span className="ml-2 font-mono transition-transform group-hover:translate-x-1">→</span>
              </a>
            </div>
          </Reveal>
        </div>

        {/* The lifecycle */}
        <Reveal delay={0.1}>
          <div className="mt-16 pt-10 border-t border-foreground/12">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-vault mb-8">
              The lifecycle, end to end
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((s, i) => (
                <StepCard key={s.n} step={s} i={i} />
              ))}
            </div>
          </div>
        </Reveal>

        {/* The graphic demo */}
        <Reveal delay={0.15}>
          <div className="mt-16 pt-10 border-t border-foreground/12">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
              <div>
                <div className="text-xs font-mono uppercase tracking-[0.2em] text-vault mb-3">
                  What a launch looks like
                </div>
                <h3 className="font-display text-2xl md:text-4xl font-semibold tracking-[-0.02em]">
                  A curve, live.
                </h3>
              </div>
              <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                Watch a project climb its bonding curve: simulated buys push the
                price up, reserves swell toward 4× the seed, graduation triggers
                the atomic migration and the seed locks forever.
              </p>
            </div>
            <CurveDemo />
          </div>
        </Reveal>

        {/* Numbers band */}
        <Reveal delay={0.1}>
          <div className="mt-16 border-t border-b border-foreground/10 grid grid-cols-2 md:grid-cols-6">
            {FIGURES.map((f, i) => (
              <div key={f.label} className={`px-4 py-6 text-center md:text-left ${i < FIGURES.length - 2 ? 'md:border-r md:border-foreground/10' : ''} ${i < 4 ? 'border-b border-foreground/10 md:border-b-0' : ''}`}>
                <div className="font-display text-2xl md:text-3xl font-semibold text-gradient-vault tabular-nums tracking-[-0.02em]">{f.v}</div>
                <div className="mt-2 text-xs font-semibold tracking-[-0.01em]">{f.label}</div>
                <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground mt-1">{f.sub}</div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Two contracts */}
        <div className="mt-16 grid md:grid-cols-2 gap-x-16 gap-y-12">
          <Reveal>
            <div>
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-vault mb-4">
                Contract one
              </div>
              <h3 className="font-display text-2xl font-semibold tracking-tight">
                VaultLaunch <span className="font-mono text-xs font-normal text-muted-foreground align-middle">v4.2</span>
              </h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                The launchpad itself: proposals, the vote window with refundable
                deposits, real native confidential assets created on-chain
                (fixed supply, 8 decimals), the bonding curve in true deposits,
                and the permissionless atomic migration.
              </p>
              <div className="mt-5 divide-y divide-foreground/10 border-t border-foreground/12">
                {[
                  ['Assets', 'native confidential, fixed supply'],
                  ['Vote deposits', '0.5 XEL, refundable, dial up to 10'],
                  ['Team allocation', '≤ 20%, vests after graduation'],
                  ['Tickers', 'on-chain registry, first come first served'],
                  ['Max projects', '8,192 per generation'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between py-2.5">
                    <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/80">{k}</span>
                    <span className="text-xs font-mono text-foreground/90 text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div>
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-xusd mb-4">
                Contract two
              </div>
              <h3 className="font-display text-2xl font-semibold tracking-tight">
                LaunchDEX <span className="font-mono text-xs font-normal text-muted-foreground align-middle">v1.3</span>
              </h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                The permanent home after graduation. One pool per asset, constant
                product, a seed that can never be withdrawn and providers who are
                always free to leave. Every swap fee is split between the protocol
                and the people who deepen the pool.
              </p>
              <div className="mt-5 divide-y divide-foreground/10 border-t border-foreground/12">
                {[
                  ['Seed floor', 'protocol-locked, forever (IX9)'],
                  ['Swap fee', '0.30%, split 50/50 by default'],
                  ['Fee split dial', 'admin-settable, hard-bounded 25/75%'],
                  ['Providers', 'exit pro-rata any time, ungated'],
                  ['Emergency role', 'can pause buys, never drain'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between py-2.5">
                    <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/80">{k}</span>
                    <span className="text-xs font-mono text-foreground/90 text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* Honest status + CTA */}
        <Reveal delay={0.1}>
          <div className="mt-16 dark-band px-6 md:px-10 py-10 md:py-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-dots opacity-[0.04]" aria-hidden />
            <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.28em] text-vault-soft">
                  Where it stands
                </div>
                <h3 className="mt-4 font-display text-2xl md:text-3xl font-medium tracking-tight leading-snug">
                  Specs frozen. Contracts rehearsed.{' '}
                  <span className="italic text-gradient-gold">Mainnet when it is ready.</span>
                </h3>
                <p className="mt-5 text-sm leading-relaxed text-ink-foreground/70">
                  Both contracts run 109 reference tests and five formal audit
                  gates in CI on every push: requirement traceability, mechanical
                  security, a 40-seed fuzz, SDK parity and documentation parity.
                  Internal audits only: no external review yet, and we say so.
                  The path to mainnet is a testnet rehearsal, an external audit
                  budget, then deployment. No date theater.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-[10px] font-mono uppercase tracking-[0.16em]">
                  <span className="text-vault-soft">▣ 109 reference tests</span>
                  <span className="text-ink-foreground/30">·</span>
                  <span className="text-xusd">5 audit gates in CI</span>
                  <span className="text-ink-foreground/30">·</span>
                  <span className="text-ink-foreground/60">external audit: not yet</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <a
                  href="https://github.com/XelisVault/xelis-vault/blob/main/docs/LAUNCHPAD.md"
                  target="_blank"
                  rel="noreferrer"
                  className="group relative inline-flex items-center justify-between border border-vault/50 px-6 py-4 text-vault transition-colors hover:bg-vault/10"
                >
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">Read the specification</span>
                  <span className="font-mono text-sm transition-transform group-hover:translate-x-1">→</span>
                  <span aria-hidden className="absolute left-0 top-0 h-2.5 w-2.5 border-l-2 border-t-2 border-vault transition-all duration-200 group-hover:h-4 group-hover:w-[3px]" />
                  <span aria-hidden className="absolute right-0 top-0 h-2.5 w-2.5 border-r-2 border-t-2 border-vault transition-all duration-200 group-hover:h-[3px] group-hover:w-4" />
                  <span aria-hidden className="absolute bottom-0 left-0 h-2.5 w-2.5 border-b-2 border-l-2 border-vault transition-all duration-200 group-hover:h-[3px] group-hover:w-4" />
                  <span aria-hidden className="absolute bottom-0 right-0 h-2.5 w-2.5 border-b-2 border-r-2 border-vault transition-all duration-200 group-hover:h-4 group-hover:w-[3px]" />
                </a>
                <a
                  href="https://discord.gg/UHpYAWbG"
                  target="_blank"
                  rel="noreferrer"
                  className="group relative inline-flex items-center justify-between border border-ink-foreground/25 px-6 py-4 text-ink-foreground/80 transition-colors hover:border-ink-foreground/60 hover:text-ink-foreground"
                >
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">Follow the progress on Discord</span>
                  <span className="font-mono text-sm transition-transform group-hover:translate-x-1">→</span>
                  <span aria-hidden className="absolute left-0 top-0 h-2.5 w-2.5 border-l-2 border-t-2 border-current opacity-50 transition-all duration-200 group-hover:h-4 group-hover:w-[3px]" />
                  <span aria-hidden className="absolute right-0 top-0 h-2.5 w-2.5 border-r-2 border-t-2 border-current opacity-50 transition-all duration-200 group-hover:h-[3px] group-hover:w-4" />
                  <span aria-hidden className="absolute bottom-0 left-0 h-2.5 w-2.5 border-b-2 border-l-2 border-current opacity-50 transition-all duration-200 group-hover:h-[3px] group-hover:w-4" />
                  <span aria-hidden className="absolute bottom-0 right-0 h-2.5 w-2.5 border-b-2 border-r-2 border-current opacity-50 transition-all duration-200 group-hover:h-4 group-hover:w-[3px]" />
                </a>
                <p className="px-1 pt-1 text-[10px] font-mono leading-relaxed text-ink-foreground/40">
                  Mainnet application under private preview. The testnet app for
                  the other contracts stays live in the meantime.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
