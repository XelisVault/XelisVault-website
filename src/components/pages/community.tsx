'use client'

import { motion } from 'framer-motion'
import {
  ArrowLeft,
  MessageCircle,
  Twitter,
  Github,
  ExternalLink,
  Wrench,
  Globe,
} from 'lucide-react'
import { Nav } from '@/components/site/nav'
import { Footer } from '@/components/sections/roadmap-cta'
import { Reveal, SectionLabel } from '@/components/site/reveal'

const CHANNELS = [
  {
    icon: MessageCircle,
    label: 'Discord',
    href: 'https://discord.gg/UHpYAWbG',
    desc: 'Real-time chat, support, and announcements',
  },
  {
    icon: Twitter,
    label: 'Twitter / X',
    href: 'https://x.com/xelisvault',
    desc: 'Public updates and testnet launch alerts',
  },
  {
    icon: Github,
    label: 'GitHub',
    href: 'https://github.com/XelisVault/xelis-vault',
    desc: 'Source code, issues, pull requests',
  },
  {
    icon: Globe,
    label: 'XELIS Blockchain',
    href: 'https://xelis.io',
    desc: 'The underlying BlockDAG chain',
  },
]

const REAL_RESOURCES = [
  {
    title: 'Protocol repository',
    desc: '46 Silex contracts, whitepaper, audit report, CLI tools',
    href: 'https://github.com/XelisVault/xelis-vault',
  },
  {
    title: 'Testnet explorer',
    desc: 'Live blocks, transactions, and contract calls',
    href: 'https://testnet-explorer.xelis.io/',
  },
  {
    title: 'XELIS documentation',
    desc: 'BlockDAG, XSWD wallet protocol, Silex language guide',
    href: 'https://docs.xelis.io',
  },
  {
    title: 'Genesix wallet',
    desc: 'Official XELIS desktop wallet (needed to connect to the dApp)',
    href: 'https://github.com/xelis-project/xelis-genesix-wallet',
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
              presale. Pick a channel below and join us — the team is most active on Discord.
            </p>
          </Reveal>

          {/* Channels — NO fake member counts */}
          <section className="mt-16">
            <Reveal>
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Join the community</h2>
            </Reveal>
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {CHANNELS.map((c) => (
                <Reveal key={c.label}>
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl glass-panel p-6 hover:border-vault/40 hover:bg-card/60 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-vault/10 border border-vault/30 flex items-center justify-center">
                        <c.icon className="w-5 h-5 text-vault" />
                      </div>
                      <div>
                        <div className="font-display text-lg font-semibold">{c.label}</div>
                        <div className="text-xs font-mono text-muted-foreground/70">external link</div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                  </a>
                </Reveal>
              ))}
            </div>
          </section>

          {/* Real resources — replaces fake grants + fake ecosystem projects */}
          <section className="mt-20">
            <Reveal>
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Resources</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Verified links to the actual protocol ecosystem.
              </p>
            </Reveal>
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {REAL_RESOURCES.map((r, i) => (
                <Reveal key={r.title} delay={0.05 * i}>
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl glass-panel p-6 hover:border-vault/40 hover:bg-card/60 transition-all h-full"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg font-semibold">{r.title}</h3>
                      <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                  </a>
                </Reveal>
              ))}
            </div>
          </section>

          {/* Build with us — honest framing, no fake bounty amounts */}
          <section className="mt-20">
            <Reveal>
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-vault" />
                <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Build on XELIS Vault</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                The protocol is MIT-licensed and every contract is open source. If you are building
                something on top — a frontend, an indexer, a mobile app, a bot — let us know on
                Discord. We feature community projects here as they ship.
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
                <Wrench className="w-6 h-6 text-muted-foreground mx-auto" />
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                  No community projects to showcase yet — the testnet has not launched. After August 25,
                  this section will list real projects built by real community members, submitted via
                  Discord and verified before publication.
                </p>
                <a
                  href="https://discord.gg/UHpYAWbG"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-vault px-6 text-sm font-semibold text-white hover:bg-vault/85 transition-all hover:shadow-[0_0_24px_-4px_var(--vault)]"
                >
                  <MessageCircle className="w-4 h-4" />
                  Join the Discord
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              </div>
            </Reveal>
          </section>

          {/* Contact */}
          <Reveal>
            <div className="mt-20 rounded-2xl glass-panel p-6 text-center">
              <p className="text-sm text-muted-foreground">
                For partnerships, press, or private enquiries:{' '}
                <a href="mailto:xelisvault@protonmail.org" className="text-vault hover:underline font-mono">
                  xelisvault@protonmail.org
                </a>
              </p>
            </div>
          </Reveal>
        </div>
      </main>

      <Footer />
    </div>
  )
}
