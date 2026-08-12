'use client'

import { motion } from 'framer-motion'
import { Flame, TrendingDown, Users, Vote } from 'lucide-react'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'

const DISTRIBUTION = [
  { label: 'Oracle Rewards', pct: 55, amount: '5,500,000', note: '10 years · dynamic', color: 'var(--vault)' },
  { label: 'Chat Relayer Rewards', pct: 10, amount: '1,000,000', note: 'VaultChat relayers · 10y', color: 'oklch(0.7 0.2 320)' },
  { label: 'DEX Liquidity', pct: 10, amount: '1,000,000', note: 'VLT/XEL pool · 6mo unlock', color: 'oklch(0.7 0.18 160)' },
  { label: 'Founder Vesting', pct: 5, amount: '500,000', note: '4y vest, 1y cliff · on-chain', color: 'var(--vlt)' },
  { label: 'Founder Ongoing', pct: 5, amount: '500,000', note: '10y · from FeeDistributor', color: 'oklch(0.75 0.18 80)' },
  { label: 'Treasury', pct: 5, amount: '500,000', note: 'Governance-controlled', color: 'var(--xusd)' },
  { label: 'Community Airdrop', pct: 5, amount: '500,000', note: 'Testnet contributors', color: 'oklch(0.78 0.18 195)' },
  { label: 'Protocol Reserve', pct: 2, amount: '200,000', note: 'Emergency buffer', color: 'oklch(0.65 0.15 280)' },
  { label: 'Launch Airdrop', pct: 2, amount: '200,000', note: 'Launch community', color: 'oklch(0.7 0.15 200)' },
  { label: 'Bug Bounty', pct: 1, amount: '100,000', note: 'Perpetual · Immunefi', color: 'oklch(0.65 0.24 25)' },
]

const BURN_MECHANISMS = [
  {
    icon: Flame,
    title: 'FeeDistributor (v10.3)',
    desc: 'Every protocol fee (swap, PSM, borrow, redemption) is split by FeeDistributor.slx: 50% burned permanently, 40% to treasury, 10% to founder (ongoing 10y vesting). No extra cost to users — only the split changes.',
  },
  {
    icon: TrendingDown,
    title: 'Reputation-Based Slashing',
    desc: 'When a price provider submits an outlier, their reputation drops (5 tiers: 0× to 1.5×). Bad behavior reduces reward multiplier — and 50% of every slash is burned at the contract level. Bad behavior is deflationary.',
  },
  {
    icon: Vote,
    title: 'Governance Burn',
    desc: 'VLT holders can vote to burn treasury VLT to accelerate deflation. Quorum of 10% required (with 365-day lock boost up to 2× voting power) — a community-controlled supply sink.',
  },
]

const SUPPLY_CURVE = [
  { year: 'Y0', supply: 10.0 },
  { year: 'Y2', supply: 8.5 },
  { year: 'Y5', supply: 6.0 },
  { year: 'Y7', supply: 4.5 },
  { year: 'Y10', supply: 3.0 },
]

export function Vlt() {
  const max = 10.0

  return (
    <section
      id="vlt"
      className="relative py-20 md:py-28 px-5 md:px-8 bg-background overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full bg-vlt/8 blur-[140px]" />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="max-w-3xl">
          <Reveal>
            <SectionLabel className="text-vlt">
              <span className="text-vlt">The Governance Token</span>
            </SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1]">
              VLT — fixed supply,
              <br />
              <span className="text-gradient-vault">engineered to shrink.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
              10 million VLT minted at launch. No more will ever exist. Three independent
              burn mechanisms grind the supply down — projected to divide by 3 within a
              decade. Holders govern every parameter, earn oracle rewards, and capture
              protocol upside as the supply tightens.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid lg:grid-cols-[1.3fr_1fr] gap-8">
          {/* Distribution chart */}
          <Reveal>
            <div className="rounded-2xl glass-panel p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="font-display text-xl font-semibold">Token Distribution</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">
                    Total Supply · 10,000,000 VLT · Fixed
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-semibold text-vlt">10M</div>
                  <div className="text-xs text-muted-foreground">VLT</div>
                </div>
              </div>

              {/* Stacked bar */}
              <div className="flex h-12 rounded-lg overflow-hidden border border-border">
                {DISTRIBUTION.map((d, i) => (
                  <motion.div
                    key={`vlt-legend-${i}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${d.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
                    style={{ backgroundColor: d.color }}
                    className="relative group"
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] font-mono font-bold text-white drop-shadow">
                        {d.pct}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-6 grid sm:grid-cols-2 gap-x-6 gap-y-3">
                {DISTRIBUTION.map((d, i) => (
                  <RevealItem key={`vlt-burn-${i}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium truncate">{d.label}</span>
                          <span className="text-xs font-mono text-muted-foreground">{d.pct}%</span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground font-mono">{d.note}</span>
                          <span className="text-xs font-mono">{d.amount}</span>
                        </div>
                      </div>
                    </div>
                  </RevealItem>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Supply curve */}
          <Reveal delay={0.1}>
            <div className="rounded-2xl glass-panel p-6 md:p-8 h-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="font-display text-xl font-semibold">Deflationary Curve</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">
                    Projected VLT supply · 10-year horizon
                  </div>
                </div>
                <Users className="w-5 h-5 text-vlt" />
              </div>

              {/* Chart */}
              <div className="relative h-56 flex items-end justify-between gap-3 px-2">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={`vlt-bar-${i}`} className="border-t border-border/50 w-full" />
                  ))}
                </div>

                {SUPPLY_CURVE.map((point, i) => {
                  const h = (point.supply / max) * 100
                  return (
                    <div key={`vlt-point-${i}`} className="relative flex-1 flex flex-col items-center justify-end h-full">
                      <motion.div
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
                        className="w-full rounded-t-md bg-gradient-to-t from-vlt/20 to-vlt/80 relative group"
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-mono font-semibold text-vlt whitespace-nowrap">
                          {point.supply}M
                        </div>
                      </motion.div>
                      <div className="mt-2 text-xs font-mono text-muted-foreground">{point.year}</div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-vlt/10 border border-vlt/20 flex items-center justify-center text-vlt">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Supply ÷ 3</span> in 10 years
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      From 10M → ~3M VLT
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Burn mechanisms */}
        <div className="mt-16">
          <Reveal>
            <div className="flex items-center gap-2 mb-6">
              <Flame className="w-4 h-4 text-vlt" />
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-vlt">
                Three Burn Mechanisms
              </span>
            </div>
          </Reveal>
          <RevealStagger className="grid md:grid-cols-3 gap-4">
            {BURN_MECHANISMS.map((b, i) => (
              <RevealItem key={`vlt-supply-${i}`}>
                <div className="h-full rounded-2xl glass-panel hover:glass-panel-hover p-6 transition-all">
                  <div className="w-11 h-11 rounded-xl bg-vlt/10 border border-vlt/20 flex items-center justify-center text-vlt">
                    <b.icon className="w-5 h-5" />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold">{b.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </div>
    </section>
  )
}
