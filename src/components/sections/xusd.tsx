'use client'

import { Reveal, SectionLabel } from '@/components/site/reveal'

export function Xusd() {
  return (
    <section
      id="xusd"
      className="relative py-20 md:py-28 px-5 md:px-8 bg-background overflow-hidden"
    >
      {/* Background: cyan/teal accent for xUSD */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-xusd/8 blur-[140px]" />

      <div className="relative max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-center">
          {/* Left: copy + mechanisms */}
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
                encrypted: recipients, amounts, and balances stay private by default. The
                peg is enforced by two complementary mechanisms, a Peg Stability Module for
                instant mint and redeem at $1 oracle price, and overcollateralized vaults that
                back every xUSD with XEL collateral at a minimum 150% collateral ratio.
              </p>
            </Reveal>

            {/* Mechanisms: editorial ledger */}
            <div className="mt-10">
              {[
                {
                  title: 'Peg Stability Module (PSM)',
                  desc: 'Mint or redeem xUSD at exactly $1 oracle price (0.5% fee). Arbitrageurs keep the peg tight: no slippage, no oracle delay.',
                },
                {
                  title: 'Overcollateralized VaultEngine',
                  desc: 'Borrow xUSD against XEL collateral at up to 50% LTV (200% minimum collateral ratio). 2% APR stability fee. 10% liquidation penalty. Confidential liquidations via sealed-bid auctions eliminate front-running.',
                },
                {
                  title: 'SavingsRate',
                  desc: 'Deposit xUSD to earn 5% APY (default, governance-adjustable), paid in xUSD. Accrues continuously, balances stay encrypted.',
                },
              ].map((m, i) => (
                <Reveal key={`xusd-mech-${i}`} delay={0.3 + i * 0.08}>
                  <div className="border-t border-foreground/12 py-6">
                    <div className="flex items-baseline justify-between gap-6">
                      <div className="font-display font-semibold text-lg">{m.title}</div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-xusd/70 shrink-0">
                        0{i + 1}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {m.desc}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Right: the framed view, the promise of the peg */}
          <Reveal delay={0.25}>
            <div className="relative max-w-[520px] mx-auto hidden md:block">
              {/* offset frame */}
              <div className="absolute -inset-3 rounded-[6px] border border-xusd/35 pointer-events-none" />
              <div className="absolute -inset-3 translate-x-2.5 translate-y-2.5 rounded-[6px] border border-foreground/10 pointer-events-none" />

              <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] ring-1 ring-foreground/15 shadow-maison">
                <img
                  src="/images/bank/handshake.jpg"
                  alt="A handshake in warm light: one dollar in, one dollar out"
                  className="w-full h-full object-cover animate-kenburns"
                />
                <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-oklch(0.16 0.008 80 / 0.85) via-oklch(0.16 0.008 80 / 0.45) to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-ink-foreground">
                  <div className="font-display italic text-sm opacity-90">
                    One dollar in, one dollar out.
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] opacity-70 mt-1">
                    PSM · instant mint & redeem at $1
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Bottom: peg figures, hairline band */}
        <Reveal delay={0.2}>
          <div className="mt-20 grid grid-cols-3 border-t border-b border-foreground/10">
            {[
              { value: '$1.00', label: 'Target Peg', sub: 'USD oracle median', color: 'text-xusd' },
              { value: '150%', label: 'Collateral Ratio', sub: 'Liquidation threshold', color: 'text-vault' },
              { value: '0.5%', label: 'PSM Fee', sub: 'Mint or redeem at $1', color: 'text-xusd' },
            ].map((s, i) => (
              <div key={`xusd-stat-${i}`} className="py-6 md:py-8 px-5 md:px-6 md:border-l md:first:border-l-0 border-foreground/10">
                <div className={`font-display text-3xl md:text-4xl font-semibold ${s.color}`}>{s.value}</div>
                <div className="mt-2 text-sm font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground font-mono mt-1">{s.sub}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
