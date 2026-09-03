'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Banknote, Lock, Percent, ShieldCheck, Undo2 } from 'lucide-react'
import { useWallet } from '@/lib/wallet-store'
import {
  getVaultEngineConfig, getVaultsForOwner, getRecentVaults,
  type VaultEngineConfig, type VaultRecord,
} from '@/lib/xelis/reads'
import { getOracleAggregate } from '@/lib/xelis/reads'
import { invoke, depositXel, depositXusd, GAS } from '@/lib/xelis/invoke'
import { valU64, valHash, toAtomic, fromAtomic, formatAmount } from '@/lib/xelis/types'
import { XEL_ASSET, XUSD_ASSET } from '@/lib/xelis/contracts'
import { canSign } from '@/lib/wallet-store'
import {
  StatCard, Panel, AmountInput, ActionButton, TxStatusBanner, ActionCliFallback,
  ConnectPrompt, LoadingRows, Badge, HashLink, type TxFeedback,
} from '../shared'
import { TokenIcon } from '../token-icon'

function randomSalt(): string {
  const t = Date.now() & 0xffffffff
  return t.toString(16).padStart(64, '0')
}

export function VaultEngine() {
  const { address, xelBalance, xusdBalance, xelPrice } = useWallet()
  const [config, setConfig] = useState<VaultEngineConfig | null>(null)
  const [myVaults, setMyVaults] = useState<VaultRecord[] | null>(null)
  const [recent, setRecent] = useState<VaultRecord[]>([])
  const [price, setPrice] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const [tab, setTab] = useState<'deposit' | 'borrow' | 'repay' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const [vaultId, setVaultId] = useState<string>('')
  const [tx, setTx] = useState<TxFeedback>({ state: 'idle' })
  const [busy, setBusy] = useState(false)

  const canTx = canSign()

  const refresh = useCallback(async () => {
    try {
      const [cfg, agg] = await Promise.all([
        getVaultEngineConfig(),
        getOracleAggregate(0),
      ])
      setConfig(cfg)
      if (agg) setPrice(agg.priceUsd)
      if (address) {
        const mine = await getVaultsForOwner(address)
        setMyVaults(mine)
        if (mine.length > 0 && !vaultId) setVaultId(String(mine[mine.length - 1].id))
      } else {
        setMyVaults([])
      }
      const rec = await getRecentVaults(5)
      setRecent(rec)
      setLoading(false)
    } catch {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 20000)
    return () => clearInterval(id)
  }, [refresh])

  const runTx = async (fn: () => Promise<void>) => {
    setBusy(true)
    setTx({ state: 'broadcast', message: 'Waiting for wallet approval…' })
    try {
      await fn()
    } finally {
      setBusy(false)
      setTimeout(refresh, 3000)
    }
  }

  const doDeposit = () => runTx(async () => {
    const res = await invoke('VaultEngineV3', 'deposit', {
      params: [valHash(XEL_ASSET), valU64(toAtomic(amount || '0')), valHash(randomSalt())],
      deposits: depositXel(toAtomic(amount || '0')),
      maxGas: GAS.VERY_HEAVY,
    })
    setTx(res.ok
      ? { state: 'success', message: `Deposited ${amount} XEL as collateral.`, hash: res.hash }
      : { state: 'error', message: res.error ?? 'Deposit failed' })
  })

  const doBorrow = () => runTx(async () => {
    const res = await invoke('VaultEngineV3', 'borrow', {
      params: [valU64(vaultId || '0'), valU64(toAtomic(amount || '0'))],
      maxGas: GAS.VERY_HEAVY,
    })
    setTx(res.ok
      ? { state: 'success', message: `Borrowed ${amount} xUSD against vault #${vaultId}.`, hash: res.hash }
      : { state: 'error', message: res.error ?? 'Borrow failed' })
  })

  const doRepay = () => runTx(async () => {
    const res = await invoke('VaultEngineV3', 'repay', {
      params: [valU64(vaultId || '0'), valU64(toAtomic(amount || '0'))],
      deposits: depositXusd(toAtomic(amount || '0')),
      maxGas: GAS.VERY_HEAVY,
    })
    setTx(res.ok
      ? { state: 'success', message: `Repaid ${amount} xUSD on vault #${vaultId}.`, hash: res.hash }
      : { state: 'error', message: res.error ?? 'Repay failed' })
  })

  const doWithdraw = () => runTx(async () => {
    const res = await invoke('VaultEngineV3', 'withdraw', {
      params: [valU64(vaultId || '0'), valU64(toAtomic(amount || '0'))],
      maxGas: GAS.VERY_HEAVY,
    })
    setTx(res.ok
      ? { state: 'success', message: `Withdrew ${amount} XEL from vault #${vaultId}.`, hash: res.hash }
      : { state: 'error', message: res.error ?? 'Withdraw failed' })
  })

  const selectedVault = myVaults?.find((v) => String(v.id) === vaultId)
  const minCrPct = (config?.minCrBps ?? 20000) / 100
  const maxLtv = 100 / minCrPct

  // Preview computations
  const amountNum = Number(amount) || 0
  let preview = ''
  if (tab === 'deposit') {
    preview = `${amountNum} XEL = $${(amountNum * price).toFixed(2)} collateral → borrow up to $${(amountNum * price * maxLtv).toFixed(2)} xUSD`
  } else if (tab === 'borrow' && selectedVault) {
    const newValue = (selectedVault.collateralHuman + 0) * price
    const newDebt = selectedVault.borrowHuman + amountNum
    const newCr = newDebt > 0 ? (newValue / newDebt) * 100 : Infinity
    preview = `New ratio: ${newCr === Infinity ? '∞' : newCr.toFixed(0)}% ${newCr < minCrPct ? 'below minimum!' : '(min ' + minCrPct + '%)'}`
  } else if (tab === 'repay' && selectedVault) {
    const remaining = Math.max(0, selectedVault.borrowHuman - amountNum)
    preview = `Remaining debt: ${remaining.toFixed(2)} xUSD`
  } else if (tab === 'withdraw' && selectedVault) {
    const remainingColl = Math.max(0, selectedVault.collateralHuman - amountNum)
    const debt = selectedVault.borrowHuman
    const cr = debt > 0 ? (remainingColl * price / debt) * 100 : Infinity
    preview = `Ratio after withdraw: ${cr === Infinity ? '∞' : cr.toFixed(0)}% ${debt > 0 && cr < minCrPct ? 'would be liquidatable!' : ''}`
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Config stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Min collateral ratio" value={`${minCrPct}%`} icon={<ShieldCheck className="w-4 h-4" />} loading={loading && !config} />
        <StatCard label="Max LTV" value={`${(maxLtv * 100).toFixed(0)}%`} icon={<Percent className="w-4 h-4" />} />
        <StatCard label="Stability fee" value={`${((config?.stabilityFeeBps ?? 200) / 100).toFixed(0)}% APR`} accent="amber" icon={<Banknote className="w-4 h-4" />} />
        <StatCard label="Liquidation penalty" value={`${((config?.liqPenaltyBps ?? 1000) / 100).toFixed(0)}%`} accent="amber" icon={<AlertTriangle className="w-4 h-4" />} />
        <StatCard label="Total vaults" value={config?.vaultCount ?? '–'} icon={<Lock className="w-4 h-4" />} />
        <StatCard label="XEL / USD" value={`$${price.toFixed(4)}`} accent="xusd" sub="oracle aggregate" />
        <StatCard label="Your XEL" value={formatAmount(toAtomic(xelBalance))} sub="wallet balance" />
        <StatCard label="Your xUSD" value={formatAmount(toAtomic(xusdBalance))} accent="xusd" sub="wallet balance" />
      </div>

      {/* My vaults */}
      <Panel
        title="Your vaults"
        desc="CDPs owned by your address. Ratio is computed live against the oracle price."
        actions={myVaults && myVaults.length > 0 ? <Badge tone="vault">{myVaults.length} open</Badge> : undefined}
      >
        {!address ? (
          <ConnectPrompt note="Connect your wallet to see your vaults and open new ones." />
        ) : myVaults === null ? (
          <LoadingRows rows={2} />
        ) : myVaults.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <Lock className="w-6 h-6 text-vault/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No open vaults yet. Deposit XEL below to create your first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myVaults.map((v) => {
              const cr = v.collateralRatioPct
              const healthy = cr == null || cr >= minCrPct * 1.25
              const risky = cr != null && cr < minCrPct * 1.25
              return (
                <div key={v.id} className={`rounded-xl border p-4 ${risky ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-background/40'}`}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">#{v.id}</span>
                      <Badge tone={healthy ? 'emerald' : 'amber'}>
                        {cr == null ? 'no debt' : cr === Infinity ? '∞ ratio' : `${cr.toFixed(0)}% ratio`}
                      </Badge>
                    </div>
                    <HashLink hash={v.owner} type="account" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Collateral</div>
                      <div className="font-mono text-sm font-semibold flex items-center gap-1.5 mt-0.5">
                        <TokenIcon symbol="XEL" size="xs" />
                        {v.collateralHuman.toFixed(2)} <span className="text-muted-foreground text-[11px]">(${(v.collateralHuman * price).toFixed(2)})</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Debt</div>
                      <div className="font-mono text-sm font-semibold flex items-center gap-1.5 mt-0.5">
                        <TokenIcon symbol="xUSD" size="xs" />
                        {v.borrowHuman.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      {/* Actions */}
      <Panel title="Manage vault" desc="Each action is a real transaction, approve it in your wallet.">
        {/* Tabs */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {([
            ['deposit', 'Deposit XEL', ArrowDownToLine],
            ['borrow', 'Borrow xUSD', Banknote],
            ['repay', 'Repay', Undo2],
            ['withdraw', 'Withdraw', ArrowUpFromLine],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setTx({ state: 'idle' }) }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                tab === id ? 'bg-vault/15 text-vault border border-vault/30' : 'text-muted-foreground border border-transparent hover:bg-card/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {(tab === 'borrow' || tab === 'repay' || tab === 'withdraw') && (
          <div className="mb-3">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Vault ID</label>
            <input
              value={vaultId}
              onChange={(e) => setVaultId(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              className="mt-1 w-full rounded-xl border border-border bg-background/60 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-vault/50"
            />
            {selectedVault && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Vault #{selectedVault.id}: {selectedVault.collateralHuman.toFixed(2)} XEL · {selectedVault.borrowHuman.toFixed(2)} xUSD debt
              </p>
            )}
          </div>
        )}

        <AmountInput
          value={amount}
          onChange={setAmount}
          symbol={tab === 'deposit' || tab === 'withdraw' ? 'XEL' : 'xUSD'}
          max={tab === 'deposit' ? xelBalance : tab === 'repay' ? Math.min(xusdBalance, selectedVault?.borrowHuman ?? 0) : tab === 'withdraw' ? selectedVault?.collateralHuman : undefined}
        />

        {preview && (
          <p className="mt-2 text-[11px] font-mono text-muted-foreground">{preview}</p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <ActionButton
            onClick={tab === 'deposit' ? doDeposit : tab === 'borrow' ? doBorrow : tab === 'repay' ? doRepay : doWithdraw}
            disabled={!canTx || !amount || Number(amount) <= 0 || ((tab === 'borrow' || tab === 'repay' || tab === 'withdraw') && !vaultId)}
            loading={busy}
          >
            {tab === 'deposit' && <>Deposit collateral</>}
            {tab === 'borrow' && <>Borrow xUSD</>}
            {tab === 'repay' && <>Repay xUSD</>}
            {tab === 'withdraw' && <>Withdraw XEL</>}
          </ActionButton>
          {!canTx && <span className="text-[11px] text-muted-foreground">Requires an XSWD wallet connection</span>}
        </div>

        <div className="mt-4">
          <TxStatusBanner tx={tx} />
        </div>

        <div className="mt-4">
          <ActionCliFallback action="vault" />
        </div>
      </Panel>

      {/* Recent vaults */}
      <Panel title="Recent vaults" desc="The latest CDPs opened on the testnet.">
        {loading ? (
          <LoadingRows rows={3} />
        ) : recent.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No vaults yet, be the first.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/30 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-xs text-muted-foreground shrink-0">#{v.id}</span>
                  <HashLink hash={v.owner} type="account" />
                </div>
                <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                  <span className="flex items-center gap-1"><TokenIcon symbol="XEL" size="xs" />{v.collateralHuman.toFixed(1)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="flex items-center gap-1"><TokenIcon symbol="xUSD" size="xs" />{v.borrowHuman.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-[11px] text-muted-foreground/70 leading-relaxed max-w-2xl">
        Vault rules: minimum collateral ratio {minCrPct}% enforced on every borrow and withdraw ·
        stability fee {((config?.stabilityFeeBps ?? 200) / 100).toFixed(0)}% APR accrues on debt ·
        undercollateralized vaults can be liquidated with a {((config?.liqPenaltyBps ?? 1000) / 100).toFixed(0)}% penalty ·
        confidential vault variants (deposit_confidential) hide amounts entirely.
      </p>
    </div>
  )
}
