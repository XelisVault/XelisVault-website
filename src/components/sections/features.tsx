'use client'

import { motion } from 'framer-motion'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'

export function Features() {
  return (
    <section className="relative py-32 md:py-40 px-5 md:px-8 bg-background overflow-hidden">
      <div className="absolute inset-0 bg-dots opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-vault/5 blur-[160px]" />

      <div className="relative max-w-7xl mx-auto">
        <div className="max-w-3xl mb-14">
          <Reveal>
            <SectionLabel>Beyond Lending</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-6 font-display text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1]">
              A complete{' '}
              <span className="text-gradient-vault">confidential ecosystem</span>
              <br />on a single BlockDAG.
            </h2>
          </Reveal>
        </div>

        {/* VaultChat: editorial feature spread with the live chat vignette */}
        <Reveal>
          <div className="border-t border-foreground/12 pt-10 md:pt-14 pb-4 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-start">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-vlt">
                New in v11.5
              </div>
              <h3 className="mt-4 font-display text-3xl md:text-4xl font-semibold tracking-tight">
                VaultChat
              </h3>
              <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
                End-to-end encrypted messaging with Diffie-Hellman key exchange, off-chain
                relayers, and hourly on-chain Merkle anchoring.{' '}
                <strong className="text-foreground">One transaction per hour, zero gas per message.</strong>
              </p>
              <div className="mt-5 text-xs font-mono text-muted-foreground">
                E2E encrypted · Merkle-anchored hourly
              </div>
            </div>

            {/* Chat vignette: the product speaks for itself */}
            <div className="relative max-w-md w-full mx-auto lg:mr-0">
              <div className="absolute -inset-2.5 rounded-[6px] border border-vlt/25 pointer-events-none" />
              <div className="relative rounded-[4px] ring-1 ring-foreground/15 bg-card/40 p-6 shadow-maison">
                <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70 border-b border-foreground/10 pb-3">
                  Conversation · encrypted
                </div>
                <div className="mt-5 space-y-2.5">
                  {[
                    { from: 'them', text: '0x4f9a…c2b1', time: '14:01' },
                    { from: 'me', text: '••••••••••••', time: '14:01' },
                    { from: 'them', text: '0x9d3e…1f7a', time: '14:02' },
                  ].map((m, i) => (
                    <motion.div
                      key={`feat-chat-${i}`}
                      initial={{ opacity: 0, x: m.from === 'me' ? 20 : -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + i * 0.15 }}
                      className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] rounded-none px-3.5 py-2 text-xs font-mono${
                        m.from === 'me'
                          ? 'bg-vlt/15 border border-vlt/30 text-vlt rounded-br-sm'
                          : 'bg-card/60 border border-border rounded-bl-sm'
                      }`}>
                        <div>{m.text}</div>
                        <div className="text-[9px] opacity-50 mt-0.5">{m.time}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* The four modules: an editorial ledger, hairlines only */}
        <RevealStagger className="grid md:grid-cols-2 gap-x-16">
          {[
            {
              title: 'PrivacyMixer',
              tag: 'XEL · xUSD · VLT',
              desc: 'Tornado-style note mixing for XEL, xUSD and VLT. Deposit with a secret, withdraw from the shared pool to any address; the contract stores no sender, no recipient.',
            },
            {
              title: 'ComplianceModule',
              tag: 'ZK · MiCA · MiFID',
              desc: 'ZK-based KYC/AML verification. Prove regulatory eligibility without revealing your identity to the counterparty or the network.',
            },
            {
              title: 'Flash Loans',
              tag: 'Atomic · 0 collateral',
              desc: 'Uncollateralized atomic borrows with reentrancy guard. Arbitrage, liquidations, refinancing, all settled within a single block.',
            },
            {
              title: 'Sealed-Bid Auctions',
              tag: 'Commit → reveal',
              desc: 'Confidential commit-reveal liquidations. No front-running, no sniping, no bid stalking. Just fair price discovery.',
            },
          ].map((f, i) => (
            <RevealItem key={`feature-${i}`}>
              <div className="group border-t border-foreground/12 py-8 md:py-10">
                <div className="flex items-baseline justify-between gap-6">
                  <h3 className="font-display text-xl md:text-2xl font-semibold tracking-tight">
                    {f.title}
                  </h3>
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70 group-hover:text-vault transition-colors shrink-0">
                    {f.tag}
                  </span>
                </div>
                <p className="mt-3 text-sm md:text-[15px] text-muted-foreground leading-relaxed max-w-xl">
                  {f.desc}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  )
}
