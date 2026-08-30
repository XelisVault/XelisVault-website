'use client'

import { useCallback, useEffect, useState } from 'react'
import { PiggyBank, Sparkles, TrendingUp } from 'lucide-react'
import { useWallet, canSign } from '@/lib/wallet-store'
import { getSavingsInfo } from '@/lib/xelis/reads'
import { invoke, depositXusd, GAS } from '@/lib/xelis/invoke'
import { toAtomic, formatAmount, valU64 } from '@/lib/xelis/types'
import { StatCard, Panel, AmountInput, ActionButton, TxStatusBanner, ActionCliFallback, CliFallback, ConnectPrompt, type TxFeedback } from '../shared'
import { TokenIcon } from '../token-icon'

export function Savings() {
  const { address, xusdBalance } = useWallet()
  const [info, setInfo] = useState<{ totalDeposits: bigint; apyBps: number; xusdReserve: bigint } | null>(null)
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const [tx, setTx] = useState<TxFeedback>({ state: 'idle' })
  const [busy, setBusy] = useState(false)
  const canTx = canSign()

  const refresh = useCallback(async () => {
    setInfo(await getSavingsInfo().catch(() => null))
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 20000)
    return () => clearInterval(id)
  }, [refresh])

  const apy = (info?.apyBps ?? 500) / 100
  const amountNum = Number(amount) || 0
  const yearlyInterest = amountNum * apy / 100

  const submit = async () => {
    setBusy(true)
    setTx({ state: 'broadcast', message: 'Waiting for wallet approval…' })
    try {
      const res = tab === 'deposit'
        ? await invoke('SavingsRate', 'deposit', {
            params: [valU64(toAtomic(amount || '0'))],
            deposits: depositXusd(toAtomic(amount || '0')),
            maxGas: GAS.HEAVY,
          })
        : await invoke('SavingsRate', 'withdraw', {
            params: [valU64(toAtomic(amount || '0'))],
            maxGas: GAS.HEAVY,
          })
      setTx(res.ok
        ? { state: 'success', message: `${tab === 'deposit' ? 'Deposited' : 'Withdrew'} ${amount} xUSD.`, hash: res.hash }
        : { state: 'error', message: res.error ?? 'Transaction failed' })
    } finally {
      setBusy(false)
      setTimeout(refresh, 3000)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="APY" value={`${apy}%`} accent="xusd" icon={<TrendingUp className="w-4 h-4" />} loading={!info} />
        <StatCard label="Total deposits" value={`${formatAmount(info?.totalDeposits)} xUSD`} accent="xusd" icon={<PiggyBank className="w-4 h-4" />} />
        <StatCard label="Contract reserve" value={`${formatAmount(info?.xusdReserve)} xUSD`} accent="xusd" icon={<TokenIcon symbol="xUSD" size="xs" />} />
        <StatCard label="Your xUSD" value={formatAmount(toAtomic(xusdBalance))} accent="xusd" sub="wallet balance" />
      </div>

      <Panel
        title="Savings Rate"
        desc={`Deposit xUSD and earn ${apy}% APY, accrued per block and claimable at any time. The rate is adjustable by governance.`}
        actions={<span className="text-vlt font-mono text-xs">2% stability-fee funded</span>}
      >
        {!address ? (
          <ConnectPrompt />
        ) : (
          <>
            <div className="flex gap-1.5 mb-4">
              {(['deposit', 'withdraw'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setTx({ state: 'idle' }) }}
                  className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                    tab === t ? 'bg-xusd/15 text-xusd border border-xusd/30' : 'text-muted-foreground border border-transparent hover:bg-card/60'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <AmountInput value={amount} onChange={setAmount} symbol="xUSD" max={tab === 'deposit' ? xusdBalance : undefined} />

            {amountNum > 0 && (
              <div className="mt-3 rounded-xl border border-border bg-background/40 p-3.5 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Projected interest</span>
                  <span className="font-mono text-xusd">+{yearlyInterest.toFixed(4)} xUSD / year</span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Rate</span>
                  <span className="font-mono">{apy}% APY, compounding per block</span>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <ActionButton onClick={submit} variant="xusd" disabled={!canTx || amountNum <= 0} loading={busy}>
                <Sparkles className="w-4 h-4" />
                {tab === 'deposit' ? 'Deposit xUSD' : 'Withdraw xUSD'}
              </ActionButton>
              {!canTx && <span className="text-[11px] text-muted-foreground">Requires XSWD</span>}
            </div>

            <div className="mt-4"><TxStatusBanner tx={tx} /></div>
          </>
        )}

        <div className="mt-4">
          <CliFallback
            title="CLI alternative — savings"
            commands={[
              { label: 'cli', cmd: 'xvault          # menu: Dashboard → Savings' },
            ]}
            note="The community CLI supports deposit, withdraw and interest claims from its Savings menu."
          />
        </div>
      </Panel>

      <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
        Savings interest is funded by the protocol: VaultEngine stability fees flow into the rate, making xUSD
        deposits productive without any external yield source. Interest accrues every block (5 s) on your
        confidential balance — the contract tracks your entitlement without exposing the amount.
      </p>
    </div>
  )
}

