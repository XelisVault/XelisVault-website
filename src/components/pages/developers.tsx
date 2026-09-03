'use client'

import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  Code2,
  Terminal,
  Calendar,
  Trophy,
  Wrench,
  ArrowUpRight,
  Copy,
  Check,
} from 'lucide-react'
import { useState } from 'react'
import { Nav } from '@/components/site/nav'
import { Footer } from '@/components/sections/roadmap-cta'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'

const DOCS = [
  { title: 'API reference', description: 'All 966 entry functions across 51 contracts', href: 'https://github.com/XelisVault/xelis-vault' },
  { title: 'Silex language guide', description: 'XELIS native smart-contract language', href: 'https://docs.xelis.io/features/smart-contracts/silex' },
  { title: 'Integration guide', description: 'Step-by-step XSWD wallet integration', href: 'https://docs.xelis.io/features/wallet/xswd' },
  { title: 'Security best practices', description: 'Building secure dApps on XELIS', href: '/security' },
]

const RESOURCES = [
  {
    name: 'Protocol repository',
    description: '35 Silex contracts, audit reports, whitepaper',
    href: 'https://github.com/XelisVault/xelis-vault',
    install: 'git clone https://github.com/XelisVault/xelis-vault',
  },
  {
    name: 'Genesix wallet',
    description: 'Official XELIS desktop wallet with XSWD support',
    href: 'https://github.com/xelis-project/xelis-genesix-wallet',
    install: 'git clone https://github.com/xelis-project/xelis-genesix-wallet',
  },
  {
    name: 'XELIS blockchain',
    description: 'BlockDAG core, daemon, RPC reference',
    href: 'https://github.com/xelis-project/xelis-blockchain',
    install: 'git clone https://github.com/xelis-project/xelis-blockchain',
  },
  {
    name: 'XELIS documentation',
    description: 'Full protocol, wallet, and daemon docs',
    href: 'https://docs.xelis.io',
    install: 'open https://docs.xelis.io',
  },
]

const EXAMPLES = [
  {
    title: 'Connect to wallet via XSWD',
    description: 'Open a WebSocket to the local wallet daemon and request permissions.',
    code: `const ws = new WebSocket('ws://localhost:44325/xswd')

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 'my-dapp-' + Math.random().toString(36).slice(2),
    name: 'My XELIS App',
    description: 'Built on XELIS Vault',
    url: window.location.origin,
    permissions: [
      'get_balance',
      'get_address',
      'build_transaction',
      'transfer',
    ],
  }))
}`,
  },
  {
    title: 'Open a vault (deposit + borrow)',
    description: 'Call VaultEngine.deposit entry function with XEL collateral and borrow xUSD.',
    code: `// entry_id 10 = VaultEngine.deposit
// params: [collateralAsset, collateralAmount, borrowAmount]
const tx = await wallet.callContract(
  VAULT_ENGINE_ADDRESS,
  10,
  [
    { type: 'Hash', value: XEL_ASSET_HASH },
    { type: 'U64',  value: '100000000000' }, // 100 XEL
    { type: 'U64',  value: '50000000000'  }, // 500 xUSD
  ]
)

await wallet.sendTransaction(tx)`,
  },
  {
    title: 'Submit oracle price (as miner)',
    description: 'If you are a registered miner, submit the latest XEL/USD price.',
    code: `// entry_id 5 = StakedOracle.submit_price
// params: [price (u64), timestamp (u64)]
const tx = await wallet.callContract(
  STAKED_ORACLE_ADDRESS,
  5,
  [
    { type: 'U64', value: '1294' }, // $12.94
    { type: 'U64', value: String(Math.floor(Date.now() / 1000)) },
  ]
)

await wallet.sendTransaction(tx)`,
  },
]

// No fabricated bounties. The only real bounty program is the security bug bounty
// on /security — 100,000 VLT total, 1% of supply, on Immunefi.
// If the team opens developer grants later, they will be announced on Discord.

export function DevelopersPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <Nav />

      <main className="flex-1 relative pt-32 md:pt-36">
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-vault/8 blur-[140px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-5 md:px-8 pb-20">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-vault transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </a>

          <Reveal>
            <SectionLabel>Developers</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mt-6 font-display text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1]">
              Build confidential
              <br />
              <span className="text-gradient-vault">applications.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-3xl">
              XELIS Vault is MIT-licensed, fully open source, and built to be extended. The wallet
              protocol (XSWD) is a simple JSON-RPC WebSocket. The contract language (Silex) is
              Turing-complete. Below is everything you need to ship a confidential DeFi app
              repositories, examples, and bounties for the work that still needs doing.
            </p>
          </Reveal>

          {/* Documentation cards */}
          <section className="mt-16">
            <Reveal>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-vault" />
                <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Documentation</h2>
              </div>
            </Reveal>
            <RevealStagger className="mt-8 grid sm:grid-cols-2 gap-4">
              {DOCS.map((d) => (
                <RevealItem key={d.title}>
                  <a
                    href={d.href}
                    target={d.href.startsWith('http') ? '_blank' : undefined}
                    rel={d.href.startsWith('http') ? 'noreferrer' : undefined}
                    className="block rounded-2xl glass-panel p-6 hover:border-vault/40 hover:bg-card/60 transition-all h-full"
                  >
                    <h3 className="font-display text-lg font-semibold">{d.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{d.description}</p>
                    <div className="mt-3 text-xs font-mono text-vault inline-flex items-center gap-1">
                      Open <ArrowUpRight className="w-3 h-3" />
                    </div>
                  </a>
                </RevealItem>
              ))}
            </RevealStagger>
          </section>

          {/* Repositories with copy */}
          <section className="mt-20">
            <Reveal>
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-vault" />
                <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Repositories</h2>
              </div>
            </Reveal>
            <div className="mt-8 space-y-4">
              {RESOURCES.map((r, i) => (
                <Reveal key={r.name} delay={0.05 * i}>
                  <div className="rounded-2xl glass-panel p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-lg font-semibold">{r.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                      </div>
                      <a
                        href={r.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card/40 hover:bg-card/80 hover:border-vault/40 px-4 text-xs font-medium transition-all shrink-0"
                      >
                        Open repo <ArrowUpRight className="w-3 h-3 opacity-50" />
                      </a>
                    </div>
                    <CopyBlock text={r.install} />
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* Code examples */}
          <section className="mt-20">
            <Reveal>
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-vault" />
                <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Code examples</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Working snippets you can paste into a dApp. All entry IDs and parameter formats are real.
              </p>
            </Reveal>
            <div className="mt-8 space-y-6">
              {EXAMPLES.map((ex, i) => (
                <Reveal key={ex.title} delay={0.05 * i}>
                  <div className="rounded-2xl glass-panel p-6">
                    <h3 className="font-display text-lg font-semibold">{ex.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{ex.description}</p>
                    <CopyBlock text={ex.code} code />
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* Hackathons & events, honest: nothing scheduled yet */}
          <section className="mt-20">
            <Reveal>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-vault" />
                <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Hackathons &amp; events</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Nothing scheduled yet. After testnet launch, hackathons and developer calls will be
                announced on Discord first.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center">
                <Calendar className="w-6 h-6 text-muted-foreground mx-auto" />
                <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
                  No hackathons or developer calls are scheduled right now. Join the Discord to be
                  notified when the first events are announced.
                </p>
                <a
                  href="https://discord.gg/UHpYAWbG"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card/40 hover:bg-card/80 hover:border-vault/40 px-5 text-sm font-medium transition-all"
                >
                  Join Discord for event updates
                  <ArrowUpRight className="w-3 h-3 opacity-50" />
                </a>
              </div>
            </Reveal>
          </section>

          {/* Security bug bounty, real, points to /security */}
          <section className="mt-20">
            <Reveal>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-vault" />
                <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Bug bounty program</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                The only active bounty program right now is the security bug bounty. 100,000 VLT
                total (1% of fixed supply), split 50% critical / 30% high / 15% medium / 5% low,
                running on Immunefi for 2 years.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="mt-6 rounded-2xl glass-panel p-6 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-display text-lg font-semibold">Security bug bounty</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Up to 50,000 VLT per critical finding · responsible disclosure only
                  </p>
                </div>
                <a
                  href="/security"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-vault px-6 text-sm font-semibold text-white hover:bg-vault/85 transition-all hover:shadow-[0_0_24px_-4px_var(--vault)]"
                >
                  View bounty details
                </a>
              </div>
            </Reveal>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function CopyBlock({ text, code = false }: { text: string; code?: boolean }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-4 relative group">
      {code ? (
        <pre className="rounded-xl border border-border bg-black/40 p-4 overflow-x-auto text-[12px] font-mono leading-relaxed text-foreground/90">
          <code>{text}</code>
        </pre>
      ) : (
        <div className="rounded-xl border border-border bg-black/40 p-4 font-mono text-[12px] text-foreground/90 break-all">
          <span className="text-muted-foreground/60 select-none">$ </span>
          {text}
        </div>
      )}
      <button
        onClick={copy}
        className="absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-card/80 hover:bg-card hover:border-vault/40 px-2.5 py-1.5 text-[11px] font-mono transition-all"
      >
        {copied ? (
          <>
            <Check className="w-3 h-3 text-emerald-600" />
            Copied
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" />
            Copy
          </>
        )}
      </button>
    </div>
  )
}
