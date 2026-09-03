'use client'

import { motion } from 'framer-motion'
import { Github, Twitter, MessageCircle, ArrowUpRight, ArrowUp } from 'lucide-react'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'
import { useDemo } from '@/lib/demo-store'
import { QuestLogoTrigger } from '@/components/quest/quest-logo-trigger'
import { CountdownTimer, useLaunchStatus } from '@/components/app/launch-gate'

const MILESTONES = [
  {
    phase: 'Complete',
    status: 'done',
    title: 'Core Protocol v11.5',
    items: [
      '51 contracts total · 966 entry functions · MIT license',
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
    phase: 'Complete',
    status: 'done',
    title: 'Testnet Deployment',
    items: [
      'Contracts redeployed with v5.1 patches (4 critical fixes)',
      'XSWD integration rewrite (cross-contract permissions)',
      'CLI tool + miner script released on GitHub',
      'Wallet connection via Genesix + local RPC',
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
  done: { dot: 'bg-emerald-600', text: 'text-emerald-700' },
  active: { dot: 'bg-vault', text: 'text-vault' },
  pending: { dot: 'bg-muted-foreground/40', text: 'text-muted-foreground' },
} as const

export function Roadmap() {
  return (
    <section
      id="roadmap"
      className="relative py-20 md:py-28 px-5 md:px-8 bg-background overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid opacity-25" />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-vault/7 blur-[140px]" />

      <div className="relative max-w-7xl mx-auto">
        <div className="max-w-3xl">
          <Reveal>
            <SectionLabel>Roadmap</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-medium tracking-[-0.02em] leading-[1.02]">
              From testnet
              <br />
              <span className="italic font-light text-gradient-vault">to confidential mainnet.</span>
            </h2>
          </Reveal>
        </div>

        {/* Milestone ledger: editorial rows, hairlines only */}
        <div className="mt-16">
          <RevealStagger>
            {MILESTONES.map((m, i) => {
              const s = STATUS_STYLE[m.status as keyof typeof STATUS_STYLE]
              return (
                <RevealItem key={`roadmap-milestone-${i}`}>
                  <div className="relative border-t border-foreground/12 py-8 md:py-10">
                    <div className="grid md:grid-cols-[180px_1fr] gap-x-12">
                      {/* Date column */}
                      <div className="flex items-baseline gap-3 md:block">
                        <span className="text-sm font-mono text-foreground/80 tabular-nums">{m.date}</span>
                        <div className={`mt-1.5 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] ${s.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {m.phase}
                        </div>
                      </div>
                      {/* Content column */}
                      <div>
                        <h3 className="font-display text-xl md:text-2xl font-semibold tracking-tight">{m.title}</h3>
                        <ul className="mt-4 md:columns-2 gap-x-10">
                          {m.items.map((item, j) => (
                            <li key={j} className="flex items-baseline gap-3 text-sm text-muted-foreground py-1.5 break-inside-avoid">
                              <span className="font-mono text-[10px] text-muted-foreground/40 shrink-0">{String(j + 1).padStart(2, '0')}</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
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
      className="relative py-24 md:py-32 px-5 md:px-8 dark-band overflow-hidden"
    >
      {/* Dark marble texture backdrop */}
      <div className="absolute inset-0 opacity-[0.16]">
        <img
          src="/images/bank/marble-dark.jpg"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-oklch(0.16 0.008 80 / 0.6)" />
      {/* Champagne breath */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full bg-vault/12 blur-[160px] animate-pulse-glow" />

      <div className="relative max-w-5xl mx-auto text-center">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-ink-foreground/15 bg-ink-foreground/5 px-4 py-1.5 text-[11px] font-mono uppercase tracking-[0.2em] text-vault-soft mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {isLaunched ? 'Testnet is live' : 'Testnet launching August 30, 2026 · 14:00 UTC'}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-medium tracking-[-0.02em] leading-[1] text-ink-foreground">
            <span>Privacy in finance</span>
            <br />
            <span className="italic font-light text-gradient-gold">shouldn&apos;t be optional.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-8 max-w-2xl mx-auto text-lg md:text-xl text-ink-foreground/70 leading-relaxed">
            Join the first confidential financial platform on XELIS BlockDAG.
            Become a price provider, build on the SDK, or just hold xUSD privately.
            The encrypted future is open-source, and it is waiting for you.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {isLaunched ? (
              <button
                onClick={() => openApp()}
                className="group inline-flex h-13 items-center rounded-full bg-vault px-8 py-3.5 text-base font-semibold text-primary-foreground hover:bg-vault/90 transition-all hover:shadow-[0_12px_40px_-10px_var(--vault)]"
              >
                Launch App
              </button>
            ) : (
              <CountdownTimer compact />
            )}
            <a
              href="https://github.com/XelisVault/xelis-vault"
              target="_blank"
              rel="noreferrer"
              className="group inline-flex h-13 items-center rounded-full border border-ink-foreground/20 hover:border-vault/40 px-8 py-3.5 text-base font-semibold text-ink-foreground transition-all"
            >
              <span className="border-b border-ink-foreground/20 group-hover:border-vault-soft pb-0.5">Clone the Repo</span>
            </a>
            <a
              href="https://discord.gg/UHpYAWbG"
              target="_blank"
              rel="noreferrer"
              className="group inline-flex h-13 items-center rounded-full border border-ink-foreground/20 hover:border-vault/40 px-8 py-3.5 text-base font-semibold text-ink-foreground transition-all"
            >
              <span className="border-b border-ink-foreground/20 group-hover:border-vault-soft pb-0.5">Join Discord</span>
            </a>
          </div>
        </Reveal>

        {/* Trust line */}
        <Reveal delay={0.4}>
          <div className="mt-8 text-xs font-mono text-ink-foreground/50">
            {isLaunched
              ? 'Testnet live · Connect your Xelis wallet to interact with real contracts'
              : 'Final integration testing in progress · Testnet launches August 30, 2026 · 14:00 UTC'}
          </div>
        </Reveal>

        {/* Quick stats: hairline band on ink */}
        <RevealStagger className="mt-16 grid grid-cols-2 md:grid-cols-4 border-t border-b border-ink-foreground/15 max-w-4xl mx-auto">
          {[
            { value: '51', label: 'Smart Contracts' },
            { value: '14', label: 'Categories' },
            { value: '10M', label: 'VLT Supply' },
            { value: '5s', label: 'Block Time' },
          ].map((s, i) => (
            <RevealItem key={`cta-stat-${i}`}>
              <div className="py-6 px-5 md:border-l md:first:border-l-0 border-ink-foreground/12">
                <div className="font-display text-3xl md:text-4xl font-semibold text-gradient-gold tabular-nums">
                  {s.value}
                </div>
                <div className="mt-1 text-xs text-ink-foreground/60 font-mono uppercase tracking-wider">
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
        { label: 'The Observatory · Live Explorer', href: '/explorer' },
        { label: 'Documentation', href: '/docs' },
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
        { label: 'Hall of Fame', href: '/contributors' },
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
    <footer className="relative dark-band">
      {/* Gold hairline at the top of the footer */}
      <div className="rule-gold-line" />

      <div className="max-w-7xl mx-auto px-5 md:px-8 pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr] gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <QuestLogoTrigger />
              <span className="font-display font-semibold text-lg tracking-[-0.01em] text-ink-foreground">
                XELIS<span className="text-vault">Vault</span>
              </span>
            </div>
            <p className="mt-5 text-sm text-ink-foreground/60 leading-relaxed max-w-xs">
              The first confidential financial platform on XELIS BlockDAG.
              Encrypted by default, governed by community, built to an
              institutional standard.
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
                  className="w-9 h-9 rounded-md border border-ink-foreground/15 hover:bg-vault hover:border-vault flex items-center justify-center text-ink-foreground/80 hover:text-primary-foreground transition-all"
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
              <span className="ml-3 text-[11px] font-mono uppercase tracking-[0.18em] text-vault-soft/80">
                Built on XELIS BlockDAG
              </span>
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col, i) => (
            <div key={`footer-link-${i}`}>
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-ink-foreground/45">
                {col.title}
              </div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l, j) => (
                  <li key={j}>
                    <a
                      href={l.href}
                      target={l.ext ? '_blank' : undefined}
                      rel={l.ext ? 'noreferrer' : undefined}
                      className="inline-flex items-center gap-1 text-sm text-ink-foreground/75 hover:text-vault-soft transition-colors"
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

        {/* Back to top */}
        <div className="mt-12 flex justify-center">
          <a
            href="/#top"
            className="group inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-ink-foreground/50 hover:text-vault-soft transition-colors"
            aria-label="Back to top"
          >
            <ArrowUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
            Back to top
          </a>
        </div>

        {/* Bottom */}
        <div className="mt-6 pt-6 border-t border-ink-foreground/12 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="text-[11px] text-ink-foreground/45 font-mono">
            © 2026 XELIS Vault · MIT License · Confidential Finance for the Privacy Era
          </div>
          <div className="text-[11px] text-ink-foreground/45 font-mono">
            Testnet live since August 30, 2026 · 14:00 UTC
          </div>
        </div>
      </div>
    </footer>
  )
}
