'use client'
import { useWallet } from '@/lib/wallet-store'
import { Card } from '../ui'
export function VaultChat() {
  const { address } = useWallet()
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-display text-lg font-semibold">VaultChat</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-vlt/15 text-vlt">LIVE</span>
        </div>
        <div className="text-center py-8 text-sm text-muted-foreground">
          Encrypted messaging requires DH key exchange setup.
          <br />Chat UI coming soon.
        </div>
      </Card>
    </div>
  )
}
