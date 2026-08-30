'use client'

// The Inspector — slide-over drawer for blocks, transactions and accounts.
// Block:   lazy-fetches include_txs=true to reveal fees + full tx list.
// Tx:      decodes the data payload (transfers / burn / contract call / deploy).
// Account: nonce, registration, assets, sealed balance, recent activity.

import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Copy, Check, ExternalLink, Flame, Zap, Boxes, ArrowLeftRight, User, Loader2, ArrowRight } from 'lucide-react'
import {
  XelisBlock,
  XelisTransaction,
  getBlockByHash,
  getTxByHash,
  getAddressNonce,
  getRegistrationTopoheight,
  getAccountAssets,
  getEncryptedBalance,
  getAccountHistory,
  describeTxData,
  explorerBlockUrl,
  fmtXEL,
  fmtNum,
  fmtBytes,
  fmtAge,
  shortHash,
  XEL_ASSET,
} from '@/lib/xelis/explorer'
import { explorerTxUrl, explorerAddressUrl } from '@/lib/xelis/rpc'
import { Identicon } from './fx'
import type { SearchTarget } from './search-bar'

// ---- small building blocks ------------------------------------------------

function Copyable({ value, display }: { value: string; display?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      className="inline-flex items-center gap-1.5 hover:text-vault transition-colors group/copy"
      title="Copy"
    >
      <span className="truncate max-w-[240px]">{display ?? shortHash(value)}</span>
      {copied ? <Check className="w-3 h-3 text-emerald-400 shrink-0" /> : <Copy className="w-3 h-3 opacity-0 group-hover/copy:opacity-60 shrink-0" />}
    </button>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground shrink-0 pt-0.5">{label}</span>
      <span className="text-right text-[12px] font-mono break-all">{children}</span>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const style: Record<string, string> = {
    Normal: 'text-vault bg-vault/10 border-vault/30',
    Sync: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/30',
    Side: 'text-amber-300 bg-amber-400/10 border-amber-400/30',
    Orphaned: 'text-red-300 bg-red-400/10 border-red-400/30',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border ${style[type] ?? style.Normal}`}>
      {type}
    </span>
  )
}

function ExternalLinkChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 hover:border-vault/50 hover:bg-card/80 px-3 py-1.5 text-[11px] font-medium transition-colors"
    >
      {label} <ExternalLink className="w-3 h-3" />
    </a>
  )
}

function SealedChip({ note = 'sealed' }: { note?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-pink-400/30 bg-pink-400/10 px-2 py-0.5 text-[10px] font-mono text-pink-300">
      🔒 {note}
    </span>
  )
}

// ---- the drawer ------------------------------------------------------------

function targetKey(t: SearchTarget): string {
  switch (t.kind) {
    case 'block': return `block:${t.block.hash}`
    case 'blockhash': return `blockhash:${t.hash}`
    case 'tx': return `tx:${t.hash}`
    case 'account': return `account:${t.address}`
  }
}

export function DetailDrawer({
  target,
  onClose,
  onOpenBlock,
  onOpenTx,
  onOpenAccount,
}: {
  target: SearchTarget | null
  onClose: () => void
  onOpenBlock: (b: XelisBlock) => void
  onOpenTx: (hash: string) => void
  onOpenAccount: (address: string) => void
}) {
  return (
    <AnimatePresence>
      {target && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '105%' }}
            animate={{ x: 0 }}
            exit={{ x: '105%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 34 }}
            className="fixed right-0 top-0 bottom-0 z-[90] w-full max-w-lg bg-card/95 backdrop-blur-2xl border-l border-border overflow-y-auto"
          >
            {/* keyed remount: fresh state per inspected target */}
            <DrawerContent
              key={targetKey(target)}
              target={target}
              onClose={onClose}
              onOpenBlock={onOpenBlock}
              onOpenTx={onOpenTx}
              onOpenAccount={onOpenAccount}
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function DrawerContent({
  target,
  onClose,
  onOpenBlock,
  onOpenTx,
  onOpenAccount,
}: {
  target: SearchTarget
  onClose: () => void
  onOpenBlock: (b: XelisBlock) => void
  onOpenTx: (hash: string) => void
  onOpenAccount: (address: string) => void
}) {
  const closeBtn = (
    <button
      onClick={onClose}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
      aria-label="Close inspector"
    >
      <X className="w-4 h-4" />
    </button>
  )

  if (target.kind === 'block') {
    return <BlockDetail block={target.block} onClose={onClose} closeBtn={closeBtn} onOpenTx={onOpenTx} onOpenAccount={onOpenAccount} onOpenBlock={onOpenBlock} />
  }
  if (target.kind === 'blockhash') {
    return <BlockDetailByHash hash={target.hash} onClose={onClose} closeBtn={closeBtn} onOpenTx={onOpenTx} onOpenAccount={onOpenAccount} onOpenBlock={onOpenBlock} />
  }
  if (target.kind === 'tx') {
    return <TxDetail hash={target.hash} onClose={onClose} closeBtn={closeBtn} onOpenBlock={onOpenBlock} onOpenAccount={onOpenAccount} />
  }
  return <AccountDetail address={target.address} onClose={onClose} closeBtn={closeBtn} onOpenBlock={onOpenBlock} />
}

// ---- Block ------------------------------------------------------------------

function BlockBody({
  block,
  full,
  loadingTxs,
  onOpenTx,
  onOpenAccount,
  onOpenBlock,
  closeBtn,
}: {
  block: XelisBlock
  full: XelisBlock | null
  loadingTxs: boolean
  onOpenTx: (h: string) => void
  onOpenAccount: (a: string) => void
  onOpenBlock: (b: XelisBlock) => void
  closeBtn: React.ReactNode
}) {
  const txs = full?.transactions ?? null
  return (
    <div className="p-5 pb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Boxes className="w-4 h-4 text-vault" />
          <h2 className="font-display text-lg font-semibold">Block {block.topoheight != null && block.topoheight >= 0 ? `#${block.topoheight}` : '(orphaned)'}</h2>
          <TypeBadge type={block.block_type} />
        </div>
        {closeBtn}
      </div>

      <div className="rounded-xl bg-background/40 border border-border/60 px-4 py-2">
        <Row label="hash">
          <Copyable value={block.hash} display={shortHash(block.hash, 20, 12)} />
        </Row>
        <Row label="height / topo">{block.height} / {block.topoheight ?? '—'}</Row>
        <Row label="timestamp">
          {new Date(block.timestamp).toLocaleString()} <span className="text-muted-foreground">({fmtAge(block.timestamp)})</span>
        </Row>
        <Row label="miner">
          <button onClick={() => onOpenAccount(block.miner)} className="hover:text-vault transition-colors inline-flex items-center gap-1">
            <Identicon seed={block.miner} size={16} /> <span className="font-mono">{shortHash(block.miner, 12, 8)}</span>
          </button>
        </Row>
        <Row label="reward">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-vault/70" />
            {fmtXEL(block.reward)} XET
          </span>
        </Row>
        <Row label="split">
          <span className="text-muted-foreground">
            miner {fmtXEL(block.miner_reward)} · dev {fmtXEL(block.dev_reward)}
          </span>
        </Row>
        {full?.total_fees != null && (
          <Row label="fees">
            {fmtXEL(full.total_fees)} XET{' '}
            {full.total_fees_burned ? (
              <span className="text-orange-300 inline-flex items-center gap-1">
                <Flame className="w-3 h-3" /> {fmtXEL(full.total_fees_burned)} burned
              </span>
            ) : null}
          </Row>
        )}
        <Row label="size">{fmtBytes(block.total_size_in_bytes)}</Row>
        <Row label="nonce / version">{block.nonce} · v{block.version}</Row>
        <Row label="supply @block">{fmtXEL(block.supply, { trim: true })} XET</Row>
        <Row label="difficulty">
          {fmtNum(parseInt(block.difficulty, 10))} <span className="text-muted-foreground">(cum {shortHash(block.cumulative_difficulty, 8, 4)})</span>
        </Row>
        <Row label="tips">
          <span className="flex flex-wrap gap-1.5 justify-end">
            {(block.tips ?? []).map((t) => (
              <button
                key={t}
                onClick={() => onOpenBlock({ hash: t } as XelisBlock)}
                className="rounded-md border border-border bg-muted/40 hover:border-vault/40 px-2 py-0.5 text-[10px] font-mono transition-colors"
                title="Open tip block"
              >
                {shortHash(t, 8, 6)} <ArrowRight className="w-2.5 h-2.5 inline" />
              </button>
            ))}
          </span>
        </Row>
      </div>

      {/* Transactions */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
            {block.txs_hashes?.length ?? 0} transactions
          </span>
          {loadingTxs && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        </div>
        <div className="space-y-1.5">
          {txs && txs.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/70 px-4 py-3 text-[11px] font-mono text-muted-foreground">
              empty block — miner reward only
            </div>
          )}
          {txs?.map((tx) => {
            const d = describeTxData(tx.data)
            return (
              <button
                key={tx.hash}
                onClick={() => onOpenTx(tx.hash)}
                className="w-full text-left rounded-xl border border-border/60 bg-background/40 hover:border-vault/40 hover:bg-card/70 transition-colors px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-vault/80 shrink-0" />
                  <span className="font-mono text-[11px]">{shortHash(tx.hash, 12, 8)}</span>
                  <span className="ml-auto text-[9px] font-mono uppercase tracking-wider text-vault/80">{d.kind}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-muted-foreground">
                  <span>{d.summary}</span>
                  <span className="ml-auto">fee {fmtXEL(tx.fee)} XET</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <ExternalLinkChip href={explorerBlockUrl(block.hash)} label="Official explorer" />
      </div>
    </div>
  )
}

function BlockDetail({ block, onClose, closeBtn, onOpenTx, onOpenAccount, onOpenBlock }: {
  block: XelisBlock
  onClose: () => void
  closeBtn: React.ReactNode
  onOpenTx: (h: string) => void
  onOpenAccount: (a: string) => void
  onOpenBlock: (b: XelisBlock) => void
}) {
  const [full, setFull] = useState<XelisBlock | null>(null)
  const loading = full === null // fresh state per remount (see keyed DrawerContent)
  useEffect(() => {
    let cancelled = false
    getBlockByHash(block.hash, true)
      .then((b) => { if (!cancelled) setFull(b) })
      .catch(() => { if (!cancelled) setFull(block) }) // fallback: show the base block
    return () => { cancelled = true }
  }, [block.hash])
  void onClose
  return <BlockBody block={block} full={full} loadingTxs={loading} onOpenTx={onOpenTx} onOpenAccount={onOpenAccount} onOpenBlock={onOpenBlock} closeBtn={closeBtn} />
}

function BlockDetailByHash({ hash, onClose, closeBtn, onOpenTx, onOpenAccount, onOpenBlock }: {
  hash: string
  onClose: () => void
  closeBtn: React.ReactNode
  onOpenTx: (h: string) => void
  onOpenAccount: (a: string) => void
  onOpenBlock: (b: XelisBlock) => void
}) {
  const [block, setBlock] = useState<XelisBlock | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    getBlockByHash(hash, false)
      .then((b) => { if (!cancelled) setBlock(b) })
      .catch((e) => { if (!cancelled) setError(e?.message ?? 'Block not found') })
    return () => { cancelled = true }
  }, [hash])
  void onClose
  if (error) {
    return (
      <div className="p-5">
        <div className="flex justify-end">{closeBtn}</div>
        <p className="text-sm font-mono text-red-300 mt-8 text-center">{error}</p>
      </div>
    )
  }
  if (!block) {
    return (
      <div className="p-5">
        <div className="flex justify-end">{closeBtn}</div>
        <div className="flex items-center justify-center mt-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </div>
    )
  }
  return <BlockDetail block={block} onClose={onClose} closeBtn={closeBtn} onOpenTx={onOpenTx} onOpenAccount={onOpenAccount} onOpenBlock={onOpenBlock} />
}

// ---- Transaction -------------------------------------------------------------

function TxDetail({ hash, onClose, closeBtn, onOpenBlock, onOpenAccount }: {
  hash: string
  onClose: () => void
  closeBtn: React.ReactNode
  onOpenBlock: (b: XelisBlock) => void
  onOpenAccount: (a: string) => void
}) {
  const [tx, setTx] = useState<XelisTransaction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCrypto, setShowCrypto] = useState(false)

  useEffect(() => {
    let cancelled = false
    getTxByHash(hash)
      .then((t) => { if (!cancelled) setTx(t) })
      .catch((e) => { if (!cancelled) setError(e?.message ?? 'Transaction not found') })
    return () => { cancelled = true }
  }, [hash])
  void onClose

  if (error) {
    return (
      <div className="p-5">
        <div className="flex justify-end">{closeBtn}</div>
        <p className="text-sm font-mono text-red-300 mt-8 text-center">{error}</p>
      </div>
    )
  }
  if (!tx) {
    return (
      <div className="p-5">
        <div className="flex justify-end">{closeBtn}</div>
        <div className="flex items-center justify-center mt-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </div>
    )
  }

  const d = describeTxData(tx.data)

  return (
    <div className="p-5 pb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <ArrowLeftRight className="w-4 h-4 text-vault" />
          <h2 className="font-display text-lg font-semibold">Transaction</h2>
          <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border text-vault bg-vault/10 border-vault/30">{d.kind}</span>
        </div>
        {closeBtn}
      </div>

      <div className="rounded-xl bg-background/40 border border-border/60 px-4 py-2">
        <Row label="hash"><Copyable value={tx.hash} display={shortHash(tx.hash, 20, 12)} /></Row>
        <Row label="source">
          <button onClick={() => onOpenAccount(tx.source)} className="hover:text-vault transition-colors inline-flex items-center gap-1.5">
            <Identicon seed={tx.source} size={16} /> <span className="font-mono">{shortHash(tx.source, 12, 8)}</span>
          </button>
        </Row>
        <Row label="fee">{fmtXEL(tx.fee)} XET {tx.fee_paid != null && tx.fee_paid !== tx.fee && <span className="text-muted-foreground">(paid {fmtXEL(tx.fee_paid)}, refund {fmtXEL(tx.fee_refund ?? 0)})</span>}</Row>
        <Row label="size / nonce">{fmtBytes(tx.size)} · {tx.nonce}</Row>
        <Row label="payload">{d.summary}</Row>
        {tx.executed_in_block && (
          <Row label="executed in">
            <button onClick={() => onOpenBlock({ hash: tx.executed_in_block! } as XelisBlock)} className="hover:text-vault transition-colors font-mono">
              {shortHash(tx.executed_in_block, 12, 8)} <ArrowRight className="w-2.5 h-2.5 inline" />
            </button>
          </Row>
        )}
        {tx.reference && (
          <Row label="reference">
            <span className="text-muted-foreground font-mono">#{tx.reference.topoheight} · {shortHash(tx.reference.hash, 8, 6)}</span>
          </Row>
        )}
      </div>

      {/* Decoded payload */}
      <div className="mt-5 rounded-xl border border-vault/25 bg-vault/5 p-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-vault/90 mb-2.5">decoded payload</div>
        {tx.data && 'transfers' in tx.data ? (
          <div className="space-y-2">
            {tx.data.transfers.map((t, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-[11px] font-mono">
                <button onClick={() => onOpenAccount(t.destination)} className="hover:text-vault transition-colors truncate inline-flex items-center gap-1.5">
                  <Identicon seed={t.destination} size={14} /> {shortHash(t.destination, 12, 8)}
                </button>
                <SealedChip note="amount sealed" />
              </div>
            ))}
          </div>
        ) : tx.data && 'burn' in tx.data ? (
          <div className="flex items-center gap-2 text-[12px] font-mono">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-orange-300">{fmtXEL(tx.data.burn.amount)} XET burned forever</span>
          </div>
        ) : tx.data && 'invoke_contract' in tx.data ? (
          <div className="space-y-1.5 text-[11px] font-mono text-muted-foreground">
            <div>contract <span className="text-foreground">{shortHash(tx.data.invoke_contract.contract, 12, 8)}</span></div>
            <div>entry <span className="text-foreground">#{tx.data.invoke_contract.entry_id}</span> · max gas <span className="text-foreground">{fmtNum(tx.data.invoke_contract.max_gas)}</span></div>
            <div>params <span className="text-foreground">{tx.data.invoke_contract.parameters?.length ?? 0}</span> · permission <span className="text-foreground">{tx.data.invoke_contract.permission}</span></div>
            <div>public deposits: <span className="text-foreground">{Object.keys(tx.data.invoke_contract.deposits ?? {}).length}</span></div>
          </div>
        ) : (
          <div className="text-[11px] font-mono text-muted-foreground">{d.summary}</div>
        )}
      </div>

      {/* Cryptographic material */}
      <button
        onClick={() => setShowCrypto((s) => !s)}
        className="mt-5 w-full rounded-xl border border-dashed border-border/70 px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-vault/30 transition-colors"
      >
        {showCrypto ? 'hide' : 'show'} cryptographic material
      </button>
      {showCrypto && (
        <div className="mt-2 rounded-xl bg-background/60 border border-border/60 p-4 space-y-2 text-[10px] font-mono break-all">
          {tx.range_proof && <div><span className="text-muted-foreground">range_proof:</span> {JSON.stringify(tx.range_proof).slice(0, 220)}…</div>}
          {tx.signature && <div><span className="text-muted-foreground">signature:</span> {String(tx.signature).slice(0, 220)}…</div>}
          {tx.source_commitments && <div><span className="text-muted-foreground">source_commitments:</span> {JSON.stringify(tx.source_commitments).slice(0, 220)}…</div>}
          <div className="text-muted-foreground/60">proofs verifying since block #1 — no amount has ever leaked.</div>
        </div>
      )}

      <div className="mt-6">
        <ExternalLinkChip href={explorerTxUrl(tx.hash)} label="Official explorer" />
      </div>
    </div>
  )
}

// ---- Account -------------------------------------------------------------------

function AccountDetail({ address, onClose, closeBtn, onOpenBlock }: {
  address: string
  onClose: () => void
  closeBtn: React.ReactNode
  onOpenBlock: (b: XelisBlock) => void
}) {
  const [nonce, setNonce] = useState<{ nonce: number; topoheight: number } | null>(null)
  const [regTopo, setRegTopo] = useState<number | null>(null)
  const [assets, setAssets] = useState<string[] | null>(null)
  const [balance, setBalance] = useState<any>(null)
  const [history, setHistory] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAddressNonce(address).then((n) => { if (!cancelled) setNonce(n) }).catch((e) => { if (!cancelled) setError(e?.message ?? 'Account not found — it may never have transacted.') })
    getRegistrationTopoheight(address).then((t) => { if (!cancelled) setRegTopo(t) }).catch(() => {})
    getAccountAssets(address).then((a) => { if (!cancelled) setAssets(a) }).catch(() => { if (!cancelled) setAssets([]) })
    getEncryptedBalance(address, XEL_ASSET).then((b) => { if (!cancelled) setBalance(b) }).catch(() => {})
    getAccountHistory(address).then((h) => { if (!cancelled) setHistory(Array.isArray(h) ? h.slice(0, 8) : []) }).catch(() => { if (!cancelled) setHistory([]) })
    return () => { cancelled = true }
  }, [address])
  void onClose

  const historyLabel = useCallback((h: any) => {
    if (h.mining) return { label: `mining reward ${fmtXEL(h.mining.reward)} XET`, color: 'text-vault' }
    if (h.outgoing) return { label: `outgoing → ${shortHash(h.outgoing.to, 8, 6)}`, color: 'text-cyan-300' }
    if (h.incoming) return { label: `incoming ← ${shortHash(h.incoming.from, 8, 6)}`, color: 'text-emerald-300' }
    if (h.burn) return { label: 'burn', color: 'text-orange-300' }
    if (h.invoke_contract) return { label: 'contract call', color: 'text-vlt' }
    if (h.deploy_contract) return { label: 'deploy', color: 'text-vlt' }
    return { label: 'activity', color: 'text-muted-foreground' }
  }, [])

  return (
    <div className="p-5 pb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <User className="w-4 h-4 text-vault" />
          <h2 className="font-display text-lg font-semibold">Account</h2>
        </div>
        {closeBtn}
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-background/40 border border-border/60 px-4 py-3">
        <Identicon seed={address} size={44} />
        <div className="min-w-0">
          <Copyable value={address} display={shortHash(address, 26, 14)} />
          <div className="text-[10px] font-mono text-muted-foreground mt-1">deterministic avatar from address</div>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-[12px] font-mono text-red-300">{error}</p>
      ) : (
        <>
          <div className="mt-4 rounded-xl bg-background/40 border border-border/60 px-4 py-2">
            <Row label="nonce">{nonce ? nonce.nonce : '…'}</Row>
            {regTopo !== null && (
              <Row label="registered">topo #{regTopo}</Row>
            )}
            <Row label="assets">
              {assets === null ? '…' : assets.length === 0 ? <span className="text-muted-foreground">none tracked</span> : <span>{assets.length}</span>}
            </Row>
            <Row label="balance">
              {balance?.version?.final_balance ? (
                <SealedChip note={`sealed · commitment ${shortHash(JSON.stringify(balance.version.final_balance.commitment ?? ''), 6, 4)}`} />
              ) : (
                <span className="text-muted-foreground">{balance ? 'no versioned balance yet' : '…'}</span>
              )}
            </Row>
          </div>

          {history && history.length > 0 && (
            <div className="mt-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-2">recent activity</div>
              <div className="space-y-1.5">
                {history.map((h, i) => {
                  const l = historyLabel(h)
                  return (
                    <button
                      key={`${h.hash}-${i}`}
                      onClick={() => h.hash && onOpenBlock({ hash: h.hash } as XelisBlock)}
                      className="w-full text-left rounded-xl border border-border/60 bg-background/40 hover:border-vault/40 transition-colors px-3.5 py-2.5 flex items-center gap-2"
                    >
                      <span className={`text-[11px] font-mono ${l.color}`}>{l.label}</span>
                      <span className="ml-auto text-[10px] font-mono text-muted-foreground">#{h.topoheight}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-6">
            <ExternalLinkChip href={explorerAddressUrl(address)} label="Official explorer" />
          </div>
        </>
      )}
    </div>
  )
}
