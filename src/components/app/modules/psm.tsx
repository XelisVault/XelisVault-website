'use client'

import { useState } from 'react'
import { useWallet, psmMint, psmRedeem } from '@/lib/wallet-store'
import { Card, SuccessToast } from '../ui'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from 'lucide-react'

type Mode = 'mint' | 'redeem'

export function PSM() {
  const { xelBalance, xusdBalance, xelPrice, refreshBalances } = useWallet()
  const [mode, setMode] = useState<Mode>('mint')
  const [amount, setAmount] = useState('')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const num = parseFloat(amount) || 0
  const fee = 0.005 // 0.5%
  const output = mode === 'mint' ? num * xelPrice * (1 - fee) : num / xelPrice * (1 - 0.001)
  const inputBalance = mode === 'mint' ? xelBalance : xusdBalance

  const execute = async () => {
    if (num <= 0 || num > inputBalance) return
    setLoading(true)
    setError('')
    try {
      if (mode === 'mint') {
        await psmMint(num)
      } else {
        await psmRedeem(num)
      }
      setToast(`${mode === 'mint' ? 'Minted' : 'Redeemed'} ${output.toFixed(2)} ${mode === 'mint' ? 'xUSD' : 'XEL'}`)
      setAmount('')
      setTimeout(() => refreshBalances(), 3000)
    } catch (err: any) {
      setError(err.message || 'Transaction failed')
    } finally {
      setLoading(false)
      setTimeout(() => setToast(''), 3500)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-semibold">PSM — Peg Stability Module</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-xusd/15 text-xusd">LIVE</span>
        </div>

        {/* Price */}
        <div className="rounded-xl bg-card/30 border border-border p-4">
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">XEL/USD Oracle Price</div>
          <div className="mt-1 font-display text-2xl font-semibold text-gradient-xusd">${xelPrice.toFixed(6)}</div>
        </div>

        {/* Mode tabs */}
        <div className="flex p-1 rounded-xl bg-card/40 border border-border">
          <button onClick={() => { setMode('mint'); setAmount('') }} className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-all ${mode === 'mint' ? 'bg-xusd text-background' : 'text-muted-foreground'}`}>
            Mint xUSD
          </button>
          <button onClick={() => { setMode('redeem'); setAmount('') }} className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-all ${mode === 'redeem' ? 'bg-xusd text-background' : 'text-muted-foreground'}`}>
            Redeem xUSD
          </button>
        </div>

        {/* Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">You pay</span>
            <span className="text-xs font-mono text-muted-foreground">Balance: {inputBalance.toFixed(2)} {mode === 'mint' ? 'XEL' : 'xUSD'}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 h-12 rounded-xl border border-border bg-background/60 px-4 text-lg font-mono focus:outline-none focus:border-xusd/40"
            />
            <span className="text-sm font-mono font-bold text-xusd px-3">{mode === 'mint' ? 'XEL' : 'xUSD'}</span>
          </div>
        </div>

        {/* Output */}
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">You receive (estimated)</span>
          <div className="mt-2 h-12 rounded-xl border border-border bg-background/60 px-4 flex items-center justify-between">
            <span className="text-xl font-mono">{output.toFixed(4)}</span>
            <span className="text-sm font-mono font-bold text-xusd">{mode === 'mint' ? 'xUSD' : 'XEL'}</span>
          </div>
        </div>

        {/* Fee */}
        {num > 0 && (
          <div className="rounded-lg bg-card/40 border border-border p-3 text-xs font-mono space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Oracle price</span><span>${xelPrice.toFixed(6)} / XEL</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fee ({(fee * 100).toFixed(1)}%)</span><span>{(num * fee).toFixed(4)} {mode === 'mint' ? 'XEL' : 'xUSD'}</span></div>
          </div>
        )}

        {error && <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">{error}</div>}

        <button
          onClick={execute}
          disabled={num <= 0 || num > inputBalance || loading}
          className="w-full h-12 rounded-xl bg-xusd text-background font-semibold text-sm hover:bg-xusd/85 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {num <= 0 ? 'Enter amount' : num > inputBalance ? 'Insufficient balance' : `${mode === 'mint' ? 'Mint' : 'Redeem'} ${output.toFixed(2)} ${mode === 'mint' ? 'xUSD' : 'XEL'}`}
        </button>
      </Card>

      <AnimatePresence>
        {toast && <SuccessToast message={toast} onClose={() => setToast('')} />}
      </AnimatePresence>
    </div>
  )
}
