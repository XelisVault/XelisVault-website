'use client'

import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'

const PILLARS = [
  {
    title: 'Confidential Lending',
    desc: 'Deposit XEL as collateral and borrow xUSD without revealing your position, your LTV, or your strategy to anyone. Encrypted vaults powered by Twisted ElGamal.',
    tag: 'VaultEngineV3',
  },
  {
    title: 'Private Stablecoin',
    desc: 'xUSD is a USD-pegged stablecoin with encrypted transfers by default. Mint via PSM at $1 oracle price, redeem on demand, hold privately.',
    tag: 'xUSD',
  },
  {
    title: 'MEV-Resistant AMM',
    desc: 'VaultSwap is a custom automated market maker with built-in peg stability module and front-running protection. Your trades settle fairly on every block.',
    tag: 'VaultSwapV2',
  },
  {
    title: 'Real-World Assets',
    desc: 'Tokenize and trade real-world assets with confidential balances. Multi-signature treasury vaults for DAOs, foundations, and institutions.',
    tag: 'AssetVault',
  },
  {
    title: 'Peer-to-Peer Credit',
    desc: 'Bilateral P2P loans with custom terms, syndicated credit pools, and a multi-pool multi-collateral lending marketplace. All confidential by design.',
    tag: 'LendingMarket',
  },
  {
    title: 'On-Chain Governance',
    desc: 'VLT holders control every protocol parameter: fees, oracles, risk limits, upgrades. With 48h timelock and a Guardian multisig for emergency pause.',
    tag: 'Governor',
  },
]

export function Solution() {
  return (
    <section
      id="protocol"
      className="relative py-20 md:py-28 px-5 md:px-8 bg-background overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid opacity-25" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-vault/7 blur-[140px]" />

      <div className="relative max-w-7xl mx-auto">
        {/* Header: copy + institutional architecture */}
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-end">
          <div className="max-w-3xl">
            <Reveal>
              <SectionLabel>The Protocol</SectionLabel>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-medium tracking-[-0.02em] leading-[1.02]">
                Six pillars of a{' '}
                <span className="italic font-light text-gradient-vault">truly private</span>{' '}
                financial stack
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
                Not privacy bolted on top. Privacy at the protocol level: every contract,
                every balance, every interaction is encrypted from day one. Built native on
                the XELIS BlockDAG.
              </p>
            </Reveal>
          </div>

          {/* Architecture: the institutional tower */}
          <Reveal delay={0.25} className="hidden lg:block">
            <div className="relative max-w-[300px] ml-auto">
              <div className="absolute -inset-2.5 rounded-[6px] border border-vault/30 pointer-events-none" />
              <div className="relative aspect-[3/4] overflow-hidden rounded-[4px] ring-1 ring-foreground/15 shadow-maison">
                <img
                  src="/images/bank/architecture.jpg"
                  alt="Modern glass tower seen from below: layered institutional architecture"
                  className="w-full h-full object-cover animate-kenburns"
                />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-oklch(0.2 0.01 80 / 0.5) to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-ink-foreground">
                  <div className="font-display italic text-sm">Engineered in layers.</div>
                  <div className="text-[9px] font-mono uppercase tracking-[0.18em] opacity-70 mt-0.5">
                    6 layers · 51 contracts
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* The six pillars: a numbered manifesto index, one column, generous air */}
        <div className="mt-16 md:mt-20">
          <Reveal>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70 pb-3 border-b border-foreground/10">
              The pillars, in order of consequence
            </div>
          </Reveal>
          <RevealStagger>
            {PILLARS.map((p, i) => (
              <RevealItem key={`solution-pillar-${i}`}>
                <div className="group grid md:grid-cols-[110px_1fr] gap-x-10 border-b border-foreground/10 py-9 md:py-10">
                  <div className="font-display text-5xl md:text-6xl font-light text-vault/35 group-hover:text-vault/60 transition-colors md:text-left text-left tabular-nums">
                    0{i + 1}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                      <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                        {p.title}
                      </h3>
                      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-vault/60 group-hover:text-vault transition-colors">
                        {p.tag}
                      </span>
                    </div>
                    <p className="mt-3 text-sm md:text-[15px] text-muted-foreground leading-relaxed max-w-2xl">
                      {p.desc}
                    </p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>

        {/* Protocol figures: hairline editorial band */}
        <Reveal delay={0.2}>
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 border-t border-b border-foreground/10">
            {[
              { value: '51', label: 'Smart Contracts', sub: '966 entry functions' },
              { value: '5s', label: 'Block Time', sub: 'XELIS BlockDAG' },
              { value: '10M', label: 'VLT Fixed Supply', sub: 'Deflationary · MIT' },
              { value: '$1', label: 'xUSD Peg', sub: 'PSM + overcollateral' },
            ].map((s, i) => (
              <div key={`solution-stat-${i}`} className="py-6 md:py-8 px-5 md:px-6 md:border-l md:first:border-l-0 border-foreground/10">
                <div className="font-display text-3xl md:text-4xl font-semibold text-gradient-vault">
                  {s.value}
                </div>
                <div className="mt-2 text-sm font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
