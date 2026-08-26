'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Boxes, FileCode2, Layers, Search, ShieldCheck } from 'lucide-react'
import { PROTOCOL_CONTRACTS, V12R_CONTRACTS, resolveContract, type ContractMeta } from '@/lib/xelis/contracts'
import { Badge, HashLink, LoadingRows } from '../shared'
import { explorerContractUrl } from '@/lib/xelis/rpc'

export function Contracts() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [liveHashes, setLiveHashes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  // Resolve all deployed contracts through the live registry
  useEffect(() => {
    let cancelled = false
    const deployed = PROTOCOL_CONTRACTS.filter((c) => c.deployed)
    Promise.all(
      deployed.map(async (c) => {
        try {
          const h = await resolveContract(c.name)
          return [c.name, h] as const
        } catch {
          return [c.name, V12R_CONTRACTS[c.name] ?? ''] as const
        }
      })
    ).then((pairs) => {
      if (!cancelled) {
        setLiveHashes(Object.fromEntries(pairs))
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(PROTOCOL_CONTRACTS.map((c) => c.category))).sort()],
    []
  )

  const filtered = PROTOCOL_CONTRACTS.filter((c) => {
    const matchesCat = category === 'all' || c.category === category
    const q = query.toLowerCase()
    const matchesQuery = !q || c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q) || c.category.includes(q)
    return matchesCat && matchesQuery
  })

  const deployedCount = PROTOCOL_CONTRACTS.filter((c) => c.deployed).length

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-2">Contracts</div>
          <div className="font-mono text-xl font-semibold text-vault">{PROTOCOL_CONTRACTS.length}</div>
          <div className="text-[11px] text-muted-foreground">51 in the repo · 34 core deployed</div>
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-2">Live on testnet</div>
          <div className="font-mono text-xl font-semibold text-emerald-400">{deployedCount}</div>
          <div className="text-[11px] text-muted-foreground">v12R deployment · registry-resolved</div>
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-2">Entry functions</div>
          <div className="font-mono text-xl font-semibold">966</div>
          <div className="text-[11px] text-muted-foreground">739 wallet-invokable chunks</div>
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-2">Categories</div>
          <div className="font-mono text-xl font-semibold">{categories.length - 1}</div>
          <div className="text-[11px] text-muted-foreground">from airdrop to vault</div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contracts, e.g. oracle, mixer, governance…"
            className="w-full rounded-xl border border-border bg-background/60 pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-vault/50"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider transition-all ${
                category === c ? 'bg-vault/15 text-vault border border-vault/30' : 'text-muted-foreground border border-border hover:bg-card/60'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Contract grid */}
      {loading ? (
        <LoadingRows rows={6} />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((c, i) => (
            <ContractCard key={c.name} meta={c} hash={c.deployed ? liveHashes[c.name] : null} index={i} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/70 leading-relaxed flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-vault shrink-0 mt-0.5" />
        Addresses are resolved live from the on-chain ContractRegistry (key <code className="font-mono">cur_Name</code>) —
        when governance upgrades a contract, this page reflects the new address automatically. The registry itself
        keeps the previous hash under <code className="font-mono">prev_Name</code> for rollback.
      </p>
    </div>
  )
}

function ContractCard({ meta, hash, index }: { meta: ContractMeta; hash: string | null; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      className={`rounded-xl border p-4 ${meta.deployed ? 'border-border bg-card/40' : 'border-dashed border-border/60 bg-transparent'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className={`w-4 h-4 shrink-0 ${meta.deployed ? 'text-vault' : 'text-muted-foreground/40'}`} />
          <span className="font-mono text-sm font-semibold truncate">{meta.name}</span>
        </div>
        {meta.deployed ? (
          hash ? <Badge tone="emerald">live</Badge> : <Badge tone="muted">deployed</Badge>
        ) : (
          <Badge tone="muted">phase 5+</Badge>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">{meta.desc}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">{meta.category}</span>
        {meta.deployed && hash && <HashLink hash={hash} type="contract" />}
      </div>
    </motion.div>
  )
}
