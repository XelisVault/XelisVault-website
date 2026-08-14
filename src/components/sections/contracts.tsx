'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import { Reveal, SectionLabel } from '@/components/site/reveal'

interface Contract {
  name: string
  file: string
  desc: string
  phase?: 'core' | 'future' // core = deploys at testnet launch, future = Phase 5+ (brainstorming)
  entries?: number
}

interface Category {
  id: string
  name: string
  color: string
  contracts: Contract[]
}

const CATEGORIES: Category[] = [
  {
    id: 'token',
    name: 'Token Layer',
    color: 'vlt',
    contracts: [
      { name: 'VLTToken', file: 'contracts/token/VLTToken.slx', desc: 'Governance token · 10M fixed supply · deflationary · 3 burn vectors', phase: 'core' },
      { name: 'xUSD', file: 'contracts/usd/xUSD.slx', desc: 'Stablecoin pegged to $1 via PSM + overcollateralization · elastic supply', phase: 'core' },
    ],
  },
  {
    id: 'oracle',
    name: 'Oracle Layer',
    color: 'xusd',
    contracts: [
      { name: 'StakedOracle', file: 'contracts/oracle/StakedOracle.slx', desc: 'Decentralized oracle · trimmed median · progressive slashing · 5-tier reputation', phase: 'core' },
      { name: 'InterestRateModel', file: 'contracts/interest/InterestRateModel.slx', desc: 'Kinked interest rate model for LendingMarket', phase: 'core' },
    ],
  },
  {
    id: 'governance',
    name: 'Governance',
    color: 'vlt',
    contracts: [
      { name: 'OracleGovernance', file: 'contracts/governance/OracleGovernance.slx', desc: 'VLT holders vote to add/modify price feeds', phase: 'core' },
      { name: 'GovernanceVault', file: 'contracts/governance/GovernanceVault.slx', desc: 'VLT staking for voting power + rewards', phase: 'core' },
      { name: 'Governor', file: 'contracts/governance/Governor.slx', desc: 'On-chain governance proposals + voting', phase: 'core' },
      { name: 'Timelock', file: 'contracts/governance/Timelock.slx', desc: '48h delay on all parameter changes', phase: 'core' },
      { name: 'GuardianMultisig', file: 'contracts/governance/GuardianMultisig.slx', desc: 'Emergency pause multisig (3-of-5)', phase: 'core' },
      { name: 'GovernanceDelegation', file: 'contracts/governance/GovernanceDelegation.slx', desc: 'Liquid democracy · delegate by topic (oracle/lending/treasury) · max depth 5', phase: 'future', entries: 18 },
    ],
  },
  {
    id: 'miner',
    name: 'Mining Layer',
    color: 'vault',
    contracts: [
      { name: 'XelisVaultMiner', file: 'contracts/miner/XelisVaultMiner.slx', desc: 'Unified miner · progressive stake (100→500→1000 VLT) · streaks · leaderboard', phase: 'core' },
      { name: 'MinerPool', file: 'contracts/miner/MinerPool.slx', desc: 'Composable miner pools with mutualized stake', phase: 'core' },
      { name: 'MinerDelegation', file: 'contracts/miner/MinerDelegation.slx', desc: 'Stake delegation for miners · index-based accounting · anti-concentration cap · auto-compound opt-in · v11.0 rewrite', phase: 'core' },
    ],
  },
  {
    id: 'vault',
    name: 'Vault Engine',
    color: 'vault',
    contracts: [
      { name: 'VaultEngineV3', file: 'contracts/vault/VaultEngineV3.slx', desc: 'CDP · deposit/borrow/repay/liquidate · confidential mode (Ciphertext API)', phase: 'core' },
      { name: 'MultiCollateralVault', file: 'contracts/vault/MultiCollateralVault.slx', desc: 'Multi-asset collateral (max 10) · per-asset LTV: XEL 75%, VLT 60%, xUSD 90%, Gold 70%', phase: 'future', entries: 18 },
      { name: 'YieldOptimizer', file: 'contracts/vault/YieldOptimizer.slx', desc: '4 strategies (Conservative/Balanced/Aggressive/VLT Max) · keeper 0.1% · auto-reinvest', phase: 'future', entries: 19 },
      { name: 'VaultTemplates', file: 'contracts/vault/VaultTemplates.slx', desc: '5 one-click templates: Safe Vault, Leverage Loop, Yield Farmer, PSM Arb, LP Strategy', phase: 'future', entries: 18 },
    ],
  },
  {
    id: 'lending',
    name: 'Core Lending',
    color: 'vault',
    contracts: [
      { name: 'LendingMarket', file: 'contracts/lending/LendingMarket.slx', desc: 'Multi-pool multi-collateral lending marketplace', phase: 'core' },
      { name: 'PeerLoan', file: 'contracts/lending/PeerLoan.slx', desc: 'Bilateral P2P loans with custom terms', phase: 'core' },
      { name: 'SyndicatePool', file: 'contracts/lending/SyndicatePool.slx', desc: 'Multi-lender syndicated credit pools', phase: 'core' },
    ],
  },
  {
    id: 'amm',
    name: 'AMM & PSM',
    color: 'xusd',
    contracts: [
      { name: 'VaultSwapV2', file: 'contracts/amm/VaultSwapV2.slx', desc: 'AMM with MEV protection · TWAP oracle · volatility-adjusted fees', phase: 'core' },
      { name: 'PSM', file: 'contracts/amm/PSM.slx', desc: 'Peg Stability Module · mint/redeem xUSD at $1 · daily caps', phase: 'core' },
    ],
  },
  {
    id: 'savings',
    name: 'Savings & Flash',
    color: 'vault',
    contracts: [
      { name: 'SavingsRate', file: 'contracts/savings/SavingsRate.slx', desc: 'Earn adjustable APY on xUSD deposits', phase: 'core' },
      { name: 'FlashLoan', file: 'contracts/flashloan/FlashLoan.slx', desc: 'Uncollateralized flash loans with reentrancy guard', phase: 'core' },
      { name: 'FlashCallback', file: 'contracts/flashloan/FlashCallback.slx', desc: 'Template for flash loan receivers', phase: 'core' },
    ],
  },
  {
    id: 'liquidation',
    name: 'Liquidation (Phase 5+)',
    color: 'vlt',
    contracts: [
      { name: 'LiquidationMarket', file: 'contracts/liquidation/LiquidationMarket.slx', desc: 'Liquidator staking for priority · speed bonus (max 2%) · leaderboard', phase: 'future', entries: 17 },
      { name: 'VaultBounties', file: 'contracts/liquidation/VaultBounties.slx', desc: 'Watcher bounties for finding unhealthy vaults · 0.5% of collateral', phase: 'future', entries: 13 },
    ],
  },
  {
    id: 'auction',
    name: 'Auctions',
    color: 'vlt',
    contracts: [
      { name: 'SealedBidAuction', file: 'contracts/auction/SealedBidAuction.slx', desc: 'Confidential sealed-bid auctions (commit-reveal)', phase: 'core' },
    ],
  },
  {
    id: 'rwa',
    name: 'RWA & Treasury',
    color: 'vault',
    contracts: [
      { name: 'AssetVault', file: 'contracts/rwa/AssetVault.slx', desc: 'Template for issuing confidential RWA tokens', phase: 'core' },
      { name: 'TreasuryVault', file: 'contracts/treasury/TreasuryVault.slx', desc: 'Multi-signature confidential treasury management', phase: 'core' },
      { name: 'RevenueShare', file: 'contracts/revenue/RevenueShare.slx', desc: 'Confidential revenue distribution to holders', phase: 'core' },
      { name: 'Payroll', file: 'contracts/payroll/Payroll.slx', desc: 'Private recurring payments with time-based accrual', phase: 'core' },
    ],
  },
  {
    id: 'insurance',
    name: 'Insurance',
    color: 'xusd',
    contracts: [
      { name: 'InsurancePool', file: 'contracts/insurance/InsurancePool.slx', desc: 'Community-backed insurance pool · stake → earn premiums', phase: 'core' },
      { name: 'PrivateInsurance', file: 'contracts/insurance/PrivateInsurance.slx', desc: 'P2P insurance and derivatives markets', phase: 'core' },
      { name: 'VaultInsurance', file: 'contracts/insurance/VaultInsurance.slx', desc: 'Auto-insurance against liquidation · 0.5% premium · auto-repay at health < 120%', phase: 'future', entries: 18 },
    ],
  },
  {
    id: 'chat',
    name: 'Chat',
    color: 'vlt',
    contracts: [
      { name: 'VaultChat', file: 'contracts/chat/VaultChat.slx', desc: 'E2E encrypted chat · DH key exchange · merkle anchoring · encrypted channel metadata', phase: 'core' },
    ],
  },
  {
    id: 'privacy',
    name: 'Privacy',
    color: 'vault',
    contracts: [
      { name: 'PrivacyMixer', file: 'contracts/privacy/PrivacyMixer.slx', desc: 'Tornado-style ZK anonymity mixer · 10/100/1000 denominations', phase: 'core' },
    ],
  },
  {
    id: 'compliance',
    name: 'Compliance',
    color: 'xusd',
    contracts: [
      { name: 'ComplianceModule', file: 'contracts/compliance/ComplianceModule.slx', desc: 'ZK-based KYC/AML verification · MiCA/MiFID compatible', phase: 'core' },
    ],
  },
  {
    id: 'safety',
    name: 'Safety (Phase 5+)',
    color: 'vlt',
    contracts: [
      { name: 'EmergencyShutdown', file: 'contracts/safety/EmergencyShutdown.slx', desc: 'Global circuit breaker · 4 states (NORMAL/SOFT_PAUSE/FULL_SHUTDOWN/RECOVERY) · 9 operation types', phase: 'future', entries: 15 },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics (Phase 5+)',
    color: 'xusd',
    contracts: [
      { name: 'AnalyticsCollector', file: 'contracts/analytics/AnalyticsCollector.slx', desc: 'On-chain TVL/volume/liquidations/health metrics · 7d hourly + 1y daily', phase: 'future', entries: 17 },
    ],
  },
  {
    id: 'notifications',
    name: 'Notifications (Phase 5+)',
    color: 'vlt',
    contracts: [
      { name: 'NotificationCenter', file: 'contracts/notifications/NotificationCenter.slx', desc: 'Encrypted push/email/Telegram · 8 notification types · quiet hours · severity threshold', phase: 'future', entries: 14 },
    ],
  },
  {
    id: 'credit',
    name: 'Credit (Phase 5+)',
    color: 'xusd',
    contracts: [
      { name: 'CreditScore', file: 'contracts/credit/CreditScore.slx', desc: 'On-chain credit reputation (0-1000) · 5 tiers · rate + LTV adjustments for P2P lending', phase: 'future', entries: 15 },
    ],
  },
  {
    id: 'social',
    name: 'Social (Phase 5+)',
    color: 'vlt',
    contracts: [
      { name: 'SocialTrading', file: 'contracts/social/SocialTrading.slx', desc: 'Copy trading · leader opt-in · ratio 10-100% · max 100 followers per leader', phase: 'future', entries: 16 },
    ],
  },
  {
    id: 'nft',
    name: 'NFT (Phase 5+)',
    color: 'vlt',
    contracts: [
      { name: 'VaultNFT', file: 'contracts/nft/VaultNFT.slx', desc: 'Tokenize vault positions as NFTs · marketplace · fractionalisation', phase: 'future', entries: 23 },
    ],
  },
  {
    id: 'airdrop',
    name: 'Airdrop (v10.4)',
    color: 'xusd',
    contracts: [
      { name: 'AirdropTracker', file: 'contracts/airdrop/AirdropTracker.slx', desc: 'Testnet: accumulates points per user from all core contracts · 32 entries · 25 pub fn for dashboards', phase: 'core', entries: 32 },
      { name: 'AirdropClaim', file: 'contracts/airdrop/AirdropClaim.slx', desc: 'Mainnet: distributes VLT via Merkle proofs · 700k VLT total (500k testnet + 200k community) · 6-month claim window', phase: 'core', entries: 16 },
    ],
  },
  {
    id: 'founder',
    name: 'Founder & Fees (v10.3)',
    color: 'vlt',
    contracts: [
      { name: 'FounderVesting', file: 'contracts/founder/FounderVesting.slx', desc: '500k VLT vesting over 4y, 1y cliff · transparent, on-chain, governance-controlled', phase: 'core' },
      { name: 'FeeDistributor', file: 'contracts/founder/FeeDistributor.slx', desc: 'Splits protocol fees: 50% burn, 40% treasury, 10% founder · no extra cost to users', phase: 'core' },
      { name: 'RevenueShareDelegation', file: 'contracts/founder/RevenueShareDelegation.slx', desc: 'Delegates revenue share rights · transferable, governance-controlled', phase: 'core' },
    ],
  },
  {
    id: 'infra',
    name: 'Infrastructure',
    color: 'vlt',
    contracts: [
      { name: 'ContractRegistry', file: 'contracts/proxy/ContractRegistry.slx', desc: 'Versioned registry for upgrade pattern', phase: 'core' },
      { name: 'FaucetContract', file: 'contracts/faucet/FaucetContract.slx', desc: 'Testnet faucet · 100 XEL + 200 VLT per 24h', phase: 'core' },
    ],
  },
]

const COLOR_CLASSES: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  vault: { text: 'text-vault', bg: 'bg-vault/10', border: 'border-vault/30', dot: 'bg-vault' },
  xusd: { text: 'text-xusd', bg: 'bg-xusd/10', border: 'border-xusd/30', dot: 'bg-xusd' },
  vlt: { text: 'text-vlt', bg: 'bg-vlt/10', border: 'border-vlt/30', dot: 'bg-vlt' },
}

export function Contracts() {
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<string | null>(null)

  const filtered = CATEGORIES.map((c) => ({
    ...c,
    contracts: c.contracts.filter(
      (ct) =>
        ct.name.toLowerCase().includes(query.toLowerCase()) ||
        ct.desc.toLowerCase().includes(query.toLowerCase())
    ),
  })).filter((c) => c.contracts.length > 0)

  const totalShown = filtered.reduce((acc, c) => acc + c.contracts.length, 0)

  return (
    <section
      id="contracts"
      className="relative py-20 md:py-28 px-5 md:px-8 bg-background overflow-hidden"
    >
      <div className="absolute inset-0 bg-dots opacity-30" />

      <div className="relative max-w-7xl mx-auto">
        <div className="max-w-3xl">
          <Reveal>
            <SectionLabel>Smart Contracts</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1]">
              51 contracts.
              <br />
              <span className="text-gradient-vault">963 entry functions.</span>
              <br />
              <span className="text-muted-foreground">v11.3 · audit-remediated core.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
              Every contract is open-source (MIT-licensed). The 37 core contracts are v11.3
              audit-remediated (9 critical bugs fixed in v10.5 + 34 cross-contract call bugs
              fixed in v11.1) and will deploy on testnet August 30.
              The 13 Phase 5+ contracts are written, security-reviewed internally, and gated
              behind a governance vote — they will not deploy until the core protocol is stable.
            </p>
          </Reveal>
        </div>

        {/* Search */}
        <Reveal delay={0.2}>
          <div className="mt-12 max-w-md">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search contracts..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-11 rounded-full border border-border bg-card/40 pl-11 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-vault/40 focus:bg-card/60 transition-all"
              />
            </div>
            <div className="mt-2 text-xs font-mono text-muted-foreground">
              Showing {totalShown} of 51 contracts · 37 core + 13 Phase 5+
            </div>
          </div>
        </Reveal>

        {/* Category grid */}
        <div className="mt-10 space-y-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((cat) => {
              const c = COLOR_CLASSES[cat.color]
              const isActive = activeCat === cat.id
              return (
                <motion.div
                  key={cat.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="rounded-2xl glass-panel overflow-hidden">
                    <button
                      onClick={() => setActiveCat(isActive ? null : cat.id)}
                      className="w-full flex items-center justify-between p-5 md:p-6 hover:bg-card/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                        <span className="font-display font-semibold text-lg">{cat.name}</span>
                        <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded-full bg-card/60 border border-border">
                          {cat.contracts.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="hidden md:block text-xs font-mono text-muted-foreground">
                          {isActive ? 'Collapse' : 'Expand'}
                        </span>
                        <motion.div animate={{ rotate: isActive ? 90 : 0 }} className="text-muted-foreground">
                          →
                        </motion.div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 md:px-6 pb-5 md:pb-6 grid sm:grid-cols-2 gap-3">
                            {cat.contracts.map((contract) => (
                              <a
                                key={contract.name}
                                href={`https://github.com/XelisVault/xelis-vault/blob/main/${contract.file}`}
                                target="_blank"
                                rel="noreferrer"
                                className={`group rounded-xl ${c.bg} ${c.border} border p-4 hover:scale-[1.02] transition-all ${contract.phase === 'future' ? 'opacity-80' : ''}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`font-mono text-sm font-semibold ${c.text}`}>
                                        {contract.name}
                                      </span>
                                      {contract.phase === 'future' && (
                                        <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-amber-300">
                                          Phase 5+
                                        </span>
                                      )}
                                      {contract.entries && (
                                        <span className="text-[9px] font-mono text-muted-foreground/60">
                                          {contract.entries} entries
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                      {contract.desc}
                                    </div>
                                    <div className="mt-2 text-[10px] font-mono text-muted-foreground/70 truncate">
                                      {contract.file}
                                    </div>
                                  </div>
                                  <div className={`text-xs font-mono ${c.text} opacity-0 group-hover:opacity-100 transition-opacity shrink-0`}>
                                    ↗
                                  </div>
                                </div>
                              </a>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        <Reveal delay={0.2}>
          <div className="mt-10 flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-muted-foreground">
              All contracts are MIT-licensed. PRs welcome.
            </p>
            <a
              href="https://github.com/XelisVault/xelis-vault"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card/40 hover:bg-card/80 hover:border-vault/40 px-5 text-sm font-medium transition-all"
            >
              View full repository on GitHub ↗
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
