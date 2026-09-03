'use client'

import { useCallback, useEffect, useState } from 'react'
import { Lock, Vote, Zap } from 'lucide-react'
import { useWallet, canSign } from '@/lib/wallet-store'
import { getGovernanceStats, getProposalCount } from '@/lib/xelis/reads'
import { invoke, depositVlt, GAS } from '@/lib/xelis/invoke'
import { toAtomic, formatAmount, valU64 } from '@/lib/xelis/types'
import { StatCard, Panel, AmountInput, ActionButton, TxStatusBanner, ActionCliFallback, ConnectPrompt, Badge, DataRow, type TxFeedback } from '../shared'
import { TokenIcon } from '../token-icon'

const BOOST_TIERS = [
  { days: 7, mult: 1.19 },
  { days: 90, mult: 1.5 },
  { days: 365, mult: 2.0 },
]

export function Governance() {
  const { address, vltBalance } = useWallet()
  const [stats, setStats] = useState<{ totalStaked: bigint; stakesCount: number } | null>(null)
  const [proposals, setProposals] = useState(0)
  const [amount, setAmount] = useState('')
  const [lockDays, setLockDays] = useState('90')
  const [tx, setTx] = useState<TxFeedback>({ state: 'idle' })
  const [busy, setBusy] = useState(false)
  const canTx = canSign()

  const refresh = useCallback(async () => {
    const [g, p] = await Promise.all([
      getGovernanceStats().catch(() => null),
      getProposalCount().catch(() => 0),
    ])
    setStats(g)
    setProposals(p ?? 0)
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 25000)
    return () => clearInterval(id)
  }, [refresh])

  const stake = async () => {
    setBusy(true)
    setTx({ state: 'broadcast', message: 'Waiting for wallet approval…' })
    try {
      const res = await invoke('GovernanceVault', 'stake', {
        params: [valU64(toAtomic(amount || '0')), valU64(lockDays || '0')],
        deposits: depositVlt(toAtomic(amount || '0')),
        maxGas: GAS.VERY_HEAVY,
      })
      setTx(res.ok
        ? { state: 'success', message: `Staked ${amount} VLT for ${lockDays} days.`, hash: res.hash }
        : { state: 'error', message: res.error ?? 'Stake failed' })
    } finally {
      setBusy(false)
      setTimeout(refresh, 3000)
    }
  }

  const boost = BOOST_TIERS.reduce((best, t) => (Number(lockDays) >= t.days ? t : best), { days: 0, mult: 1 })

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="VLT staked" value={`${formatAmount(stats?.totalStaked)} VLT`} accent="vlt" icon={<TokenIcon symbol="VLT" size="xs" />} loading={!stats} />
        <StatCard label="Stakers" value={stats?.stakesCount ?? '–'} sub="individual stakes" />
        <StatCard label="Proposals" value={proposals} sub="all time" icon={<Vote className="w-4 h-4" />} />
        <StatCard label="Quorum" value="10%" sub="of voting power" />
      </div>

      <Panel
        title="Stake VLT for governance"
        desc="Staking mints voting power with a time boost: lock longer, weigh more. Vote on treasury spending, parameters and upgrades."
        actions={<Badge tone="vlt">{boost.mult}× boost</Badge>}
      >
        {!address ? (
          <ConnectPrompt />
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Amount (VLT)</label>
                <div className="mt-1"><AmountInput value={amount} onChange={setAmount} symbol="VLT" max={vltBalance} /></div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Lock duration (days)</label>
                <input
                  type="number" min="7" max="730" value={lockDays}
                  onChange={(e) => setLockDays(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background/60 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-vault/50"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {BOOST_TIERS.map((t) => (
                <button
                  key={t.days}
                  onClick={() => setLockDays(String(t.days))}
                  className="rounded-lg border border-border bg-card/40 px-3 py-1.5 text-[11px] font-mono hover:border-vlt/40 hover:text-vlt transition-all"
                >
                  {t.days}d · {t.mult}×
                </button>
              ))}
            </div>

            {Number(amount) > 0 && (
              <div className="mt-3 rounded-xl border border-border bg-background/40 p-3.5 space-y-1">
                <DataRow label="Voting power" value={`${(Number(amount) * boost.mult).toFixed(2)} vp`} accent="text-vlt" />
                <DataRow label="Boost" value={`${boost.mult}× (${boost.days}-day tier)`} />
                <DataRow label="Unstake" value={`after ${lockDays} days (undelegate delay applies)`} />
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <ActionButton onClick={stake} disabled={!canTx || Number(amount) <= 0} loading={busy}>
                <Lock className="w-4 h-4" />
                Stake for governance
              </ActionButton>
              {!canTx && <span className="text-[11px] text-muted-foreground">Requires XSWD</span>}
            </div>

            <div className="mt-4"><TxStatusBanner tx={tx} /></div>
          </>
        )}

        <div className="mt-4">
          <ActionCliFallback action="governance" />
        </div>
      </Panel>

      <Panel title="Governance process" desc="On-chain proposals, fully transparent execution.">
        <ol className="space-y-2.5">
          {[
            'Anyone staking ≥ 25,000 VLT can submit a proposal (target contract, entry, arguments)',
            '7-day voting window, 1 VLT staked = 1 vote, boosted by lock duration',
            '10% quorum and simple majority to pass',
            '2-day queue in the Timelock gives everyone time to react',
            'Execution is permissionless once the delay elapses',
          ].map((s, i) => (
            <li key={i} className="flex gap-3 text-xs text-muted-foreground leading-relaxed">
              <span className="shrink-0 w-5 h-5 rounded-md bg-vlt/15 text-vlt font-mono text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  )
}
