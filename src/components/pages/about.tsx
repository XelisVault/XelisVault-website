'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Code, Vote, Eye, Ban, Mail, Shield, Handshake, Newspaper, Heart } from 'lucide-react'
import { Nav } from '@/components/site/nav'
import { Footer } from '@/components/sections/roadmap-cta'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'

const PRINCIPLES = [
  {
    icon: Code,
    title: 'All code is MIT-licensed',
    description:
      'Every contract, every script, every line of infrastructure is open source under the MIT license. Fork it, audit it, build on it, compete with it. We do not believe in source-available or BSL licenses for critical financial infrastructure.',
  },
  {
    icon: Vote,
    title: 'All decisions are made on-chain',
    description:
      'Parameter changes, new oracle feeds, treasury allocations, and guardian elections all pass through the Governor contract with a 48-hour Timelock. If it is not on-chain, it is not a decision — it is a suggestion.',
  },
  {
    icon: Eye,
    title: 'All development is public',
    description:
      'Every commit, every issue, every internal audit finding is on GitHub. The four critical vulnerabilities that delayed the testnet are public. We do not hide mistakes — we publish them so the next team does not repeat them.',
  },
  {
    icon: Ban,
    title: 'No VC funding, no presale, no insiders',
    description:
      'XELIS Vault has no investors, no allocation to the team that vests behind closed doors, no pre-sale to selected friends. The 10M VLT supply is fully distributed through mining, community airdrops, and protocol incentives. The team holds VLT only by buying it on the open market or earning it through mining.',
  },
]

const TEAM_STATS = [
  { value: '5', label: 'Core developers', note: 'anonymous, GitHub-verified' },
  { value: '3', label: 'Security researchers', note: 'internal audit + bounty triage' },
  { value: '2', label: 'Community managers', note: 'Discord + multilingual' },
  { value: '23+', label: 'Open-source contributors', note: 'PRs merged' },
]

const CONTACTS = [
  { icon: Mail, label: 'General', email: 'hello@xelisvault.com' },
  { icon: Shield, label: 'Security', email: 'security@xelisvault.com' },
  { icon: Handshake, label: 'Partnerships', email: 'partnerships@xelisvault.com' },
  { icon: Newspaper, label: 'Media', email: 'media@xelisvault.com' },
]

export function AboutPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <Nav />

      <main className="flex-1 relative pt-24 md:pt-32">
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-vault/8 blur-[140px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-5 md:px-8 pb-20">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-vault transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </a>

          {/* Mission */}
          <Reveal>
            <SectionLabel>About</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mt-6 font-display text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1]">
              Privacy in finance
              <br />
              <span className="text-gradient-vault">should be the default.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              XELIS Vault exists because every transparent ledger — Ethereum, Solana, BNB Chain — has
              turned into a surveillance machine. Your salary, your trades, your loans, your
              donations: all visible to anyone with a block explorer and a few hours to spare.
              Front-running bots read your intent before your transaction confirms. Chain analytics
              firms sell your wallet history to employers, insurers, and governments. This is not the
              future we want. XELIS Vault is a confidential financial platform where balances,
              transactions, and positions are encrypted by default — not as an add-on, but as a
              property of the chain itself.
            </p>
          </Reveal>

          {/* Team stats */}
          <section className="mt-20">
            <Reveal>
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Team</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Distributed, anonymous, GitHub-verified. We let the code speak.
              </p>
            </Reveal>

            <RevealStagger className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {TEAM_STATS.map((s) => (
                <RevealItem key={s.label}>
                  <div className="rounded-2xl glass-panel p-6 text-center">
                    <div className="font-display text-3xl md:text-4xl font-semibold text-gradient-vault">
                      {s.value}
                    </div>
                    <div className="mt-2 text-sm font-medium">{s.label}</div>
                    <div className="mt-1 text-[11px] font-mono text-muted-foreground/70">{s.note}</div>
                  </div>
                </RevealItem>
              ))}
            </RevealStagger>
          </section>

          {/* Principles */}
          <section className="mt-20">
            <Reveal>
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                Open source philosophy
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Four non-negotiable principles.
              </p>
            </Reveal>

            <RevealStagger className="mt-8 grid sm:grid-cols-2 gap-4">
              {PRINCIPLES.map((p) => (
                <RevealItem key={p.title}>
                  <motion.div whileHover={{ y: -4 }} className="rounded-2xl glass-panel p-6 h-full">
                    <div className="w-10 h-10 rounded-xl bg-vault/10 border border-vault/30 flex items-center justify-center mb-4">
                      <p.icon className="w-5 h-5 text-vault" />
                    </div>
                    <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                  </motion.div>
                </RevealItem>
              ))}
            </RevealStagger>
          </section>

          {/* Partnerships */}
          <section className="mt-20">
            <Reveal>
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Partnerships</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We partner with builders, not VCs.
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl glass-panel p-6">
                  <div className="text-xs font-mono uppercase tracking-wider text-vault">Blockchain partner</div>
                  <h3 className="mt-2 font-display text-lg font-semibold">XELIS Foundation</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    XELIS Vault is built on the XELIS BlockDAG. We work closely with the core team on
                    protocol-level features that benefit privacy applications.
                  </p>
                  <a href="https://xelis.io" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-vault hover:underline">
                    xelis.io ↗
                  </a>
                </div>
                <div className="rounded-2xl glass-panel p-6">
                  <div className="text-xs font-mono uppercase tracking-wider text-amber-400">Security partner</div>
                  <h3 className="mt-2 font-display text-lg font-semibold">External audit firm</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Q3 2026. Candidates: Trail of Bits, OpenZeppelin, Hacken. Final selection is
                    subject to a community vote. 100,000 VLT budget allocated.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    To be announced
                  </div>
                </div>
              </div>
            </Reveal>
          </section>

          {/* Contact */}
          <section className="mt-20">
            <Reveal>
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Contact</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick the right inbox. We reply within 48 hours.
              </p>
            </Reveal>

            <RevealStagger className="mt-8 grid sm:grid-cols-2 gap-4">
              {CONTACTS.map((c) => (
                <RevealItem key={c.label}>
                  <a
                    href={`mailto:${c.email}`}
                    className="block rounded-2xl glass-panel p-6 hover:border-vault/40 hover:bg-card/60 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-vault/10 border border-vault/30 flex items-center justify-center">
                        <c.icon className="w-5 h-5 text-vault" />
                      </div>
                      <div>
                        <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{c.label}</div>
                        <div className="font-mono text-sm">{c.email}</div>
                      </div>
                    </div>
                  </a>
                </RevealItem>
              ))}
            </RevealStagger>
          </section>

          {/* Closing */}
          <Reveal>
            <div className="mt-20 rounded-2xl border border-vault/30 bg-vault/5 p-8 text-center">
              <Heart className="w-8 h-8 text-vault mx-auto" />
              <p className="mt-4 text-lg font-display font-medium leading-relaxed">
                Thank you for believing in privacy.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                The testnet launches August 30, 2026 at 14:00 UTC. We will see you there.
              </p>
            </div>
          </Reveal>
        </div>
      </main>

      <Footer />
    </div>
  )
}
