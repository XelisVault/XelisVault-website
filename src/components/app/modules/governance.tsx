'use client'
import { useWallet, stakeVlt } from '@/lib/wallet-store'
import { Card } from '../ui'
import { CONTRACTS } from '@/lib/contract-config'
export function Governance() {
  const { vltBalance, address } = useWallet()
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-display text-lg font-semibold">Governance</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-vlt/15 text-vlt">LIVE</span>
        </div>
        <div className="rounded-lg bg-card/30 border border-border p-3 mb-4">
          <div className="text-[10px] font-mono uppercase text-muted-foreground">VLT Balance</div>
          <div className="mt-1 font-display text-lg font-semibold text-vlt">{vltBalance.toFixed(4)}</div>
        </div>
        <div className="text-center py-8 text-sm text-muted-foreground">
          GovernanceVault: {CONTRACTS.GovernanceVault.slice(0, 20)}...
          <br />Staking and proposal UI coming soon.
        </div>
      </Card>
    </div>
  )
}
