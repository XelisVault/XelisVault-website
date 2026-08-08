'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import { Reveal, SectionLabel } from '@/components/site/reveal'

interface Contract {
  name: string
  file: string
  desc: string
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
      { name: 'VLTToken', file: 'contracts/token/VLTToken.slx', desc: 'Governance token · 10M fixed supply · deflationary' },
      { name: 'xUSD', file: 'contracts/usd/xUSD.slx', desc: 'Stablecoin pegged to $1 via PSM + overcollateralization' },
    ],
  },
  {
    id: 'oracle',
    name: 'Oracle Layer',
    color: 'xusd',
    contracts: [
      { name: 'StakedOracle', file: 'contracts/oracle/StakedOracle.slx', desc: 'Decentralized oracle based on VLT staking + slashing' },
      { name: 'InterestRateModel', file: 'contracts/interest/InterestRateModel.slx', desc: 'Kinked interest rate model for LendingMarket' },
    ],
  },
  {
    id: 'governance',
    name: 'Governance',
    color: 'vlt',
    contracts: [
      { name: 'OracleGovernance', file: 'contracts/governance/OracleGovernance.slx', desc: 'VLT holders vote to add/modify feeds' },
      { name: 'GovernanceVault', file: 'contracts/governance/GovernanceVault.slx', desc: 'VLT staking for voting power + rewards' },
      { name: 'Governor', file: 'contracts/governance/Governor.slx', desc: 'On-chain governance proposals + voting' },
      { name: 'Timelock', file: 'contracts/governance/Timelock.slx', desc: '48h delay on all parameter changes' },
      { name: 'GuardianMultisig', file: 'contracts/governance/GuardianMultisig.slx', desc: 'Emergency pause multisig (security)' },
    ],
  },
  {
    id: 'miner',
    name: 'Mining Layer',
    color: 'vault',
    contracts: [
      { name: 'XelisVaultMiner', file: 'contracts/miner/XelisVaultMiner.slx', desc: 'Unified miner: 100 VLT stake · reputation · dynamic rewards' },
      { name: 'MinerPool', file: 'contracts/miner/MinerPool.slx', desc: 'Composable miner pools with mutualized stake' },
    ],
  },
  {
    id: 'lending',
    name: 'Core Lending',
    color: 'vault',
    contracts: [
      { name: 'VaultEngineV3', file: 'contracts/vault/VaultEngineV3.slx', desc: 'Overcollateralized lending · XEL collateral, xUSD borrow' },
      { name: 'LendingMarket', file: 'contracts/lending/LendingMarket.slx', desc: 'Multi-pool multi-collateral lending marketplace' },
      { name: 'PeerLoan', file: 'contracts/lending/PeerLoan.slx', desc: 'Bilateral P2P loans with custom terms' },
      { name: 'SyndicatePool', file: 'contracts/lending/SyndicatePool.slx', desc: 'Multi-lender syndicated credit pools' },
    ],
  },
  {
    id: 'amm',
    name: 'AMM & PSM',
    color: 'xusd',
    contracts: [
      { name: 'VaultSwapV2', file: 'contracts/amm/VaultSwapV2.slx', desc: 'AMM with MEV protection (XEL/VLT, etc.)' },
      { name: 'PSM', file: 'contracts/amm/PSM.slx', desc: 'Peg Stability Module — mint/redeem xUSD at $1' },
    ],
  },
  {
    id: 'savings',
    name: 'Savings & Flash',
    color: 'vault',
    contracts: [
      { name: 'SavingsRate', file: 'contracts/savings/SavingsRate.slx', desc: 'Earn adjustable APY on xUSD deposits' },
      { name: 'FlashLoan', file: 'contracts/flashloan/FlashLoan.slx', desc: 'Uncollateralized flash loans with reentrancy guard' },
      { name: 'FlashCallback', file: 'contracts/flashloan/FlashCallback.slx', desc: 'Template for flash loan receivers' },
    ],
  },
  {
    id: 'auction',
    name: 'Auctions',
    color: 'vlt',
    contracts: [
      { name: 'SealedBidAuction', file: 'contracts/auction/SealedBidAuction.slx', desc: 'Confidential sealed-bid auctions (commit-reveal)' },
    ],
  },
  {
    id: 'rwa',
    name: 'RWA & Treasury',
    color: 'vault',
    contracts: [
      { name: 'AssetVault', file: 'contracts/rwa/AssetVault.slx', desc: 'Template for issuing confidential RWA tokens' },
      { name: 'TreasuryVault', file: 'contracts/treasury/TreasuryVault.slx', desc: 'Multi-signature confidential treasury management' },
      { name: 'RevenueShare', file: 'contracts/revenue/RevenueShare.slx', desc: 'Confidential revenue distribution to holders' },
      { name: 'Payroll', file: 'contracts/payroll/Payroll.slx', desc: 'Private recurring payments with time-based accrual' },
    ],
  },
  {
    id: 'insurance',
    name: 'Insurance',
    color: 'xusd',
    contracts: [
      { name: 'InsurancePool', file: 'contracts/insurance/InsurancePool.slx', desc: 'Community-backed insurance pool · stake → earn premiums' },
      { name: 'PrivateInsurance', file: 'contracts/insurance/PrivateInsurance.slx', desc: 'P2P insurance and derivatives markets' },
    ],
  },
  {
    id: 'chat',
    name: 'Chat',
    color: 'vlt',
    contracts: [
      { name: 'VaultChat', file: 'contracts/chat/VaultChat.slx', desc: 'E2E encrypted chat · DH key exchange · merkle anchoring' },
    ],
  },
  {
    id: 'privacy',
    name: 'Privacy',
    color: 'vault',
    contracts: [
      { name: 'PrivacyMixer', file: 'contracts/privacy/PrivacyMixer.slx', desc: 'Tornado-style ZK anonymity mixer · 10/100/1000 denominations' },
    ],
  },
  {
    id: 'compliance',
    name: 'Compliance',
    color: 'xusd',
    contracts: [
      { name: 'ComplianceModule', file: 'contracts/compliance/ComplianceModule.slx', desc: 'ZK-based KYC/AML verification · MiCA/MiFID compatible' },
    ],
  },
  {
    id: 'infra',
    name: 'Infrastructure',
    color: 'vlt',
    contracts: [
      { name: 'ContractRegistry', file: 'contracts/proxy/ContractRegistry.slx', desc: 'Versioned registry for upgrade pattern' },
      { name: 'Upgradeable', file: 'contracts/proxy/Upgradeable.slx', desc: 'Template mixin for upgrade-aware contracts' },
      { name: 'ReentrancyGuard', file: 'contracts/lib/ReentrancyGuard.slx', desc: 'Anti-reentrancy module' },
      { name: 'Pausable', file: 'contracts/lib/Pausable.slx', desc: 'Emergency pause module' },
      { name: 'FaucetContract', file: 'contracts/faucet/FaucetContract.slx', desc: 'Testnet faucet · 100 XEL + 200 VLT per 24h' },
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
              33 contracts.
              <br />
              <span className="text-gradient-vault">630 entry functions.</span>
              <br />
              <span className="text-muted-foreground">Audit-remediated.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
              Every contract is open-source (MIT-licensed), v5.0 audit-remediated (15 vulnerabilities fixed),
              and written in Silex — XELIS&apos;s native smart-contract language. Browse the full repository
              below — filter by category or search by name.
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
              Showing {totalShown} of 33 contracts
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
                                className={`group rounded-xl ${c.bg} ${c.border} border p-4 hover:scale-[1.02] transition-all`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className={`font-mono text-sm font-semibold ${c.text}`}>
                                      {contract.name}
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
