'use client'

import { motion } from 'framer-motion'
import { Coins, ShieldAlert, Gauge, Repeat, CheckCircle2 } from 'lucide-react'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'

const STEPS = [
  {
    n: '01',
    title: 'Stake & Register',
    desc: 'Anyone stakes 100 VLT and registers as a provider via XelisVaultMiner. Reputation starts at 0 and climbs to 10,000 with good behavior. 5 reward tiers: 0× (banned), 0.25× (critical), 0.50× (warning), 1.0× (good), 1.5× (excellent).',
    icon: Coins,
  },
  {
    n: '02',
    title: 'Submit Prices',
    desc: 'Fetch prices from MEXC, CoinEx, CoinGecko, or your own source. Submit signed prices every cycle (5 blocks / 25 seconds). Bootstrap mode works with just 3 providers, auto-disables when 10+ are active.',
    icon: Repeat,
  },
  {
    n: '03',
    title: 'Median Aggregation',
    desc: 'Every cycle, the contract sorts all submissions, computes the median, and identifies valid prices within ±5% of that median. Circuit breakers trigger at 5% deviation, 20% callback threshold, or 100-block hard stale.',
    icon: Gauge,
  },
  {
    n: '04',
    title: 'Rewards & Slashing',
    desc: 'Valid providers earn VLT rewards scaled by reputation tier (up to 1.5× multiplier). Outliers lose reputation points and may drop tiers — slashing from stake is burned (50%) and sent to treasury (50%).',
    icon: ShieldAlert,
  },
]

const PROVIDER_STATS = [
  { label: 'Min Stake', value: '100', unit: 'VLT' },
  { label: 'Cycle Length', value: '25', unit: 'sec' },
  { label: 'Reward Tiers', value: '5', unit: '0× → 1.5×' },
  { label: 'Reward Budget', value: '6M', unit: 'VLT / 10y' },
]

export function Oracle() {
  return (
    <section
      id="oracle"
      className="relative py-20 md:py-28 px-5 md:px-8 bg-background overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-vault/8 blur-[140px]" />

      <div className="relative max-w-7xl mx-auto">
        <div className="max-w-3xl">
          <Reveal>
            <SectionLabel>The Oracle</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1]">
              <span className="text-gradient-vault">StakedOracle</span>
              <br />
              <span className="text-muted-foreground">permissionless by design.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
              No permissioned node operators. No backdoor admin keys. Anyone with 100 VLT
              can become a price provider — and economic slashing keeps them honest. The
              median of all valid submissions becomes the on-chain truth, every 25 seconds.
            </p>
          </Reveal>
        </div>

        {/* Stats strip */}
        <Reveal delay={0.2}>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl glass-panel overflow-hidden">
            {PROVIDER_STATS.map((s, i) => (
              <div key={`oracle-info-${i}`} className="p-5 md:p-6 bg-card/30">
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-display text-2xl md:text-3xl font-semibold text-vault">{s.value}</span>
                  <span className="text-xs text-muted-foreground font-mono">{s.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Flow diagram */}
        <RevealStagger className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((step, i) => (
            <RevealItem key={`oracle-step-${i}`}>
              <div className="relative h-full rounded-2xl glass-panel p-6">
                {/* Connector arrow */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="text-vault/40"
                    >
                      →
                    </motion.div>
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-vault/10 border border-vault/20 flex items-center justify-center text-vault">
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground/60">{step.n}</span>
                </div>

                <h3 className="mt-5 font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>

        {/* Slashing visualization */}
        <Reveal delay={0.2}>
          <div className="mt-16 rounded-2xl glass-panel p-6 md:p-10">
            <div className="grid md:grid-cols-[1fr_1.4fr] gap-10 items-center">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-red-400">
                  <ShieldAlert className="w-4 h-4" />
                  Anti-Sybil Protection
                </div>
                <h3 className="mt-4 font-display text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
                  Attack the oracle and
                  <br />
                  <span className="text-red-400">you fund its deflation.</span>
                </h3>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  A would-be attacker trying to spawn 1,000 bots to manipulate the median
                  would need to stake 100,000 VLT — 1% of total supply. Even then, the
                  reputation system drains those bots until they fall below the 1,000 threshold
                  and get auto-deactivated (dropping to the 0× tier, which earns no rewards).
                  Every attack burns VLT for the rest of the holders.
                </p>
              </div>

              {/* Slashing flow viz */}
              <div className="space-y-3">
                {[
                  { label: 'Outlier submitted', sub: 'Price >5% from median', icon: ShieldAlert, color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/5' },
                  { label: 'Reputation drops', sub: 'May fall to lower reward tier (0.25× or 0×)', icon: Gauge, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/5' },
                  { label: 'Stake slashed', sub: '50% burned · permanent supply reduction', icon: CheckCircle2, color: 'text-vlt', border: 'border-vlt/30', bg: 'bg-vlt/5' },
                  { label: '50% to treasury', sub: 'Community-controlled VLT', icon: Coins, color: 'text-vault', border: 'border-vault/30', bg: 'bg-vault/5' },
                ].map((step, i) => (
                  <motion.div
                    key={`oracle-step-${i}`}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className={`flex items-center gap-4 rounded-xl border ${step.border} ${step.bg} p-4`}
                  >
                    <div className={`w-9 h-9 rounded-lg border ${step.border} flex items-center justify-center ${step.color}`}>
                      <step.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{step.label}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{step.sub}</div>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground/60">0{i + 1}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
