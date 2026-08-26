'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, Gauge, Radio, ShieldCheck, Users, Zap } from 'lucide-react'
import { getOracleAggregate, getOracleFeed, getOracleConfig, getMinerStats, type OracleAggregate, type OracleFeed } from '@/lib/xelis/reads'
import { getNetworkInfo } from '@/lib/xelis/rpc'
import { StatCard, Panel, Badge, LoadingRows, LiveDot, DataRow } from '../shared'

export function Oracle() {
  const [agg, setAgg] = useState<OracleAggregate | null>(null)
  const [feed, setFeed] = useState<OracleFeed | null>(null)
  const [config, setConfig] = useState<{ minProviders: number; bootstrapMinProviders: number; hardStaleBlocks: number; maxDeviationBps: number; aggregationBlocks: number } | null>(null)
  const [minerStats, setMinerStats] = useState<{ activeOracle: number; count: number } | null>(null)
  const [topo, setTopo] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [a, f, c, m, n] = await Promise.all([
      getOracleAggregate(0).catch(() => null),
      getOracleFeed(0).catch(() => null),
      getOracleConfig().catch(() => null),
      getMinerStats().catch(() => null),
      getNetworkInfo().catch(() => null),
    ])
    setAgg(a); setFeed(f); setConfig(c)
    if (m) setMinerStats({ activeOracle: m.activeOracle, count: m.count })
    if (n) setTopo(n.topoheight)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 8000)
    return () => clearInterval(id)
  }, [refresh])

  const staleness = agg ? topo - agg.topo : 0
  const health = (() => {
    const providers = minerStats?.activeOracle ?? 0
    if (providers === 0) return { label: 'Emergency', tone: 'red' as const, desc: 'No active providers — last price held, marked stale' }
    if (providers < (config?.bootstrapMinProviders ?? 3)) return { label: 'Degraded', tone: 'amber' as const, desc: 'Only 1-2 providers — prices held but slashing disabled' }
    if (providers < (config?.minProviders ?? 10)) return { label: 'Bootstrap', tone: 'amber' as const, desc: `Bootstrap mode (${providers}/${config?.minProviders ?? 10} providers) — no slashing yet` }
    return { label: 'Full', tone: 'emerald' as const, desc: `${providers} providers — median aggregation with slashing active` }
  })()

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Price hero */}
      <Panel className="!p-6" actions={<Badge tone={health.tone}><LiveDot tone={health.tone === 'emerald' ? 'emerald' : health.tone === 'amber' ? 'amber' : 'red'} /> {health.label}</Badge>}>
        <div className="flex flex-col md:flex-row md:items-end gap-6 justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
              {feed?.name ?? 'XEL/USD'} · aggregated median
            </div>
            <div className="font-mono text-4xl md:text-5xl font-semibold text-xusd tracking-tight">
              ${(agg?.priceUsd ?? 0).toFixed(4)}
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground font-mono">
              <span>cycle #{agg?.cycle ?? '–'}</span>
              <span>·</span>
              <span>{agg?.sources ?? 0} sources</span>
              <span>·</span>
              <span>{((agg?.deviationBps ?? 0) / 100).toFixed(2)}% deviation</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[220px]">
            <StatCard label="Updated" value={`${staleness} blocks ago`} accent={staleness > 30 ? 'amber' : 'emerald'} sub={`@ topoheight ${agg?.topo ?? 0}`} icon={<Radio className="w-4 h-4" />} />
            <StatCard label="Providers" value={minerStats?.activeOracle ?? '–'} sub={`of ${minerStats?.count ?? 0} registered`} icon={<Users className="w-4 h-4" />} />
          </div>
        </div>
      </Panel>

      {/* Health detail */}
      <div className="grid md:grid-cols-2 gap-6">
        <Panel title="Network health" desc="The oracle degrades gracefully as provider count changes.">
          <div className="space-y-3">
            <div className={`rounded-xl border p-3.5 ${health.tone === 'emerald' ? 'border-emerald-500/25 bg-emerald-500/5' : health.tone === 'amber' ? 'border-amber-500/25 bg-amber-500/5' : 'border-red-500/25 bg-red-500/5'}`}>
              <div className="flex items-center gap-2 mb-1">
                <LiveDot tone={health.tone === 'emerald' ? 'emerald' : health.tone === 'amber' ? 'amber' : 'red'} />
                <span className="text-sm font-semibold">{health.label} mode</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{health.desc}</p>
            </div>
            <DataRow label="Aggregation window" value={`${config?.aggregationBlocks ?? 5} blocks (${((config?.aggregationBlocks ?? 5) * 5)}s)`} />
            <DataRow label="Max deviation per submission" value={`${(config?.maxDeviationBps ?? 500) / 100}% → 1% slash`} />
            <DataRow label="Hard stale threshold" value={`${config?.hardStaleBlocks ?? 500} blocks`} />
            <DataRow label="Bootstrap → Full transition" value={`at ${config?.minProviders ?? 10} providers`} />
          </div>
        </Panel>

        <Panel title="How the median works" desc="Stake-secured aggregation in five blocks.">
          <ol className="space-y-2.5">
            {[
              'Registered miners stake VLT (min 1,000) and submit prices every aggregation window',
              'Each submission is weighted by the submitter\'s stake and reputation multiplier',
              'Submissions deviating more than 5% from the median are rejected and slashed 1%',
              'The median is written on-chain and feeds the PSM, VaultEngine and VaultSwap',
              'Deviation >20% from the 30-entry TWAP trips the circuit breaker',
            ].map((s, i) => (
              <li key={i} className="flex gap-3 text-xs text-muted-foreground leading-relaxed">
                <span className="shrink-0 w-5 h-5 rounded-md bg-vault/15 text-vault font-mono text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      {/* Slashing table */}
      <Panel title="Slashing schedule" desc="Five severity levels protect the aggregate.">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-4 font-medium">Severity</th>
                <th className="py-2 pr-4 font-medium">Stake slashed</th>
                <th className="py-2 pr-4 font-medium">Reputation</th>
                <th className="py-2 font-medium">Trigger</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {[
                ['Outlier', '1%', '−50', 'Price >5% from median'],
                ['Offline', '2%', '−200', 'Missed heartbeats'],
                ['Data loss', '5%', '−500', 'Invalid data submitted'],
                ['Censorship', '10%', '−1,000', 'Refused valid transactions'],
                ['Malicious', '50%', '−5,000', 'Proven manipulation'],
              ].map((row) => (
                <tr key={row[0]} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-4 font-sans font-medium">{row[0]}</td>
                  <td className="py-2 pr-4 text-amber-300">{row[1]}</td>
                  <td className="py-2 pr-4">{row[2]}</td>
                  <td className="py-2 text-muted-foreground">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground/70">
          Slashed funds: 50% burned, 10% to the reporter, 40% to the treasury.
        </p>
      </Panel>

      {loading && <div className="max-w-md mx-auto"><LoadingRows /></div>}

      <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-muted-foreground/50 pb-2">
        <Activity className="w-3 h-3" />
        Oracle data refreshes every 8 s from the live testnet
      </div>
    </div>
  )
}
