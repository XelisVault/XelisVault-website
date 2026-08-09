'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, AlertCircle, FileText } from 'lucide-react'
import { Nav } from '@/components/site/nav'
import { Footer } from '@/components/sections/roadmap-cta'
import { Reveal, SectionLabel } from '@/components/site/reveal'

// Important: XELIS Vault is a DeFi protocol, NOT a blockchain.
// It is built ON the XELIS BlockDAG (the L1 chain).
// This comparison compares the XELIS ECOSYSTEM (chain + Vault DeFi suite)
// against other privacy-focused DeFi ecosystems.
//
// Sources:
//  - XELIS: https://xelis.io, https://docs.xelis.io
//  - XELIS Vault whitepaper: https://github.com/XelisVault/xelis-vault/blob/main/docs/WHITEPAPER.md
//  - Aztec: https://aztec.network (zk-rollup L2 on Ethereum)
//  - Railgun: https://railgun.org (privacy protocol on Ethereum/BNB/Polygon)
//  - Secret Network: https://scrt.network (L1 with SGX-based privacy)

interface Row {
  feature: string
  xelis: string
  aztec: string
  railgun: string
  secret: string
  xelisHighlight?: boolean
}

const ROWS: Row[] = [
  // Chain-level comparison
  { feature: 'Type', xelis: 'L1 BlockDAG', aztec: 'L2 zk-rollup (Ethereum)', railgun: 'Privacy protocol (on Ethereum/BNB/Polygon)', secret: 'L1 blockchain (Cosmos SDK)' },
  { feature: 'Privacy mechanism', xelis: 'Native Twisted ElGamal homomorphic encryption', aztec: 'zk-SNARKs (client-side proving)', railgun: 'zk-SNARKs (client-side proving)', secret: 'Trusted execution environment (Intel SGX)', xelisHighlight: true },
  { feature: 'Block time', xelis: '5s', aztec: '~12s (L1 settles slower)', railgun: '= host chain (~12s on Ethereum)', secret: '~6s' },
  { feature: 'Smart contracts', xelis: 'Silex (Turing-complete, native)', aztec: 'Noir (zk-circuits)', railgun: 'Cairo (zk-circuits, limited)', secret: 'CosmWasm (Rust)' },
  { feature: 'Trust assumption', xelis: 'None (cryptographic)', aztec: 'None (zk proofs)', railgun: 'None (zk proofs)', secret: 'Intel SGX hardware trust' },

  // DeFi ecosystem comparison (what XELIS Vault provides on XELIS)
  { feature: 'CDP stablecoin (xUSD)', xelis: 'Yes (VaultEngine + PSM)', aztec: 'No native', railgun: 'No native', secret: 'No native', xelisHighlight: true },
  { feature: 'AMM with MEV protection', xelis: 'VaultSwapV2 (TWAP + vol fees)', aztec: 'L2 sequencer (single block)', railgun: 'L2 host', secret: 'No native AMM' },
  { feature: 'Decentralized oracle', xelis: 'StakedOracle (5-tier reputation, slashing)', aztec: 'No native', railgun: 'No native', secret: 'Band Protocol (external)', xelisHighlight: true },
  { feature: 'Encrypted messaging', xelis: 'VaultChat (E2E, Merkle anchoring)', aztec: 'No', railgun: 'No', secret: 'No', xelisHighlight: true },
  { feature: 'Privacy mixer', xelis: 'PrivacyMixer (native ZK)', aztec: 'Native (shielded addresses)', railgun: 'Native (shielded pools)', secret: 'No native' },
  { feature: 'Governance', xelis: 'On-chain VLT + 48h Timelock', aztec: 'Off-chain', railgun: 'Off-chain (DAO)', secret: 'On-chain (SCRT staking)' },

  // Tokenomics
  { feature: 'Governance token supply', xelis: 'VLT — 10M fixed', aztec: 'Variable', railgun: 'RAIL — variable', secret: 'SCRT — variable', xelisHighlight: true },
  { feature: 'Deflationary mechanism', xelis: '3 burn vectors (slash + fees + governance)', aztec: 'No', railgun: 'No', secret: 'No', xelisHighlight: true },

  // Project
  { feature: 'Open source license', xelis: 'MIT', aztec: 'BSL (source-available)', railgun: 'BSL (source-available)', secret: 'MIT' },
  { feature: 'Funding model', xelis: 'No VC, team 10% transparent vesting', aztec: 'VC-backed (a16z, Paradigm)', railgun: 'VC-backed (DCG)', secret: 'VC-backed (multiple)', xelisHighlight: true },
]

function Cell({ value, highlight }: { value: string; highlight?: boolean }) {
  if (highlight) {
    return (
      <td className="px-4 py-3 text-sm text-vault font-medium bg-vault/5">
        {value}
      </td>
    )
  }
  return <td className="px-4 py-3 text-sm text-muted-foreground">{value}</td>
}

export function ComparePage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <Nav />

      <main className="flex-1 relative pt-24 md:pt-32">
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-vault/8 blur-[140px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-5 md:px-8 pb-20">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-vault transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </a>

          <Reveal>
            <SectionLabel>Compare</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mt-6 font-display text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1]">
              XELIS ecosystem
              <br />
              <span className="text-gradient-vault">vs the alternatives.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-3xl">
              <strong className="text-foreground">Important:</strong> XELIS Vault is a DeFi protocol,
              not a blockchain. It runs on the <strong className="text-foreground">XELIS BlockDAG</strong>{' '}
              (an L1 with native Twisted ElGamal encryption). The comparison below covers both the chain
              layer and the DeFi ecosystem built on top — because privacy in DeFi requires both.
            </p>
          </Reveal>

          {/* What XELIS Vault IS vs IS NOT */}
          <Reveal delay={0.3}>
            <div className="mt-8 rounded-xl border border-vault/30 bg-vault/5 p-5">
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-vault mb-1">XELIS Vault IS</div>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>· A DeFi protocol suite (46 Silex contracts)</li>
                    <li>· Built on top of the XELIS BlockDAG</li>
                    <li>· CDP stablecoin, AMM, oracle, governance, chat, mixer</li>
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">XELIS Vault IS NOT</div>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>· A blockchain (that is XELIS)</li>
                    <li>· A wallet (that is Genesix)</li>
                    <li>· A token (the tokens are VLT and xUSD)</li>
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Comparison table */}
          <Reveal delay={0.4}>
            <div className="mt-8 rounded-2xl glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-4 text-left text-xs font-mono uppercase tracking-wider text-muted-foreground">Feature</th>
                      <th className="px-4 py-4 text-left text-xs font-mono uppercase tracking-wider text-vault bg-vault/5">XELIS ecosystem</th>
                      <th className="px-4 py-4 text-left text-xs font-mono uppercase tracking-wider text-muted-foreground">Aztec</th>
                      <th className="px-4 py-4 text-left text-xs font-mono uppercase tracking-wider text-muted-foreground">Railgun</th>
                      <th className="px-4 py-4 text-left text-xs font-mono uppercase tracking-wider text-muted-foreground">Secret Network</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((row, i) => (
                      <tr key={row.feature} className={i % 2 === 1 ? 'bg-card/20' : ''}>
                        <td className="px-4 py-3 text-sm font-medium">{row.feature}</td>
                        <Cell value={row.xelis} highlight={row.xelisHighlight} />
                        <Cell value={row.aztec} />
                        <Cell value={row.railgun} />
                        <Cell value={row.secret} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>

          {/* Caveat / honesty */}
          <Reveal delay={0.5}>
            <div className="mt-8 rounded-xl border border-border bg-card/30 p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-vault shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">A note on fairness.</strong> Aztec, Railgun, and
                Secret Network are all genuinely good projects pushing privacy forward. They each
                chose different tradeoffs — Aztec on Ethereum L2, Railgun as a privacy overlay, Secret
                on a Tendermint chain with SGX. XELIS chose to build a layer-1 with native homomorphic
                encryption, which lets XELIS Vault offer default-private smart contracts without SGX
                trust assumptions or L2 sequencer risk. The right tool depends on your threat model.
                We encourage you to read each project&apos;s documentation before deciding.
              </div>
            </div>
          </Reveal>

          {/* Deep dive CTA */}
          <Reveal delay={0.6}>
            <div className="mt-12 rounded-2xl glass-panel p-8 text-center">
              <h2 className="font-display text-2xl font-semibold">Want the technical deep dive?</h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
                The XELIS Vault whitepaper covers the cryptographic primitives, the threat model, and
                the comparative analysis against each of the projects above.
              </p>
              <a
                href="https://github.com/XelisVault/xelis-vault/blob/main/docs/WHITEPAPER.md"
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-vault px-6 text-sm font-semibold text-white hover:bg-vault/85 transition-all hover:shadow-[0_0_24px_-4px_var(--vault)]"
              >
                <FileText className="w-4 h-4" />
                Read the whitepaper
              </a>
            </div>
          </Reveal>
        </div>
      </main>

      <Footer />
    </div>
  )
}
