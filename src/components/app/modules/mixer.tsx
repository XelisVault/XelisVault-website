'use client'
import { useWallet } from '@/lib/wallet-store'
import { Card } from '../ui'
export function Mixer() {
  const { xusdBalance, vltBalance } = useWallet()
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-display text-lg font-semibold">Privacy Mixer</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-vault/15 text-vault">LIVE</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-lg bg-card/30 border border-border p-3">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">xUSD Balance</div>
            <div className="mt-1 font-display text-lg font-semibold text-xusd">{xusdBalance.toFixed(4)}</div>
          </div>
          <div className="rounded-lg bg-card/30 border border-border p-3">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">VLT Balance</div>
            <div className="mt-1 font-display text-lg font-semibold text-vlt">{vltBalance.toFixed(4)}</div>
          </div>
        </div>
        <div className="text-center py-8 text-sm text-muted-foreground">
          Mixer deposits and withdrawals require ZK proof generation.
          <br />Interaction UI coming soon.
        </div>
      </Card>
    </div>
  )
}
