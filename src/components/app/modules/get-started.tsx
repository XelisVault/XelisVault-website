'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronDown, Download, Droplets, ExternalLink, MessageCircle, Pickaxe, Rocket, Terminal, Wallet, Zap } from 'lucide-react'
import { useWallet } from '@/lib/wallet-store'
import { Badge, CliFallback, CliRow, LiveDot, Panel } from '../shared'
import { GENESIX_URL, XELIS_FAUCET_URL, DISCORD_URL, CLI_INSTALL, CLI_COMMANDS } from '@/lib/xelis/cli'

const STEPS = [
  { id: 'wallet', icon: Wallet, title: 'Install a XELIS wallet', time: '2 min' },
  { id: 'funds', icon: Droplets, title: 'Get testnet funds', time: '5 min' },
  { id: 'connect', icon: Zap, title: 'Connect to the app', time: '30 s' },
  { id: 'mine', icon: Pickaxe, title: 'Start mining (optional)', time: '10 min' },
  { id: 'explore', icon: Rocket, title: 'Explore the protocol', time: '∞' },
] as const

export function GetStarted() {
  const { address, connectionType, setShowConnectModal } = useWallet()
  const [open, setOpen] = useState<string | null>('wallet')

  const connected = !!address

  const stepDone = (id: string) => {
    if (id === 'connect') return connected
    return false
  }

  const toggle = (id: string) => setOpen(open === id ? null : id)

  return (
    <div className="max-w-3xl space-y-4">
      <div className="rounded-2xl border border-vault/25 bg-gradient-to-br from-vault/10 via-card/30 to-transparent p-6">
        <div className="flex items-center gap-2 mb-3">
          <LiveDot />
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-vault font-semibold">Testnet is live</span>
        </div>
        <h2 className="font-display text-2xl font-semibold tracking-tight mb-2">
          Welcome to the XELIS Vault testnet
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
          Everything here is real: 34 contracts deployed on the XELIS BlockDAG, a live oracle fed by
          staked miners, and confidential balances by default. Follow these steps to get started —
          no real value is at risk on testnet.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex-1 flex items-center gap-1.5">
            <div
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                stepDone(s.id) ? 'bg-emerald-400' : open === s.id ? 'bg-vault' : 'bg-border'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const isOpen = open === step.id
          const done = stepDone(step.id)
          return (
            <div key={step.id} className={`rounded-2xl border transition-colors ${isOpen ? 'border-vault/30 bg-card/40' : 'border-border bg-card/25'}`}>
              <button
                onClick={() => toggle(step.id)}
                className="w-full flex items-center gap-3.5 px-5 py-4 text-left"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  done ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : isOpen ? 'bg-vault/15 border-vault/30 text-vault'
                    : 'bg-card/60 border-border text-muted-foreground'
                }`}>
                  {done ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <span className="text-muted-foreground/60 font-mono text-xs">{String(i + 1).padStart(2, '0')}</span>
                    {step.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{step.time}</div>
                </div>
                {done && <Badge tone="emerald">done</Badge>}
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-1 space-y-3">
                    {step.id === 'wallet' && <StepWallet />}
                    {step.id === 'funds' && <StepFunds />}
                    {step.id === 'connect' && <StepConnect connected={connected} onConnect={() => setShowConnectModal(true)} />}
                    {step.id === 'mine' && <StepMine />}
                    {step.id === 'explore' && <StepExplore />}
                  </div>
                </motion.div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StepWallet() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        XELIS Vault connects to <span className="text-foreground font-medium">Genesix</span>, the official
        XELIS desktop wallet, via XSWD (XELIS Secure WebSocket Daemon). Your keys never leave the wallet —
        the site only sees your address and the balances you approve, and every transaction requires an
        explicit approval popup.
      </p>
      <a href={GENESIX_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-vault px-4 py-2.5 text-sm font-semibold text-white hover:bg-vault/85 transition-all">
        <Download className="w-4 h-4" />
        Download Genesix
        <ExternalLink className="w-3 h-3 opacity-60" />
      </a>
      <div className="text-[11px] text-muted-foreground">
        Available for Windows, Linux and macOS. Create a new wallet for testnet — never reuse a mainnet seed.
      </div>
    </div>
  )
}

function StepFunds() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        You need two assets on testnet:
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-background/40 p-4">
          <div className="text-sm font-semibold mb-1">XEL — gas & collateral</div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
            Claim from the official XELIS faucet. Every transaction pays a tiny XEL fee (~0.001 XEL).
          </p>
          <a href={XELIS_FAUCET_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-mono text-vault hover:underline">
            faucet.xelis.io <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="rounded-xl border border-border bg-background/40 p-4">
          <div className="text-sm font-semibold mb-1">VLT — staking & mining</div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
            VLT is distributed to testnet participants. Ask in the Discord #faucet channel —
            an operator sends a batch to your address on request.
          </p>
          <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-mono text-vault hover:underline">
            discord.gg/UHpYAWbG <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground leading-relaxed">
        Minimum to start mining: <span className="text-foreground font-medium">1,000 VLT</span>. To open a vault:
        <span className="text-foreground font-medium"> some XEL for collateral</span> (any amount — the ratio is what matters).
      </div>
    </div>
  )
}

function StepConnect({ connected, onConnect }: { connected: boolean; onConnect: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        With Genesix running, click Connect and approve the XELIS Vault application in the wallet popup.
        The connection uses XSWD on <code className="font-mono text-[10px] bg-muted/50 px-1 rounded">ws://127.0.0.1:44325/xswd</code> —
        Chrome, Edge and Firefox allow localhost WebSockets from HTTPS pages; on Safari use the CLI instead.
      </p>
      {connected ? (
        <Badge tone="emerald"><Check className="w-3 h-3" /> wallet connected</Badge>
      ) : (
        <button onClick={onConnect} className="inline-flex items-center gap-2 rounded-xl bg-vault px-4 py-2.5 text-sm font-semibold text-white hover:bg-vault/85 transition-all">
          <Wallet className="w-4 h-4" />
          Connect wallet
        </button>
      )}
      <p className="text-[11px] text-muted-foreground">
        No wallet handy? You can still browse all protocol data in this app — only signing requires a wallet.
      </p>
    </div>
  )
}

function StepMine() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Miners secure the StakedOracle price feed (and can relay VaultChat). Stake a minimum of
        <span className="text-foreground font-medium"> 1,000 VLT</span>, submit prices, earn VLT emission with
        Bitcoin-style yearly halvings. New miners get a <span className="text-foreground font-medium">+50% reward boost</span> for
        30 days while the network is under 10 miners.
      </p>
      <div className="rounded-xl border border-border bg-background/60 p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <Terminal className="w-3.5 h-3.5 text-vault" /> install the miner CLI
        </div>
        <CliRow cmd={CLI_INSTALL.linux} label="linux/mac" />
        <CliRow cmd={CLI_INSTALL.windows} label="windows" />
        <div className="pt-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          one-time setup, then run
        </div>
        <CliRow cmd={CLI_COMMANDS.startMiner.setup} label="setup" />
        <CliRow cmd={CLI_COMMANDS.startMiner.start} label="start" />
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        The CLI registers your miner on-chain (staking VLT from your wallet), then submits oracle prices
        automatically and shows a live reputation/stake/rewards dashboard. Press <code className="font-mono text-[10px] bg-muted/50 px-1 rounded">C</code> to
        compound rewards into your stake.
      </p>
    </div>
  )
}

function StepExplore() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Every module in this app reads live testnet data. Good starting points:
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { t: 'Vault Engine', d: 'Deposit XEL, borrow xUSD, watch your collateral ratio' },
          { t: 'PSM & Swap', d: 'Mint/redeem xUSD at oracle price, trade on the AMM' },
          { t: 'Oracle', d: 'Watch the median price aggregate and its sources' },
          { t: 'Airdrop', d: 'Track your contribution points toward the 500k VLT airdrop' },
        ].map((x) => (
          <div key={x.t} className="rounded-xl border border-border bg-background/40 p-3.5">
            <div className="text-sm font-semibold">{x.t}</div>
            <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{x.d}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <MessageCircle className="w-3.5 h-3.5 text-vault" />
        Questions? The community on Discord answers fast.
      </div>
    </div>
  )
}
