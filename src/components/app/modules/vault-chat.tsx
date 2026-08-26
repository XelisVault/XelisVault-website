'use client'

import { useCallback, useEffect, useState } from 'react'
import { KeyRound, MessageSquareLock, Radio, Server, Users } from 'lucide-react'
import { useWallet } from '@/lib/wallet-store'
import { getChatStats, hasChatSession } from '@/lib/xelis/reads'
import { StatCard, Panel, Badge, CliFallback, CliRow, LiveDot } from '../shared'
import { CLI_COMMANDS } from '@/lib/xelis/cli'

const CRYPTO_STACK = [
  { layer: 'Key derivation', detail: 'HKDF-SHA256 from your wallet keys — no separate seed to back up' },
  { layer: 'Key exchange', detail: 'X25519 Diffie-Hellman between participants' },
  { layer: 'Encryption', detail: 'ChaCha20-Poly1305 AEAD with timestamp AAD' },
  { layer: 'Signatures', detail: 'Ed25519 on every message blob' },
  { layer: 'Anchoring', detail: 'Merkle roots of message batches stored on-chain (SHA-256)' },
]

export function VaultChat() {
  const { address } = useWallet()
  const [stats, setStats] = useState<{ groupsCount: number } | null>(null)
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  const refresh = useCallback(async () => {
    setStats(await getChatStats().catch(() => null))
    if (address) {
      setHasSession(await hasChatSession(address).catch(() => null))
    } else {
      setHasSession(null)
    }
  }, [address])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 30000)
    return () => clearInterval(id)
  }, [refresh])

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Groups on-chain" value={stats?.groupsCount ?? '–'} icon={<Users className="w-4 h-4" />} loading={!stats} />
        <StatCard label="Your session" value={hasSession == null ? '—' : hasSession ? 'Registered' : 'None'} accent={hasSession ? 'emerald' : 'amber'} icon={<KeyRound className="w-4 h-4" />} />
        <StatCard label="Storage model" value="Ring buffer" sub="50 msgs/user — zero chain growth" />
        <StatCard label="End-to-end" value="ChaCha20" sub="Poly1305 authenticated" accent="emerald" icon={<MessageSquareLock className="w-4 h-4" />} />
      </div>

      <Panel
        title="VaultChat"
        desc="Encrypted messaging anchored to the XELIS BlockDAG. Messages flow peer-to-peer in under a second; relayers batch-anchor Merkle roots on-chain every ~80 minutes for verifiable history."
        actions={<Badge tone="vault"><LiveDot /> E2E</Badge>}
      >
        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          {[
            'Direct messages and group chats with rotating group keys',
            'Ephemeral messages with 2h / 6h / 12h / 24h TTLs',
            'On-chain payment requests and invoices between users',
            'Group giveaways with per-wallet claim limits',
            'Premium direct storage — persistent, no relayer needed',
            'Tombstone deletions that preserve Merkle integrity',
          ].map((f) => (
            <div key={f} className="flex gap-2.5 rounded-xl border border-border bg-background/40 p-3">
              <MessageSquareLock className="w-3.5 h-3.5 text-vault shrink-0 mt-0.5" />
              <span className="text-xs text-muted-foreground leading-relaxed">{f}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-background/40 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">crypto stack</div>
          <div className="space-y-2">
            {CRYPTO_STACK.map((c, i) => (
              <div key={c.layer} className="flex gap-3 items-baseline">
                <span className="font-mono text-[10px] text-vault/70 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <span className="text-xs font-medium">{c.layer}</span>
                  <span className="text-xs text-muted-foreground"> — {c.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel
        title="Run a chat relayer"
        desc="Relayers are the messaging backbone — and earn from the 1,000,000 VLT relayer allocation (10% of supply over 10 years)."
        actions={<Badge tone="vlt">earns VLT</Badge>}
      >
        <div className="space-y-2">
          <CliRow cmd={CLI_COMMANDS.chat.relayer} label="run" />
          <CliRow cmd={CLI_COMMANDS.chat.send} label="send" />
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Relayer bond" value="50 VLT" accent="amber" sub="slashable for abuse" />
          <StatCard label="Reward cap" value="100 VLT/day" sub="per relayer" />
          <StatCard label="Anchor rate limit" value="25 min" sub="between anchors" />
          <StatCard label="Protocol cut" value="5%" sub="of relayer fees" />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground/70 leading-relaxed">
          Anchors must contain at least 5 messages from 2 distinct senders to earn rewards — spam anchors earn
          nothing. Reputation multipliers (0.5× to 1.5×) scale relayer earnings, with diminishing returns above
          50 anchors/day to prevent single-player dominance.
        </p>
      </Panel>

      <CliFallback
        title="Full chat experience"
        commands={[
          { label: 'cli', cmd: 'xvault          # menu: Chat — sessions, groups, E2E messages' },
          { label: 'tui', cmd: 'xvault-chat     # dedicated chat TUI (12 backend methods)' },
        ]}
        note="End-to-end encryption requires key derivation from your wallet — available through the CLI while the web chat ships."
      />
    </div>
  )
}
