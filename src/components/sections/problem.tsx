'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { Reveal, SectionLabel } from '@/components/site/reveal'

export function Problem() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const encryptedReveal = useTransform(scrollYProgress, [0.3, 0.55], [0, 1])

  return (
    <section
      ref={ref}
      id="vision"
      className="relative py-20 md:py-28 px-5 md:px-8 bg-background overflow-hidden"
    >
      {/* Section bg */}
      <div className="absolute inset-0 bg-dots opacity-25" />
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-vault/5 blur-[120px]" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-vault/7 blur-[120px]" />

      <div className="relative max-w-7xl mx-auto">
        <div className="max-w-3xl">
          <Reveal>
            <SectionLabel>The Problem</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1]">
              Every DeFi platform
              <br />
              <span className="text-muted-foreground">operates on a</span>
              <br />
              <span className="italic font-light">fully transparent ledger.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Your positions, your strategies, your holdings, all visible to everyone.
              Bots front-run you. Competitors copy you. Regulators surveil you. Privacy
              in finance isn&apos;t a feature anymore. It&apos;s survival.
            </p>
          </Reveal>
        </div>

        {/* The two ledgers: same account, two worlds */}
        <div className="mt-20 grid md:grid-cols-2 gap-8 md:gap-12">
          {/* The open ledger */}
          <Reveal delay={0.1}>
            <div className="relative border-t border-foreground/12 pt-6 md:pt-8">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-foreground/70">
                  The open ledger
                </span>
                <span className="text-xs text-muted-foreground font-mono">exposed</span>
              </div>

              <div className="mt-6">
                {[
                  { label: 'Collateral', value: '142.7 XEL', sub: '$1,847.32' },
                  { label: 'Borrowed', value: '920.0 xUSD', sub: 'LTV 49.8%' },
                  { label: 'Health Factor', value: '1.42', sub: 'Above threshold' },
                  { label: 'Wallet Balance', value: '$8,420.10', sub: '4 assets' },
                ].map((row, i) => (
                  <motion.div
                    key={`problem-row-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="flex items-baseline justify-between py-4 border-b border-foreground/10"
                  >
                    <div>
                      <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{row.label}</div>
                      <div className="text-sm font-medium mt-1 tabular-nums">{row.value}</div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono tabular-nums">{row.sub}</div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.9 }}
                className="mt-6 flex items-center gap-2.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs text-destructive font-mono">
                  Front-running bots watching your every move
                </span>
              </motion.div>
            </div>
          </Reveal>

          {/* The confidential ledger */}
          <motion.div style={{ opacity: encryptedReveal }}>
            <Reveal delay={0.2}>
              <div className="relative border-t border-vault/40 pt-6 md:pt-8">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-vault">
                    The confidential ledger
                  </span>
                  <span className="text-xs text-vault/60 font-mono">Only you see</span>
                </div>

                <div className="mt-6">
                  {[
                    { label: 'Collateral', value: '••••••••••••' },
                    { label: 'Borrowed', value: '••••••••••••' },
                    { label: 'Health Factor', value: '✓ Verified' },
                    { label: 'Wallet Balance', value: '••••••••••••' },
                  ].map((row, i) => (
                    <motion.div
                      key={`problem-encrypted-${i}`}
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      className="flex items-baseline justify-between py-4 border-b border-vault/15"
                    >
                      <div>
                        <div className="text-[10px] text-vault/70 font-mono uppercase tracking-wider">{row.label}</div>
                        <div className="text-sm font-mono mt-1 tracking-[0.2em]">{row.value}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.9 }}
                  className="mt-6 flex items-center gap-2.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-vault animate-pulse" />
                  <span className="text-xs text-vault font-mono">
                    Prove solvency with zero-knowledge · no data leaked
                  </span>
                </motion.div>
              </div>
            </Reveal>
          </motion.div>
        </div>

        {/* Closing line */}
        <Reveal delay={0.2}>
          <div className="mt-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-vault mb-4">
                The XELIS Vault Way
              </div>
              <h3 className="font-display text-3xl md:text-5xl font-semibold tracking-[-0.02em] leading-[1.05]">
                Built on XELIS native{' '}
                <span className="text-gradient-vault">homomorphic encryption</span>,
                your financial life stays encrypted by default.
              </h3>
            </div>
            <a
              href="#protocol"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-vault whitespace-nowrap"
            >
              <span className="border-b border-vault/40 group-hover:border-vault transition-colors pb-0.5">
                See the protocol
              </span>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
