'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Check, X, AlertCircle, FileText } from 'lucide-react'
import { Nav } from '@/components/site/nav'
import { Footer } from '@/components/sections/roadmap-cta'
import { Reveal, SectionLabel } from '@/components/site/reveal'

interface Row {
  feature: string
  xelis: string
  aztec: string
  railgun: string
  secret: string
  xelisHighlight?: boolean
}

const ROWS: Row[] = [
  { feature: 'Privacy level', xelis: 'Full (default)', aztec: 'Full (opt-in)', railgun: 'Full (opt-in)', secret: 'Partial', xelisHighlight: true },
  { feature: 'Native encryption', xelis: 'Twisted ElGamal', aztec: 'No (zk-snark)', railgun: 'No (zk-snark)', secret: 'AES + SGX', xelisHighlight: true },
  { feature: 'Block time', xelis: '5s', aztec: '12s', railgun: '12s (host chain)', secret: '6s' },
  { feature: 'Smart contracts', xelis: 'Silex (Turing-complete)', aztec: 'Noir (zk-circuits)', railgun: 'Cairo (zk-circuits)', secret: 'CosmWasm (Rust)' },
  { feature: 'Oracle system', xelis: 'StakedOracle (5-tier reputation)', aztec: 'None native', railgun: 'None native', secret: 'Band Protocol', xelisHighlight: true },
  { feature: 'AMM with MEV protection', xelis: 'VaultSwapV2', aztec: 'L2 sequencer', railgun: 'L2 host', secret: 'No' },
  { feature: 'Native stablecoin', xelis: 'xUSD (PSM + collateralized)', aztec: 'No', railgun: 'No', secret: 'No', xelisHighlight: true },
  { feature: 'Governance', xelis: 'On-chain VLT + Timelock', aztec: 'Off-chain', railgun: 'Off-chain', secret: 'On-chain (SCRT)' },
  { feature: 'Encrypted messaging', xelis: 'VaultChat (E2E)', aztec: 'No', railgun: 'No', secret: 'No', xelisHighlight: true },
  { feature: 'Privacy mixer', xelis: 'Native ZK denominations', aztec: 'No', railgun: 'Native', secret: 'No' },
  { feature: 'Token supply', xelis: '10M fixed', aztec: 'Variable', railgun: 'Variable', secret: 'Variable', xelisHighlight: true },
  { feature: 'Deflationary mechanism', xelis: '3 burn vectors', aztec: 'No', railgun: 'No', secret: 'No', xelisHighlight: true },
  { feature: 'Open source license', xelis: 'MIT', aztec: 'BSL', railgun: 'BSL', secret: 'MIT' },
  { feature: 'VC funding', xelis: 'None', aztec: 'a16z, Paradigm', railgun: 'Digital Currency Group', secret: 'Multiple VCs', xelisHighlight: true },
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
              Why XELIS Vault,
              <br />
              <span className="text-gradient-vault">and not the others.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-3xl">
              Privacy in DeFi is not a single feature — it is a stack. Native encryption, an oracle
              that respects confidentiality, an AMM that cannot be sandwiched, a stablecoin that
              holds its peg without leaking your balance, and governance that does not require you to
              reveal your votes. Here is how XELIS Vault stacks up against the alternatives.
            </p>
          </Reveal>

          {/* Comparison table */}
          <Reveal delay={0.3}>
            <div className="mt-12 rounded-2xl glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-4 text-left text-xs font-mono uppercase tracking-wider text-muted-foreground">Feature</th>
                      <th className="px-4 py-4 text-left text-xs font-mono uppercase tracking-wider text-vault bg-vault/5">XELIS Vault</th>
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
          <Reveal delay={0.4}>
            <div className="mt-8 rounded-xl border border-border bg-card/30 p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-vault shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">A note on fairness.</strong> Aztec, Railgun, and
                Secret Network are all genuinely good projects pushing privacy forward. They each
                chose different tradeoffs — Aztec on Ethereum L2, Railgun as a privacy overlay, Secret
                on a Tendermint chain with SGX. XELIS Vault chose to build on a layer-1 with native
                homomorphic encryption, which lets us offer default-private smart contracts without
                SGX trust assumptions or L2 sequencer risk. The right tool depends on your threat
                model. We encourage you to read each project&apos;s documentation before deciding.
              </div>
            </div>
          </Reveal>

          {/* Deep dive CTA */}
          <Reveal delay={0.5}>
            <div className="mt-12 rounded-2xl glass-panel p-8 text-center">
              <h2 className="font-display text-2xl font-semibold">Want the technical deep dive?</h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
                The whitepaper covers the cryptographic primitives, the threat model, and the
                comparative analysis against each of the projects above.
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
