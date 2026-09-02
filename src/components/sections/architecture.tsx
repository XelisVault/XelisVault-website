'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useState } from 'react'
import { Database, Server, ShieldCheck, Layers, Workflow, Cpu } from 'lucide-react'
import { Reveal, SectionLabel } from '@/components/site/reveal'

const LAYERS = [
  {
    id: 'governance',
    name: 'Governance Layer',
    tag: 'VLT stakers vote',
    desc: 'VLT holders propose and vote on every protocol parameter. 48h timelock enforced on-chain, with a Guardian multisig for emergency pause. Liquid democracy lets you delegate your vote by topic.',
    contracts: ['OracleGovernance', 'GovernanceVault', 'Governor', 'Timelock', 'GuardianMultisig', 'GovernanceDelegation'],
    color: 'vlt',
    icon: Vote,
  },
  {
    id: 'core',
    name: 'Application Layer',
    tag: 'Confidential primitives',
    desc: 'The user-facing contracts: lending, swapping, savings, auctions, RWA, treasury, insurance, payroll, mixer, chat, flash loans, compliance. All encrypted, all on XELIS.',
    contracts: ['VaultEngineV3', 'MultiCollateralVault', 'VaultSwapV2', 'PSM', 'SavingsRate', 'SealedBidAuction', 'AssetVault', 'TreasuryVault', 'RevenueShare', 'Payroll', 'PrivacyMixer', 'VaultChat', 'ComplianceModule', 'FlashLoan', 'FlashCallback', 'LendingMarket', 'PeerLoan', 'SyndicatePool', 'InsurancePool', 'PrivateInsurance'],
    color: 'vault',
    icon: Layers,
  },
  {
    id: 'vault-advanced',
    name: 'Vault Advanced (Phase 5+)',
    tag: 'Yield strategies · templates · NFTs',
    desc: 'Higher-order vault contracts written and security-reviewed, gated behind a governance vote. Yield optimizer, one-click templates, multi-collateral vaults, tokenized positions, social trading, credit scores.',
    contracts: ['YieldOptimizer', 'VaultTemplates', 'VaultNFT', 'SocialTrading', 'CreditScore', 'LiquidationMarket', 'VaultBounties', 'VaultInsurance', 'AnalyticsCollector', 'NotificationCenter', 'EmergencyShutdown'],
    color: 'vlt',
    icon: Workflow,
  },
  {
    id: 'oracle',
    name: 'Oracle & Mining Layer',
    tag: 'Permissionless + staked',
    desc: 'A decentralized price oracle secured by VLT staking. Anyone can be a provider, slashing deters manipulation, median aggregation every 5 blocks. MinerDelegation lets any VLT holder delegate to a miner.',
    contracts: ['StakedOracle', 'InterestRateModel', 'XelisVaultMiner', 'MinerPool', 'MinerDelegation'],
    color: 'xusd',
    icon: Cpu,
  },
  {
    id: 'token',
    name: 'Token & Economics Layer',
    tag: 'Assets + fee distribution',
    desc: 'VLT — 10M fixed supply, deflationary governance token. xUSD — USD-pegged stablecoin. FeeDistributor splits all protocol fees 50% burn / 40% treasury / 10% founder. FounderVesting transparent on-chain.',
    contracts: ['VLTToken', 'xUSD', 'FeeDistributor', 'FounderVesting', 'RevenueShareDelegation', 'AirdropTracker', 'AirdropClaim'],
    color: 'vlt',
    icon: Coins,
  },
  {
    id: 'infra',
    name: 'Infrastructure',
    tag: 'XELIS BlockDAG',
    desc: 'The base layer: XELIS native homomorphic encryption (Twisted ElGamal), 5-second block time, contract registry for versioned lookups, testnet faucet.',
    contracts: ['ContractRegistry', 'FaucetContract'],
    color: 'vault',
    icon: Server,
  },
] as const

const COLOR_MAP: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  vault: {
    text: 'text-vault',
    bg: 'bg-vault/10',
    border: 'border-vault/30',
    glow: 'shadow-[0_0_60px_-20px_var(--vault)]',
  },
  xusd: {
    text: 'text-xusd',
    bg: 'bg-xusd/10',
    border: 'border-xusd/30',
    glow: 'shadow-[0_0_60px_-20px_var(--xusd)]',
  },
  vlt: {
    text: 'text-vlt',
    bg: 'bg-vlt/10',
    border: 'border-vlt/30',
    glow: 'shadow-[0_0_60px_-20px_var(--vlt)]',
  },
}

function Vote({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 12l2 2 4-4" />
      <path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7z" />
      <path d="M2 12h2M20 12h2" />
    </svg>
  )
}

function Coins({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82" />
    </svg>
  )
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
              and every byte of state is encrypted at the XELIS BlockDAG level — long before
              it ever reaches a contract.
            </p>
          </Reveal>
        </div>

        {/* Interactive stack */}
        <div className="mt-16 grid lg:grid-cols-[1fr_1.2fr] gap-10">
          {/* Layer list */}
          <Reveal>
            <div className="space-y-3">
              {LAYERS.map((layer, i) => {
                const isActive = active === i
                const c = COLOR_MAP[layer.color]
                return (
                  <button
                    key={layer.id}
                    onClick={() => setActive(i)}
                    onMouseEnter={() => setActive(i)}
                    className={`w-full text-left rounded-2xl border p-5 md:p-6 transition-all duration-300 ${
                      isActive
                        ? `${c.border} ${c.bg} ${c.glow}`
                        : 'border-border bg-card/20 hover:bg-card/40'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                        isActive ? `${c.bg} ${c.text} ${c.border} border` : 'bg-card/60 text-muted-foreground border border-border'
                      }`}>
                        <layer.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-xs text-muted-foreground">L{LAYERS.length - i}</span>
                          <h3 className={`font-display text-lg font-semibold ${isActive ? c.text : ''}`}>
                            {layer.name}
                          </h3>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground font-mono">
                          {layer.tag}
                        </p>
                        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                          {layer.desc}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </Reveal>

          {/* Visual stack */}
          <motion.div style={{ y: layerY }} className="relative">
            <Reveal>
              <div className="relative rounded-2xl glass-panel p-6 md:p-8 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
                    <Database className="w-3.5 h-3.5" />
                    Stack Visualization
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
                        className={`relative cursor-pointer rounded-xl border p-4 transition-all overflow-hidden ${
                          isActive ? `${c.border} ${c.bg}` : 'border-border bg-card/30'
                        }`}
                        style={{
                          marginLeft: `${i * 16}px`,
                          marginRight: `${(LAYERS.length - i - 1) * 8}px`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`font-mono text-[10px] uppercase tracking-wider ${c.text}`}>
                              L{LAYERS.length - i}
                            </span>
                            <span className="text-sm font-medium">{layer.name}</span>
                          </div>
                          <span className={`text-xs font-mono ${c.text}`}>
                            {layer.contracts.length} contracts
                          </span>
                        </div>

                        {/* Encrypted pattern */}
                        <div className="absolute inset-0 pointer-events-none opacity-30">
                          <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${c.text} font-mono text-[9px] tracking-wider opacity-60`}>
                            enc::twisted_elgamal
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Active layer contracts */}
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 pt-6 border-t border-border"
                >
                  <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">
                    {LAYERS[active].contracts.length} Contracts
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {LAYERS[active].contracts.map((contract) => {
                      const c = COLOR_MAP[LAYERS[active].color]
                      return (
                        <span
                          key={contract}
                          className={`inline-flex items-center gap-1.5 rounded-md ${c.bg} ${c.border} border px-2.5 py-1 text-xs font-mono ${c.text}`}
                        >
                          <span className="w-1 h-1 rounded-full bg-current opacity-60" />
                          {contract}.slx
                        </span>
                      )
                    })}
                  </div>
                </motion.div>

                {/* Bottom: data flow */}
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Workflow className="w-3.5 h-3.5" />
                      get_price(&quot;XEL/USD&quot;)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ZK verified
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Annotation */}
            <Reveal delay={0.1}>
              <div className="mt-4 flex items-start gap-3 text-xs text-muted-foreground">
                <div className="w-1 h-full bg-gradient-to-b from-vault to-vlt rounded-full" />
                <p className="leading-relaxed">
                  Click any layer to inspect its contracts. Every layer is built on the
                  encrypted primitives below — nothing is added as an afterthought.
                </p>
              </div>
            </Reveal>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
