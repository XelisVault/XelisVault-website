'use client'

import { motion } from 'framer-motion'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'

/**
 * Mining & Delegation Section
 *
 * Explains the full miner economy:
 * - How miners register, stake, and earn
 * - The 5-tier reputation system
 * - How ANY user can delegate VLT to miners (MinerDelegation v11.0)
 * - The concentration penalty (v11.3) that prevents oracle manipulation
 * - Real numbers from the protocol spec (REWARD_SYSTEM.md + MinerDelegation.slx)
 *
 * Editorial design: hairline ledgers, serif figures, mono small caps.
 * No icon cards, no glass panels, no colored boxes.
 */

const REPUTATION_TIERS = [
  { tier: 'Excellent', range: '8,000 to 10,000', multiplier: '1.5×', color: 'text-emerald-700', desc: 'Earns 50% bonus rewards. Reached via honest behavior over time.' },
  { tier: 'Good', range: '5,000 to 7,999', multiplier: '1.0×', color: 'text-vault', desc: 'Standard rewards. New miners reach this after 15 days (time-proven bonus +2000).' },
  { tier: 'Warning', range: '2,000 to 4,999', multiplier: '0.7×', color: 'text-amber-700', desc: '30% reward penalty. Where new miners start (REP_START = 3,000).' },
  { tier: 'Critical', range: '1,000 to 1,999', multiplier: '0.4×', color: 'text-orange-700', desc: 'Last chance before ban. 60% reward penalty.' },
  { tier: 'Banned', range: '0 to 999', multiplier: '0×', color: 'text-destructive', desc: 'Cannot earn. Must rebuild via heartbeats.' },
]

const DELEGATION_STEPS = [
  {
    n: '01',
    title: 'Choose a miner',
    desc: 'Browse registered miners on the dashboard. Each miner has a public profile: name, description, commission rate (0 to 20%), total stake, reputation tier, and historical performance.',
  },
  {
    n: '02',
    title: 'Delegate VLT',
    desc: 'Call MinerDelegation.delegate(miner_addr, amount, auto_compound). Your VLT is locked in the contract and added to the miner\'s total stake. The miner\'s oracle weight increases proportionally.',
  },
  {
    n: '03',
    title: 'Earn rewards',
    desc: 'When the miner submits valid prices, StakedOracle calls distribute_rewards(). Your share is calculated via index-based accounting (no loops, gas-efficient). Auto-compound optionally reinvests your rewards.',
  },
  {
    n: '04',
    title: 'Undelegate anytime',
    desc: 'Call undelegate(amount) to queue a withdrawal. After the undelegate delay, call execute_undelegate() to receive your VLT plus accumulated rewards. No lock-up beyond the delay period.',
  },
]

const CONCENTRATION_TABLE = [
  { stake: '0 to 8%', weight: '1.0×', rewards: 'Full', note: 'No penalty' },
  { stake: '10%', weight: '0.88×', rewards: 'Full', note: 'Slight reduction' },
  { stake: '14%', weight: '0.65×', rewards: 'Full', note: 'Moderate' },
  { stake: '18%', weight: '0.42×', rewards: 'Full', note: 'Heavy' },
  { stake: '20%+', weight: '0.30×', rewards: 'Full', note: 'Capped, cannot manipulate' },
]

const SLASH_SEVERITY = [
  { severity: 'Outlier', slash: '1%', repLoss: '−50', trigger: 'Price deviates more than 5% from median' },
  { severity: 'Offline', slash: '2%', repLoss: '−200', trigger: 'Missed heartbeats' },
  { severity: 'Data loss', slash: '5%', repLoss: '−500', trigger: 'Submitted invalid data' },
  { severity: 'Censorship', slash: '10%', repLoss: '−1,000', trigger: 'Refused to include transactions' },
  { severity: 'Malicious', slash: '50%', repLoss: '−5,000', trigger: 'Proven price manipulation' },
]

export function MiningDelegation() {
  return (
    <section
      id="mining"
      className="relative py-20 md:py-28 px-5 md:px-8 bg-background overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid opacity-25" />
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-vault/7 blur-[140px]" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-vlt/7 blur-[120px]" />

      <div className="relative max-w-7xl mx-auto">
        {/* Header: copy + steady-waters imagery */}
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
        <div className="max-w-3xl">
          <Reveal>
            <SectionLabel>Mining & Delegation</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-medium tracking-[-0.02em] leading-[1.02]">
              <span className="text-gradient-vault">Stake VLT,</span>
              <br />
              <span className="italic font-light text-muted-foreground">secure the oracle.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
              The XELIS Vault oracle is secured by staked VLT. Miners stake 1,000 VLT to register
              and submit prices every 25 seconds. <strong className="text-foreground">Any VLT holder
              can delegate</strong> to a miner, increasing their oracle weight and earning a share
              of rewards. Rewards follow a <strong className="text-foreground">Bitcoin-style halving</strong>:
              about 0.436 VLT per block initially, halving every year; emission lasts indefinitely,
              not capped at 10 years. New miners start at reputation 3,000 (Warning tier) and must
              prove themselves over 15 days to reach Good.
            </p>
          </Reveal>
        </div>

        {/* Alpine lake: steady yield, still waters */}
        <Reveal delay={0.25} className="hidden lg:block">
          <div className="relative max-w-[380px] mx-auto">
            <div className="absolute -inset-2.5 rounded-[6px] border border-xusd/30 pointer-events-none" />
            <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] ring-1 ring-foreground/15 shadow-maison">
              <img
                src="/images/privacy/steady-emission.jpg"
                alt="Soft golden light suspended in darkness: rewards that flow steadily, privately"
                className="w-full h-full object-cover animate-kenburns"
              />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-oklch(0.16 0.008 80 / 0.8) to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-ink-foreground">
                <div className="font-display italic text-sm">Steady, like still water.</div>
                <div className="text-[9px] font-mono uppercase tracking-[0.18em] opacity-85 mt-0.5">
                  Halving emission · 25s cycles
                </div>
              </div>
            </div>
          </div>
        </Reveal>
        </div>

        {/* Key figures: hairline editorial band */}
        <Reveal delay={0.2}>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 border-t border-b border-foreground/10">
            {[
              { label: 'Miner Stake', value: '100', unit: 'VLT min' },
              { label: 'Cap per Miner', value: '500K', unit: 'VLT (own + delegated)' },
              { label: 'Initial Reward', value: '0.436', unit: 'VLT / block' },
              { label: 'Halving', value: '1 year', unit: '50% reduction' },
            ].map((s, i) => (
              <div key={`mining-stat-${i}`} className="py-6 md:py-8 px-5 md:px-6 md:border-l md:first:border-l-0 border-foreground/10">
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

        {/* Miner lifecycle: editorial numbered ledger */}
        <Reveal delay={0.3}>
          <div className="mt-16">
            <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mb-2">
              How miners work
            </h3>
            <p className="text-sm text-muted-foreground mb-8">
              A four-stage lifecycle: register, submit, earn, slash. All on-chain, all transparent.
            </p>
          </div>
        </Reveal>

        <RevealStagger className="grid md:grid-cols-2 gap-x-16">
          {[
            { n: '01', title: 'Register', desc: 'Stake 1,000 VLT via XelisVaultMiner.register_miner(). Set endpoint URL, miner pubkey, and services mask. Reputation starts at 3,000 (Warning tier); you must prove yourself over time, not start at max.' },
            { n: '02', title: 'Submit prices', desc: 'Fetch prices from MEXC, CoinEx, CoinGecko, or your own source. Submit signed prices every 25 seconds (5 blocks). Bootstrap mode works with just 3 miners.' },
            { n: '03', title: 'Earn rewards', desc: 'Bitcoin-style halving: about 0.436 VLT per block, halving every year (6,307,200 blocks). Your share equals block_reward × stake × rep_multiplier / total_stake. New miners get a 30-day bonus (up to +50%).' },
            { n: '04', title: 'Get slashed if bad', desc: 'Outlier prices lose reputation and slash stake (1% to 50%). Half of every slash is burned, 10% goes to the whistleblower, 40% to the treasury. Bad behavior is deflationary.' },
          ].map((step, i) => (
            <RevealItem key={`mining-lifecycle-${i}`}>
              <div className="border-t border-foreground/12 py-8 md:py-10">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-4xl font-light text-vault/50">{step.n}</span>
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70">
                    Stage {step.n} / 04
                  </span>
                </div>
                <h4 className="mt-4 font-display text-xl md:text-2xl font-semibold tracking-tight">{step.title}</h4>
                <p className="mt-3 text-sm md:text-[15px] text-muted-foreground leading-relaxed max-w-xl">{step.desc}</p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>

        {/* Reputation tiers: a reference table, hairlines only */}
        <Reveal delay={0.2}>
          <div className="mt-16 pt-10 border-t border-foreground/10">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-vault mb-2">
              Reputation System
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Five tiers, from 0× to a 1.5× reward multiplier
            </h3>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
              Reputation is a number between 0 and 10,000 stored per-miner. It determines whether
              the miner is active (at least 1,000) and how much they earn. Good behavior increases it,
              bad behavior decreases it.
            </p>

            <div className="mt-8">
              {REPUTATION_TIERS.map((tier, i) => (
                <motion.div
                  key={tier.tier}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i }}
                  className="flex flex-wrap md:flex-nowrap items-baseline gap-x-6 gap-y-1 py-4 border-b border-foreground/10"
                >
                  <div className="w-28 shrink-0">
                    <div className={`text-sm font-semibold ${tier.color}`}>{tier.tier}</div>
                    <div className="text-[10px] font-mono text-muted-foreground/70">{tier.range}</div>
                  </div>
                  <div className={`font-display text-xl font-semibold ${tier.color} w-16 shrink-0`}>{tier.multiplier}</div>
                  <div className="text-xs md:text-sm text-muted-foreground flex-1 min-w-[200px]">{tier.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* New miner bootstrapping (v11.4): editorial split */}
        <Reveal delay={0.2}>
          <div className="mt-16 pt-10 border-t border-foreground/10">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-vault mb-2">
              New Miner Bootstrapping (v11.4)
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              New miners don&apos;t start at the top.
              <br />
              <span className="text-gradient-vault">They earn their way up.</span>
            </h3>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-2xl">
              To prevent Sybil attacks (spawning many new miners to capture rewards), new miners
              start at reputation 3,000 (Warning tier, 0.7× multiplier), not at the maximum.
              They must prove themselves over time through two mechanisms:
            </p>

            <div className="mt-8 grid md:grid-cols-2 gap-x-16">
              <div className="border-t border-foreground/12 py-7">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-vault">Time-Proven</div>
                <h4 className="mt-3 font-display text-lg font-semibold">+2000 reputation after 15 days</h4>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  After 15 days of active participation (259,200 blocks), a miner earns a
                  <strong className="text-foreground"> +2000 reputation bonus</strong> via
                  <code className="text-vault mx-1">get_time_proven_bonus()</code>.
                  This moves them from 3,000 (Warning) to 5,000 (Good), doubling their
                  reward multiplier from 0.5× to 1.0×.
                </p>
              </div>

              <div className="border-t border-foreground/12 py-7">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-vlt">New Miner Bonus</div>
                <h4 className="mt-3 font-display text-lg font-semibold">Up to +50% extra rewards</h4>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  For the first 30 days, new miners get a bonus on top of their base reward
                  (via <code className="text-vlt mx-1">get_new_miner_bonus()</code>).
                  The bonus scales inversely with network size; fewer miners means higher bonus,
                  incentivizing early participation.
                </p>
                <div className="mt-4 space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between border-b border-foreground/8 pb-1.5"><span className="text-muted-foreground">0 to 10 active miners</span> <span className="text-vlt">+50%</span></div>
                  <div className="flex justify-between border-b border-foreground/8 pb-1.5"><span className="text-muted-foreground">11 to 50 miners</span> <span className="text-vlt">+30%</span></div>
                  <div className="flex justify-between border-b border-foreground/8 pb-1.5"><span className="text-muted-foreground">51 to 100 miners</span> <span className="text-vlt">+10%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">100+ miners</span> <span className="text-muted-foreground/60">+0% (healthy)</span></div>
                </div>
              </div>
            </div>

            <p className="mt-8 text-sm text-muted-foreground leading-relaxed pl-4 border-l-2 border-vault/40 max-w-3xl italic">
              <strong className="text-foreground not-italic">Anti-Sybil by design.</strong> An attacker
              spawning 100 new miners would only get them at a 0.5× multiplier (Warning tier)
              for 15 days, and the new-miner bonus disappears once 100+ miners are active.
              The cost of attacking (100 × 1,000 VLT stake = 100,000 VLT) far exceeds the
              rewards captured during the bootstrap period.
            </p>
          </div>
        </Reveal>

        {/* Delegation: the key section */}
        <Reveal delay={0.2}>
          <div className="mt-20">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-vlt mb-2">
              Delegation (v11.0)
            </div>
            <h3 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              Don&apos;t want to run a miner?
              <br />
              <span className="text-gradient-vault">Delegate your VLT instead.</span>
            </h3>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-2xl">
              MinerDelegation.slx lets any VLT holder delegate to a registered miner. Your stake
              increases the miner&apos;s oracle weight and earns a share of their rewards. The miner
              sets a commission (0 to 20%). Index-based accounting means no loops, so gas stays constant
              even with 500 delegators per miner.
            </p>
          </div>
        </Reveal>

        <RevealStagger className="mt-10 grid md:grid-cols-2 gap-x-16">
          {DELEGATION_STEPS.map((step, i) => (
            <RevealItem key={`delegation-step-${i}`}>
              <div className="border-t border-foreground/12 py-8 md:py-10">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-4xl font-light text-vlt/50">{step.n}</span>
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70">
                    Step {step.n} / 04
                  </span>
                </div>
                <h4 className="mt-4 font-display text-xl md:text-2xl font-semibold tracking-tight">{step.title}</h4>
                <p className="mt-3 text-sm md:text-[15px] text-muted-foreground leading-relaxed max-w-xl">{step.desc}</p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>

        {/* Delegation params: hairline figures */}
        <Reveal delay={0.3}>
          <div className="mt-4 grid sm:grid-cols-3 border-t border-b border-foreground/10">
            {[
              { label: 'Min Commission', value: '0%', note: 'Miner chooses' },
              { label: 'Max Commission', value: '20%', note: 'Hard cap' },
              { label: 'Max Delegators', value: '500', note: 'Per miner' },
            ].map((p, i) => (
              <div key={`del-param-${i}`} className="py-6 px-5 sm:border-l sm:first:border-l-0 border-foreground/10">
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{p.label}</div>
                <div className="mt-1.5 font-display text-2xl font-semibold text-vlt">{p.value}</div>
                <div className="text-[10px] font-mono text-muted-foreground/70 mt-1">{p.note}</div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Concentration penalty (v11.3): reference table */}
        <Reveal delay={0.2}>
          <div className="mt-16 pt-10 border-t border-foreground/10">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-vault mb-2">
              Concentration Penalty (v11.3)
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Don&apos;t penalize rewards.
              <br />
              <span className="text-gradient-vault">Penalize oracle manipulation power.</span>
            </h3>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-2xl">
              In v11.3, the concentration penalty moved from rewards to oracle weight. A miner
              holding too much stake (own plus delegated) still earns full rewards, but their influence
              on the median price is reduced. This prevents a single large miner from manipulating
              the oracle without punishing them economically.
            </p>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-foreground/15">
                    <th className="text-left py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Miner % of total stake</th>
                    <th className="text-left py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Oracle weight</th>
                    <th className="text-left py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Rewards</th>
                    <th className="text-left py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground hidden md:table-cell">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {CONCENTRATION_TABLE.map((row, i) => (
                    <tr key={i} className="border-b border-foreground/8">
                      <td className="py-3 text-sm font-medium">{row.stake}</td>
                      <td className="py-3 text-sm text-vault font-mono">{row.weight}</td>
                      <td className="py-3 text-sm text-emerald-600">{row.rewards}</td>
                      <td className="py-3 text-xs text-muted-foreground hidden md:table-cell">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-8 text-sm text-muted-foreground leading-relaxed pl-4 border-l-2 border-vault/40 max-w-3xl italic">
              <strong className="text-foreground not-italic">Key insight.</strong> A miner with 20%+ of
              total stake still earns full rewards, but their vote on the median price is capped
              at 0.3× weight. They cannot manipulate the oracle even with significant
              stake, and they have no reason to complain since their rewards are unaffected.
            </p>
          </div>
        </Reveal>

        {/* Slashing table */}
        <Reveal delay={0.2}>
          <div className="mt-16 pt-10 border-t border-foreground/10">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-destructive mb-2">
              Slashing Schedule
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Bad behavior is <span className="text-destructive">expensive.</span>
            </h3>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
              Five severity levels. Slashing is applied to the miner&apos;s stake: 50% is burned
              permanently, 10% goes to the whistleblower, 40% to the treasury. Reputation drops
              simultaneously, reducing the future reward multiplier.
            </p>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-foreground/15">
                    <th className="text-left py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Severity</th>
                    <th className="text-left py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Slash</th>
                    <th className="text-left py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Rep Loss</th>
                    <th className="text-left py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {SLASH_SEVERITY.map((row, i) => (
                    <tr key={i} className="border-b border-foreground/8">
                      <td className="py-3 text-sm font-medium">{row.severity}</td>
                      <td className="py-3 text-sm text-destructive font-mono">{row.slash}</td>
                      <td className="py-3 text-sm text-amber-600 font-mono">{row.repLoss}</td>
                      <td className="py-3 text-xs text-muted-foreground">{row.trigger}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        {/* CTA: quiet editorial close */}
        <Reveal delay={0.3}>
          <div className="mt-16 pt-10 border-t border-foreground/10 text-center">
            <h3 className="font-display text-2xl font-semibold">
              Ready to secure the oracle?
            </h3>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
              Run a miner with the CLI, or delegate your VLT to an existing miner. Both earn rewards
              via Bitcoin-style halving emission: about 0.436 VLT per block initially, halving every year.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <a
                href="https://github.com/XelisVault/xelis-vault/blob/main/docs/MINER_GUIDE.md"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex h-11 items-center rounded-none bg-vault px-7 text-sm font-semibold text-white hover:bg-vault/85 transition-all"
              >
                Read the miner guide
              </a>
              <a
                href="https://github.com/XelisVault/xelis-vault/blob/main/docs/REWARD_SYSTEM.md"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              >
                <span className="border-b border-foreground/25 group-hover:border-vault group-hover:text-vault transition-colors pb-0.5">
                  Reward system documentation
                </span>
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
