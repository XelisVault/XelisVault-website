'use client'

import { useState } from 'react'
import { useWallet } from '@/lib/wallet-store'
import { swapTokens, psmMint, psmRedeem, sendTransaction } from '@/lib/wallet-store'
import { CONTRACTS, ENTRIES, XEL_ASSET, toAtomic, fromAtomic, u64Param, hashParam } from '@/lib/contract-config'
import { Card, Button, SuccessToast } from '../ui'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown, Shield, Zap, Loader2 } from 'lucide-react'

type Asset = 'XEL' | 'xUSD' | 'VLT'

const ASSET_HASHES: Record<Asset, string> = {
  XEL: XEL_ASSET,
  xUSD: CONTRACTS.xUSDAsset,
  VLT: CONTRACTS.VLTAsset,
}

export function VaultSwap() {
  const { xelBalance, xusdBalance, vltBalance, xelPrice, refreshBalances } = useWallet()
  const [from, setFrom] = useState<Asset>('XEL')
  const [to, setTo] = useState<Asset>('xUSD')
  const [amount, setAmount] = useState('')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const num = parseFloat(amount) || 0
  const balance = (a: Asset) => a === 'XEL' ? xelBalance : a === 'xUSD' ? xusdBalance : vltBalance

  // Estimate output based on oracle price (simplified)
  const estimate = () => {
    if (num <= 0) return 0
    if (from === 'XEL' && to === 'xUSD') return num * xelPrice * 0.997
    if (from === 'xUSD' && to === 'XEL') return num / xelPrice * 0.997
    return 0
  }

  const execute = async () => {
    if (num <= 0 || num > balance(from)) return
    setLoading(true)
    setError('')
    try {
      await swapTokens(ASSET_HASHES[from], ASSET_HASHES[to], num)
      setToast(`Swapped ${num} ${from} → ${estimate().toFixed(4)} ${to}`)
      setAmount('')
      setTimeout(() => refreshBalances(), 3000)
    } catch (err: any) {
      setError(err.message || 'Transaction failed')
    } finally {
      setLoading(false)
      setTimeout(() => setToast(''), 3500)
    }
  }

  const flip = () => { setFrom(to); setTo(from); setAmount('') }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-5 md:p-6 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-display text-lg font-semibold">VaultSwap</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-vault/15 text-vault">LIVE</span>
        </div>

        {/* From */}
        <div className="rounded-2xl border border-border bg-card/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">From</span>
            <span className="text-xs font-mono text-muted-foreground">Balance: {balance(from).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-2xl font-mono focus:outline-none w-full"
            />
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value as Asset)}
              className="rounded-xl border border-border bg-card/60 px-3 py-2 text-sm font-mono font-bold text-vault focus:outline-none"
            >
              <option value="XEL">XEL</option>
              <option value="xUSD">xUSD</option>
              <option value="VLT">VLT</option>
            </select>
          </div>
        </div>

        {/* Flip */}
        <div className="flex justify-center -my-1 relative z-10">
          <button onClick={flip} className="w-10 h-10 rounded-xl border border-border bg-card/60 hover:bg-vault/15 hover:border-vault/40 flex items-center justify-center transition-all">
            <ArrowDown className="w-4 h-4 text-vault" />
          </button>
        </div>

        {/* To */}
        <div className="rounded-2xl border border-border bg-card/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">To (estimated)</span>
            <span className="text-xs font-mono text-muted-foreground">Balance: {balance(to).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 text-2xl font-mono text-muted-foreground">{estimate().toFixed(4) || '0.00'}</div>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value as Asset)}
              className="rounded-xl border border-border bg-card/60 px-3 py-2 text-sm font-mono font-bold text-xusd focus:outline-none"
            >
              <option value="XEL">XEL</option>
              <option value="xUSD">xUSD</option>
              <option value="VLT">VLT</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Swap button */}
        <button
          onClick={execute}
          disabled={num <= 0 || num > balance(from) || loading}
          className="w-full h-12 rounded-xl bg-vault text-white font-semibold text-sm hover:bg-vault/85 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {num <= 0 ? 'Enter amount' : num > balance(from) ? 'Insufficient balance' : `Swap ${from} → ${to}`}
        </button>

        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> MEV-protected</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> 5s finality</span>
        </div>
      </Card>

      <AnimatePresence>
        {toast && <SuccessToast message={toast} onClose={() => setToast('')} />}
      </AnimatePresence>
    </div>
  )
}
