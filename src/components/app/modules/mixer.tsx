'use client'

import { useCallback, useEffect, useState } from 'react'
import { EyeOff, Wind } from 'lucide-react'
import { useWallet, canSign } from '@/lib/wallet-store'
import { invoke, GAS } from '@/lib/xelis/invoke'
import { toAtomic, valAddr, valHash, valU64, formatAmount } from '@/lib/xelis/types'
import { XUSD_ASSET, VLT_ASSET } from '@/lib/xelis/contracts'
import { resolveContract } from '@/lib/xelis/contracts'
import { readKey } from '@/lib/xelis/reads'
import { rpcCall } from '@/lib/xelis/rpc'
import { StatCard, Panel, AmountInput, ActionButton, TxStatusBanner, ConnectPrompt, ViewOnlyNotice, CliFallback, type TxFeedback } from '../shared'
import { TokenIcon } from '../token-icon'

export function Mixer() {
  const { address, connectionType, xusdBalance, vltBalance } = useWallet()
  const [thresholds, setThresholds] = useState<{ pools: number; maxThreshold: bigint | null }>({ pools: 0, maxThreshold: null })
  const [asset, setAsset] = useState<'xUSD' | 'VLT'>('xUSD')
  const [amount, setAmount] = useState('')
  const [tx, setTx] = useState<TxFeedback>({ state: 'idle' })
  const [busy, setBusy] = useState(false)
  const canTx = canSign()

  const refresh = useCallback(async () => {
    try {
      const mixer = await resolveContract('PrivacyMixer')
      // Keys: pc = pool count, pmt = max anonymity threshold requested by any depositor
      const [pc, pmt] = await Promise.all([
        readKey(mixer, 'pc', 30000).catch(() => null),
        readKey(mixer, 'pmt', 30000).catch(() => null),
      ])
      setThresholds({ pools: Number(pc ?? 0), maxThreshold: (pmt ?? null) as bigint | null })
    } catch { /* defaults */ }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const assetHash = asset === 'xUSD' ? XUSD_ASSET : VLT_ASSET
  const assetBalance = asset === 'xUSD' ? xusdBalance : vltBalance

  const deposit = async () => {
    if (!address) return
    setBusy(true)
    setTx({ state: 'broadcast', message: 'Waiting for wallet approval…' })
    try {
      const res = await invoke('PrivacyMixer', 'deposit', {
        params: [valAddr(address), valHash(assetHash), valU64(0)],
        deposits: { [assetHash]: { amount: toAtomic(amount || '0') } },
        maxGas: GAS.VERY_HEAVY,
      })
      setTx(res.ok
        ? { state: 'success', message: `Deposited ${amount} ${asset}. Funds will auto-mix when the anonymity threshold is reached.`, hash: res.hash }
        : { state: 'error', message: res.error ?? 'Deposit failed' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Anonymity model" value="Threshold" sub="per-user, not fixed denominations" icon={<EyeOff className="w-4 h-4" />} />
        <StatCard label="Mix pools" value={thresholds.pools || '–'} sub="on-chain pool count" accent="emerald" />
        <StatCard label="Max threshold" value={thresholds.maxThreshold ? formatAmount(thresholds.maxThreshold) : '–'} sub="largest anonymity set requested" accent="amber" />
        <StatCard label="Admin fee" value="0.1%" sub="on withdrawal" accent="amber" />
      </div>

      <Panel
        title="Privacy Mixer"
        desc="Unlike fixed-denomination mixers, XELIS Vault's mixer builds per-user anonymity thresholds. Deposits auto-mix when the pool crosses its threshold — no manual denomination picking, no fixed-amount side channels."
        actions={<span className="text-vault font-mono text-xs">rewritten in v11.5</span>}
      >
        {!address ? (
          <ConnectPrompt />
        ) : (
          <>
            {connectionType === 'view-only' && <div className="mb-4"><ViewOnlyNotice what="your mixer deposits" /></div>}

            {/* Asset selector */}
            <div className="flex gap-2 mb-4">
              {(['xUSD', 'VLT'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAsset(a)}
                  className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                    asset === a ? 'border-vault/40 bg-vault/10' : 'border-border bg-card/40 hover:bg-card/60'
                  }`}
                >
                  <TokenIcon symbol={a} size="xs" />
                  {a}
                </button>
              ))}
            </div>

            <AmountInput value={amount} onChange={setAmount} symbol={asset} max={assetBalance} />

            {Number(amount) > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground font-mono">
                {amount} {asset} → mixed pool · auto-mix triggers at the pool anonymity threshold
              </p>
            )}

            <div className="mt-4 flex items-center gap-3">
              <ActionButton onClick={deposit} disabled={!canTx || Number(amount) <= 0} loading={busy}>
                <Wind className="w-4 h-4" />
                Deposit into mixer
              </ActionButton>
              {!canTx && <span className="text-[11px] text-muted-foreground">Requires XSWD</span>}
            </div>

            <div className="mt-4"><TxStatusBanner tx={tx} /></div>
          </>
        )}

        <div className="mt-4">
          <CliFallback
            title="CLI alternative — mixer"
            commands={[{ label: 'cli', cmd: 'xvault          # menu: Mixer → private transfer' }]}
            note="The CLI supports full deposit → mix → withdraw cycles, including refunds for stuck deposits."
          />
        </div>
      </Panel>

      <Panel title="How thresholds beat denominations" desc="Why the v11.5 rewrite changed the model.">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <div className="text-xs font-semibold mb-2 text-muted-foreground">Old model — fixed denominations</div>
            <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
              <li>· Only 10 / 100 / 1000 unit amounts accepted</li>
              <li>· Amount patterns still link deposit to withdrawal</li>
              <li>· Small pools per denomination = weak anonymity</li>
            </ul>
          </div>
          <div className="rounded-xl border border-vault/25 bg-vault/5 p-4">
            <div className="text-xs font-semibold mb-2 text-vault">New model — per-user thresholds</div>
            <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
              <li>· Any amount, any asset — pool grows unified</li>
              <li>· Auto-mix when the pool crosses your threshold</li>
              <li>· Withdrawal timing unlinkable to deposit timing</li>
            </ul>
          </div>
        </div>
      </Panel>
    </div>
  )
}
