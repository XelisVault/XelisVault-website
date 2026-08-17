'use client'

import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Users,
  Zap,
  FileCheck,
  Bug,
  Mail,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { Nav } from '@/components/site/nav'
import { Footer } from '@/components/sections/roadmap-cta'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'

const SECURITY_FEATURES = [
  {
    icon: Lock,
    title: '2-Step Emergency Withdraw',
    description:
      'Every fund-holding contract implements a 2-step emergency withdraw with a 17,280 block delay (~24h at 5s blocks). This means even if an admin key were compromised, an attacker cannot drain funds instantly — the community has a full day to react, pause the contract via the guardian multisig, and migrate funds safely.',
  },
  {
    icon: ShieldCheck,
    title: 'Reentrancy Guards (RG_STATUS_KEY)',
    description:
      'Every contract that touches funds implements the RG_STATUS_KEY pattern from ReentrancyGuard.slx. The guard sets a status flag at function entry and verifies it on exit, blocking any reentrant call before the original completes. This is the same defense used by OpenZeppelin, adapted to Silex semantics.',
  },
  {
    icon: Users,
    title: 'Guardian Multisig (3-of-5)',
    description:
      'A 3-of-5 guardian multisig can pause any contract in case of emergency. Every governance action passes through a 48-hour Timelock, so the community has time to inspect and exit positions before a malicious proposal can execute. Guardians are doxxed community members elected by VLT holders.',
  },
  {
    icon: Zap,
    title: 'Circuit Breakers',
    description:
      'The StakedOracle automatically pauses price submissions if the new price deviates more than 5% from the previous one — a single bad data point cannot cascade. The VaultEngine pauses new borrows if the protocol-wide health factor drops below 1.1, preventing a death spiral during market crashes.',
  },
]

const AUDIT_HISTORY = [
  {
    version: 'v5.0 Internal Audit',
    period: 'Q1 2026',
    status: 'Completed',
    findings: [
      { severity: 'Critical', count: 5, color: 'red' },
      { severity: 'High', count: 4, color: 'orange' },
      { severity: 'Medium', count: 4, color: 'amber' },
      { severity: 'Low', count: 2, color: 'blue' },
    ],
    allFixed: true,
  },
  {
    version: 'v5.1 Pre-launch Review',
    period: 'August 2026',
    status: 'Completed',
    findings: [
      { severity: 'Critical', count: 4, color: 'red' },
      { severity: 'High', count: 1, color: 'orange' },
    ],
    allFixed: true,
    note: 'VaultEngine liquidation queue, PSM rounding error, VaultSwapV2 TWAP manipulation, Miner heartbeat reorg handling',
  },
  {
    version: 'v11.3 External IA Audit',
    period: 'August 2026',
    status: 'Completed',
    findings: [
      { severity: 'Critical', count: 5, color: 'red' },
      { severity: 'High', count: 2, color: 'orange' },
      { severity: 'Medium', count: 1, color: 'amber' },
    ],
    allFixed: true,
    note: '9 bugs found by external IA audit: 5 critical (wrong oracle entry IDs in PSM/VaultSwap/LendingMarket/SyndicatePool/VaultEngine), 2 high (circuit breaker never checked, FlashLoan callback whitelist unused), 1 medium (Ciphertext code may not compile). All fixed + 11 entry wrappers added + chunk ID validator rewritten (73/73 real OK).',
  },
  {
    version: 'v10.2 Brainstorming Review',
    period: 'August 2026',
    status: 'Completed',
    findings: [
      { severity: 'Critical', count: 0, color: 'red' },
      { severity: 'High', count: 0, color: 'orange' },
    ],
    allFixed: true,
    note: '13 new Phase 5+ contracts reviewed for Silex API compliance, anti-abuse mechanisms, and privacy preservation. No critical or high findings — contracts gated behind governance vote before deployment.',
  },
  {
    version: 'External Audit',
    period: 'Q3 2026',
    status: 'Planned',
    candidates: ['Trail of Bits', 'OpenZeppelin', 'Hacken'],
    budget: '100,000 VLT allocated',
  },
]

const BOUNTY_TIERS = [
  {
    severity: 'Critical',
    reward: 'Up to 50,000 VLT',
    description: 'Remote code execution, theft of funds, complete protocol compromise, oracle manipulation that allows minting unbacked xUSD.',
    color: 'red',
  },
  {
    severity: 'High',
    reward: 'Up to 30,000 VLT',
    description: 'Partial theft of funds, governance attack vectors, bypass of the 2-step emergency withdraw, breaking of the reentrancy guard.',
    color: 'orange',
  },
  {
    severity: 'Medium',
    reward: 'Up to 15,000 VLT',
    description: 'Denial of service, information disclosure across encrypted balances, minor fund loss through edge-case rounding.',
    color: 'amber',
  },
  {
    severity: 'Low',
    reward: 'Up to 5,000 VLT',
    description: 'Gas optimization issues, UX edge cases, documentation errors, minor logic bugs with no fund impact.',
    color: 'blue',
  },
]

const COLOR_MAP: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  red: { text: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/30', dot: 'bg-red-400' },
  orange: { text: 'text-orange-400', bg: 'bg-orange-500/5', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  blue: { text: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/30', dot: 'bg-blue-400' },
}

export function SecurityPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <Nav />

      <main className="flex-1 relative pt-24 md:pt-32">
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-vault/8 blur-[140px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-5 md:px-8 pb-20">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-vault transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </a>

          {/* Header */}
          <Reveal>
            <SectionLabel>Security</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mt-6 font-display text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1]">
              Security is the
              <br />
              <span className="text-gradient-vault">only launch criterion.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-3xl">
              We delayed the testnet from August 9 to August 25 because four critical vulnerabilities
              were found in the final pre-launch review. We could have shipped anyway and hoped nobody
              noticed. We chose not to. Here is exactly how XELIS Vault protects your funds, and how
              you can help us find anything we missed.
            </p>
          </Reveal>

          {/* Security model */}
          <section className="mt-20">
            <Reveal>
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                Defense in depth
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Four independent layers. All four must fail for funds to be lost.
              </p>
            </Reveal>

            <RevealStagger className="mt-8 grid md:grid-cols-2 gap-4">
              {SECURITY_FEATURES.map((f) => (
                <RevealItem key={f.title}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="rounded-2xl glass-panel p-6 h-full"
                  >
                    <div className="w-10 h-10 rounded-xl bg-vault/10 border border-vault/30 flex items-center justify-center mb-4">
                      <f.icon className="w-5 h-5 text-vault" />
                    </div>
                    <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                  </motion.div>
                </RevealItem>
              ))}
            </RevealStagger>
          </section>

          {/* Audit history */}
          <section className="mt-20">
            <Reveal>
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                Audit history
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Every audit finding is public. Every fix is verified on-chain.
              </p>
            </Reveal>

            <div className="mt-8 space-y-4">
              {AUDIT_HISTORY.map((audit, i) => (
                <Reveal key={audit.version} delay={0.1 * i}>
                  <div className="rounded-2xl glass-panel p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-vault" />
                          <h3 className="font-display text-lg font-semibold">{audit.version}</h3>
                        </div>
                        <div className="mt-1 text-xs font-mono text-muted-foreground">{audit.period}</div>
                      </div>
                      <div className={`inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-full ${
                        audit.status === 'Completed'
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                      }`}>
                        {audit.status === 'Completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {audit.status}
                      </div>
                    </div>

                    {audit.findings && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {audit.findings.map((f) => {
                          const c = COLOR_MAP[f.color]
                          return (
                            <div key={f.severity} className={`inline-flex items-center gap-2 rounded-lg ${c.bg} ${c.border} border px-3 py-1.5`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                              <span className={`text-xs font-mono ${c.text}`}>{f.count} {f.severity}</span>
                              {audit.allFixed && (
                                <span className="text-[10px] font-mono text-emerald-400/70">fixed</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {audit.note && (
                      <p className="mt-3 text-xs text-muted-foreground/70 leading-relaxed">
                        <strong className="text-foreground">Issues addressed:</strong> {audit.note}
                      </p>
                    )}

                    {audit.candidates && (
                      <div className="mt-3 text-xs text-muted-foreground/70">
                        <strong className="text-foreground">Candidate firms:</strong>{' '}
                        {audit.candidates.join(' · ')} · {audit.budget}
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-3">
                      <a
                        href="https://github.com/XelisVault/xelis-vault/blob/main/docs/AUDIT.md"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-vault hover:underline"
                      >
                        <Download className="w-3 h-3" />
                        Read full audit report
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* The Aug 25 delay transparency */}
          <section className="mt-20">
            <Reveal>
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 md:p-8">
                <div className="flex items-center gap-2 text-amber-400 mb-4">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-xs font-mono uppercase tracking-wider">Why we delayed the testnet</span>
                </div>
                <h3 className="font-display text-xl md:text-2xl font-semibold">
                  Four critical vulnerabilities, found and fixed in the final week.
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">→</span>
                    <span><strong className="text-foreground">VaultEngine liquidation queue:</strong> Front-runnable by mempool watchers, allowing attackers to steal collateral before legitimate liquidators could act. Fixed by committing to a sealed-bid auction.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">→</span>
                    <span><strong className="text-foreground">PSM rounding error:</strong> A truncation bug in the fee calculation allowed minting tiny amounts of xUSD without depositing the corresponding XEL. Fixed with proper decimal scaling.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">→</span>
                    <span><strong className="text-foreground">VaultSwapV2 TWAP manipulation:</strong> Sandwich attacks could move the TWAP during low-liquidity periods. Fixed with a minimum-liquidity check and a longer window.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">→</span>
                    <span><strong className="text-foreground">Miner heartbeat reorg handling:</strong> Chain reorganizations could slash miners incorrectly. Fixed by requiring 6 confirmations before slashing.</span>
                  </li>
                </ul>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  Every fix has been re-deployed to the testnet contracts and re-verified. The new
                  target is <strong className="text-foreground">August 25, 2026 at 14:00 UTC</strong>.
                </p>
              </div>
            </Reveal>
          </section>

          {/* Bug bounty */}
          <section className="mt-20">
            <Reveal>
              <div className="flex items-center gap-2 mb-2">
                <Bug className="w-5 h-5 text-vault" />
                <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                  Bug bounty program
                </h2>
              </div>
              <p className="mt-8 text-sm text-muted-foreground leading-relaxed">
                Up to 50,000 VLT for critical findings. Total allocation: 100,000 VLT (1% of fixed supply),
                split 50% critical / 30% high / 15% medium / 5% low, distributed over 2 years on Immunefi.
                Responsible disclosure only — public disclosure of an unpatched vulnerability voids the bounty.
              </p>
            </Reveal>

            <RevealStagger className="mt-8 grid sm:grid-cols-2 gap-4">
              {BOUNTY_TIERS.map((tier) => {
                const c = COLOR_MAP[tier.color]
                return (
                  <RevealItem key={tier.severity}>
                    <div className={`rounded-2xl border ${c.border} ${c.bg} p-6 h-full`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-mono uppercase tracking-wider ${c.text}`}>
                          {tier.severity}
                        </span>
                        <span className={`font-display text-lg font-semibold ${c.text}`}>
                          {tier.reward}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                        {tier.description}
                      </p>
                    </div>
                  </RevealItem>
                )
              })}
            </RevealStagger>

            <Reveal delay={0.3}>
              <div className="mt-8 rounded-2xl glass-panel p-6">
                <h3 className="font-display text-lg font-semibold">Report a vulnerability</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Email <a href="mailto:xelisvault@protonmail.org" className="text-vault hover:underline">xelisvault@protonmail.org</a> with a
                  detailed writeup and proof of concept. We acknowledge every report within 48 hours.
                  PGP-encrypted reports are preferred.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="mailto:xelisvault@protonmail.org"
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-vault px-5 text-sm font-semibold text-white hover:bg-vault/85 transition-all"
                  >
                    <Mail className="w-4 h-4" />
                    Email security team
                  </a>
                  <a
                    href="https://github.com/XelisVault/xelis-vault/security/policy"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card/40 hover:bg-card/80 hover:border-vault/40 px-5 text-sm font-semibold transition-all"
                  >
                    <FileCheck className="w-4 h-4" />
                    View responsible disclosure policy
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                </div>
              </div>
            </Reveal>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
