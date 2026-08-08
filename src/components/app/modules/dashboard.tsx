'use client'

import { useWallet } from '@/lib/wallet-store'
import { Card, CardHeader, Stat, Pill, ActionLink } from '../ui'
import { TokenIcon } from '../token-icon'
import { TrendingUp, ArrowUpRight, ArrowDownRight, Shield, Lock, Wind } from 'lucide-react'

export function Dashboard() {
  const { address, xelBalance, xusdBalance, vltBalance, xelPrice, setShowConnectModal } = useWallet()
  const portfolioUsd = xelBalance * xelPrice + xusdBalance + vltBalance * 0 // VLT price TBD from pool
  const totalVlt = vltBalance

  // No fake positions, no fake history — only real wallet data

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Hero stat */}
      <Card className="p-6 md:p-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-vault/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Pill color="emerald">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              Connected · Testnet
            </Pill>
          </div>
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Total Portfolio Value</div>
          <div className="mt-2 font-display text-4xl md:text-5xl font-semibold tracking-tight">
            ${portfolioUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground text-xs font-mono">
              XEL/USD: ${xelPrice.toFixed(6)}
            </span>
          </div>
        </div>
      </Card>

      {/* Balance grid */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { sym: 'XEL' as const, name: 'Xelis', amount: xelBalance, price: xelPrice, change: '+0.0%' },
          { sym: 'xUSD' as const, name: 'Xelis Dollar', amount: xusdBalance, price: 1, change: '0.0%' },
          { sym: 'VLT' as const, name: 'Vault Token', amount: totalVlt, price: 0, change: '0.0%' },
        ].map((b) => (
          <Card key={b.sym} className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <TokenIcon symbol={b.sym} size="md" />
                <div>
                  <div className="text-sm font-semibold">{b.sym}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{b.name}</div>
                </div>
              </div>
            </div>
            <div className="mt-4 font-display text-2xl font-semibold">
              {b.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-mono">
              {b.price > 0 ? `≈ $${(b.amount * b.price).toLocaleString(undefined, { maximumFractionDigits: 2 })} · $${b.price.toFixed(4)}` : 'Price unavailable'}
            </div>
          </Card>
        ))}
      </div>

      {/* Wallet address */}
      <Card className="p-5">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Wallet Address</div>
        <div className="font-mono text-sm break-all text-vault">{address}</div>
      </Card>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Deposit XEL', module: 'vault', color: 'vault' as const },
          { label: 'Swap on AMM', module: 'swap', color: 'xusd' as const },
          { label: 'Mint xUSD', module: 'psm', color: 'xusd' as const },
          { label: 'Register Miner', module: 'miner', color: 'vlt' as const },
        ].map((a) => (
          <button
            key={a.label}
            onClick={() => {
              const event = new CustomEvent('navigate', { detail: a.module })
              window.dispatchEvent(event)
            }}
            className="rounded-xl border border-border bg-card/30 hover:bg-card/60 hover:border-vault/40 p-4 transition-all text-left"
          >
            <div className="text-sm font-medium">{a.label}</div>
          </button>
        ))}
      </div>

      {/* No fake data message */}
      <Card className="p-5">
        <div className="text-center py-4">
          <div className="text-xs font-mono text-muted-foreground">
            All data shown is fetched from the XELIS testnet in real-time.
            <br />
            No simulated or demo data is displayed.
          </div>
        </div>
      </Card>
    </div>
  )
}
