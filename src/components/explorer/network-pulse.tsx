'use client'

// Network Pulse — live chain stats with odometer-rolling numbers,
// plus the deflation burn meter (XET sealed away forever).

import { Boxes, Flame, Gauge, Layers, Users, Clock, Coins, ArrowLeftRight, PersonStanding, Droplets } from 'lucide-react'
import { NetworkInfo } from '@/lib/xelis/rpc'
import { fmtXEL, fmtNum } from '@/lib/xelis/explorer'
import { Odometer } from './fx'

function Tile({
  icon: Icon,
  label,
  children,
  hint,
}: {
  icon: any
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="rounded-xl glass-panel px-3.5 py-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="w-3 h-3 text-vault/80" />
        {label}
      </div>
      <div className="font-mono text-lg md:text-xl font-semibold tracking-tight text-foreground">{children}</div>
      {hint && <div className="text-[10px] font-mono text-muted-foreground/70">{hint}</div>}
    </div>
  )
}

export function NetworkPulse({
  info,
  hashrateFormatted,
  peerCount,
  mempoolTotal,
  txCount,
  accountCount,
  assetCount,
}: {
  info: NetworkInfo | null
  hashrateFormatted: string | null
  peerCount: number | null
  mempoolTotal: number | null
  txCount: number | null
  accountCount: number | null
  assetCount: number
}) {
  const emitted = info ? fmtXEL(info.emitted_supply, { trim: true }) : '—'
  const burned = info ? fmtXEL(info.burned_supply, { trim: true }) : '—'
  const burnedPct = info && info.emitted_supply > 0 ? (info.burned_supply / info.emitted_supply) * 100 : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">Network Pulse</span>
        <span className="text-[10px] font-mono text-muted-foreground/60">
          {info ? `daemon ${info.version} · target ${(info.block_time_target / 1000).toFixed(0)}s` : '…'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <Tile icon={Layers} label="Topoheight">
          {info ? <Odometer value={fmtNum(info.topoheight)} /> : '—'}
        </Tile>
        <Tile icon={Boxes} label="Height">
          {info ? <Odometer value={fmtNum(info.height)} /> : '—'}
        </Tile>
        <Tile icon={Gauge} label="Hashrate">
          {hashrateFormatted ?? '—'}
        </Tile>
        <Tile icon={Clock} label="Avg block">
          {info ? `${(info.average_block_time / 1000).toFixed(2)}s` : '—'}
        </Tile>
        <Tile icon={Users} label="Peers">
          {peerCount !== null ? <Odometer value={peerCount} /> : '—'}
        </Tile>
        <Tile icon={Droplets} label="Mempool">
          {mempoolTotal !== null ? <Odometer value={mempoolTotal} /> : '—'}
        </Tile>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Tile icon={Coins} label="Emitted" hint="max 18.4M XET">
          {emitted}
        </Tile>
        <div className="rounded-xl glass-panel px-3.5 py-3 flex flex-col gap-1.5 relative overflow-hidden">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-orange-300/90">
            <Flame className="w-3 h-3" />
            Burned forever
          </div>
          <div className="font-mono text-lg md:text-xl font-semibold tracking-tight text-orange-300">
            {burned}
          </div>
          <div className="h-1 rounded-full bg-orange-400/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300 transition-all duration-700"
              style={{ width: `${Math.max(1.2, Math.min(100, burnedPct))}%` }}
            />
          </div>
          <div className="text-[10px] font-mono text-muted-foreground/70">{burnedPct.toFixed(3)}% of emitted · deflation live</div>
        </div>
        <Tile icon={ArrowLeftRight} label="Txs on chain">
          {txCount !== null ? <Odometer value={fmtNum(txCount)} /> : '—'}
        </Tile>
        <Tile icon={PersonStanding} label="Accounts">
          {accountCount !== null ? <Odometer value={fmtNum(accountCount)} /> : '—'}
          <span className="text-[10px] font-mono text-muted-foreground/70">{assetCount} assets</span>
        </Tile>
      </div>
    </div>
  )
}
