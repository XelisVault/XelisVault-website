'use client'

import { motion } from 'framer-motion'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'

const STEPS = [
  {
    n: '01',
    title: 'Stake & Register',
    desc: 'Anyone stakes 1,000 VLT and registers as a provider via XelisVaultMiner. Reputation starts at 3,000 (Warning tier) and climbs to 10,000 with good behavior; time-proven miners earn +2,000 after 15 days. Five reward tiers: 0× (banned), 0.4× (critical), 0.7× (warning), 1.0× (good), 1.5× (excellent).',
  },
  {
    n: '02',
    title: 'Submit Prices',
    desc: 'Fetch prices from MEXC, CoinEx, CoinGecko, or your own source. Submit signed prices every cycle (5 blocks / 25 seconds). Bootstrap mode works with just 3 providers and auto-disables when 10+ are active.',
  },
  {
    n: '03',
    title: 'Median Aggregation',
    desc: 'Every cycle, the contract sorts all submissions, computes the median, and identifies valid prices within ±5% of that median. Circuit breakers trigger at 5% deviation, 20% callback threshold, or 100-block hard stale.',
  },
  {
    n: '04',
    title: 'Rewards & Slashing',
    desc: 'Valid providers earn VLT rewards scaled by reputation tier (up to 1.5× multiplier). Outliers lose reputation points and may drop tiers; slashing from stake is burned (50%) and sent to treasury (50%).',
  },
]

const PROVIDER_STATS = [
  { label: 'Min Stake', value: '1,000', unit: 'VLT' },
  { label: 'Cycle Length', value: '25', unit: 'sec' },
  { label: 'Reward Tiers', value: '5', unit: '0× → 1.5×' },
  { label: 'Emission', value: 'Halving', unit: 'per year' },
]

const SLASHING_FLOW = [
  { label: 'Outlier submitted', sub: 'Price more than 5% from the median', color: 'text-destructive' },
  { label: 'Reputation drops', sub: 'May fall to a lower reward tier (0.4× or 0×)', color: 'text-amber-600' },
  { label: 'Stake slashed', sub: '50% burned · permanent supply reduction', color: 'text-vlt' },
  { label: '50% to treasury', sub: 'Community-controlled VLT', color: 'text-vault' },
]

export function Oracle() {
  return (
    <section
      id="oracle"
      className="relative py-20 md:py-28 px-5 md:px-8 bg-background overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid opacity-25" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-vault/7 blur-[140px]" />

      <div className="relative max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
        <div className="max-w-3xl">
          <Reveal>
            <SectionLabel>The Oracle</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-medium tracking-[-0.02em] leading-[1.02]">
              <span className="text-gradient-vault">StakedOracle</span>
              <br />
              <span className="italic font-light text-muted-foreground">permissionless by design.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
              No permissioned node operators. No backdoor admin keys. Anyone with 1,000 VLT
              can become a price provider, and economic slashing keeps them honest. The
              median of all valid submissions becomes the on-chain truth, every 25 seconds.
            </p>
          </Reveal>
        </div>

        {/* Precision craftsmanship: the oracle as a fine instrument */}
        <Reveal delay={0.25} className="hidden lg:block">
          <div className="relative max-w-[380px] mx-auto">
            <div className="absolute -inset-2.5 rounded-[6px] border border-vault/30 pointer-events-none" />
            <div className="relative aspect-[3/4] overflow-hidden rounded-[4px] ring-1 ring-foreground/15 shadow-maison">
              <img
                src="/images/bank/precision-watch.jpg"
                alt="A watchmaker calibrating a mechanical movement: precision as a discipline"
                className="w-full h-full object-cover animate-kenburns"
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-oklch(0.2 0.01 80 / 0.5) to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-ink-foreground">
                <div className="font-display italic text-sm">Precision, every 25 seconds.</div>
                <div className="text-[9px] font-mono uppercase tracking-[0.18em] opacity-70 mt-0.5">
                  Median aggregation · 5-block cycles
                </div>
              </div>
            </div>
          </div>
        </Reveal>
        </div>

        {/* Provider figures: hairline editorial band */}
        <Reveal delay={0.2}>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 border-t border-b border-foreground/10">
            {PROVIDER_STATS.map((s, i) => (
              <div key={`oracle-info-${i}`} className="py-6 md:py-8 px-5 md:px-6 md:border-l md:first:border-l-0 border-foreground/10">
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

        {/* The four stages: an editorial numbered ledger, hairlines only */}
        <RevealStagger className="mt-16 grid md:grid-cols-2 gap-x-16 gap-y-0">
          {STEPS.map((step, i) => (
            <RevealItem key={`oracle-step-${i}`}>
              <div className="border-t border-foreground/12 py-8 md:py-10">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-4xl font-light text-vault/50">{step.n}</span>
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70">
                    Stage {step.n} / 04
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl md:text-2xl font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-3 text-sm md:text-[15px] text-muted-foreground leading-relaxed max-w-xl">{step.desc}</p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>

        {/* Anti-Sybil: editorial split, ledger-style flow on the right */}
        <Reveal delay={0.2}>
          <div className="mt-16 pt-10 md:pt-14 border-t border-foreground/10">
            <div className="grid md:grid-cols-[1fr_1.4fr] gap-10 md:gap-16 items-start">
              <div>
                <div className="text-xs font-mono uppercase tracking-[0.2em] text-destructive">
                  Anti-Sybil Protection
                </div>
                <h3 className="mt-4 font-display text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
                  Attack the oracle and
                  <br />
                  <span className="text-destructive">you fund its deflation.</span>
                </h3>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  A would-be attacker trying to spawn 1,000 bots to manipulate the median
                  would need to stake 100,000 VLT, 1% of total supply. Even then, the
                  reputation system drains those bots until they fall below the 1,000 threshold
                  and get auto-deactivated (dropping to the 0× tier, which earns no rewards).
                  Every attack burns VLT for the rest of the holders.
                </p>
              </div>

              {/* Slashing ledger: hairline rows, no boxes */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70 pb-3 border-b border-foreground/10">
                  The slashing sequence
                </div>
                {SLASHING_FLOW.map((step, i) => (
                  <motion.div
                    key={`slash-${i}`}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-5 py-5 border-b border-foreground/10"
                  >
                    <span className="font-mono text-xs text-muted-foreground/50 tabular-nums shrink-0">0{i + 1}</span>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${step.color}`}>{step.label}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{step.sub}</div>
                    </div>
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
