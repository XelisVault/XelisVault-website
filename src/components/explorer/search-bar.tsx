'use client'

// Universal search — resolves a block hash, tx hash, topoheight, height
// or xet: address and opens the inspector drawer.

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, AlertCircle } from 'lucide-react'
import {
  XelisBlock,
  getBlockAtTopo,
  getBlocksAtHeight,
  getBlockByHash,
  getTxByHash,
} from '@/lib/xelis/explorer'

export type SearchTarget =
  | { kind: 'block'; block: XelisBlock }
  | { kind: 'blockhash'; hash: string }
  | { kind: 'tx'; hash: string }
  | { kind: 'account'; address: string }

export function SearchBar({ onResolve }: { onResolve: (t: SearchTarget) => void }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolve = useCallback(async () => {
    const query = q.trim()
    setError(null)
    if (!query) return
    setBusy(true)
    try {
      if (/^\d+$/.test(query)) {
        // try topoheight first, then height
        try {
          const block = await getBlockAtTopo(parseInt(query, 10), false)
          onResolve({ kind: 'block', block })
          return
        } catch {
          try {
            const blocks = await getBlocksAtHeight(parseInt(query, 10), false)
            if (Array.isArray(blocks) && blocks.length > 0) {
              onResolve({ kind: 'block', block: blocks[0] })
              return
            }
          } catch { /* fallthrough */ }
        }
        throw new Error('No block at that topoheight or height.')
      }

      if (query.startsWith('xet:') || query.startsWith('xel:')) {
        onResolve({ kind: 'account', address: query })
        return
      }

      if (/^[0-9a-fA-F]{64}$/.test(query)) {
        try {
          const block = await getBlockByHash(query.toLowerCase(), false)
          onResolve({ kind: 'block', block })
          return
        } catch {
          try {
            await getTxByHash(query.toLowerCase())
            onResolve({ kind: 'tx', hash: query.toLowerCase() })
            return
          } catch {
            throw new Error('No block or transaction with that hash.')
          }
        }
      }

      throw new Error('Try a block hash, a topoheight, a tx hash or an xet: address.')
    } catch (e: any) {
      setError(e?.message ?? 'Not found.')
    } finally {
      setBusy(false)
    }
  }, [q, onResolve])

  return (
    <div className="w-full">
      <div className="relative flex items-center gap-2 rounded-full glass-panel pl-4 pr-1.5 py-1.5 border border-border/70 focus-within:border-vault/50 transition-colors">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          id="obs-search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setError(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') resolve() }}
          placeholder="Inspect anything, block hash · topoheight · tx hash · xet:address  ( / )"
          spellCheck={false}
          className="flex-1 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/70 min-w-0"
        />
        <button
          onClick={resolve}
          disabled={busy || !q.trim()}
          className="shrink-0 inline-flex h-8 items-center gap-2 rounded-full bg-vault hover:bg-vault/85 disabled:opacity-40 disabled:cursor-not-allowed px-4 text-[13px] font-semibold text-white transition-colors"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Inspect
        </button>
      </div>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 mt-2 ml-4 text-[11px] font-mono text-red-300"
          >
            <AlertCircle className="w-3 h-3" /> {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
