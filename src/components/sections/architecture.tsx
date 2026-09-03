'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useState } from 'react'
import { Reveal, SectionLabel } from '@/components/site/reveal'

const LAYERS = [
  {
    id: 'governance',
    name: 'Governance Layer',
    tag: 'VLT stakers vote',
    desc: 'VLT holders propose and vote on every protocol parameter. 48h timelock enforced on-chain, with a Guardian multisig for emergency pause. Liquid democracy lets you delegate your vote by topic.',
    contracts: ['OracleGovernance', 'GovernanceVault', 'Governor', 'Timelock', 'GuardianMultisig', 'GovernanceDelegation'],
    color: 'vlt',
  },
  {
    id: 'core',
    name: 'Application Layer',
    tag: 'Confidential primitives',
    desc: 'The user-facing contracts: lending, swapping, savings, auctions, RWA, treasury, insurance, payroll, mixer, chat, flash loans, compliance. All encrypted, all on XELIS.',
    contracts: ['VaultEngineV3', 'MultiCollateralVault', 'VaultSwapV2', 'PSM', 'SavingsRate', 'SealedBidAuction', 'AssetVault', 'TreasuryVault', 'RevenueShare', 'Payroll', 'PrivacyMixer', 'VaultChat', 'ComplianceModule', 'FlashLoan', 'FlashCallback', 'LendingMarket', 'PeerLoan', 'SyndicatePool', 'InsurancePool', 'PrivateInsurance'],
    color: 'vault',
  },
  {
    id: 'vault-advanced',
    name: 'Vault Advanced (Phase 5+)',
    tag: 'Yield strategies · templates · NFTs',
    desc: 'Higher-order vault contracts written and security-reviewed, gated behind a governance vote. Yield optimizer, one-click templates, multi-collateral vaults, tokenized positions, social trading, credit scores.',
    contracts: ['YieldOptimizer', 'VaultTemplates', 'VaultNFT', 'SocialTrading', 'CreditScore', 'LiquidationMarket', 'VaultBounties', 'VaultInsurance', 'AnalyticsCollector', 'NotificationCenter', 'EmergencyShutdown'],
    color: 'vlt',
  },
  {
    id: 'oracle',
    name: 'Oracle & Mining Layer',
    tag: 'Permissionless + staked',
    desc: 'A decentralized price oracle secured by VLT staking. Anyone can be a provider, slashing deters manipulation, median aggregation every 5 blocks. MinerDelegation lets any VLT holder delegate to a miner.',
    contracts: ['StakedOracle', 'InterestRateModel', 'XelisVaultMiner', 'MinerPool', 'MinerDelegation'],
    color: 'xusd',
  },
  {
    id: 'token',
    name: 'Token & Economics Layer',
    tag: 'Assets + fee distribution',
    desc: 'VLT, 10M fixed supply, deflationary governance token. xUSD, USD-pegged stablecoin. FeeDistributor splits all protocol fees 50% burn / 40% treasury / 10% founder. FounderVesting transparent on-chain.',
    contracts: ['VLTToken', 'xUSD', 'FeeDistributor', 'FounderVesting', 'RevenueShareDelegation', 'AirdropTracker', 'AirdropClaim'],
    color: 'vlt',
  },
  {
    id: 'infra',
    name: 'Infrastructure',
    tag: 'XELIS BlockDAG',
    desc: 'The base layer: XELIS native homomorphic encryption (Twisted ElGamal), 5-second block time, contract registry for versioned lookups, testnet faucet.',
    contracts: ['ContractRegistry', 'FaucetContract'],
    color: 'vault',
  },
] as const

const COLOR_MAP: Record<string, { text: string }> = {
  vault: { text: 'text-vault' },
  xusd: { text: 'text-xusd' },
  vlt: { text: 'text-vlt' },
}

export function Architecture() {
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const layerY = useTransform(scrollYProgress, [0, 1], [60, -60])

  return (
    <section
      ref={ref}
      id="architecture"
      className="relative py-20 md:py-28 px-5 md:px-8 bg-background overflow-hidden"
    >
      <div className="absolute inset-0 bg-dots opacity-30" />
      <div className="absolute top-1/4 left-0 w-[400px] h-[400px] rounded-full bg-vault/8 blur-[120px]" />
      <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] rounded-full bg-vlt/8 blur-[120px]" />

      <div className="relative max-w-7xl mx-auto">
        <div className="max-w-3xl">
          <Reveal>
            <SectionLabel>Architecture</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1]">
              A layered stack,
              <br />
              <span className="text-gradient-vault">encrypted end-to-end.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
              51 smart contracts, organized in 6 layers. Each layer secures the one above,
              and every byte of state is encrypted at the XELIS BlockDAG level, long before
              it ever reaches a contract.
            </p>
          </Reveal>
        </div>

        {/* Interactive stack: an editorial index + the layered diagram */}
        <div className="mt-16 grid lg:grid-cols-[1fr_1.2fr] gap-10">
          {/* Layer index */}
          <Reveal>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70 pb-3 border-b border-foreground/10">
                The six layers
              </div>
              {LAYERS.map((layer, i) => {
                const isActive = active === i
                const c = COLOR_MAP[layer.color]
                return (
                  <button
                    key={layer.id}
                    onClick={() => setActive(i)}
                    onMouseEnter={() => setActive(i)}
                    className={`w-full text-left py-5 border-b border-foreground/10 transition-colors ${
                      isActive ? 'border-l-2 pl-4' : 'border-l-2 border-l-transparent pl-4'
                    }`}
                    style={isActive ? { borderLeftColor: 'var(--vault)' } : undefined}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs text-muted-foreground/60">L{LAYERS.length - i}</span>
                      <h3 className={`font-display text-lg font-semibold transition-colors ${isActive ? c.text : ''}`}>
                        {layer.name}
                      </h3>
                      <span className="ml-auto text-xs font-mono text-muted-foreground shrink-0">
                        {layer.contracts.length}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground font-mono">
                      {layer.tag}
                    </p>
                    {isActive && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-3 text-sm text-muted-foreground leading-relaxed"
                      >
                        {layer.desc}
                      </motion.p>
                    )}
                  </button>
                )
              })}
            </div>
          </Reveal>

          {/* Visual stack */}
          <motion.div style={{ y: layerY }} className="relative">
            <Reveal>
              <div className="relative pt-7 border-t border-foreground/12">
                <div className="flex items-baseline justify-between mb-6">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70">
                    Stack visualization
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Encrypted
                  </div>
                </div>

                {/* Layered visual */}
                <div className="space-y-2">
                  {LAYERS.map((layer, i) => {
                    const isActive = active === i
                    const c = COLOR_MAP[layer.color]
                    return (
                      <motion.div
                        key={layer.id}
                        animate={{
                          opacity: isActive ? 1 : 0.55,
                          scale: isActive ? 1 : 0.98,
                        }}
                        transition={{ duration: 0.3 }}
                        onClick={() => setActive(i)}
                        className={`relative cursor-pointer border-b border-foreground/12 py-3.5 px-4 transition-colors ${
                          isActive ? 'bg-card/40' : 'bg-transparent hover:bg-card/20'
                        }`}
                        style={{
                          marginLeft: `${i * 16}px`,
                          marginRight: `${(LAYERS.length - i - 1) * 8}px`,
                        }}
                      >
                        <div className="flex items-baseline justify-between">
                          <div className="flex items-baseline gap-3">
                            <span className={`font-mono text-[10px] uppercase tracking-wider ${isActive ? c.text : 'text-muted-foreground/60'}`}>
                              L{LAYERS.length - i}
                            </span>
                            <span className="text-sm font-medium">{layer.name}</span>
                          </div>
                          <span className={`text-xs font-mono ${isActive ? c.text : 'text-muted-foreground'}`}>
                            {layer.contracts.length} contracts
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Active layer contracts: a mono listing */}
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 pt-6 border-t border-foreground/10"
                >
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70 mb-3">
                    {LAYERS[active].contracts.length} contracts
                  </div>
                  <div className="text-xs font-mono leading-loose text-foreground/80">
                    {LAYERS[active].contracts.map((contract, j) => (
                      <span key={contract}>
                        <span className={COLOR_MAP[LAYERS[active].color].text}>{contract}</span>.slx
                        {j < LAYERS[active].contracts.length - 1 && (
                          <span className="text-muted-foreground/40 mx-1">·</span>
                        )}
                      </span>
                    ))}
                  </div>
                </motion.div>

                {/* Bottom: data flow */}
                <div className="mt-8 pt-6 border-t border-foreground/10 flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>get_price(&quot;XEL/USD&quot;)</span>
                  <span className="text-emerald-700">ZK verified</span>
                </div>
              </div>
            </Reveal>

            {/* Annotation */}
            <Reveal delay={0.1}>
              <div className="mt-4 flex items-start gap-3 text-xs text-muted-foreground">
                <div className="w-1 h-full bg-gradient-to-b from-vault to-vlt rounded-full" />
                <p className="leading-relaxed">
                  Select any layer to inspect its contracts. Every layer is built on the
                  encrypted primitives below; nothing is added as an afterthought.
                </p>
              </div>
            </Reveal>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
