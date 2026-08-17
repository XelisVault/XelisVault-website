'use client'

import { motion } from 'framer-motion'
import {
  Pickaxe, Users, Coins, TrendingUp, Shield, Lock, Zap,
  ArrowRight, Check, AlertTriangle, Repeat,
} from 'lucide-react'
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
 */

const REPUTATION_TIERS = [
  { tier: 'Excellent', range: '8,000 – 10,000', multiplier: '1.5×', color: 'emerald', desc: 'Earns 50% bonus rewards. Reached via honest behavior over time.' },
  { tier: 'Good', range: '5,000 – 7,999', multiplier: '1.0×', color: 'vault', desc: 'Standard rewards. New miners reach this after 15 days (time-proven bonus +2000).' },
  { tier: 'Warning', range: '2,000 – 4,999', multiplier: '0.5×', color: 'amber', desc: 'Half rewards. Where new miners START (REP_START = 3000).' },
  { tier: 'Critical', range: '1,000 – 1,999', multiplier: '0.25×', color: 'orange', desc: 'Last chance before ban. Quarter rewards.' },
  { tier: 'Banned', range: '0 – 999', multiplier: '0×', color: 'red', desc: 'Cannot earn. Must rebuild via heartbeats.' },
]

const TIER_COLORS: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  vault: { text: 'text-vault', bg: 'bg-vault/5', border: 'border-vault/30', dot: 'bg-vault' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  orange: { text: 'text-orange-400', bg: 'bg-orange-500/5', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  red: { text: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/30', dot: 'bg-red-400' },
}

const DELEGATION_STEPS = [
  {
    n: '01',
    title: 'Choose a miner',
    desc: 'Browse registered miners on the dashboard. Each miner has a public profile: name, description, commission rate (0–20%), total stake, reputation tier, and historical performance.',
    icon: Users,
  },
  {
    n: '02',
    title: 'Delegate VLT',
    desc: 'Call MinerDelegation.delegate(miner_addr, amount, auto_compound). Your VLT is locked in the contract and added to the miner\'s total stake. The miner\'s oracle weight increases proportionally.',
    icon: Coins,
  },
  {
    n: '03',
    title: 'Earn rewards',
    desc: 'When the miner submits valid prices, StakedOracle calls distribute_rewards(). Your share is calculated via index-based accounting (no loops, gas-efficient). Auto-compound optionally reinvests your rewards.',
    icon: TrendingUp,
  },
  {
    n: '04',
    title: 'Undelegate anytime',
    desc: 'Call undelegate(amount) to queue a withdrawal. After the undelegate delay, call execute_undelegate() to receive your VLT + accumulated rewards. No lock-up beyond the delay period.',
    icon: Lock,
  },
]

const CONCENTRATION_TABLE = [
  { stake: '0–8%', weight: '1.0×', rewards: 'Full', note: 'No penalty' },
  { stake: '10%', weight: '0.88×', rewards: 'Full', note: 'Slight reduction' },
  { stake: '14%', weight: '0.65×', rewards: 'Full', note: 'Moderate' },
  { stake: '18%', weight: '0.42×', rewards: 'Full', note: 'Heavy' },
  { stake: '20%+', weight: '0.30×', rewards: 'Full', note: 'Capped — cannot manipulate' },
]

const SLASH_SEVERITY = [
  { severity: 'Outlier', slash: '1%', repLoss: '−50', trigger: 'Price deviates >5% from median' },
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
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-vault/8 blur-[140px]" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-vlt/8 blur-[120px]" />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="max-w-3xl">
          <Reveal>
            <SectionLabel>Mining & Delegation</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1]">
              <span className="text-gradient-vault">Stake VLT,</span>
              <br />
              <span className="text-muted-foreground">secure the oracle.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
              The XELIS Vault oracle is secured by staked VLT. Miners stake 1,000 VLT to register
              and submit prices every 25 seconds. <strong className="text-foreground">Any VLT holder
              can delegate</strong> to a miner — increasing their oracle weight and earning a share
              of rewards. Rewards follow a <strong className="text-foreground">Bitcoin-style halving</strong>:
              ~0.436 VLT per block initially, halving every year — emission lasts indefinitely,
              not capped at 10 years. New miners start at reputation 3,000 (Warning tier) and must
              prove themselves over 15 days to reach Good.
            </p>
          </Reveal>
        </div>

        {/* Key stats */}
        <Reveal delay={0.2}>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl glass-panel overflow-hidden">
            {[
              { label: 'Miner Stake', value: '100', unit: 'VLT min' },
              { label: 'Cap per Miner', value: '500K', unit: 'VLT (own + delegated)' },
              { label: 'Initial Reward', value: '0.436', unit: 'VLT / block' },
              { label: 'Halving', value: '1 year', unit: '50% reduction' },
            ].map((s, i) => (
              <div key={`mining-stat-${i}`} className="p-5 md:p-6 bg-card/30">
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

        {/* Miner lifecycle */}
        <Reveal delay={0.3}>
          <div className="mt-16">
            <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mb-2">
              How miners work
            </h3>
            <p className="text-sm text-muted-foreground mb-8">
              4-step lifecycle — register, submit, earn, slash. All on-chain, all transparent.
            </p>
          </div>
        </Reveal>

        <RevealStagger className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { n: '01', title: 'Register', desc: 'Stake 1,000 VLT via XelisVaultMiner.register_miner(). Set endpoint URL, miner pubkey, and services mask. Reputation starts at 3,000 (Warning tier) — you must prove yourself over time, not start at max.', icon: Pickaxe },
            { n: '02', title: 'Submit prices', desc: 'Fetch prices from MEXC, CoinEx, CoinGecko, or your own source. Submit signed prices every 25 seconds (5 blocks). Bootstrap mode works with just 3 miners.', icon: Repeat },
            { n: '03', title: 'Earn rewards', desc: 'Bitcoin-style halving: ~0.436 VLT per block, halving every year (6,307,200 blocks). Your share = block_reward × stake × rep_multiplier / total_stake. New miners get a 30-day bonus (up to +50%).', icon: Coins },
            { n: '04', title: 'Get slashed if bad', desc: 'Outlier prices lose reputation and slash stake (1%–50%). 50% of slash is burned, 10% to whistleblower, 40% to treasury. Bad behavior is deflationary.', icon: Shield },
          ].map((step, i) => (
            <RevealItem key={`mining-lifecycle-${i}`}>
              <div className="relative h-full rounded-2xl glass-panel p-6">
                {i < 3 && (
                  <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-vault/40">
                    →
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-vault/10 border border-vault/20 flex items-center justify-center text-vault">
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground/60">{step.n}</span>
                </div>
                <h4 className="mt-5 font-display text-lg font-semibold">{step.title}</h4>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>

        {/* Reputation tiers */}
        <Reveal delay={0.2}>
          <div className="mt-16 rounded-2xl glass-panel p-6 md:p-10">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-vault mb-2">
              <TrendingUp className="w-4 h-4" />
              Reputation System
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              5 tiers · 0× to 1.5× reward multiplier
            </h3>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
              Reputation is a number between 0 and 10,000 stored per-miner. It determines whether
              the miner is active (≥ 1,000) and how much they earn. Good behavior increases it,
              bad behavior decreases it.
            </p>

            <div className="mt-8 space-y-2">
              {REPUTATION_TIERS.map((tier, i) => {
                const c = TIER_COLORS[tier.color]
                return (
                  <motion.div
                    key={tier.tier}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * i }}
                    className={`flex items-center gap-4 rounded-xl border ${c.border} ${c.bg} p-4`}
                  >
                    <div className={`w-2 h-12 rounded-full ${c.dot}`} />
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 items-center">
                      <div>
                        <div className={`text-sm font-semibold ${c.text}`}>{tier.tier}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{tier.range}</div>
                      </div>
                      <div className={`font-display text-xl font-bold ${c.text}`}>{tier.multiplier}</div>
                      <div className="text-xs text-muted-foreground hidden md:block">{tier.desc}</div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </Reveal>

        {/* New miner bootstrapping (v11.4) */}
        <Reveal delay={0.2}>
          <div className="mt-16 rounded-2xl glass-panel p-6 md:p-10">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-vault mb-2">
              <Zap className="w-4 h-4" />
              New Miner Bootstrapping (v11.4)
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              New miners don&apos;t start at the top —
              <br />
              <span className="text-gradient-vault">they earn their way up.</span>
            </h3>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-2xl">
              To prevent Sybil attacks (spawning many new miners to capture rewards), new miners
              start at reputation 3,000 (Warning tier, 0.5× multiplier) — not at the maximum.
              They must prove themselves over time through two mechanisms:
            </p>

            <div className="mt-8 grid md:grid-cols-2 gap-4">
              {/* Time-proven */}
              <div className="rounded-xl border border-vault/30 bg-vault/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-vault/15 border border-vault/30 flex items-center justify-center text-vault">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-mono uppercase tracking-wider text-vault">Time-Proven</div>
                </div>
                <h4 className="font-display text-lg font-semibold">+2000 reputation after 15 days</h4>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  After 15 days of active participation (259,200 blocks), a miner earns a
                  <strong className="text-foreground"> +2000 reputation bonus</strong> via
                  <code className="text-vault mx-1">get_time_proven_bonus()</code>.
                  This moves them from 3,000 (Warning) to 5,000 (Good) — doubling their
                  reward multiplier from 0.5× to 1.0×.
                </p>
              </div>

              {/* New miner bonus */}
              <div className="rounded-xl border border-vlt/30 bg-vlt/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-vlt/15 border border-vlt/30 flex items-center justify-center text-vlt">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-mono uppercase tracking-wider text-vlt">New Miner Bonus</div>
                </div>
                <h4 className="font-display text-lg font-semibold">Up to +50% extra rewards</h4>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  For the first 30 days, new miners get a bonus on top of their base reward
                  (via <code className="text-vlt mx-1">get_new_miner_bonus()</code>).
                  The bonus scales inversely with network size — fewer miners means higher bonus,
                  incentivizing early participation.
                </p>
                <div className="mt-3 space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between"><span className="text-muted-foreground">0–10 active miners:</span> <span className="text-vlt">+50%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">11–50 miners:</span> <span className="text-vlt">+30%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">51–100 miners:</span> <span className="text-vlt">+10%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">100+ miners:</span> <span className="text-muted-foreground/60">+0% (healthy)</span></div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 flex items-start gap-3">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Anti-Sybil by design:</strong> An attacker
                spawning 100 new miners would only get them at 0.5× multiplier (Warning tier)
                for 15 days, and the new-miner bonus disappears once 100+ miners are active.
                The cost of attacking (100 × 1,000 VLT stake = 100,000 VLT) far exceeds the
                rewards captured during the bootstrap period.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Delegation — the key section */}
        <Reveal delay={0.2}>
          <div className="mt-20">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-vlt mb-2">
              <Users className="w-4 h-4" />
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
              sets a commission (0–20%). Index-based accounting means no loops — gas stays constant
              even with 500 delegators per miner.
            </p>
          </div>
        </Reveal>

        <RevealStagger className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DELEGATION_STEPS.map((step, i) => (
            <RevealItem key={`delegation-step-${i}`}>
              <div className="relative h-full rounded-2xl glass-panel p-6">
                {i < 3 && (
                  <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-vlt/40">
                    →
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-vlt/10 border border-vlt/20 flex items-center justify-center text-vlt">
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground/60">{step.n}</span>
                </div>
                <h4 className="mt-5 font-display text-lg font-semibold">{step.title}</h4>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>

        {/* Delegation params */}
        <Reveal delay={0.3}>
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Min Commission', value: '0%', note: 'Miner chooses' },
              { label: 'Max Commission', value: '20%', note: 'Hard cap' },
              { label: 'Max Delegators', value: '500', note: 'Per miner' },
            ].map((p, i) => (
              <div key={`del-param-${i}`} className="rounded-xl glass-panel p-4 text-center">
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{p.label}</div>
                <div className="mt-1 font-display text-2xl font-semibold text-vlt">{p.value}</div>
                <div className="text-[10px] font-mono text-muted-foreground/60 mt-1">{p.note}</div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Concentration penalty (v11.3) */}
        <Reveal delay={0.2}>
          <div className="mt-16 rounded-2xl glass-panel p-6 md:p-10">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-vault mb-2">
              <Zap className="w-4 h-4" />
              Concentration Penalty (v11.3)
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Don&apos;t penalize rewards —
              <br />
              <span className="text-gradient-vault">penalize oracle manipulation power.</span>
            </h3>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-2xl">
              In v11.3, the concentration penalty moved from rewards to oracle weight. A miner
              holding too much stake (own + delegated) still earns full rewards, but their influence
              on the median price is reduced. This prevents a single large miner from manipulating
              the oracle without punishing them economically.
            </p>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Miner % of total stake</th>
                    <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Oracle weight</th>
                    <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Rewards</th>
                    <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground hidden md:table-cell">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {CONCENTRATION_TABLE.map((row, i) => (
                    <tr key={i} className={i % 2 === 1 ? 'bg-card/20' : ''}>
                      <td className="px-4 py-3 text-sm font-medium">{row.stake}</td>
                      <td className="px-4 py-3 text-sm text-vault font-mono">{row.weight}</td>
                      <td className="px-4 py-3 text-sm text-emerald-400">{row.rewards}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 rounded-xl bg-vault/5 border border-vault/20 p-4 flex items-start gap-3">
              <Check className="w-4 h-4 text-vault shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Key insight:</strong> A miner with 20%+ of
                total stake still earns full rewards, but their vote on the median price is capped
                at 0.3× weight. This means they cannot manipulate the oracle even with significant
                stake — and they have no reason to complain since their rewards are unaffected.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Slashing table */}
        <Reveal delay={0.2}>
          <div className="mt-16 rounded-2xl glass-panel p-6 md:p-10">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-red-400 mb-2">
              <AlertTriangle className="w-4 h-4" />
              Slashing Schedule
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Bad behavior is
              <span className="text-red-400"> expensive.</span>
            </h3>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
              5 severity levels. Slashing is applied to the miner&apos;s stake — 50% is burned
              permanently, 10% goes to the whistleblower, 40% to the treasury. Reputation drops
              simultaneously, reducing future reward multiplier.
            </p>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Severity</th>
                    <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Slash</th>
                    <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Rep Loss</th>
                    <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {SLASH_SEVERITY.map((row, i) => (
                    <tr key={i} className={i % 2 === 1 ? 'bg-card/20' : ''}>
                      <td className="px-4 py-3 text-sm font-medium">{row.severity}</td>
                      <td className="px-4 py-3 text-sm text-red-400 font-mono">{row.slash}</td>
                      <td className="px-4 py-3 text-sm text-amber-400 font-mono">{row.repLoss}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{row.trigger}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        {/* CTA */}
        <Reveal delay={0.3}>
          <div className="mt-16 rounded-2xl border border-vault/30 bg-vault/5 p-8 text-center">
            <h3 className="font-display text-2xl font-semibold">
              Ready to secure the oracle?
            </h3>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
              Run a miner with the CLI, or delegate your VLT to an existing miner. Both earn rewards
              via Bitcoin-style halving emission — ~0.436 VLT per block initially, halving every year.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://github.com/XelisVault/xelis-vault/blob/main/docs/MINER_GUIDE.md"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-vault px-6 text-sm font-semibold text-white hover:bg-vault/85 transition-all"
              >
                <Pickaxe className="w-4 h-4" />
                Miner guide
                <ArrowRight className="w-3 h-3 opacity-50" />
              </a>
              <a
                href="https://github.com/XelisVault/xelis-vault/blob/main/docs/REWARD_SYSTEM.md"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card/40 hover:bg-card/80 hover:border-vault/40 px-6 text-sm font-semibold transition-all"
              >
                <Coins className="w-4 h-4" />
                Reward system docs
                <ArrowRight className="w-3 h-3 opacity-50" />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
