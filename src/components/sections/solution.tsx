'use client'

import { motion } from 'framer-motion'
import { Lock, Coins, ArrowLeftRight, Building2, Users, Vote } from 'lucide-react'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'

const PILLARS = [
  {
    icon: Lock,
    title: 'Confidential Lending',
    desc: 'Deposit XEL as collateral and borrow xUSD without revealing your position, your LTV, or your strategy to anyone. Encrypted vaults powered by Twisted ElGamal.',
    tag: 'VaultEngineV3',
  },
  {
    icon: Coins,
    title: 'Private Stablecoin',
    desc: 'xUSD is a USD-pegged stablecoin with encrypted transfers by default. Mint via PSM at $1 oracle price, redeem on demand, hold privately.',
    tag: 'xUSD',
  },
  {
    icon: ArrowLeftRight,
    title: 'MEV-Resistant AMM',
    desc: 'VaultSwap is a custom automated market maker with built-in peg stability module and front-running protection — your trades settle fairly on every block.',
    tag: 'VaultSwapV2',
  },
  {
    icon: Building2,
    title: 'Real-World Assets',
    desc: 'Tokenize and trade real-world assets with confidential balances. Multi-signature treasury vaults for DAOs, foundations, and institutions.',
    tag: 'AssetVault',
  },
  {
    icon: Users,
    title: 'Peer-to-Peer Credit',
    desc: 'Bilateral P2P loans with custom terms, syndicated credit pools, and a multi-pool multi-collateral lending marketplace — all confidential by design.',
    tag: 'LendingMarket',
  },
  {
    icon: Vote,
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
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-vault/8 blur-[140px]" />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="max-w-3xl">
          <Reveal>
            <SectionLabel>The Protocol</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1]">
              Six pillars of a{' '}
              <span className="text-gradient-vault">truly private</span>{' '}
              financial stack
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
              Not privacy bolted on top. Privacy at the protocol level — every contract,
              every balance, every interaction is encrypted from day one. Built native on
              the XELIS BlockDAG.
            </p>
          </Reveal>
        </div>

        {/* Grid */}
        <RevealStagger className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {PILLARS.map((p, i) => (
            <RevealItem key={`solution-pillar-${i}`}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="group relative h-full rounded-2xl glass-panel hover:glass-panel-hover p-6 md:p-7 overflow-hidden cursor-default"
              >
                {/* Index */}
                <div className="absolute top-6 right-6 font-mono text-xs text-muted-foreground/50">
                  0{i + 1}
                </div>

                <div className="w-12 h-12 rounded-xl bg-vault/10 border border-vault/20 flex items-center justify-center text-vault group-hover:bg-vault/20 group-hover:border-vault/40 transition-all">
                  <p.icon className="w-5 h-5" />
                </div>

                <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {p.desc}
                </p>

                <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-card/60 border border-border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground group-hover:text-vault group-hover:border-vault/30 transition-all">
                  <span className="w-1 h-1 rounded-full bg-vault/60" />
                  {p.tag}
                </div>

                {/* Hover glow */}
                <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-vault/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.div>
            </RevealItem>
          ))}
        </RevealStagger>

        {/* Stats strip */}
        <Reveal delay={0.2}>
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl glass-panel overflow-hidden">
            {[
              { value: '51', label: 'Smart Contracts', sub: '962 entry functions' },
              { value: '5s', label: 'Block Time', sub: 'XELIS BlockDAG' },
              { value: '10M', label: 'VLT Fixed Supply', sub: 'Deflationary · MIT' },
              { value: '$1', label: 'xUSD Peg', sub: 'PSM + overcollateral' },
            ].map((s, i) => (
              <div key={`solution-stat-${i}`} className="p-6 md:p-8 bg-card/30">
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
