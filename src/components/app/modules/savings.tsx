'use client'

import { useWallet } from '@/lib/wallet-store'
import { Card } from '../ui'

export function Savings() {
  const { xusdBalance, xelPrice } = useWallet()
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-display text-lg font-semibold">Savings Rate</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-xusd/15 text-xusd">LIVE</span>
        </div>
        <div className="rounded-xl bg-card/30 border border-border p-4 mb-4">
          <div className="text-xs font-mono uppercase text-muted-foreground">xUSD Balance</div>
          <div className="mt-1 font-display text-2xl font-semibold text-xusd">{xusdBalance.toFixed(4)}</div>
        </div>
        <div className="text-center py-8 text-sm text-muted-foreground">
          Savings Rate contract interaction coming soon.
          <br />
          Your xUSD balance: {xusdBalance.toFixed(2)}
        </div>
      </Card>
    </div>
  )
}
