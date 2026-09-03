'use client'

import { useCallback, useEffect, useState } from 'react'
import { Award, Target } from 'lucide-react'
import { useWallet } from '@/lib/wallet-store'
import { getAirdropGlobal, getUserPoints, type AirdropUserPoints } from '@/lib/xelis/reads'
import { StatCard, Panel, Badge, LoadingRows, ConnectPrompt, CliFallback, DataRow } from '../shared'

const CATEGORIES: Array<{ key: keyof AirdropUserPoints & string; label: string; desc: string; rate: string }> = [
  { key: 'mining', label: 'Mining', desc: 'Oracle price submissions and runtime', rate: '1 pt/submission (1,000/day cap) + 50 pts/hour' },
  { key: 'relayer', label: 'Relayer', desc: 'VaultChat message anchoring', rate: '10 pts/anchor + 200 pts/day uptime' },
  { key: 'governance', label: 'Governance', desc: 'Proposals and votes', rate: '50 pts/vote · 500 pts/proposal' },
  { key: 'chat', label: 'Chat', desc: 'E2E messages and groups', rate: '1 pt/message (100/day) · 100 pts/group created' },
  { key: 'liquidity', label: 'Liquidity', desc: 'AMM pool deposits', rate: '10 pts per XEL deposited' },
  { key: 'bounty', label: 'Bounty', desc: 'Security research', rate: '5,000 / 1,000 / 200 pts by severity' },
  { key: 'community', label: 'Community', desc: 'Discord help and docs', rate: '50 pts/help · 200 pts/docs' },
]

export function Airdrop() {
  const { address } = useWallet()
  const [global, setGlobal] = useState<{ users: number; totalPoints: number; qualified: number } | null>(null)
  const [mine, setMine] = useState<AirdropUserPoints | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const g = await getAirdropGlobal().catch(() => null)
    setGlobal(g)
    if (address) {
      setMine(await getUserPoints(address).catch(() => null))
    } else {
      setMine(undefined)
    }
    setLoading(false)
  }, [address])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 30000)
    return () => clearInterval(id)
  }, [refresh])

  const qualifies = mine ? mine.totalRaw >= 1000 && mine.daysActive >= 7 : false

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Participants" value={global?.users ?? '–'} loading={loading && !global} />
        <StatCard label="Total points" value={(global?.totalPoints ?? 0).toLocaleString()} accent="emerald" />
        <StatCard label="Qualified" value={global?.qualified ?? 0} sub="≥ 1,000 pts + 7 days" />
        <StatCard label="Airdrop pool" value="500,000 VLT" accent="vlt" sub="testnet contributors" />
      </div>

      {/* Your points */}
      <Panel
        title="Your contribution"
        desc="Points are recorded on-chain by the protocol contracts themselves, every oracle submission, chat anchor, vote and liquidity deposit counts automatically."
        actions={mine ? <Badge tone={qualifies ? 'emerald' : 'amber'}>{qualifies ? 'qualified' : 'in progress'}</Badge> : undefined}
      >
        {!address ? (
          <ConnectPrompt note="Connect your wallet to see your airdrop points." />
        ) : mine === undefined ? (
          <LoadingRows rows={2} />
        ) : mine === null ? (
          <div className="rounded-none border border-border p-6 text-center">
            <Target className="w-6 h-6 text-vault/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No points recorded yet for this address.</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">Start with mining or liquidity, points flow in automatically.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard label="Total points" value={mine.totalRaw.toLocaleString()} accent="emerald" />
              <StatCard label="Active days" value={`${mine.daysActive} / 7`} accent={mine.daysActive >= 7 ? 'emerald' : 'amber'} />
              <StatCard label="Multi-role bonus" value="+25%" sub="if active in 3+ categories" />
              <StatCard label="Registered" value={mine.registered ? 'Yes' : 'No'} sub="mainnet address" accent={mine.registered ? 'emerald' : 'amber'} />
            </div>

            {/* Progress to qualification */}
            <div className="rounded-none border border-border bg-background/40 p-4 mb-4">
              <div className="flex justify-between text-[11px] font-mono mb-2">
                <span className="text-muted-foreground">Points progress to 1,000</span>
                <span className={mine.totalRaw >= 1000 ? 'text-emerald-400' : 'text-amber-400'}>{Math.min(100, (mine.totalRaw / 1000) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all${mine.totalRaw >= 1000 ? 'bg-emerald-400' : 'bg-vault'}`}
                  style={{ width: `${Math.min(100, (mine.totalRaw / 1000) * 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-0.5">
              {CATEGORIES.map((c) => {
                const pts = Number(mine[c.key] ?? 0)
                return (
                  <div key={c.key} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="min-w-0">
                      <span className="text-xs font-medium">{c.label}</span>
                      <span className="text-[11px] text-muted-foreground ml-2 hidden sm:inline">{c.rate}</span>
                    </div>
                    <span className={`font-mono text-xs shrink-0 ${pts > 0 ? 'text-emerald-400' : 'text-muted-foreground/70'}`}>
                      {pts.toLocaleString()} pts
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div className="mt-4">
          <CliFallback
            title="CLI, airdrop & mainnet registration"
            commands={[
              { label: 'points', cmd: 'xvault          # menu: Airdrop → my points & leaderboard' },
              { label: 'register', cmd: 'xvault          # menu: Airdrop → register mainnet address' },
            ]}
            note="Registering a mainnet address is required to claim VLT at launch. Claims stay open for 6 months."
          />
        </div>
      </Panel>

      {/* Rules */}
      <Panel title="How the airdrop works" desc="700,000 VLT total: 500k for testnet contributors + 200k launch airdrop.">
        <div className="space-y-3">
          <div className="rounded-none border border-border bg-background/40 p-4">
            <div className="mb-2">
              <span className="text-sm font-semibold">Qualification requirements</span>
            </div>
            <div className="space-y-0.5">
              <DataRow label="Minimum points" value="1,000 pts" />
              <DataRow label="Distinct active days" value="7 days" />
              <DataRow label="Mainnet address" value="registered before freeze" />
              <DataRow label="Claim window" value="6 months after mainnet launch" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
            Points are recorded by the contracts you interact with, the oracle logs valid submissions, VaultChat
            logs anchors, the Governor logs votes, the AMM logs liquidity. There is nothing to submit or claim
            during the testnet: activity is the application. At freeze, multi-role participants (active in 3+
            categories) receive a +25% bonus, then the final allocation is written to a Merkle tree for the
            mainnet claim contract.
          </p>
        </div>
      </Panel>
    </div>
  )
}
