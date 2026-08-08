'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
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
      <div className="absolute inset-0 bg-dots opacity-30" />
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-red-500/5 blur-[120px]" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-vault/10 blur-[120px]" />

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
              <span className="text-red-400">fully transparent ledger.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Your positions, your strategies, your holdings — visible to everyone.
              Bots front-run you. Competitors copy you. Regulators surveil you. Privacy
              in finance isn&apos;t a feature anymore. It&apos;s survival.
            </p>
          </Reveal>
        </div>

        {/* Visual contrast */}
        <div className="mt-20 grid md:grid-cols-2 gap-4 md:gap-6">
          {/* Transparent side */}
          <Reveal delay={0.1}>
            <div className="relative h-[460px] rounded-2xl border border-red-500/20 bg-red-950/10 overflow-hidden p-6 md:p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-300">
                  <Eye className="w-4 h-4" />
                  <span className="font-mono text-xs uppercase tracking-[0.2em]">Transparent</span>
                </div>
                <span className="text-xs text-red-300/60 font-mono">Anyone can see</span>
              </div>

              <div className="mt-6 space-y-3">
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
                    className="flex items-center justify-between rounded-lg bg-red-950/30 border border-red-500/10 px-4 py-3"
                  >
                    <div>
                      <div className="text-xs text-red-300/70 font-mono uppercase tracking-wider">{row.label}</div>
                      <div className="text-sm font-medium mt-0.5">{row.value}</div>
                    </div>
                    <div className="text-xs text-red-300/60 font-mono">{row.sub}</div>
                  </motion.div>
                ))}
              </div>

              <div className="absolute bottom-6 left-6 right-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.9 }}
                  className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-xs text-red-200 font-mono">
                    Front-running bots watching your every move
                  </span>
                </motion.div>
              </div>

              {/* Scan line */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <motion.div
                  animate={{ y: ['-100%', '500%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-400/60 to-transparent"
                />
              </div>
            </div>
          </Reveal>

          {/* Encrypted side */}
          <motion.div style={{ opacity: encryptedReveal }}>
            <Reveal delay={0.2}>
              <div className="relative h-[460px] rounded-2xl border border-vault/30 bg-gradient-to-br from-vault/10 to-background overflow-hidden p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-vault">
                    <EyeOff className="w-4 h-4" />
                    <span className="font-mono text-xs uppercase tracking-[0.2em]">Confidential</span>
                  </div>
                  <span className="text-xs text-vault/60 font-mono">Only you see</span>
                </div>

                <div className="mt-6 space-y-3">
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
                      className="flex items-center justify-between rounded-lg bg-vault/5 border border-vault/15 px-4 py-3"
                    >
                      <div>
                        <div className="text-xs text-vault/70 font-mono uppercase tracking-wider">{row.label}</div>
                        <div className="text-sm font-mono mt-0.5 tracking-[0.2em]">{row.value}</div>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-vault/40" />
                    </motion.div>
                  ))}
                </div>

                <div className="absolute bottom-6 left-6 right-6">
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.9 }}
                    className="flex items-center gap-2 rounded-lg bg-vault/10 border border-vault/30 px-4 py-3"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-vault animate-pulse" />
                    <span className="text-xs text-vault-foreground font-mono">
                      Prove solvency with zero-knowledge · no data leaked
                    </span>
                  </motion.div>
                </div>

                {/* Animated cipher particles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div
                      key={`problem-cipher-${i}`}
                      className="absolute text-vault/20 font-mono text-[10px]"
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: [0, 0.8, 0],
                        y: [0, -40],
                        x: [(i % 4) * 80 + 20, (i % 4) * 80 + 30],
                      }}
                      transition={{
                        duration: 3 + (i % 3),
                        repeat: Infinity,
                        delay: i * 0.4,
                        ease: 'easeOut',
                      }}
                      style={{ bottom: 60, left: `${10 + (i % 6) * 14}%` }}
                    >
                      {['0x4f', '0x9a', '0xc2', '0x1e', '0xb7', '0x33'][i % 6]}
                    </motion.div>
                  ))}
                </div>
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
                your financial life stays encrypted — by default.
              </h3>
            </div>
            <a
              href="#protocol"
              className="inline-flex items-center gap-2 text-sm font-semibold text-vault hover:gap-3 transition-all whitespace-nowrap"
            >
              See the protocol <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Lock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
