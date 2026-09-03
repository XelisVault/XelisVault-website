'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet, canSign } from '@/lib/wallet-store'
import { getPools, getSwapConfig, quoteAmountOut, type AmmPool } from '@/lib/xelis/reads'
import { invoke, GAS } from '@/lib/xelis/invoke'
import { toAtomic, fromAtomic, formatAmount, valHash, valU64 } from '@/lib/xelis/types'
import { XEL_ASSET, XUSD_ASSET, VLT_ASSET } from '@/lib/xelis/contracts'
import { StatCard, Panel, AmountInput, ActionButton, TxStatusBanner, ActionCliFallback, ConnectPrompt, Badge, LoadingRows, type TxFeedback } from '../shared'
import { TokenIcon } from '../token-icon'

const ASSET_INFO: Record<string, { ticker: string }> = {
  [XEL_ASSET]: { ticker: 'XEL' },
  [XUSD_ASSET]: { ticker: 'xUSD' },
  [VLT_ASSET]: { ticker: 'VLT' },
}

function tickerFor(hash: string): string {
  return ASSET_INFO[hash]?.ticker ?? `${hash.slice(0, 6)}…`
}

export function VaultSwap() {
  const { address, xelBalance, xusdBalance, vltBalance } = useWallet()
  const [pools, setPools] = useState<AmmPool[] | null>(null)
  const [config, setConfig] = useState<{ baseFeeBps: number; poolsCount: number } | null>(null)
  const [tx, setTx] = useState<TxFeedback>({ state: 'idle' })
  const [busy, setBusy] = useState(false)
  const [amount, setAmount] = useState('')
  const [selectedPool, setSelectedPool] = useState<AmmPool | null>(null)
  const [direction, setDirection] = useState<'ab' | 'ba'>('ab')
  const canTx = canSign()

  const refresh = useCallback(async () => {
    const [ps, cfg] = await Promise.all([getPools().catch(() => null), getSwapConfig().catch(() => null)])
    setPools(ps)
    setConfig(cfg)
    if (ps && ps.length > 0) {
      setSelectedPool((prev) => prev && ps.find((p) => p.key === prev.key) ? ps.find((p) => p.key === prev.key)! : ps[0])
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 20000)
    return () => clearInterval(id)
  }, [refresh])

  const balances: Record<string, number> = { XEL: xelBalance, xUSD: xusdBalance, VLT: vltBalance }

  const inAsset = selectedPool ? (direction === 'ab' ? selectedPool.assetA : selectedPool.assetB) : ''
  const outAsset = selectedPool ? (direction === 'ab' ? selectedPool.assetB : selectedPool.assetA) : ''
  const reserveIn = selectedPool ? (direction === 'ab' ? selectedPool.reserveA : selectedPool.reserveB) : 0n
  const reserveOut = selectedPool ? (direction === 'ab' ? selectedPool.reserveB : selectedPool.reserveA) : 0n

  const amountAtomic = toAtomic(amount || '0')
  const quote = useMemo(
    () => quoteAmountOut(amountAtomic, reserveIn, reserveOut),
    [amountAtomic, reserveIn, reserveOut]
  )
  const fee = (config?.baseFeeBps ?? 30) / 10000
  const quoteAfterFee = (quote * BigInt(10000 - (config?.baseFeeBps ?? 30))) / 10000n
  const minOut = (quoteAfterFee * 95n) / 100n

  const balanceFor = (asset: string) => balances[tickerFor(asset)] ?? 0

  const submit = async () => {
    if (!selectedPool) return
    setBusy(true)
    setTx({ state: 'broadcast', message: 'Waiting for wallet approval…' })
    try {
      const res = await invoke('VaultSwapV2', 'swap', {
        params: [valHash(inAsset), valHash(outAsset), valU64(amountAtomic), valU64(minOut)],
        deposits: { [inAsset]: { amount: amountAtomic } },
        maxGas: 25_000_000,
      })
      setTx(res.ok
        ? { state: 'success', message: `Swapped ${amount} ${tickerFor(inAsset)} for ${fromAtomic(quoteAfterFee).toFixed(4)} ${tickerFor(outAsset)}.`, hash: res.hash }
        : { state: 'error', message: res.error ?? 'Swap failed' })
    } finally {
      setBusy(false)
      setTimeout(refresh, 3000)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Pools" value={config?.poolsCount ?? '–'} loading={!pools} />
        <StatCard label="Swap fee" value={`${fee * 100}%`} sub="+ 0.05% treasury" accent="amber" />
        <StatCard label="Circuit breaker" value="20% vol" sub="vs TWAP, 10 min" />
        <StatCard label="Max swap size" value="5%" sub="of pool reserves" />
      </div>

      {/* Pools */}
      <Panel title="Liquidity pools" desc="Constant-product pools with a TWAP-based volatility circuit breaker.">
        {!pools ? (
          <LoadingRows rows={2} />
        ) : pools.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No pools created yet.</p>
        ) : (
          <div className="space-y-2">
            {pools.map((p) => {
              const active = selectedPool?.key === p.key
              return (
                <button
                  key={p.key}
                  onClick={() => setSelectedPool(p)}
                  className={`w-full flex items-center justify-between gap-3 rounded-none border px-4 py-3 text-left transition-all${
                    active ? 'border-vault/40 bg-vault/10' : 'border-border bg-background/40 hover:bg-card/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TokenIcon symbol={tickerFor(p.assetA) as any} size="xs" />
                    <span className="text-sm font-semibold">{tickerFor(p.assetA)}</span>
                    <span className="text-muted-foreground text-xs">/</span>
                    <TokenIcon symbol={tickerFor(p.assetB) as any} size="xs" />
                    <span className="text-sm font-semibold">{tickerFor(p.assetB)}</span>
                    {p.isPsm && <Badge tone="xusd">psm</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span>{formatAmount(p.reserveA, 2)} {tickerFor(p.assetA)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{formatAmount(p.reserveB, 2)} {tickerFor(p.assetB)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Panel>

      {/* Swap */}
      <Panel title="Swap" desc="Confidential swap: amounts are encrypted on-chain, MEV cannot front-run what it cannot see.">
        {!address ? (
          <ConnectPrompt />
        ) : !selectedPool ? (
          <p className="text-xs text-muted-foreground">Select a pool above.</p>
        ) : (
          <>
            {/* Direction selector */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className={`flex items-center gap-1.5 rounded-none border px-3.5 py-2${direction === 'ab' ? 'border-vault/40 bg-vault/10' : 'border-border bg-card/40'}`}>
                <TokenIcon symbol={tickerFor(inAsset) as any} size="xs" />
                <span className="text-sm font-semibold">{tickerFor(inAsset)}</span>
              </div>
              <button
                onClick={() => setDirection(direction === 'ab' ? 'ba' : 'ab')}
                className="w-9 h-9 rounded-none border border-border bg-card/60 flex items-center justify-center hover:border-vault/40 hover:text-vault transition-all"
                aria-label="Flip direction"
              >
                <span className="font-mono text-base leading-none">⇄</span>
              </button>
              <div className="flex items-center gap-1.5 rounded-none border border-border bg-card/40 px-3.5 py-2">
                <TokenIcon symbol={tickerFor(outAsset) as any} size="xs" />
                <span className="text-sm font-semibold">{tickerFor(outAsset)}</span>
              </div>
            </div>

            <AmountInput value={amount} onChange={setAmount} symbol={tickerFor(inAsset)} max={balanceFor(inAsset)} />

            {Number(amount) > 0 && (
              <div className="mt-3 rounded-none border border-border bg-background/40 p-3.5 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Quote (after {(fee * 100).toFixed(2)}% fee)</span>
                  <span className="font-mono">{fromAtomic(quoteAfterFee).toFixed(6)} {tickerFor(outAsset)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Pool after swap</span>
                  <span className="font-mono text-[11px]">{formatAmount(reserveIn + amountAtomic, 2)} {tickerFor(inAsset)} · {formatAmount(reserveOut - quoteAfterFee, 2)} {tickerFor(outAsset)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Min out (5% slippage guard)</span>
                  <span className="font-mono">{fromAtomic(minOut).toFixed(6)} {tickerFor(outAsset)}</span>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <ActionButton onClick={submit} disabled={!canTx || Number(amount) <= 0} loading={busy}>
                Swap {tickerFor(inAsset)} for {tickerFor(outAsset)}
              </ActionButton>
              {!canTx && <span className="text-[11px] text-muted-foreground">Requires XSWD</span>}
            </div>

            <div className="mt-4"><TxStatusBanner tx={tx} /></div>
          </>
        )}

        <div className="mt-4">
          <ActionCliFallback action="swap" />
        </div>
      </Panel>

      <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
        VaultSwap V2 routes large stable conversions through its embedded PSM automatically, keeps a 30-entry
        TWAP window per pool, and pauses a pair for 10 minutes when instantaneous volatility exceeds 20% of the
        TWAP, the circuit breaker that makes price manipulation unprofitable.
      </p>
    </div>
  )
}
