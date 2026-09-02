'use client'

import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Lock,
  Coins,
  Network,
  BookOpen,
  Video,
  Clock,
  ArrowUpRight,
} from 'lucide-react'
import { Nav } from '@/components/site/nav'
import { Footer } from '@/components/sections/roadmap-cta'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'

const CATEGORIES = [
  {
    icon: Lock,
    title: 'Cryptography basics',
    description: 'The primitives that make confidential finance possible.',
    articles: [
      { title: 'What is homomorphic encryption?', readTime: '5 min', href: 'https://en.wikipedia.org/wiki/Homomorphic_encryption' },
      { title: 'How Twisted ElGamal works on XELIS', readTime: '10 min', href: 'https://docs.xelis.io/features/privacy' },
      { title: 'Zero-knowledge proofs explained', readTime: '8 min', href: 'https://en.wikipedia.org/wiki/Zero-knowledge_proof' },
      { title: 'Why privacy matters in DeFi', readTime: '6 min', href: 'https://github.com/XelisVault/xelis-vault/blob/main/docs/WHITEPAPER.md' },
    ],
  },
  {
    icon: Coins,
    title: 'DeFi concepts',
    description: 'The financial primitives XELIS Vault builds on.',
    articles: [
      { title: 'What is a CDP (collateralized debt position)?', readTime: '7 min', href: 'https://en.wikipedia.org/wiki/Collateralized_debt_position' },
      { title: 'How liquidations work', readTime: '10 min', href: '/vault-simulator' },
      { title: 'Understanding LTV and health factor', readTime: '5 min', href: '/vault-simulator' },
      { title: 'Oracle manipulation risks', readTime: '12 min', href: 'https://github.com/XelisVault/xelis-vault/blob/main/docs/AUDIT.md' },
    ],
  },
  {
    icon: Network,
    title: 'Protocol deep dives',
    description: 'XELIS Vault internals, straight from the source.',
    articles: [
      { title: 'StakedOracle architecture', readTime: '15 min', href: 'https://github.com/XelisVault/xelis-vault/blob/main/contracts/oracle/StakedOracle.slx' },
      { title: 'VaultEngineV3 security model', readTime: '20 min', href: 'https://github.com/XelisVault/xelis-vault/blob/main/contracts/vault/VaultEngineV3.slx' },
      { title: 'MEV protection mechanisms', readTime: '10 min', href: 'https://github.com/XelisVault/xelis-vault/blob/main/contracts/amm/VaultSwapV2.slx' },
      { title: 'Governance and Timelock', readTime: '8 min', href: 'https://github.com/XelisVault/xelis-vault/blob/main/contracts/governance/Governor.slx' },
    ],
  },
]

const VIDEOS = [
  { title: 'Opening your first vault', duration: '5 min', href: '#' },
  { title: 'Understanding the StakedOracle', duration: '10 min', href: '#' },
  { title: 'How to participate in governance', duration: '15 min', href: '#' },
  { title: 'Mining on XELIS Vault', duration: '12 min', href: '#' },
]

export function LearnPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <Nav />

      <main className="flex-1 relative pt-32 md:pt-36">
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-vault/8 blur-[140px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-5 md:px-8 pb-20">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-vault transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </a>

          <Reveal>
            <SectionLabel>Learn</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mt-6 font-display text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1]">
              Master confidential
              <br />
              <span className="text-gradient-vault">DeFi, one concept at a time.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-3xl">
              Whether you are new to DeFi or a seasoned builder, the learning curve on a
              confidential chain is different. Below is a curated reading list that takes you from
              the cryptographic primitives to the protocol internals. Each link opens the original
              source — no second-hand summaries.
            </p>
          </Reveal>

          {/* Categories */}
          <div className="mt-16 space-y-16">
            {CATEGORIES.map((cat, idx) => (
              <section key={cat.title}>
                <Reveal>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-vault/10 border border-vault/30 flex items-center justify-center shrink-0">
                      <cat.icon className="w-6 h-6 text-vault" />
                    </div>
                    <div>
                      <h2 className="font-display text-2xl font-semibold tracking-tight">{cat.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>
                    </div>
                  </div>
                </Reveal>

                <RevealStagger className="mt-6 grid sm:grid-cols-2 gap-4">
                  {cat.articles.map((article) => (
                    <RevealItem key={article.title}>
                      <motion.a
                        href={article.href}
                        target={article.href.startsWith('http') ? '_blank' : undefined}
                        rel={article.href.startsWith('http') ? 'noreferrer' : undefined}
                        whileHover={{ y: -3 }}
                        className="block rounded-2xl glass-panel p-5 hover:border-vault/40 hover:bg-card/60 transition-all h-full"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-display font-medium leading-snug">{article.title}</h3>
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs font-mono text-muted-foreground/70">
                          <Clock className="w-3 h-3" />
                          {article.readTime} read
                        </div>
                      </motion.a>
                    </RevealItem>
                  ))}
                </RevealStagger>
              </section>
            ))}
          </div>

          {/* Video tutorials placeholder */}
          <section className="mt-20">
            <Reveal>
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-vault" />
                <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Video tutorials</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Coming after testnet launch. We record every workflow with the real contracts.
              </p>
            </Reveal>

            <RevealStagger className="mt-8 grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {VIDEOS.map((v) => (
                <RevealItem key={v.title}>
                  <div className="rounded-2xl border border-dashed border-border p-5 h-full">
                    <div className="aspect-video rounded-lg bg-card/40 mb-4 flex items-center justify-center">
                      <Video className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <h3 className="font-display font-medium text-sm leading-snug">{v.title}</h3>
                    <div className="mt-2 flex items-center gap-2 text-[11px] font-mono text-muted-foreground/60">
                      <Clock className="w-3 h-3" />
                      {v.duration}
                    </div>
                  </div>
                </RevealItem>
              ))}
            </RevealStagger>
          </section>

          {/* Docs CTA */}
          <Reveal>
            <div className="mt-20 rounded-2xl glass-panel p-8 text-center">
              <BookOpen className="w-8 h-8 text-vault mx-auto" />
              <h2 className="mt-4 font-display text-2xl font-semibold">Complete documentation</h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
                Ready to dive deeper? The full technical documentation lives on GitHub alongside the
                source code. Every contract is documented with entry function signatures, parameters,
                and example calls.
              </p>
              <a
                href="https://github.com/XelisVault/xelis-vault"
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-vault px-6 text-sm font-semibold text-white hover:bg-vault/85 transition-all hover:shadow-[0_0_24px_-4px_var(--vault)]"
              >
                <BookOpen className="w-4 h-4" />
                View full documentation
                <ArrowUpRight className="w-3 h-3 opacity-50" />
              </a>
            </div>
          </Reveal>
        </div>
      </main>

      <Footer />
    </div>
  )
}
