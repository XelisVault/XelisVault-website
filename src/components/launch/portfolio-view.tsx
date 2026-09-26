// Portfolio view — the connected wallet's REAL mainnet holdings.
//
// XELIS balances are confidential: the wallet itself is the only
// source. The portfolio therefore shows exactly what the wallet knows:
//   • XEL balance
//   • every launched asset the wallet tracks, priced from the live
//     curve/pool reserves
//   • liquidity-provider positions (on-chain provider slots)
// plus links to the explorer for the full history.

'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { useMainnet } from '@/lib/launch/mainnet-store'
import { useCommunity } from '@/lib/launch/community-store'
import { useLaunchWallet } from '@/lib/launch/wallet'
import { fetchLpInfo } from '@/lib/launch/reader'
import { explorerAddressUrl } from '@/lib/launch/protocol'
import { fmtAtomic } from '@/lib/launch/chain-math'
import { AnimatedNumber, BracketButton, Sparkline, StatusTag } from './shared'
import { ProjectLogo } from './logos'
import { fmtXel, fmtPrice } from '@/lib/launch/math'
import { cn } from '@/lib/utils'
import type { AppView } from './launchpad-view'
import type { CommunityCoin } from '@/lib/launch/types'

interface LpRow {
  ticker: string
  asset: string
  parts: bigint
  withdrawable: bigint
  claimableXel: bigint
  claimableTokens: bigint
}

export function PortfolioView({ setView }: { setView: (v: AppView, id?: string) => void }) {
  const projects = useMainnet((s) => s.projects)
  const coins = useCommunity((s) => s.coins)
  const wallet = useLaunchWallet()
  const connected = wallet.state === 'connected' && !!wallet.address

  const [lps, setLps] = useState<LpRow[]>([])
  const address = wallet.address
  const refreshLps = useCallback(async () => {
    if (!address) { setLps([]); return }
    const pools = projects.filter((p) => p.pool && p.pool.asset)
    const rows = await Promise.all(
      pools.map(async (p) => {
        try {
          const lp = await fetchLpInfo(p.pool!.asset, address)
          if (lp.parts > 0n || lp.withdrawable > 0n) {
            return {
              ticker: p.ticker, asset: p.pool!.asset,
              parts: lp.parts, withdrawable: lp.withdrawable,
              claimableXel: lp.claimableXel, claimableTokens: lp.claimableTokens,
            }
          }
        } catch { /* ignore */ }
        return null
      }),
    )
    setLps(rows.filter((r): r is LpRow => !!r))
  }, [projects, address])

  useEffect(() => {
    void refreshLps()
    const t = setInterval(() => void refreshLps(), 45_000)
    return () => clearInterval(t)
  }, [refreshLps])

  // ── disconnected state ──
  if (!connected) {
    return (
      <div className="mt-10 border border-dashed border-border p-10 text-center">
        <div className="font-display text-xl font-semibold">Connect your wallet to see your portfolio</div>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          XELIS balances are confidential — only your wallet (Genesix on mainnet, XSWD enabled)
          can show what you hold. The site reads balances through your own wallet connection
          and never sees your keys.
        </p>
      </div>
    )
  }

  // ── holdings ──
  const priceOf = (asset: string | null): { price: number; project: typeof projects[number] | null; coin: CommunityCoin | null } => {
    if (!asset) return { price: 0, project: null, coin: null }
    const p = projects.find((x) => x.asset === asset)
    if (p) {
      if (p.pool) return { price: p.pool.xel / p.pool.token, project: p, coin: null }
      if (p.curve) return { price: p.curve.reserves / p.curve.circulating, project: p, coin: null }
      return { price: 0, project: p, coin: null }
    }
    const c = coins.find((x) => x.asset === asset)
    if (c) return { price: c.price, project: null, coin: c }
    return { price: 0, project: null, coin: null }
  }

  const holdings = [
    {
      ticker: 'XEL',
      name: 'XELIS',
      balance: wallet.xelBalance ?? 0,
      price: 1,
      stage: 'native',
      project: null as typeof projects[number] | null,
      coin: null as CommunityCoin | null,
      asset: null as string | null,
    },
    ...Object.entries(wallet.assetBalances)
      .filter(([, bal]) => bal > 0.000001)
      .map(([asset, bal]) => {
        const { price, project, coin } = priceOf(asset)
        return {
          ticker: project?.ticker ?? coin?.ticker ?? asset.slice(0, 6).toUpperCase(),
          name: project?.name ?? coin?.name ?? 'Unknown asset',
          balance: bal,
          price,
          stage: coin
            ? (coin.pool ? 'community · DEX pool' : 'community · bonding curve')
            : project?.pool ? 'LaunchDEX' : project?.curve ? 'bonding curve' : 'untracked',
          project,
          coin,
          asset,
        }
      }),
  ]

  const totalValue = holdings.reduce((a, h) => a + h.balance * h.price, 0)

  return (
    <div className="space-y-6">
      {/* Fortune */}
      <div className="border border-border/70 bg-card/50 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              total value · mainnet wallet
            </div>
            <div className="mt-2 font-display text-4xl font-semibold tabular-nums">
              <AnimatedNumber value={totalValue} format={(v) => v.toLocaleString('en-US', { maximumFractionDigits: 2 })} />
              <span className="ml-2 text-lg text-muted-foreground">XEL</span>
            </div>
            <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
              <span>{address != null ? `${address.slice(0, 14)}…${address.slice(-6)}` : ''}</span>
              <a
                href={address != null ? explorerAddressUrl(address) : '#'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-vault hover:underline"
              >
                explorer <ExternalLink className="h-3 w-3" />
              </a>
              {wallet.isMainnet === false && (
                <span className="text-destructive">· NOT on mainnet ({wallet.network})</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <BracketButton size="sm" onClick={() => setView('trading')}>curve trading</BracketButton>
            <BracketButton size="sm" variant="teal" onClick={() => setView('dex')}>launchdex</BracketButton>
            <BracketButton size="sm" variant="vlt" onClick={() => setView('community')}>community coins</BracketButton>
            <BracketButton size="sm" variant="quiet" onClick={() => setView('launchpad')}>launchpad</BracketButton>
          </div>
        </div>
      </div>

      {/* Holdings */}
      <div>
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">holdings</h3>
        <div className="border border-border/70 bg-card/50">
          {holdings.map((h, i) => (
            <motion.div
              key={h.ticker + (h.asset ?? '')}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                'flex items-center gap-3 px-4 py-3',
                i > 0 && 'border-t border-border/60',
              )}
            >
              {h.ticker === 'XEL'
                ? <ProjectLogo ticker="XEL" size="sm" />
                : <ProjectLogo ticker={h.ticker} size="sm" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{h.name}</span>
                  <span className={cn('font-mono text-[10px] uppercase tracking-wider', h.coin ? 'text-vlt' : 'text-muted-foreground')}>{h.stage}</span>
                  {h.project && <StatusTag status={h.project.status} />}
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {h.asset ? `${h.asset.slice(0, 16)}…` : 'native asset'}
                </div>
              </div>
              {(h.project && (h.project.curve || h.project.pool)) && (
                <Sparkline
                  data={(h.project.curve ?? h.project.pool)!.history.slice(-45)}
                  width={84}
                  height={26}
                  color={h.project.pool ? 'var(--xusd)' : 'auto'}
                />
              )}
              {h.coin && (h.coin.curve || h.coin.pool) && (
                <Sparkline
                  data={(h.coin.curve ?? h.coin.pool)!.history.slice(-45)}
                  width={84}
                  height={26}
                  color={h.coin.pool ? 'var(--xusd)' : 'auto'}
                />
              )}
              <div className="w-36 text-right font-mono text-xs tabular-nums">
                <div className="text-foreground">{fmtXel(h.balance)} {h.ticker}</div>
                <div className="text-muted-foreground">
                  {h.price > 0 ? `@ ${fmtPrice(h.price)} · ${fmtXel(h.balance * h.price)} XEL` : 'unpriced'}
                </div>
              </div>
              <div className="w-16 text-right">
                {h.project ? (
                  <button
                    onClick={() => h.project!.pool ? setView('dex', h.project!.id) : setView('trading', h.project!.id)}
                    className="font-mono text-[10px] uppercase tracking-wider text-vault hover:underline"
                  >
                    {h.project.pool ? 'pool →' : 'trade →'}
                  </button>
                ) : h.coin ? (
                  <button
                    onClick={() => setView('community', h.coin!.id)}
                    className="font-mono text-[10px] uppercase tracking-wider text-vlt hover:underline"
                  >
                    coin →
                  </button>
                ) : null}
              </div>
            </motion.div>
          ))}
          {holdings.length === 1 && (
            <div className="border-t border-border/60 px-4 py-6 text-center font-mono text-xs text-muted-foreground">
              no launched tokens in this wallet yet · buy on a curve or a pool to start
            </div>
          )}
        </div>
      </div>

      {/* LP positions */}
      <div>
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          liquidity provider positions
        </h3>
        {lps.length > 0 ? (
          <div className="border border-border/70 bg-card/50">
            {lps.map((lp, i) => {
              const p = projects.find((x) => x.asset === lp.asset)
              return (
                <div key={lp.asset} className={cn('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-border/60')}>
                  <ProjectLogo ticker={lp.ticker} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">XEL / {lp.ticker}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      depth {fmtAtomic(lp.parts, 2)} · withdrawable {fmtAtomic(lp.withdrawable, 2)} · claimable {fmtAtomic(lp.claimableXel, 4)} XEL
                    </div>
                  </div>
                  {p && (
                    <button
                      onClick={() => setView('dex', p.id)}
                      className="font-mono text-[10px] uppercase tracking-wider text-xusd hover:underline"
                    >
                      manage →
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="border border-dashed border-border p-8 text-center font-mono text-xs text-muted-foreground">
            no LP positions · provide liquidity on a LaunchDEX pool to earn {'50'}% of the fees
          </div>
        )}
      </div>

      {/* note */}
      <p className="text-center font-mono text-[10px] leading-relaxed text-muted-foreground">
        Balances come from your wallet (XELIS balances are confidential — there is no public ledger).
        Prices come live from the on-chain curve and pool reserves.
      </p>
    </div>
  )
}
