'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronDown, ExternalLink } from 'lucide-react'
import { useWallet } from '@/lib/wallet-store'
import { Badge, CliRow } from '../shared'
import { GENESIX_URL, XELIS_FAUCET_URL, DISCORD_URL, CLI_INSTALL, CLI_COMMANDS } from '@/lib/xelis/cli'

const STEPS = [
  { id: 'wallet', title: 'Install a XELIS wallet', time: '2 min' },
  { id: 'funds', title: 'Get testnet funds', time: '5 min' },
  { id: 'connect', title: 'Connect to the app', time: '30 s' },
  { id: 'mine', title: 'Start mining (optional)', time: '10 min' },
  { id: 'explore', title: 'Explore the protocol', time: 'at leisure' },
] as const

export function GetStarted() {
  const { address, setShowConnectModal } = useWallet()
  const [open, setOpen] = useState<string | null>('wallet')

  const connected = !!address

  const stepDone = (id: string) => {
    if (id === 'connect') return connected
    return false
  }

  const toggle = (id: string) => setOpen(open === id ? null : id)

  return (
    <div className="max-w-3xl space-y-8">
      {/* Intro — plain editorial statement, hairline below */}
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-vault font-semibold">Testnet is live</span>
        </div>
        <h2 className="font-display text-2xl font-semibold tracking-tight mb-3">
          Welcome to the XELIS Vault testnet
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
          Everything here is real: 34 contracts deployed on the XELIS BlockDAG, a live oracle fed by
          staked miners, and confidential balances by default. Follow these five steps to get started
          no real value is at risk on testnet.
        </p>
      </div>

      {/* Steps — numbered ledger accordion */}
      <div className="border-t border-border">
        {STEPS.map((step, i) => {
          const isOpen = open === step.id
          const done = stepDone(step.id)
          return (
            <div key={step.id} className="border-b border-border">
              <button
                onClick={() => toggle(step.id)}
                className="w-full flex items-baseline gap-4 py-4 text-left group"
              >
                <span className={`font-mono text-xs tracking-[0.18em] shrink-0 w-7 ${done ? 'text-emerald-400' : isOpen ? 'text-vault' : 'text-muted-foreground/50'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold flex items-center gap-3 ${done ? 'text-emerald-300' : isOpen ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'}`}>
                    {step.title}
                    {done && <Badge tone="emerald">done</Badge>}
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/60 shrink-0 hidden sm:inline">
                  {step.time}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${isOpen ? 'rotate-180 text-vault' : ''}`} />
              </button>

              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden"
                >
                  <div className="pl-11 pr-2 pb-6 space-y-4">
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
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        XELIS Vault connects to <span className="text-foreground font-medium">Genesix</span>, the official
        XELIS desktop wallet, via XSWD (XELIS Secure WebSocket Daemon). Your keys never leave the wallet
        the site only sees your address and the balances you approve, and every transaction requires an
        explicit approval popup.
      </p>
      <a href={GENESIX_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-vault text-background px-4 py-2.5 text-sm font-semibold hover:bg-vault/90 transition-colors">
        Download Genesix
        <ExternalLink className="w-3 h-3 opacity-60" />
      </a>
      <p className="text-[11px] text-muted-foreground">
        Available for Windows, Linux and macOS. Create a new wallet for testnet, never reuse a mainnet seed.
      </p>
    </div>
  )
}

function StepFunds() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        You need two assets on testnet:
      </p>
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="border-t border-border pt-3">
          <div className="text-sm font-semibold mb-1.5">XEL, gas & collateral</div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
            Claim from the official XELIS faucet. Every transaction pays a tiny XEL fee (~0.001 XEL).
          </p>
          <a href={XELIS_FAUCET_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-mono text-vault hover:underline">
            faucet.xelis.io <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="border-t border-border pt-3">
          <div className="text-sm font-semibold mb-1.5">VLT, staking & mining</div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
            VLT is distributed to testnet participants. Ask in the Discord #faucet channel
            an operator sends a batch to your address on request.
          </p>
          <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-mono text-vault hover:underline">
            discord.gg/UHpYAWbG <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Minimum to start mining: <span className="text-foreground font-medium">1,000 VLT</span>. To open a vault:
        <span className="text-foreground font-medium"> some XEL for collateral</span> (any amount, the ratio is what matters).
      </p>
    </div>
  )
}

function StepConnect({ connected, onConnect }: { connected: boolean; onConnect: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        With Genesix running, click Connect and approve the XELIS Vault application in the wallet popup.
        The connection uses XSWD on <code className="font-mono text-[10px] bg-muted/50 px-1">ws://127.0.0.1:44325/xswd</code>
        Chrome, Edge and Firefox allow localhost WebSockets from HTTPS pages; on Safari use the CLI instead.
      </p>
      {connected ? (
        <div className="flex items-center gap-2 text-emerald-300">
          <Check className="w-3.5 h-3.5" />
          <span className="text-xs font-mono uppercase tracking-[0.14em]">wallet connected</span>
        </div>
      ) : (
        <button onClick={onConnect} className="inline-flex items-center gap-2 bg-vault text-background px-4 py-2.5 text-sm font-semibold hover:bg-vault/90 transition-colors">
          Connect wallet
        </button>
      )}
      <p className="text-[11px] text-muted-foreground">
        No wallet handy? You can still browse all protocol data in this app, only signing requires a wallet.
      </p>
    </div>
  )
}

function StepMine() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Miners secure the StakedOracle price feed (and can relay VaultChat). Stake a minimum of
        <span className="text-foreground font-medium"> 1,000 VLT</span>, submit prices, earn VLT emission with
        Bitcoin-style yearly halvings. New miners get a <span className="text-foreground font-medium">+50% reward boost</span> for
        30 days while the network is under 10 miners.
      </p>
      <div className="border border-border p-4 space-y-2.5">
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground pb-1">
          install the miner CLI
        </div>
        <CliRow cmd={CLI_INSTALL.linux} label="linux/mac" />
        <CliRow cmd={CLI_INSTALL.windows} label="windows" />
        <div className="pt-3 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          one-time setup, then run
        </div>
        <CliRow cmd={CLI_COMMANDS.startMiner.setup} label="setup" />
        <CliRow cmd={CLI_COMMANDS.startMiner.start} label="start" />
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        The CLI registers your miner on-chain (staking VLT from your wallet), then submits oracle prices
        automatically and shows a live reputation/stake/rewards dashboard. Press <code className="font-mono text-[10px] bg-muted/50 px-1">C</code> to
        compound rewards into your stake.
      </p>
    </div>
  )
}

function StepExplore() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Every module in this app reads live testnet data. Good starting points:
      </p>
      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
        {[
          { t: 'Vault Engine', d: 'Deposit XEL, borrow xUSD, watch your collateral ratio' },
          { t: 'PSM & Swap', d: 'Mint/redeem xUSD at oracle price, trade on the AMM' },
          { t: 'Oracle', d: 'Watch the median price aggregate and its sources' },
          { t: 'Airdrop', d: 'Track your contribution points toward the 500k VLT airdrop' },
        ].map((x, i) => (
          <div key={x.t} className="border-t border-border pt-3">
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-[10px] text-muted-foreground/50">{String(i + 1).padStart(2, '0')}</span>
              <div className="text-sm font-semibold">{x.t}</div>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed pl-6">{x.d}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Questions? The community on Discord answers fast.
      </p>
    </div>
  )
}
