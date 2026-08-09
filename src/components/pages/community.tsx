'use client'

import { motion } from 'framer-motion'
import {
  ArrowLeft,
  MessageCircle,
  Twitter,
  Github,
  Star,
  Users,
  Sparkles,
  ExternalLink,
  Trophy,
  Wrench,
} from 'lucide-react'
import { Nav } from '@/components/site/nav'
import { Footer } from '@/components/sections/roadmap-cta'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'

const CHANNELS = [
  {
    icon: MessageCircle,
    label: 'Discord',
    value: '1,247',
    sublabel: 'members',
    href: 'https://discord.gg/UHpYAWbG',
    color: 'text-[#5865F2]',
  },
  {
    icon: Twitter,
    label: 'Twitter / X',
    value: '5,420',
    sublabel: 'followers',
    href: 'https://x.com/xelisvault',
    color: 'text-foreground',
  },
  {
    icon: Users,
    label: 'GitHub contributors',
    value: '23',
    sublabel: 'committers',
    href: 'https://github.com/XelisVault/xelis-vault',
    color: 'text-foreground',
  },
  {
    icon: Star,
    label: 'GitHub stars',
    value: '892',
    sublabel: 'stargazers',
    href: 'https://github.com/XelisVault/xelis-vault',
    color: 'text-amber-400',
  },
]

const GRANTS = [
  {
    title: 'Build a frontend',
    reward: '50,000 VLT',
    description: 'Create an alternative React/Next.js frontend for XELIS Vault. Must support all 10 modules.',
    skills: 'React · TypeScript · XELIS RPC',
  },
  {
    title: 'Analytics dashboard',
    reward: '75,000 VLT',
    description: 'Build a Dune-like analytics platform indexing encrypted events from the chain.',
    skills: 'Indexer · SQL · Recharts',
  },
  {
    title: 'Mobile companion app',
    reward: '100,000 VLT',
    description: 'Native iOS/Android app for read-only vault monitoring and push notifications.',
    skills: 'React Native · Push API',
  },
  {
    title: 'Educational content',
    reward: '25,000 VLT',
    description: 'Create tutorials, video walkthroughs, and articles explaining confidential DeFi.',
    skills: 'Writing · Video · Teaching',
  },
]

const PROJECTS = [
  {
    name: 'VaultStats',
    description: 'Real-time TVL, volume, and health-factor analytics for XELIS Vault.',
    author: '@builder1',
    status: 'Live',
    href: '#',
  },
  {
    name: 'VaultBot',
    description: 'Telegram bot for vault monitoring and liquidation alerts.',
    author: '@builder2',
    status: 'Beta',
    href: '#',
  },
  {
    name: 'VaultAcademy',
    description: 'Interactive learning platform for privacy-preserving DeFi concepts.',
    author: '@builder3',
    status: 'In progress',
    href: '#',
  },
]

export function CommunityPage() {
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

          <Reveal>
            <SectionLabel>Community</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mt-6 font-display text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1]">
              Built in the open,
              <br />
              <span className="text-gradient-vault">with you.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-3xl">
              XELIS Vault is community-owned and community-built. No VC allocation, no insider
              presale, no closed-door decisions. Every VLT in circulation is earned through mining,
              airdropped to active community members, or distributed through the grants program
              below. Pick a channel and join us.
            </p>
          </Reveal>

          {/* Channels */}
          <section className="mt-16">
            <Reveal>
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Join the community</h2>
            </Reveal>
            <RevealStagger className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {CHANNELS.map((c) => (
                <RevealItem key={c.label}>
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl glass-panel p-6 hover:border-vault/40 hover:bg-card/60 transition-all"
                  >
                    <c.icon className={`w-6 h-6 ${c.color}`} />
                    <div className="mt-4 font-display text-2xl md:text-3xl font-semibold text-gradient-vault tabular-nums">
                      {c.value}
                    </div>
                    <div className="mt-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      {c.sublabel}
                    </div>
                    <div className="mt-3 text-sm font-medium">{c.label}</div>
                  </a>
                </RevealItem>
              ))}
            </RevealStagger>
          </section>

          {/* Grants */}
          <section className="mt-20">
            <Reveal>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-vault" />
                <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Grants program</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                500,000 VLT reserved for builders. Apply on Discord with a 1-page proposal.
              </p>
            </Reveal>

            <RevealStagger className="mt-8 grid sm:grid-cols-2 gap-4">
              {GRANTS.map((g) => (
                <RevealItem key={g.title}>
                  <motion.div whileHover={{ y: -4 }} className="rounded-2xl glass-panel p-6 h-full flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg font-semibold">{g.title}</h3>
                      <span className="shrink-0 inline-flex items-center rounded-full bg-vault/10 border border-vault/30 px-3 py-1 text-xs font-mono text-vault">
                        {g.reward}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed flex-1">{g.description}</p>
                    <div className="mt-4 text-[11px] font-mono text-muted-foreground/70">{g.skills}</div>
                  </motion.div>
                </RevealItem>
              ))}
            </RevealStagger>

            <Reveal delay={0.3}>
              <a
                href="https://discord.gg/UHpYAWbG"
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-vault px-6 text-sm font-semibold text-white hover:bg-vault/85 transition-all hover:shadow-[0_0_24px_-4px_var(--vault)]"
              >
                <Sparkles className="w-4 h-4" />
                Apply on Discord
                <ExternalLink className="w-3 h-3 opacity-50" />
              </a>
            </Reveal>
          </section>

          {/* Built on XELIS Vault */}
          <section className="mt-20">
            <Reveal>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-vault" />
                <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Built on XELIS Vault</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Projects shipping on top of the protocol. Submit yours on Discord to be featured here.
              </p>
            </Reveal>

            <RevealStagger className="mt-8 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {PROJECTS.map((p) => (
                <RevealItem key={p.name}>
                  <motion.div whileHover={{ y: -4 }} className="rounded-2xl glass-panel p-6 h-full flex flex-col">
                    <div className="flex items-start justify-between">
                      <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                      <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        p.status === 'Live'
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                          : p.status === 'Beta'
                          ? 'border-amber-500/30 text-amber-400 bg-amber-500/5'
                          : 'border-border text-muted-foreground bg-card/30'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed flex-1">{p.description}</p>
                    <div className="mt-4 text-xs font-mono text-muted-foreground/70">by {p.author}</div>
                  </motion.div>
                </RevealItem>
              ))}
            </RevealStagger>

            <Reveal delay={0.3}>
              <div className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center">
                <Wrench className="w-5 h-5 text-muted-foreground mx-auto" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Building something on XELIS Vault? Let us know — we feature community projects every week.
                </p>
                <a
                  href="https://discord.gg/UHpYAWbG"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card/40 hover:bg-card/80 hover:border-vault/40 px-5 text-sm font-medium transition-all"
                >
                  Submit your project
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              </div>
            </Reveal>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
