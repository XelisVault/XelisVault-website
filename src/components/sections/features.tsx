'use client'

import { motion } from 'framer-motion'
import { MessageSquareLock, Wind, ShieldCheck, Zap, FileLock2, Network } from 'lucide-react'
import { Reveal, SectionLabel } from '@/components/site/reveal'

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

        {/* Bento grid */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-5">
          {/* VaultChat - big card */}
          <Reveal className="md:col-span-2 md:row-span-2">
            <div className="relative h-full min-h-[400px] rounded-2xl glass-panel p-7 md:p-9 overflow-hidden group">
              <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-vlt/10 blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />

              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-vlt/10 border border-vlt/20 flex items-center justify-center text-vlt">
                  <MessageSquareLock className="w-5 h-5" />
                </div>

                <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-vlt/10 border border-vlt/20 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-vlt">
                  <span className="w-1 h-1 rounded-full bg-vlt" />
                  New in v5.0
                </div>

                <h3 className="mt-4 font-display text-2xl md:text-3xl font-semibold tracking-tight">
                  VaultChat
                </h3>
                <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-lg">
                  End-to-end encrypted messaging with Diffie-Hellman key exchange, off-chain
                  relayers, and hourly on-chain Merkle anchoring. <strong className="text-foreground">1 transaction per hour, 0 gas per message.</strong>
                </p>

                {/* Chat mock */}
                <div className="mt-8 space-y-2 max-w-md">
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
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs font-mono ${
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

                <div className="mt-6 flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  E2E encrypted · merkle-anchored hourly
                </div>
              </div>
            </div>
          </Reveal>

          {/* PrivacyMixer */}
          <Reveal delay={0.1}>
            <div className="relative h-full min-h-[200px] rounded-2xl glass-panel hover:glass-panel-hover p-6 transition-all overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-vault/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-10 h-10 rounded-lg bg-vault/10 border border-vault/20 flex items-center justify-center text-vault">
                <Wind className="w-4 h-4" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">PrivacyMixer</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Tornado-style ZK anonymity set for xUSD and VLT. Denominations of 10, 100, 1000. Merkle tree depth 24.
              </p>
              <div className="mt-4 flex gap-1.5">
                {[10, 100, 1000].map((d) => (
                  <span key={d} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-vault/10 border border-vault/20 text-vault">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ComplianceModule */}
          <Reveal delay={0.15}>
            <div className="relative h-full min-h-[200px] rounded-2xl glass-panel hover:glass-panel-hover p-6 transition-all overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-xusd/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-10 h-10 rounded-lg bg-xusd/10 border border-xusd/20 flex items-center justify-center text-xusd">
                <FileLock2 className="w-4 h-4" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">ComplianceModule</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                ZK-based KYC/AML verification. Prove regulatory eligibility without revealing your identity. MiCA/MiFID compatible.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-xusd/10 border border-xusd/20 text-xusd">
                <span className="w-1 h-1 rounded-full bg-xusd" />
                ZK · MiCA · MiFID
              </div>
            </div>
          </Reveal>

          {/* FlashLoan */}
          <Reveal delay={0.2}>
            <div className="relative h-full min-h-[200px] rounded-2xl glass-panel hover:glass-panel-hover p-6 transition-all overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-vault/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-10 h-10 rounded-lg bg-vault/10 border border-vault/20 flex items-center justify-center text-vault">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">Flash Loans</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Uncollateralized atomic borrows with reentrancy guard. Arbitrage, liquidations, refinancing — all in one block.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-mono text-vault">
                <span className="w-1.5 h-1.5 rounded-full bg-vault animate-pulse" />
                Atomic · 1-block · 0 collateral
              </div>
            </div>
          </Reveal>

          {/* SealedBidAuction */}
          <Reveal delay={0.25}>
            <div className="relative h-full min-h-[200px] rounded-2xl glass-panel hover:glass-panel-hover p-6 transition-all overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-vlt/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-10 h-10 rounded-lg bg-vlt/10 border border-vlt/20 flex items-center justify-center text-vlt">
                <Network className="w-4 h-4" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">Sealed-Bid Auctions</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Confidential commit-reveal liquidations. No front-running. No sniping. No bid stalking. Just fair price discovery.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-mono text-vlt">
                <ShieldCheck className="w-3 h-3" />
                commit → reveal · MEV-proof
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
