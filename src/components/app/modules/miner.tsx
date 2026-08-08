'use client'

import { useWallet, registerMiner, submitHeartbeat } from '@/lib/wallet-store'
import { CONTRACTS, ENTRIES, TOKENOMICS } from '@/lib/contract-config'
import { Card, SuccessToast } from '../ui'
import { useState } from 'react'
import { Loader2, Pickaxe } from 'lucide-react'

export function Miner() {
  const { vltBalance, address, refreshBalances } = useWallet()
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  const canRegister = vltBalance >= TOKENOMICS.MIN_MINER_STAKE

  const handleRegister = async () => {
    setLoading(true)
    try {
      await registerMiner('https://miner.example.com', '0x' + '0'.repeat(64), 1)
      setToast('Miner registered! Stake: 100 VLT')
      setTimeout(() => refreshBalances(), 3000)
    } catch (err: any) {
      setToast('Error: ' + (err.message || 'failed'))
    } finally {
      setLoading(false)
      setTimeout(() => setToast(''), 4000)
    }
  }

  const handleHeartbeat = async () => {
    setLoading(true)
    try {
      await submitHeartbeat()
      setToast('Heartbeat submitted!')
    } catch (err: any) {
      setToast('Error: ' + (err.message || 'failed'))
    } finally {
      setLoading(false)
      setTimeout(() => setToast(''), 4000)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Pickaxe className="w-5 h-5 text-vault" />
          <span className="font-display text-lg font-semibold">XelisVaultMiner</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-vault/15 text-vault">LIVE</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-lg bg-card/30 border border-border p-3">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">VLT Balance</div>
            <div className="mt-1 font-display text-lg font-semibold text-vlt">{vltBalance.toFixed(4)}</div>
          </div>
          <div className="rounded-lg bg-card/30 border border-border p-3">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Min Stake Required</div>
            <div className="mt-1 font-display text-lg font-semibold">{TOKENOMICS.MIN_MINER_STAKE} VLT</div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleRegister}
            disabled={!canRegister || loading}
            className="w-full h-12 rounded-xl bg-vault text-white font-semibold text-sm hover:bg-vault/85 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {canRegister ? 'Register as Miner (100 VLT)' : `Need ${TOKENOMICS.MIN_MINER_STAKE} VLT to register`}
          </button>

          <button
            onClick={handleHeartbeat}
            disabled={loading}
            className="w-full h-12 rounded-xl border border-border bg-card/40 hover:bg-card/80 font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Submit Heartbeat
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
          <div>Contract: {CONTRACTS.XelisVaultMiner.slice(0, 20)}...</div>
          <div>Heartbeat interval: every {TOKENOMICS.HEARTBEAT_INTERVAL} blocks</div>
        </div>
      </Card>

      {toast && <SuccessToast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}
