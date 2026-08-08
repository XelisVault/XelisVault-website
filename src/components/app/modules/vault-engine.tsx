'use client'

import { useState } from 'react'
import { useWallet, depositCollateral, borrowXusd, repayXusd, withdrawCollateral } from '@/lib/wallet-store'
import { Card, SuccessToast } from '../ui'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Loader2 } from 'lucide-react'

type Tab = 'deposit' | 'borrow'

export function VaultEngine() {
  const { xelBalance, xusdBalance, xelPrice, refreshBalances } = useWallet()
  const [tab, setTab] = useState<Tab>('deposit')
  const [action, setAction] = useState<'add' | 'withdraw'>('add')
  const [amount, setAmount] = useState('')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const num = parseFloat(amount) || 0

  const execute = async () => {
    if (num <= 0) return
    setLoading(true)
    setError('')
    try {
      if (tab === 'deposit') {
        if (action === 'add') {
          await depositCollateral(num)
          setToast(`Deposited ${num} XEL as collateral`)
        } else {
          await withdrawCollateral(0, num) // vault_id 0 for now
          setToast(`Withdrew ${num} XEL`)
        }
      } else {
        if (action === 'add') {
          await borrowXusd(0, num)
          setToast(`Borrowed ${num} xUSD`)
        } else {
          await repayXusd(0, num)
          setToast(`Repaid ${num} xUSD`)
        }
      }
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
    <div className="max-w-2xl mx-auto space-y-4">
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-vault/10 border border-vault/30 flex items-center justify-center text-vault">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display font-semibold">Vault Engine</div>
            <div className="text-xs text-muted-foreground font-mono">Deposit XEL · Borrow xUSD</div>
          </div>
        </div>

        {/* Real balances */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-lg bg-card/30 border border-border p-3">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">XEL Balance</div>
            <div className="mt-1 font-display text-lg font-semibold text-vault">{xelBalance.toFixed(4)}</div>
          </div>
          <div className="rounded-lg bg-card/30 border border-border p-3">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">xUSD Balance</div>
            <div className="mt-1 font-display text-lg font-semibold text-xusd">{xusdBalance.toFixed(4)}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 rounded-xl bg-card/40 border border-border mb-4">
          <button onClick={() => setTab('deposit')} className={`flex-1 h-10 rounded-lg text-sm font-semibold ${tab === 'deposit' ? 'bg-vault text-white' : 'text-muted-foreground'}`}>Collateral</button>
          <button onClick={() => setTab('borrow')} className={`flex-1 h-10 rounded-lg text-sm font-semibold ${tab === 'borrow' ? 'bg-vault text-white' : 'text-muted-foreground'}`}>Borrow xUSD</button>
        </div>

        {/* Action */}
        <div className="flex gap-2 mb-3">
          <button onClick={() => setAction('add')} className={`flex-1 h-9 rounded-lg text-xs font-semibold ${action === 'add' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'text-muted-foreground border border-border bg-card/30'}`}>
            {tab === 'deposit' ? 'Deposit' : 'Borrow'}
          </button>
          <button onClick={() => setAction('withdraw')} className={`flex-1 h-9 rounded-lg text-xs font-semibold ${action === 'withdraw' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'text-muted-foreground border border-border bg-card/30'}`}>
            {tab === 'deposit' ? 'Withdraw' : 'Repay'}
          </button>
        </div>

        {/* Input */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Amount</span>
            <span className="text-xs font-mono text-muted-foreground">
              Balance: {(tab === 'deposit' ? (action === 'add' ? xelBalance : 0) : (action === 'add' ? 0 : xusdBalance)).toFixed(2)} {tab === 'deposit' ? 'XEL' : 'xUSD'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 h-12 rounded-xl border border-border bg-background/60 px-4 text-lg font-mono focus:outline-none focus:border-vault/40"
            />
            <span className="text-xs font-mono font-bold text-muted-foreground">{tab === 'deposit' ? 'XEL' : 'xUSD'}</span>
          </div>
        </div>

        {error && <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300 mb-3">{error}</div>}

        <button
          onClick={execute}
          disabled={num <= 0 || loading}
          className="w-full h-12 rounded-xl bg-vault text-white font-semibold text-sm hover:bg-vault/85 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {tab === 'deposit' ? (action === 'add' ? `Deposit ${num > 0 ? num : ''} XEL` : `Withdraw ${num > 0 ? num : ''} XEL`) : (action === 'add' ? `Borrow ${num > 0 ? num : ''} xUSD` : `Repay ${num > 0 ? num : ''} xUSD`)}
        </button>
      </Card>

      <Card className="p-5">
        <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Vault Parameters</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Max LTV</span><span className="font-mono">~66% (150% CR)</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Stability fee</span><span className="font-mono">2% APR</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Liquidation penalty</span><span className="font-mono">10%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Oracle</span><span className="font-mono">PriceOracle v2.1</span></div>
        </div>
      </Card>

      <AnimatePresence>
        {toast && <SuccessToast message={toast} onClose={() => setToast('')} />}
      </AnimatePresence>
    </div>
  )
}
