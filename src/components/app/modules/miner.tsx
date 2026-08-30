'use client'

import { useCallback, useEffect, useState } from 'react'
import { Award, Gauge, Pickaxe, Sparkles, TrendingDown, Users, Zap } from 'lucide-react'
import { useWallet } from '@/lib/wallet-store'
import { getMinerStats, getMinerRecord, getDelegationStats, type MinerStats, type MinerRecord } from '@/lib/xelis/reads'
import { formatAmount } from '@/lib/xelis/types'
import { StatCard, Panel, Badge, LoadingRows, DataRow, CliFallback, CliRow } from '../shared'
import { CLI_INSTALL, CLI_COMMANDS } from '@/lib/xelis/cli'
import { TokenIcon } from '../token-icon'

// Bitcoin-style halving table (0.43593 VLT/block, halving every 6,307,200 blocks = 1 year)
const EMISSION_YEARS = [
  { year: 1, perDay: '2,749', total: '2,749,478' },
  { year: 2, perDay: '1,375', total: '1,374,739' },
  { year: 3, perDay: '687', total: '687,370' },
  { year: 4, perDay: '344', total: '343,685' },
  { year: 5, perDay: '172', total: '171,842' },
]

export function Miner() {
  const { address } = useWallet()
  const [stats, setStats] = useState<MinerStats | null>(null)
  const [record, setRecord] = useState<MinerRecord | null>(null)
  const [delegation, setDelegation] = useState<{ miners: number; totalDelegated: bigint } | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [s, d] = await Promise.all([
      getMinerStats().catch(() => null),
      getDelegationStats().catch(() => null),
    ])
    setStats(s)
    setDelegation(d)
    if (address) {
      const r = await getMinerRecord(address).catch(() => null)
      setRecord(r)
    } else {
      setRecord(null)
    }
    setLoading(false)
  }, [address])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 20000)
    return () => clearInterval(id)
  }, [refresh])

  const tierTone = record
    ? record.tier === 'Excellent' ? 'emerald'
      : record.tier === 'Good' ? 'vault'
        : record.tier === 'Warning' ? 'amber' : 'red'
    : 'muted'

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Network stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Registered miners" value={stats?.count ?? '–'} sub={`${stats?.activeOracle ?? 0} oracle · ${stats?.activeChat ?? 0} chat`} icon={<Users className="w-4 h-4" />} loading={loading && !stats} />
        <StatCard label="Total staked" value={`${formatAmount(stats?.totalStaked)} VLT`} accent="vlt" icon={<TokenIcon symbol="VLT" size="xs" />} />
        <StatCard label="Emission" value={`${(stats?.emissionPerBlock ?? 0).toFixed(4)} VLT`} sub="per block · yearly halving" icon={<Gauge className="w-4 h-4" />} />
        <StatCard label="Rewards distributed" value={`${formatAmount(stats?.distributed)} VLT`} accent="emerald" sub={`of ${formatAmount(stats ? stats.budget - stats.distributed : null)} remaining`} />
        <StatCard label="Delegated VLT" value={`${formatAmount(delegation?.totalDelegated)} VLT`} accent="vlt" sub={`${delegation?.miners ?? 0} profiles accept delegation`} />
        <StatCard label="Min stake" value={`${formatAmount(stats?.minStake)} VLT`} accent="amber" />
        <StatCard label="Stake cap / miner" value="500,000 VLT" sub="own + delegated" />
        <StatCard label="New miner boost" value="+50%" sub="while network < 10 miners, 30 days" icon={<Sparkles className="w-4 h-4" />} />
      </div>

      {/* Your miner */}
      <Panel
        title="Your miner"
        desc="Live record from the XelisVaultMiner contract."
        actions={record ? <Badge tone={tierTone as any}>{record.tier} · {record.multiplier}×</Badge> : undefined}
      >
        {!address ? (
          <p className="text-xs text-muted-foreground text-center py-4">Connect your wallet to check your miner registration.</p>
        ) : record === null && !loading ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <Pickaxe className="w-6 h-6 text-vault/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">This address is not a registered miner.</p>
            <p className="text-[11px] text-muted-foreground/70">Run the miner CLI below to register — it handles stake, heartbeats and price submissions end-to-end.</p>
          </div>
        ) : record ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-0.5">
                <DataRow label="Stake" value={`${formatAmount(record.stake)} VLT`} accent="text-vlt" />
                <DataRow label="Reputation" value={`${record.reputation.toLocaleString()} / 10,000`} />
                <DataRow label="Total earned" value={`${formatAmount(record.totalRewards)} VLT`} accent="text-emerald-400" />
                <DataRow label="Total slashed" value={`${formatAmount(record.totalSlashed)} VLT`} accent="text-red-300" />
                <DataRow label="Status" value={record.active ? 'Active' : 'Inactive'} accent={record.active ? 'text-emerald-400' : 'text-red-300'} />
              </div>
            </div>
            <div>
              <div className="space-y-0.5">
                <DataRow label="Valid submissions" value={record.validSubmissions.toLocaleString()} />
                <DataRow label="Successful anchors" value={record.successfulAnchors.toLocaleString()} />
                <DataRow label="Heartbeat" value={`@ topo ${record.lastHeartbeat.toLocaleString()}`} />
                <DataRow label="Endpoint" value={record.endpointUrl.slice(0, 28) || '—'} />
                <DataRow label="Registered" value={`@ topo ${record.registeredAt.toLocaleString()}`} />
              </div>
            </div>
          </div>
        ) : (
          <LoadingRows rows={2} />
        )}
      </Panel>

      {/* Run a miner */}
      <Panel
        title="Run a miner"
        desc="Mining = securing the StakedOracle price feed (and optionally relaying VaultChat). The CLI does everything: registration, heartbeats, price submission, reward compounding."
        actions={<Badge tone="vault">CLI required</Badge>}
      >
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground pb-1">1 — install (linux / macOS / windows)</div>
          <CliRow cmd={CLI_INSTALL.linux} label="sh" />
          <CliRow cmd={CLI_INSTALL.windows} label="ps" />
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground pt-3 pb-1">2 — one-time setup (wallet, stake, registration)</div>
          <CliRow cmd={CLI_COMMANDS.startMiner.setup} label="setup" />
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground pt-3 pb-1">3 — start submitting prices</div>
          <CliRow cmd={CLI_COMMANDS.startMiner.start} label="oracle" />
          <CliRow cmd="xvault-miner --miner --services both" label="oracle+chat" />
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground pt-3 pb-1">4 — live dashboard (stake, reputation, rewards)</div>
          <CliRow cmd={CLI_COMMANDS.startMiner.dashboard} label="tui" />
        </div>
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          {[
            { icon: Zap, t: 'Stake 1,000 VLT', d: 'Locked while mining. Withdraw anytime by deregistering.' },
            { icon: Award, t: 'Earn per block', d: 'Stake-weighted share of the 0.43593 VLT/block emission.' },
            { icon: TrendingDown, t: 'Build reputation', d: 'Start Warning (0.7×), reach Good 1.0× at 5,000 rep in ~15 days.' },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border border-border bg-background/40 p-3.5">
              <x.icon className="w-4 h-4 text-vault mb-2" />
              <div className="text-xs font-semibold">{x.t}</div>
              <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{x.d}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Emission schedule */}
      <Panel title="Emission schedule" desc="Bitcoin-style halving: the per-block reward halves every 6,307,200 blocks (exactly one year of 5-second blocks).">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-4 font-medium">Year</th>
                <th className="py-2 pr-4 font-medium">Per block</th>
                <th className="py-2 pr-4 font-medium">Per day</th>
                <th className="py-2 font-medium">Year total</th>
              </tr>
            </thead>
            <tbody>
              {EMISSION_YEARS.map((y, i) => (
                <tr key={y.year} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-4">{y.year}</td>
                  <td className="py-2 pr-4 text-vlt">{(0.43593 / Math.pow(2, i)).toFixed(5)} VLT</td>
                  <td className="py-2 pr-4">{y.perDay} VLT</td>
                  <td className="py-2">{y.total} VLT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground/70 leading-relaxed">
          5,500,000 VLT (55% of supply) funds oracle rewards over 10+ years. New-miner boosts: +50% under 10 miners,
          +30% under 50, +10% under 100 — applied for the first 30 days of a miner's life. The concentration
          penalty curve (8%→20% of network stake) scales oracle weight down to 0.3× to prevent power grabs.
        </p>
      </Panel>

      <CliFallback
        title="Delegation — earn without running a node"
        commands={[
          { label: 'cli', cmd: 'xvault          # menu: Mining → delegate to a miner' },
        ]}
        note="Delegators earn a share of a miner's rewards minus their commission (0-20%). Caps: 500 delegators and 500,000 VLT total stake per miner."
      />
    </div>
  )
}
