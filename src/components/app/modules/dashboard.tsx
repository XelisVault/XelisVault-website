'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '@/lib/wallet-store'
import { getNetworkInfo, type NetworkInfo } from '@/lib/xelis/rpc'
import {
  getOracleAggregate, getMinerStats, getProtocolTVL, getAirdropGlobal,
  getVaultEngineConfig, getDelegationStats, getTopBlock,
  type OracleAggregate, type MinerStats, type ProtocolTVL,
} from '@/lib/xelis/reads'
import { formatAmount } from '@/lib/xelis/types'
import { StatCard, Panel, LoadingRows, LiveDot, Badge } from '../shared'
import { TokenIcon } from '../token-icon'

function useInterval(fn: () => void, ms: number) {
  useEffect(() => {
    fn()
    const id = setInterval(fn, ms)
    return () => clearInterval(id)
  }, [ms])
}

export function Dashboard() {
  const { address, xelBalance, xusdBalance, vltBalance, xelPrice } = useWallet()
  const [net, setNet] = useState<NetworkInfo | null>(null)
  const [topBlock, setTopBlock] = useState<{ hash: string; topoheight: number } | null>(null)
  const [oracle, setOracle] = useState<OracleAggregate | null>(null)
  const [miner, setMiner] = useState<MinerStats | null>(null)
  const [tvl, setTvl] = useState<ProtocolTVL | null>(null)
  const [airdrop, setAirdrop] = useState<{ users: number; totalPoints: number } | null>(null)
  const [vaults, setVaults] = useState<{ vaultCount: number } | null>(null)
  const [delegation, setDelegation] = useState<{ miners: number; totalDelegated: bigint } | null>(null)
  const [loading, setLoading] = useState(true)

  useInterval(async () => {
    try {
      const [n, o, m, t, a, v, d] = await Promise.all([
        getNetworkInfo().catch(() => null),
        getOracleAggregate(0).catch(() => null),
        getMinerStats().catch(() => null),
        getProtocolTVL().catch(() => null),
        getAirdropGlobal().catch(() => null),
        getVaultEngineConfig().catch(() => null),
        getDelegationStats().catch(() => null),
      ])
      setNet(n); setOracle(o); setMiner(m); setTvl(t); setAirdrop(a); setVaults(v); setDelegation(d)
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, 12000)

  useInterval(async () => {
    getTopBlock().then(setTopBlock).catch(() => {})
  }, 5000)

  const portfolioUsd = xelBalance * xelPrice + xusdBalance + vltBalance * (oracle ? 0.02 : 0) // VLT placeholder, pools are thin on testnet

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Network status strip */}
      <Panel className="!p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
          <div className="flex items-center gap-2">
            <LiveDot />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider">Testnet Live</span>
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            Topo <span className="text-foreground font-semibold">{(topBlock?.topoheight ?? net?.topoheight ?? 0).toLocaleString()}</span>
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            Height <span className="text-foreground font-semibold">{(net?.height ?? 0).toLocaleString()}</span>
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            Block time <span className="text-foreground font-semibold">{((net?.average_block_time ?? 5000) / 1000).toFixed(1)}s</span>
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            Mempool <span className="text-foreground font-semibold">{net?.mempool_size ?? 0}</span>
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            Supply <span className="text-foreground font-semibold">{(Number(net?.circulating_supply ?? 0) / 1e8 / 1e6).toFixed(2)}M XEL</span>
          </div>
          {topBlock?.hash && (
            <div className="text-[10px] font-mono text-muted-foreground/70 truncate max-w-[160px]">
              tip {topBlock.hash.slice(0, 12)}…
            </div>
          )}
        </div>
      </Panel>

      {/* Wallet overview */}
      {address && (
        <Panel title="Your portfolio" desc="Balances from your connected wallet, priced by the StakedOracle aggregate.">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total value" value={`$${portfolioUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} accent="emerald" />
            <StatCard label="XEL" value={xelBalance.toLocaleString('en-US', { maximumFractionDigits: 4 })} sub={`$${(xelBalance * xelPrice).toFixed(2)} @ $${(oracle?.priceUsd ?? 0).toFixed(4)}`} />
            <StatCard label="xUSD" value={xusdBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })} accent="xusd" />
            <StatCard label="VLT" value={vltBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })} accent="vlt" />
          </div>
        </Panel>
      )}

      {/* Oracle + TVL */}
      <div className="grid md:grid-cols-2 gap-6">
        <Panel title="StakedOracle" desc="XEL/USD aggregate, median of staked miner submissions." actions={<Badge tone="emerald"><LiveDot /> live</Badge>}>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="XEL / USD" value={`$${(oracle?.priceUsd ?? 0).toFixed(4)}`} accent="xusd" loading={loading && !oracle} />
            <StatCard label="Sources" value={oracle?.sources ?? '–'} sub={`cycle #${oracle?.cycle ?? '–'}`} />
            <StatCard label="Deviation" value={`${((oracle?.deviationBps ?? 0) / 100).toFixed(2)}%`} accent="amber" />
            <StatCard label="Updated at" value={`#${oracle?.topo ?? 0}`} sub="topoheight" />
          </div>
        </Panel>

        <Panel title="Protocol TVL" desc="Assets held by the core contracts (public contract balances).">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="PSM XEL" value={formatAmount(tvl?.psmXel)} loading={loading && !tvl} />
            <StatCard label="PSM xUSD" value={formatAmount(tvl?.psmXusd)} accent="xusd" />
            <StatCard label="Vault collateral" value={formatAmount(tvl?.vaultEngineXel)} sub={`${vaults?.vaultCount ?? 0} vaults`} />
            <StatCard label="Savings xUSD" value={formatAmount(tvl?.savingsXusd)} accent="xusd" />
            <StatCard label="AMM XEL" value={formatAmount(tvl?.swapXel)} />
            <StatCard label="AMM xUSD" value={formatAmount(tvl?.swapXusd)} accent="xusd" />
          </div>
        </Panel>
      </div>

      {/* Mining + airdrop */}
      <div className="grid md:grid-cols-2 gap-6">
        <Panel title="Mining network" desc="XelisVaultMiner: unified oracle + chat relayer layer." actions={<Badge tone="vault">{miner?.activeOracle ?? 0} active</Badge>}>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Miners" value={miner?.count ?? '–'} sub={`${miner?.activeOracle ?? 0} oracle · ${miner?.activeChat ?? 0} chat`} loading={loading && !miner} />
            <StatCard label="Total staked" value={`${formatAmount(miner?.totalStaked)} VLT`} accent="vlt" />
            <StatCard label="Budget remaining" value={`${formatAmount(miner ? miner.budget - miner.distributed : null)} VLT`} accent="vlt" sub={`${formatAmount(miner?.distributed)} distributed`} />
            <StatCard label="Emission" value={`${(miner?.emissionPerBlock ?? 0).toFixed(3)} VLT`} sub="per block · halving yearly" />
            <StatCard label="Delegated" value={`${formatAmount(delegation?.totalDelegated)} VLT`} accent="vlt" sub={`${delegation?.miners ?? 0} delegation profiles`} />
            <StatCard label="Min stake" value={`${formatAmount(miner?.minStake)} VLT`} accent="amber" />
          </div>
        </Panel>

        <Panel title="Testnet airdrop" desc="Contribution points recorded on-chain by 7 categories of activity.">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Participants" value={airdrop?.users ?? '–'} loading={loading && !airdrop} />
            <StatCard label="Total points" value={(airdrop?.totalPoints ?? 0).toLocaleString()} accent="emerald" />
          </div>
          <div className="mt-3 rounded-none border border-border bg-background/40 p-3.5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Earn points by mining, relaying chat, voting, providing liquidity or reporting bugs.
              <span className="text-foreground font-medium"> 1,000 points + 7 distinct days</span> qualifies you for the
              <span className="text-vlt font-medium"> 500,000 VLT</span> testnet airdrop at mainnet launch.
            </p>
          </div>
        </Panel>
      </div>

      {/* Recent activity hint */}
      <Panel title="Explore" desc="Where to go next in the app.">
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { title: 'Open a vault', desc: 'Deposit XEL, borrow xUSD at 200% collateral ratio' },
            { title: 'Run a miner', desc: 'Stake 1,000 VLT and earn emission rewards' },
            { title: 'Swap & PSM', desc: 'Trade at oracle price or via the confidential AMM' },
          ].map((c, i) => (
            <div key={c.title} className="border-t border-border pt-3">
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-[10px] text-muted-foreground/70">{String(i + 1).padStart(2, '0')}</span>
                <div className="text-sm font-semibold">{c.title}</div>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed pl-6">{c.desc}</div>
            </div>
          ))}
        </div>
      </Panel>

      {loading && (
        <div className="max-w-md mx-auto"><LoadingRows /></div>
      )}

      <div className="text-center text-[10px] font-mono text-muted-foreground/70 pb-2">
        Live data from the public XELIS testnet node · auto-refresh every 12s
      </div>
    </div>
  )
}
