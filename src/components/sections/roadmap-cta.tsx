'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Clock, Github, MessageCircle, Twitter, ArrowUpRight, Rocket, AlertCircle } from 'lucide-react'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'
import { useDemo } from '@/lib/demo-store'
import { QuestLogoTrigger } from '@/components/quest/quest-logo-trigger'
import { CountdownTimer, useLaunchStatus } from '@/components/app/launch-gate'

const MILESTONES = [
  {
    phase: 'Complete',
    status: 'done',
    title: 'Core Protocol v11.3',
    items: [
      '51 contracts total · 962 entry functions · MIT license',
      '37 core contracts deployed at testnet launch',
      '13 Phase 5+ contracts written, gated behind governance vote',
      'VaultEngineV3 confidential mode · StakedOracle v10 · VaultSwapV2',
      'Progressive slashing · trimmed median · anti-Sybil stake',
    ],
    date: 'Q1–Q2 2026',
  },
  {
    phase: 'Complete',
    status: 'done',
    title: 'v5.0 Audit Remediation',
    items: [
      '15 vulnerabilities fixed (5 critical, 4 high, 4 medium, 2 low)',
      '2-step emergency withdraw on all fund-holding contracts',
      'Two-layer guardian (EOA + 3-of-5 multisig)',
      'Reentrancy guard pattern (RG_STATUS_KEY)',
      '4 additional critical fixes in v5.1 pre-launch review',
    ],
    date: 'Q2 2026',
  },
  {
    phase: 'Planned',
    status: 'pending',
    title: 'Testnet Deployment',
    items: [
      'Contracts redeployed with v5.1 patches (4 critical fixes)',
      'XSWD integration rewrite (cross-contract permissions)',
      'CLI tool + miner script released on GitHub',
      'Wallet connection — Genesix + local RPC',
    ],
    date: 'Aug 30, 2026 · 14:00 UTC',
  },
  {
    phase: 'Planned',
    status: 'pending',
    title: 'External Security Audit',
    items: [
      'Trail of Bits / OpenZeppelin / Hacken',
      'Immunefi bug bounty program',
      'Community review period',
      'Final parameter calibration',
    ],
    date: 'Q3 2026',
  },
  {
    phase: 'Planned',
    status: 'pending',
    title: 'Mainnet Launch',
    items: [
      'Mainnet contract deployment',
      'Public mining & provider onboarding',
      'Liquidity bootstrap on VaultSwap',
      'Governance handover to VLT holders',
    ],
    date: 'Q4 2026',
  },
]

const STATUS_STYLE = {
  done: { dot: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', icon: CheckCircle2 },
  active: { dot: 'bg-vault', text: 'text-vault', border: 'border-vault/40', bg: 'bg-vault/5', icon: Clock },
  pending: { dot: 'bg-muted-foreground/40', text: 'text-muted-foreground', border: 'border-border', bg: 'bg-card/20', icon: Circle },
} as const

export function Roadmap() {
  return (
    <section
      id="roadmap"
      className="relative py-20 md:py-28 px-5 md:px-8 bg-background overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-vault/8 blur-[140px]" />

      <div className="relative max-w-7xl mx-auto">
        <div className="max-w-3xl">
          <Reveal>
            <SectionLabel>Roadmap</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1]">
              From testnet
              <br />
              <span className="text-gradient-vault">to confidential mainnet.</span>
            </h2>
          </Reveal>
        </div>

        {/* Timeline */}
        <div className="mt-16 relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-vault/40 via-vault/20 to-transparent md:-translate-x-1/2" />

          <RevealStagger className="space-y-10">
            {MILESTONES.map((m, i) => {
              const s = STATUS_STYLE[m.status as keyof typeof STATUS_STYLE]
              const Icon = s.icon
              const isRight = i % 2 === 1
              return (
                <RevealItem key={`roadmap-milestone-${i}`}>
                  <div className={`relative flex md:items-center ${isRight ? 'md:flex-row-reverse' : ''}`}>
                    {/* Node */}
                    <div className="absolute left-[11px] md:left-1/2 md:-translate-x-1/2 z-10">
                      <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                        className={`w-4 h-4 rounded-full ${s.dot} ring-4 ring-background`}
                      />
                    </div>

                    {/* Card */}
                    <div className={`pl-12 md:pl-0 md:w-1/2 ${isRight ? 'md:pl-12' : 'md:pr-12'}`}>
                      <motion.div
                        whileHover={{ y: -4 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className={`rounded-2xl border ${s.border} ${s.bg} backdrop-blur-sm p-6 md:p-7`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className={`flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider ${s.text}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {m.phase}
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">{m.date}</span>
                        </div>
                        <h3 className="font-display text-xl font-semibold tracking-tight">{m.title}</h3>
                        <ul className="mt-4 space-y-2">
                          {m.items.map((item, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className={`mt-1.5 w-1 h-1 rounded-full ${s.dot} shrink-0`} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    </div>

                    {/* Spacer on the other side for md+ */}
                    <div className="hidden md:block md:w-1/2" />
                  </div>
                </RevealItem>
              )
            })}
          </RevealStagger>
        </div>
      </div>
    </section>
  )
}

export function CTA() {
  const openApp = useDemo((s) => s.openApp)
  const { isLaunched } = useLaunchStatus()
  return (
    <section
      id="cta"
      className="relative py-20 md:py-28 px-5 md:px-8 bg-background overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full bg-vault/15 blur-[160px] animate-pulse-glow" />

      <div className="relative max-w-5xl mx-auto text-center">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 text-xs font-mono uppercase tracking-[0.2em] text-vault mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-vault animate-pulse" />
            {isLaunched ? 'Testnet is LIVE' : 'Testnet launching August 30, 2026 · 14:00 UTC'}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold tracking-[-0.04em] leading-[0.95]">
            <span className="text-gradient-mono">Privacy in finance</span>
            <br />
            <span className="text-gradient-vault">shouldn&apos;t be optional.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-8 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed">
            Join the first confidential financial platform on XELIS BlockDAG.
            Become a price provider, build on the SDK, or just hold xUSD privately.
            The encrypted future is open-source — and waiting for you.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {isLaunched ? (
              <button
                onClick={openApp}
                className="group inline-flex h-13 items-center gap-2 rounded-full bg-vault px-8 py-3.5 text-base font-semibold text-white hover:bg-vault/85 transition-all hover:shadow-[0_0_48px_-8px_var(--vault)]"
              >
                <Rocket className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                Launch App
              </button>
            ) : (
              <div className="inline-flex h-13 items-center gap-3 rounded-full border border-amber-500/40 bg-amber-500/10 px-8 py-3.5">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span className="text-base font-semibold text-amber-200">Testnet launching August 30</span>
                <span className="text-sm font-mono text-amber-300/60">— 14:00 UTC</span>
              </div>
            )}
            <a
              href="https://github.com/XelisVault/xelis-vault"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-13 items-center gap-2 rounded-full border border-border bg-card/40 hover:bg-card/80 hover:border-vault/40 px-8 py-3.5 text-base font-semibold transition-all"
            >
              <Github className="w-5 h-5" />
              Clone the Repo
            </a>
            <a
              href="https://discord.gg/UHpYAWbG"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-13 items-center gap-2 rounded-full border border-border bg-card/40 hover:bg-card/80 hover:border-vault/40 px-8 py-3.5 text-base font-semibold transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              Join Discord
            </a>
          </div>
        </Reveal>

        {/* Launch notice */}
        <Reveal delay={0.4}>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-vault/10 border border-vault/30 px-4 py-2 text-xs font-mono text-vault">
            <span className="w-1.5 h-1.5 rounded-full bg-vault animate-pulse" />
            {isLaunched
              ? 'Testnet live · Connect your Xelis wallet to interact with real contracts'
              : 'Final integration testing in progress · Testnet launches August 30, 2026 · 14:00 UTC'}
          </div>
        </Reveal>

        {/* Quick stats */}
        <RevealStagger className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl glass-panel overflow-hidden max-w-4xl mx-auto">
          {[
            { value: '51', label: 'Smart Contracts' },
            { value: '14', label: 'Categories' },
            { value: '10M', label: 'VLT Supply' },
            { value: '5s', label: 'Block Time' },
          ].map((s, i) => (
            <RevealItem key={`cta-stat-${i}`}>
              <div className="p-6 bg-card/30">
                <div className="font-display text-3xl md:text-4xl font-semibold text-gradient-vault">
                  {s.value}
                </div>
                <div className="mt-1 text-xs text-muted-foreground font-mono uppercase tracking-wider">
                  {s.label}
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  )
}

export function Footer() {
  const columns = [
    {
      title: 'Protocol',
      links: [
        { label: 'Vision', href: '/#vision' },
        { label: 'Architecture', href: '/#architecture' },
        { label: 'xUSD', href: '/#xusd' },
        { label: 'VLT Token', href: '/#vlt' },
        { label: 'VaultChat', href: '/#vaultchat' },
        { label: 'Contracts', href: '/#contracts' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Security', href: '/security' },
        { label: 'Learn', href: '/learn' },
        { label: 'Developers', href: '/developers' },
        { label: 'Compare', href: '/compare' },
        { label: 'Vault Simulator', href: '/vault-simulator' },
      ],
    },
    {
      title: 'Community',
      links: [
        { label: 'Community Hub', href: '/community' },
        { label: 'About', href: '/about' },
        { label: 'Discord', href: 'https://discord.gg/UHpYAWbG', ext: true },
        { label: 'Twitter / X', href: 'https://x.com/xelisvault', ext: true },
        { label: 'GitHub', href: 'https://github.com/XelisVault/xelis-vault', ext: true },
      ],
    },
    {
      title: 'Documentation',
      links: [
        { label: 'Whitepaper', href: 'https://github.com/XelisVault/xelis-vault/blob/main/docs/WHITEPAPER.md', ext: true },
        { label: 'Audit Report', href: 'https://github.com/XelisVault/xelis-vault/blob/main/docs/AUDIT.md', ext: true },
        { label: 'XELIS Docs', href: 'https://docs.xelis.io', ext: true },
        { label: 'XSWD Protocol', href: 'https://docs.xelis.io/features/wallet/xswd', ext: true },
        { label: 'Silex Language', href: 'https://docs.xelis.io/features/smart-contracts/silex', ext: true },
      ],
    },
  ]

  return (
    <footer className="relative border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <QuestLogoTrigger />
              <span className="font-display font-semibold text-base tracking-tight">
                XELIS<span className="text-vault">Vault</span>
              </span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xs">
              The first confidential financial platform on XELIS BlockDAG.
              Encrypted by default, governed by community.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[
                { icon: Github, href: 'https://github.com/XelisVault/xelis-vault', label: 'GitHub' },
                { icon: Twitter, href: 'https://x.com/xelisvault', label: 'Twitter' },
                { icon: MessageCircle, href: 'https://discord.gg/UHpYAWbG', label: 'Discord' },
              ].map((s, i) => (
                <a
                  key={`footer-social-${i}`}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-lg border border-border bg-card/40 hover:bg-card/80 hover:border-vault/40 flex items-center justify-center transition-all"
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-vault/10 border border-vault/30 px-3 py-1.5 text-xs font-mono text-vault">
              <span className="w-1.5 h-1.5 rounded-full bg-vault animate-pulse" />
              Built on XELIS BlockDAG
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col, i) => (
            <div key={`footer-link-${i}`}>
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
                {col.title}
              </div>
              <ul className="mt-4 space-y-3">
                {col.links.map((l, j) => (
                  <li key={j}>
                    <a
                      href={l.href}
                      target={l.ext ? '_blank' : undefined}
                      rel={l.ext ? 'noreferrer' : undefined}
                      className="inline-flex items-center gap-1 text-sm text-foreground/80 hover:text-vault transition-colors"
                    >
                      {l.label}
                      {l.ext && <ArrowUpRight className="w-3 h-3 opacity-50" />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground font-mono">
            © 2026 XELIS Vault · MIT License · Confidential Finance for the Privacy Era
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            Testnet launch: August 30, 2026 · 14:00 UTC
          </div>
        </div>
      </div>
    </footer>
  )
}
