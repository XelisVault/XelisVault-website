'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, Lock } from 'lucide-react'
import { Reveal, SectionLabel } from '@/components/site/reveal'

export function Xusd() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360])
  const logoScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 1.05])

  return (
    <section
      ref={ref}
      id="xusd"
      className="relative py-20 md:py-28 px-5 md:px-8 bg-background overflow-hidden"
    >
      {/* Background — cyan/teal accent for xUSD */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-xusd/8 blur-[140px]" />

      <div className="relative max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-center">
          {/* Left: copy */}
          <div>
            <Reveal>
              <SectionLabel className="text-xusd">
                <span className="text-xusd">The Stablecoin</span>
              </SectionLabel>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="mt-6 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden ring-1 ring-xusd/40 shadow-[0_0_40px_-10px_var(--xusd)]">
                  <img src="/images/xusd-logo.jpg" alt="xUSD" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="font-display text-5xl md:text-7xl font-semibold tracking-[-0.03em] text-gradient-xusd leading-none">
                    xUSD
                  </h2>
                  <div className="mt-1 text-sm text-muted-foreground font-mono">
                    USD-pegged · Encrypted · Overcollateralized
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
                xUSD is the confidential stablecoin of XELIS Vault. Every transfer is
                encrypted — recipients, amounts, and balances stay private by default. The
                peg is enforced by two complementary mechanisms: a Peg Stability Module for
                instant mint/redeem at $1 oracle price, and overcollateralized vaults that
                back every xUSD with XEL collateral at ≥150% collateral ratio.
              </p>
            </Reveal>

            {/* Mechanisms */}
            <div className="mt-10 space-y-4">
              {[
                {
                  icon: ArrowRightLeft,
                  title: 'Peg Stability Module (PSM)',
                  desc: 'Mint or redeem xUSD at exactly $1 oracle price (0.5% fee). Arbitrageurs keep the peg tight — no slippage, no oracle delay.',
                },
                {
                  icon: Lock,
                  title: 'Overcollateralized VaultEngine',
                  desc: 'Borrow xUSD against XEL collateral at up to ~66% LTV (150% liquidation threshold). 2% APR stability fee. Confidential liquidations via sealed-bid auctions eliminate front-running.',
                },
                {
                  icon: ArrowDownToLine,
                  title: 'SavingsRate',
                  desc: 'Deposit xUSD to earn 5% APY (default, governance-adjustable), paid in xUSD. Accrues continuously, balances stay encrypted.',
                },
              ].map((m, i) => (
                <Reveal key={`xusd-mech-${i}`} delay={0.3 + i * 0.08}>
                  <div className="flex items-start gap-4 rounded-xl border border-border bg-card/30 hover:bg-card/50 hover:border-xusd/30 transition-all p-5">
                    <div className="w-10 h-10 rounded-lg bg-xusd/10 border border-xusd/20 flex items-center justify-center text-xusd shrink-0">
                      <m.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-display font-semibold">{m.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {m.desc}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Right: PSM visualization */}
          <motion.div style={{ scale: logoScale }}>
            <Reveal>
              <div className="relative aspect-square max-w-[560px] mx-auto">
                {/* Concentric rings */}
                <motion.div
                  style={{ rotate }}
                  className="absolute inset-0"
                >
                  <div className="absolute inset-0 rounded-full border border-xusd/20" />
                  <div className="absolute inset-[8%] rounded-full border border-xusd/15 border-dashed" />
                  <div className="absolute inset-[18%] rounded-full border border-xusd/10" />

                  {/* Orbiting token markers */}
                  {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                    <div
                      key={`xusd-orbit-${i}`}
                      className="absolute top-1/2 left-1/2"
                      style={{ transform: `rotate(${deg}deg) translateX(220px) rotate(-${deg}deg)` }}
                    >
                      <div className="-translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-xusd shadow-[0_0_16px_var(--xusd)]" />
                    </div>
                  ))}
                </motion.div>

                {/* Center: xUSD mint/redeem flow */}
                <div className="absolute inset-[22%] rounded-full glass-panel border-xusd/30 flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="w-14 h-14 mx-auto rounded-full overflow-hidden ring-2 ring-xusd/40 shadow-[0_0_30px_-4px_var(--xusd)]">
                      <img src="/images/xusd-logo.jpg" alt="xUSD" className="w-full h-full object-cover" />
                    </div>
                    <div className="mt-3 font-display text-2xl font-semibold text-gradient-xusd">xUSD</div>
                    <div className="text-xs font-mono text-xusd/70 mt-1">= $1.00 USD</div>

                    <div className="mt-5 flex items-center justify-center gap-2">
                      <div className="flex flex-col items-center">
                        <div className="w-9 h-9 rounded-lg bg-xusd/10 border border-xusd/30 flex items-center justify-center text-xusd">
                          <ArrowUpFromLine className="w-4 h-4" />
                        </div>
                        <div className="text-[10px] font-mono mt-1 text-xusd">Mint</div>
                      </div>
                      <div className="text-xusd/40 mx-1">⇄</div>
                      <div className="flex flex-col items-center">
                        <div className="w-9 h-9 rounded-lg bg-xusd/10 border border-xusd/30 flex items-center justify-center text-xusd">
                          <ArrowDownToLine className="w-4 h-4" />
                        </div>
                        <div className="text-[10px] font-mono mt-1 text-xusd">Redeem</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Outer labels */}
                {[
                  { label: 'PSM', angle: -90, color: 'text-xusd' },
                  { label: 'Vaults', angle: -30, color: 'text-vault' },
                  { label: 'Oracle', angle: 30, color: 'text-vlt' },
                  { label: 'VaultSwap', angle: 90, color: 'text-vault' },
                  { label: 'SavingsRate', angle: 150, color: 'text-xusd' },
                  { label: 'Governance', angle: 210, color: 'text-vlt' },
                ].map((item, i) => (
                  <motion.div
                    key={`xusd-label-${i}`}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="absolute top-1/2 left-1/2"
                    style={{ transform: `rotate(${item.angle}deg) translateX(260px) rotate(-${item.angle}deg)` }}
                  >
                    <div className="-translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
                      <div className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider glass-panel ${item.color}`}>
                        {item.label}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Reveal>
          </motion.div>
        </div>

        {/* Bottom: Peg enforcement visual */}
        <Reveal delay={0.2}>
          <div className="mt-20 grid md:grid-cols-3 gap-4">
            {[
              { value: '$1.00', label: 'Target Peg', sub: 'USD oracle median', color: 'xusd' },
              { value: '150%', label: 'Collateral Ratio', sub: 'Liquidation threshold', color: 'vault' },
              { value: '0.5%', label: 'PSM Fee', sub: 'Mint or redeem at $1', color: 'xusd' },
            ].map((s, i) => {
              const cls = s.color === 'xusd' ? 'text-xusd' : 'text-vault'
              return (
                <div key={`xusd-stat-${i}`} className="rounded-xl glass-panel p-6 text-center">
                  <div className={`font-display text-3xl md:text-4xl font-semibold ${cls}`}>{s.value}</div>
                  <div className="mt-2 text-sm font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">{s.sub}</div>
                </div>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
