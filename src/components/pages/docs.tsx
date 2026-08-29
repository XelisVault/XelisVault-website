'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight, BookOpen, Boxes, ChevronDown, FileText, Gauge, GitBranch,
  Hammer, MessageSquareLock, Pickaxe, ShieldCheck, Terminal, Users, Zap,
} from 'lucide-react'
import { Nav } from '@/components/site/nav'
import { Footer } from '@/components/sections/roadmap-cta'
import { Reveal, SectionLabel } from '@/components/site/reveal'
import { Badge } from '@/components/app/shared'
import { CLI_INSTALL, CLI_UNINSTALL, DISCORD_URL, GITHUB_URL, GENESIX_URL, XELIS_FAUCET_URL } from '@/lib/xelis/cli'

const GITHUB_DOCS = `${GITHUB_URL}/blob/main/docs`

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const GUIDES = [
  {
    id: 'get-started',
    icon: Zap,
    title: 'Get Started',
    desc: 'From zero to your first testnet transaction: install Genesix, fund your wallet, connect to the app.',
    time: '10 min',
    steps: [
      { t: 'Install Genesix', d: 'Download the official XELIS wallet for Windows, Linux or macOS. Create a fresh testnet wallet — never reuse a mainnet seed.' },
      { t: 'Get testnet funds', d: 'Claim XEL from the official faucet (faucet.xelis.io) for gas and collateral. VLT is distributed to contributors via Discord.' },
      { t: 'Connect to the app', d: 'Open the app, click Connect, approve XELIS Vault in Genesix. Balances load from your wallet, every transaction needs your approval.' },
      { t: 'Try the protocol', d: 'Open a vault (deposit XEL, borrow xUSD), swap on the PSM, and watch the oracle aggregate update live.' },
    ],
  },
  {
    id: 'cli',
    icon: Terminal,
    title: 'CLI Guide',
    desc: 'The full xvault toolkit: community CLI, miner TUI and chat relayer. Everything the app can do, scriptable.',
    time: '15 min',
    steps: [
      { t: 'Install', d: `One line: ${CLI_INSTALL.linux} (or the PowerShell one-liner on Windows). Installs xvault, xvault-miner and xvault-relayer to ~/.xelis-vault.` },
      { t: 'First run', d: 'xvault --setup walks you through wallet detection, network config and contract loading. No addresses to paste — everything resolves from the on-chain registry.' },
      { t: 'Daily use', d: 'xvault opens the interactive menu: Dashboard, Vault, Swap, Governance, Mixer, Chat, Airdrop, Stats. Quick flags: --balance, --swap, --vault, --governance.' },
      { t: 'Admin & Guardian', d: 'Admin and Guardian panels auto-appear for authorized keys: pause contracts, batch faucet distributions, oracle parameters, multisig actions.' },
    ],
  },
  {
    id: 'miner',
    icon: Pickaxe,
    title: 'Miner Guide',
    desc: 'Secure the oracle, earn VLT. From registration to your first rewards, including reputation mechanics.',
    time: '30 min',
    steps: [
      { t: 'Requirements', d: '1,000 VLT minimum stake (locked while mining), a few XEL for transaction fees, and a machine that stays online. The CLI handles everything else.' },
      { t: 'Register', d: 'xvault-miner --setup registers your miner on-chain: stake deposit, endpoint URL, public key. New miners start at reputation 3,000 (Warning tier, 0.7× rewards).' },
      { t: 'Submit prices', d: 'xvault-miner --miner --services oracle fetches XEL/USD prices from multiple sources (CoinEx, MEXC, local daemon), validates against the median, and submits every aggregation window.' },
      { t: 'Earn & compound', d: 'Rewards flow per block, stake-weighted. Press C in the TUI to compound into your stake. Time-proven bonus: +2,000 reputation after 15 days.' },
    ],
  },
  {
    id: 'provider',
    icon: Users,
    title: 'Relayer & Provider Guide',
    desc: 'Run the infrastructure layer: chat relayers earn from a dedicated 1,000,000 VLT allocation.',
    time: '45 min',
    steps: [
      { t: 'Why relay', d: 'VaultChat messages flow peer-to-peer but anchor to the chain through relayers. Relayers batch Merkle roots every ~80 minutes and earn per valid anchor.' },
      { t: 'Bond', d: 'Stake the 50 VLT relayer bond (slashable for abuse) and register your endpoint. Commission settings and subscription plans are yours to define.' },
      { t: 'Anti-abus rules', d: 'Anchors need 5+ messages from 2+ distinct senders, max 50 anchors/day, 100 VLT/day cap. Reputation multipliers scale earnings from 0.5× to 1.5×.' },
      { t: 'Run it', d: 'xvault-relayer starts the daemon: message intake, P2P sync with other relayers, on-chain anchoring, subscription management.' },
    ],
  },
]

const SPECS = [
  {
    icon: FileText,
    title: 'Whitepaper',
    desc: 'The complete protocol design: confidentiality model, ten-layer oracle security, governance, economics.',
    file: 'WHITEPAPER.md',
    facts: ['18/18 audit findings remediated', 'MIT licensed', '10-layer oracle security'],
  },
  {
    icon: Gauge,
    title: 'Tokenomics',
    desc: 'VLT fixed supply of 10,000,000. No presale, no seed, no VC — 55% funds oracle rewards.',
    file: 'TOKENOMICS_v10.3.md',
    facts: ['55% oracle rewards (halving)', '10% chat relayers', '5% founder 4y + 5% 10y', '1% bug bounty (Immunefi)'],
  },
  {
    icon: Pickaxe,
    title: 'Miner Economics',
    desc: 'Bitcoin-style emission: 0.43593 VLT per block, halving every 6,307,200 blocks (one year).',
    file: 'MINER_ECONOMICS.md',
    facts: ['0.43593 VLT/block initial', 'Yearly halving, 10+ years', 'New miner boost up to +50%', 'Concentration penalty 0.3×–1.0×'],
  },
  {
    icon: MessageSquareLock,
    title: 'VaultChat',
    desc: 'E2E messaging: HKDF key derivation, X25519 exchange, ChaCha20-Poly1305, on-chain Merkle anchoring.',
    file: 'CHAT_GUIDE.md',
    facts: ['<1 s P2P delivery', '50 msg/user ring buffer', 'Ephemeral messages 2h–24h', 'Payment requests'],
  },
  {
    icon: ShieldCheck,
    title: 'Audit Reports',
    desc: 'Controlled-disclosure audit of v11.3 (18 findings: 2 critical, 5 high, 8 medium, 3 low) fully remediated in v11.5.',
    file: 'AUDIT_v11.5_REMEDIATION.md',
    facts: ['18/18 findings closed', 'Reentrancy guards on all mutators', 'Two-step emergency withdraws', 'Cross-call access control'],
  },
  {
    icon: BookOpen,
    title: 'User Guide',
    desc: 'Every flow from a user perspective: vaults, swaps, savings, mixer, chat, with CLI walkthroughs.',
    file: 'USER_GUIDE.md',
    facts: ['Vault cycle walkthroughs', 'FAQ with 30+ answers', 'Hardware wallet notes', 'Troubleshooting'],
  },
]

const REFERENCE = [
  { label: 'Contracts', value: '51', note: '34 core deployed · 13 Phase 5+ brainstorming · 4 vault engine variants' },
  { label: 'Entry functions', value: '966', note: '739 wallet-invokable chunks across 35 compiled contracts' },
  { label: 'Deployment', value: 'v12R', note: 'Live since 2026-08-24 · registry-resolved addresses' },
  { label: 'Block time', value: '5 s', note: 'XELIS BlockDAG · 8-digit atomic precision everywhere' },
]

const CHANGELOG = [
  {
    version: 'v12R-9',
    date: '2026-08-27 → 29',
    tone: 'vault' as const,
    title: 'PrivacyMixer v2 + relayer officiel',
    points: [
      'PrivacyMixer v2 (v12R-7): note + nullifier + shared pool — the v1 sender/recipient link is gone',
      'The mixer now mixes XEL (native), in addition to xUSD and VLT — any amount',
      'Official VaultChat relayer configured on-chain (v12R-8): relay.xelisvault.io, free tier 100 msgs/day',
      'CLI v12R-9: rich dashboard, Relayer & Airdrop screens, balance guards on every spend flow',
    ],
  },
  {
    version: 'v12R',
    date: '2026-08-22 → 24',
    tone: 'emerald' as const,
    title: 'Full redeployment (canonical)',
    points: [
      'Discovered critical VM behavior: mutating entries must return 0',
      'VLT asset recreated with hard 10M cap (Mintable mode)',
      'PSM reserve seeded, VaultSwap XEL/xUSD pool created, faucet refilled',
      'Registry 19161543… — all contract upgrades resolve through it',
    ],
  },
  {
    version: 'v11.5',
    date: '2026-08-21',
    tone: 'vault' as const,
    title: 'Audit remediation re-applied (18/18)',
    points: [
      'All controlled-disclosure findings fixed (were reverted by a compile fix)',
      'PrivacyMixer rewritten: per-user thresholds, auto-mix, 0.1% admin fee',
      'PSM mint_split/burn chunk fixes, relayer bond enforcement (F-13)',
    ],
  },
  {
    version: 'v11.4',
    date: '2026-08-17',
    tone: 'muted' as const,
    title: 'Miner economy hardening',
    points: [
      'REP_START 3,000 — new miners start Warning, prove themselves',
      'Warning multiplier 0.5× → 0.7×, Critical 0.25× → 0.4×',
      'New miner boost: +50% / +30% / +10% by network size, 30 days',
    ],
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function DocsPage() {
  const [openGuide, setOpenGuide] = useState<string | null>('get-started')
  const [openSpec, setOpenSpec] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-vault/8 blur-[120px]" />
        <div className="relative max-w-5xl mx-auto text-center">
          <Reveal>
            <SectionLabel>Documentation</SectionLabel>
            <h1 className="mt-4 font-display text-4xl md:text-5xl font-semibold tracking-tight">
              Everything you need to <span className="text-gradient-vault">build on XELIS Vault</span>
            </h1>
            <p className="mt-6 text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Guides for every participant, the full specifications, and the live contract reference.
              All documentation is open-source and versioned with the protocol repository.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Guides */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-semibold tracking-tight flex items-center gap-2.5">
                <Hammer className="w-5 h-5 text-vault" />
                Guides
              </h2>
              <a href={`${GITHUB_DOCS}/CLI_GUIDE.md`} target="_blank" rel="noreferrer" className="text-xs font-mono text-vault hover:underline inline-flex items-center gap-1">
                CLI_GUIDE.md <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </Reveal>

          <div className="space-y-3">
            {GUIDES.map((g, i) => {
              const isOpen = openGuide === g.id
              return (
                <Reveal key={g.id} delay={i * 0.05}>
                  <div className={`rounded-2xl border transition-colors ${isOpen ? 'border-vault/30 bg-card/40' : 'border-border bg-card/25'}`}>
                    <button
                      onClick={() => setOpenGuide(isOpen ? null : g.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isOpen ? 'bg-vault/15 border-vault/30 text-vault' : 'bg-card/60 border-border text-muted-foreground'
                      }`}>
                        <g.icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold flex items-center gap-2">
                          {g.title}
                          <Badge tone="muted">{g.time}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{g.desc}</div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                        <div className="px-5 pb-5 pt-1 grid md:grid-cols-2 gap-3">
                          {g.steps.map((s, idx) => (
                            <div key={s.t} className="rounded-xl border border-border bg-background/40 p-4">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="font-mono text-[10px] text-vault font-bold">{String(idx + 1).padStart(2, '0')}</span>
                                <span className="text-xs font-semibold">{s.t}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">{s.d}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold tracking-tight mb-6 flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-vault" />
              Specifications
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SPECS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.05}>
                <a
                  href={`${GITHUB_DOCS}/${s.file}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group block h-full rounded-2xl border border-border bg-card/30 p-5 hover:border-vault/40 hover:bg-card/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-vault/10 border border-vault/25 flex items-center justify-center">
                      <s.icon className="w-4 h-4 text-vault" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-vault transition-colors" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{s.desc}</p>
                  <div className="space-y-1">
                    {s.facts.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/80">
                        <span className="w-1 h-1 rounded-full bg-vault/60" />
                        {f}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/60 font-mono text-[10px] text-muted-foreground/60">
                    docs/{s.file}
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Reference */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold tracking-tight mb-6 flex items-center gap-2.5">
              <Boxes className="w-5 h-5 text-vault" />
              Protocol Reference
            </h2>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {REFERENCE.map((r, i) => (
              <Reveal key={r.label} delay={i * 0.05}>
                <div className="rounded-2xl border border-border bg-card/30 p-5">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">{r.label}</div>
                  <div className="font-mono text-2xl font-semibold text-vault">{r.value}</div>
                  <div className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{r.note}</div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Entry points */}
          <Reveal>
            <div className="rounded-2xl border border-border bg-card/30 p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-vault" />
                Key links
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {[
                  { label: 'Protocol repository', href: GITHUB_URL },
                  { label: 'ENTRY_IDS.md (966 entries)', href: `${GITHUB_DOCS}/ENTRY_IDS.md` },
                  { label: 'Deployment state (v12R)', href: `${GITHUB_DOCS}/deployment_state.json` },
                  { label: 'Testnet explorer', href: 'https://testnet-explorer.xelis.io' },
                  { label: 'XELIS faucet', href: XELIS_FAUCET_URL },
                  { label: 'Genesix wallet', href: GENESIX_URL },
                  { label: 'Discord community', href: DISCORD_URL },
                  { label: 'ROADMAP.md', href: `${GITHUB_DOCS}/ROADMAP.md` },
                  { label: 'Bug bounty (Immunefi)', href: 'https://immunefi.com' },
                ].map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-3.5 py-2.5 text-xs hover:border-vault/40 hover:text-vault transition-all"
                  >
                    <span>{l.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Changelog */}
      <section className="px-4 pb-24">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold tracking-tight mb-6 flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-vault" />
              Recent versions
            </h2>
          </Reveal>
          <div className="space-y-4">
            {CHANGELOG.map((c, i) => (
              <Reveal key={c.version} delay={i * 0.05}>
                <div className="relative pl-6 md:pl-8">
                  <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-vault border-2 border-background shadow-[0_0_12px_var(--vault)]" />
                  {i < CHANGELOG.length - 1 && <div className="absolute left-[4px] top-5 bottom-[-16px] w-px bg-border" />}
                  <div className="rounded-2xl border border-border bg-card/30 p-5">
                    <div className="flex flex-wrap items-center gap-2.5 mb-2">
                      <span className="font-mono text-sm font-semibold text-vault">{c.version}</span>
                      <Badge tone={c.tone}>{c.title}</Badge>
                      <span className="text-[10px] font-mono text-muted-foreground ml-auto">{c.date}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {c.points.map((p) => (
                        <li key={p} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                          <span className="text-vault/60 shrink-0">·</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Install CTA */}
          <Reveal delay={0.1}>
            <div className="mt-10 rounded-2xl border border-vault/25 bg-gradient-to-br from-vault/10 via-card/30 to-transparent p-6 md:p-8">
              <h3 className="font-display text-xl font-semibold mb-2">Ready to dive in?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-xl">
                Install the full CLI toolkit — wallet, miner, relayer and community CLI — in one line.
                Uninstall anytime with <code className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">{CLI_UNINSTALL.linux.slice(-14)}</code>.
              </p>
              <div className="space-y-2 max-w-2xl">
                {[CLI_INSTALL.linux, CLI_INSTALL.windows].map((cmd) => (
                  <div key={cmd} className="flex items-center gap-3 rounded-xl border border-border bg-background/80 px-4 py-3">
                    <Terminal className="w-4 h-4 text-vault shrink-0" />
                    <code className="flex-1 truncate font-mono text-xs">{cmd}</code>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}
