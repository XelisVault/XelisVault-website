'use client'

import { motion } from 'framer-motion'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'

const DISTRIBUTION = [
  { label: 'Oracle Rewards', pct: 55, amount: '5,500,000', note: 'Bitcoin-style halving · ~0.436 VLT/block', color: 'var(--vault)' },
  { label: 'Chat Relayer Rewards', pct: 10, amount: '1,000,000', note: 'VaultChat relayers · 10y vesting', color: 'oklch(0.52 0.06 150)' },
  { label: 'DEX Liquidity', pct: 10, amount: '1,000,000', note: 'VLT/XEL pool · 6mo unlock', color: 'oklch(0.68 0.11 75)' },
  { label: 'Founder Vesting', pct: 5, amount: '500,000', note: '4y vest, 1y cliff · on-chain', color: 'var(--vlt)' },
  { label: 'Founder Ongoing', pct: 5, amount: '500,000', note: '10y · from FeeDistributor', color: 'oklch(0.62 0.1 70)' },
  { label: 'Treasury', pct: 5, amount: '500,000', note: 'Governance-controlled', color: 'var(--xusd)' },
  { label: 'Community Airdrop', pct: 5, amount: '500,000', note: 'Testnet contributors', color: 'oklch(0.47 0.07 210)' },
  { label: 'Protocol Reserve', pct: 2, amount: '200,000', note: 'Emergency buffer', color: 'oklch(0.42 0.012 80)' },
  { label: 'Launch Airdrop', pct: 2, amount: '200,000', note: 'Launch community', color: 'oklch(0.55 0.05 200)' },
  { label: 'Bug Bounty', pct: 1, amount: '100,000', note: 'Perpetual · Immunefi', color: 'oklch(0.48 0.13 5)' },
]

const BURN_MECHANISMS = [
  {
    title: 'FeeDistributor (v10.3)',
    desc: 'Every protocol fee (swap, PSM, borrow, redemption) is split by FeeDistributor.slx: 50% burned permanently, 40% to treasury, 10% to founder (ongoing 10y vesting). No extra cost to users; only the split changes.',
  },
  {
    title: 'Reputation-Based Slashing',
    desc: 'When a price provider submits an outlier, their reputation drops (5 tiers: 0× to 1.5×). Bad behavior reduces the reward multiplier, and 50% of every slash is burned at the contract level. Bad behavior is deflationary.',
  },
  {
    title: 'Governance Burn',
    desc: 'VLT holders can vote to burn treasury VLT to accelerate deflation. Quorum of 10% required (with 365-day lock boost up to 2× voting power): a community-controlled supply sink.',
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
      <div className="absolute inset-0 bg-grid opacity-25" />
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full bg-vlt/7 blur-[140px]" />

      <div className="relative max-w-7xl mx-auto">
        {/* Header: copy + scarce-asset imagery */}
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
        <div className="max-w-3xl">
          <Reveal>
            <SectionLabel className="text-vlt">
              <span className="text-vlt">The Governance Token</span>
            </SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-medium tracking-[-0.02em] leading-[1.02]">
              VLT, fixed supply,
              <br />
              <span className="italic font-light text-gradient-vault">engineered to shrink.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
              10 million VLT minted at launch. No more will ever exist. Three independent
              burn mechanisms grind the supply down, projected to divide by 3 within a
              decade. Holders govern every parameter, earn oracle rewards, and capture
              protocol upside as the supply tightens.
            </p>
          </Reveal>
        </div>

        {/* Gold: the scarce asset metaphor */}
        <Reveal delay={0.25} className="hidden lg:block">
          <div className="relative max-w-[380px] mx-auto">
            <div className="absolute -inset-2.5 rounded-[6px] border border-vlt/30 pointer-events-none" />
            <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] ring-1 ring-foreground/15 shadow-maison">
              <img
                src="/images/privacy/private-governance.jpg"
                alt="A stark private boardroom lit through horizontal blinds: scarcity governed behind closed doors"
                className="w-full h-full object-cover animate-kenburns"
              />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-oklch(0.16 0.008 80 / 0.8) to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-ink-foreground">
                <div className="font-display italic text-sm">Scarcity, as monetary policy.</div>
                <div className="text-[9px] font-mono uppercase tracking-[0.18em] opacity-85 mt-0.5">
                  10M fixed · burn-driven deflation
                </div>
              </div>
            </div>
          </div>
        </Reveal>
        </div>

        {/* Distribution + supply: reference exhibits, hairline frames */}
        <div className="mt-16 grid lg:grid-cols-[1.3fr_1fr] gap-x-12 gap-y-12">
          {/* Distribution chart */}
          <Reveal>
            <div className="border-t border-foreground/12 pt-7">
              <div className="flex items-baseline justify-between mb-6">
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
              <div className="flex h-12 overflow-hidden border border-foreground/12">
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
            <div className="border-t border-foreground/12 pt-7 h-full">
              <div className="flex items-baseline justify-between mb-6">
                <div>
                  <div className="font-display text-xl font-semibold">Deflationary Curve</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">
                    Projected VLT supply · 10-year horizon
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="relative h-56 flex items-end justify-between gap-3 px-2">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={`vlt-bar-${i}`} className="border-t border-foreground/8 w-full" />
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
                        className="w-full bg-gradient-to-t from-vlt/20 to-vlt/80 relative group"
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

              <div className="mt-6 pt-6 border-t border-foreground/10">
                <div className="text-sm">
                  <span className="font-semibold">Supply ÷ 3</span> in 10 years
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">
                    From 10M to about 3M VLT
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Burn mechanisms: editorial columns */}
        <div className="mt-16">
          <Reveal>
            <div className="mb-6">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-vlt">
                Three Burn Mechanisms
              </span>
            </div>
          </Reveal>
          <RevealStagger className="grid md:grid-cols-3 gap-x-12">
            {BURN_MECHANISMS.map((b, i) => (
              <RevealItem key={`vlt-supply-${i}`}>
                <div className="border-t border-foreground/12 pt-7 h-full">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-lg font-semibold">{b.title}</h3>
                    <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-vlt/60 shrink-0">0{i + 1}</span>
                  </div>
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
