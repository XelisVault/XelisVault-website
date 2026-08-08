'use client'
import { useWallet } from '@/lib/wallet-store'
import { Card } from '../ui'
import { CONTRACTS } from '@/lib/contract-config'
export function Oracle() {
  const { xelPrice } = useWallet()
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-display text-lg font-semibold">Price Oracle</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-vault/15 text-vault">LIVE</span>
        </div>
        <div className="rounded-xl bg-card/30 border border-border p-4 mb-4">
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">XEL/USD Price (from PriceOracle)</div>
          <div className="mt-1 font-display text-3xl font-semibold text-gradient-vault">${xelPrice.toFixed(6)}</div>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          Contract: {CONTRACTS.PriceOracle.slice(0, 20)}...
        </div>
      </Card>
    </div>
  )
}
