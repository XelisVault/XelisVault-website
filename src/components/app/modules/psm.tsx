'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRightLeft, Coins, Gauge, Lock, Unlock, Zap } from 'lucide-react'
import { useWallet, canSign } from '@/lib/wallet-store'
import { getPsmInfo, getOracleAggregate, type PsmInfo } from '@/lib/xelis/reads'
import { invoke, depositXel, depositXusd, GAS } from '@/lib/xelis/invoke'
import { toAtomic, formatAmount, valU64 } from '@/lib/xelis/types'
import { StatCard, Panel, AmountInput, ActionButton, TxStatusBanner, ActionCliFallback, ConnectPrompt, Badge, type TxFeedback } from '../shared'
import { TokenIcon } from '../token-icon'

export function PSM() {
  const { address, xelBalance, xusdBalance } = useWallet()
  const [info, setInfo] = useState<PsmInfo | null>(null)
  const [price, setPrice] = useState(0)
  const [mode, setMode] = useState<'mint' | 'redeem'>('mint')
  const [amount, setAmount] = useState('')
  const [tx, setTx] = useState<TxFeedback>({ state: 'idle' })
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const canTx = canSign()

  const refresh = useCallback(async () => {
    const [i, agg] = await Promise.all([getPsmInfo().catch(() => null), getOracleAggregate(0).catch(() => null)])
    setInfo(i)
    if (agg) setPrice(agg.priceUsd)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 15000)
    return () => clearInterval(id)
  }, [refresh])

  const amountNum = Number(amount) || 0
  const mintFee = (info?.mintFeeBps ?? 50) / 10000
  const redeemFee = (info?.redeemFeeBps ?? 10) / 10000

  // Mint: XEL in → xUSD out at oracle price minus fee
  const xusdOut = amountNum * price * (1 - mintFee)
  // Redeem: xUSD in → XEL out at oracle price minus fee
  const xelOut = price > 0 ? amountNum / price * (1 - redeemFee) : 0
  // slippage guards (CLI uses 5% on mint, 10% on redeem)
  const minOut = mode === 'mint' ? xusdOut * 0.95 : xelOut * 0.90

  const submit = async () => {
    setBusy(true)
    setTx({ state: 'broadcast', message: 'Waiting for wallet approval…' })
    try {
      const res = mode === 'mint'
        ? await invoke('PSM', 'mint', {
            params: [valU64(toAtomic(amount || '0')), valU64(toAtomic(String(minOut.toFixed(8))))],
            deposits: depositXel(toAtomic(amount || '0')),
            maxGas: 15_000_000,
          })
        : await invoke('PSM', 'redeem', {
            params: [valU64(toAtomic(amount || '0')), valU64(toAtomic(String(minOut.toFixed(8))))],
            deposits: depositXusd(toAtomic(amount || '0')),
            maxGas: 15_000_000,
          })
      setTx(res.ok
        ? { state: 'success', message: `${mode === 'mint' ? 'Minted' : 'Redeemed'} successfully.`, hash: res.hash }
        : { state: 'error', message: res.error ?? 'Transaction failed' })
    } finally {
      setBusy(false)
      setTimeout(refresh, 3000)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="XEL reserve" value={formatAmount(info?.xelReserve)} icon={<TokenIcon symbol="XEL" size="xs" />} loading={loading && !info} />
        <StatCard label="xUSD reserve" value={formatAmount(info?.xusdReserve)} accent="xusd" icon={<TokenIcon symbol="xUSD" size="xs" />} />
        <StatCard label="Oracle price" value={`$${price.toFixed(4)}`} sub="XEL/USD median" icon={<Gauge className="w-4 h-4" />} />
        <StatCard label="Status" value={info?.paused ? 'Paused' : 'Live'} accent={info?.paused ? 'amber' : 'emerald'} icon={info?.paused ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />} />
        <StatCard label="Mint fee" value={`${mintFee * 100}%`} accent="amber" />
        <StatCard label="Redeem fee" value={`${redeemFee * 100}%`} accent="amber" />
        <StatCard label="Your XEL" value={formatAmount(toAtomic(xelBalance))} />
        <StatCard label="Your xUSD" value={formatAmount(toAtomic(xusdBalance))} accent="xusd" />
      </div>

      <Panel
        title="Peg Stability Module"
        desc="Convert XEL and xUSD 1:1 with the oracle price, minus a small fee. Deeper than the AMM for stable conversions, no slippage curve, only the fee."
        actions={<Badge tone="vault">oracle-priced</Badge>}
      >
        {/* Mode switch */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => { setMode('mint'); setTx({ state: 'idle' }) }}
            className={`rounded-xl border p-3.5 text-left transition-all ${mode === 'mint' ? 'border-xusd/40 bg-xusd/10' : 'border-border bg-card/40'}`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TokenIcon symbol="XEL" size="xs" />
              <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
              <TokenIcon symbol="xUSD" size="xs" />
              <span className="ml-1">Mint xUSD</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Lock XEL, receive dollars</div>
          </button>
          <button
            onClick={() => { setMode('redeem'); setTx({ state: 'idle' }) }}
            className={`rounded-xl border p-3.5 text-left transition-all ${mode === 'redeem' ? 'border-vault/40 bg-vault/10' : 'border-border bg-card/40'}`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TokenIcon symbol="xUSD" size="xs" />
              <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
              <TokenIcon symbol="XEL" size="xs" />
              <span className="ml-1">Redeem XEL</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Burn xUSD, unlock XEL</div>
          </button>
        </div>

        {!address ? (
          <ConnectPrompt />
        ) : (
          <>
            <AmountInput
              value={amount}
              onChange={setAmount}
              symbol={mode === 'mint' ? 'XEL' : 'xUSD'}
              max={mode === 'mint' ? xelBalance : xusdBalance}
            />

            {/* Quote */}
            {amountNum > 0 && (
              <div className="mt-3 rounded-xl border border-border bg-background/40 p-3.5 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="font-mono">{mode === 'mint' ? `1 XEL = $${(price * (1 - mintFee)).toFixed(4)}` : `1 xUSD = ${(1 / price * (1 - redeemFee)).toFixed(6)} XEL`}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Fee ({(mode === 'mint' ? mintFee : redeemFee) * 100}%)</span>
                  <span className="font-mono">{mode === 'mint' ? `$${(amountNum * price * mintFee).toFixed(4)}` : `${(amountNum / price * redeemFee).toFixed(4)} XEL`}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold pt-1.5 border-t border-border/60">
                  <span>You receive</span>
                  <span className="font-mono text-xusd flex items-center gap-1.5">
                    {mode === 'mint' ? <><TokenIcon symbol="xUSD" size="xs" />{xusdOut.toFixed(4)}</> : <><TokenIcon symbol="XEL" size="xs" />{xelOut.toFixed(4)}</>}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Min out (slippage guard)</span>
                  <span className="font-mono">{minOut.toFixed(4)} {mode === 'mint' ? 'xUSD' : 'XEL'}</span>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <ActionButton onClick={submit} variant="xusd" disabled={!canTx || amountNum <= 0} loading={busy}>
                <Zap className="w-4 h-4" />
                {mode === 'mint' ? 'Mint xUSD' : 'Redeem for XEL'}
              </ActionButton>
              {!canTx && <span className="text-[11px] text-muted-foreground">Requires an XSWD wallet connection</span>}
            </div>

            <div className="mt-4"><TxStatusBanner tx={tx} /></div>
          </>
        )}

        <div className="mt-4">
          <ActionCliFallback action="swap" />
        </div>
      </Panel>

      <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
        How it works: the PSM holds an XEL reserve backing outstanding xUSD. Minting deposits XEL and mints
        new xUSD at the StakedOracle median; redemption burns xUSD and releases XEL. Daily caps protect the
        reserve from drain during price dislocations, and the whole flow is confidential, amounts are hidden
        from everyone except you.
      </p>
    </div>
  )
}
