'use client'

/**
 * Block & transaction detail panels for the NERVA explorer.
 *
 * Interesting part: `tx_extra` is parsed on the fly (CryptoNote TLV) to
 * surface the tx public key and payment-id presence, including the
 * clear "long" payment ids used by NervaLink invoices.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  X, Boxes, ArrowLeft, ExternalLink, Cpu, Coins, Unlock, Hash as HashIcon,
  FileJson, AlertCircle, Loader2,
} from 'lucide-react'
import { CopyButton, Mono } from '@/components/nerva/explorer/bits'
import { parseTxExtra, bytesToHex } from '@/lib/nerva/tx-extra'
import {
  getBlock, getTransactions, formatXnv, formatTimestamp, timeAgo,
  shortenHash, formatBytes, NERVA_LINKS, NERVA_CONSTANTS,
  type NervaBlock, type NervaTransaction, type NervaBlockHeader,
} from '@/lib/nerva/api'

/* ───────────── bits ───────────── */

function Row({ label, children, mono = true }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-white/6 last:border-0">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[oklch(0.57_0.012_250)] pt-0.5 shrink-0">{label}</span>
      <span className={`text-right text-[12px] text-white/85 ${mono ? 'font-mono tabular-nums' : ''} break-all min-w-0`}>{children}</span>
    </div>
  )
}

function Badge({ children, tone = 'cyan' }: { children: React.ReactNode; tone?: 'cyan' | 'violet' | 'green' | 'neutral' | 'red' }) {
  const tones = {
    cyan: 'bg-[oklch(0.78_0.06_237)]/14 text-[oklch(0.85_0.1_220)] border-[oklch(0.78_0.06_237)]/25',
    violet: 'bg-[oklch(0.62_0.08_306)]/16 text-[oklch(0.74_0.07_306)] border-[oklch(0.62_0.08_306)]/28',
    green: 'bg-[oklch(0.72_0.12_160)]/14 text-[oklch(0.75_0.11_160)] border-[oklch(0.72_0.12_160)]/25',
    neutral: 'bg-white/6 text-white/50 border-white/12',
    red: 'bg-[oklch(0.65_0.17_25)]/14 text-[oklch(0.78_0.14_25)] border-[oklch(0.65_0.17_25)]/30',
  }
  return <span className={`inline-flex items-center font-mono text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-md border ${tones[tone]}`}>{children}</span>
}

function Loading({ label }: { label: string }) {
  return (
    <div className="panel-nerva rounded-md p-8 flex flex-col items-center gap-3">
      <Loader2 className="w-5 h-5 text-[oklch(0.78_0.06_237)] animate-spin" />
      <span className="font-mono text-[11px] text-[oklch(0.6_0.012_250)]">{label}…</span>
    </div>
  )
}

function ErrorPanel({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="panel-nerva rounded-md p-6">
      <div className="flex items-center gap-2.5">
        <AlertCircle className="w-4.5 h-4.5 w-[18px] h-[18px] text-[oklch(0.75_0.14_25)]" />
        <span className="text-[13px] text-white/85 font-medium">Lookup failed</span>
        <button onClick={onClose} className="ml-auto p-1.5 rounded-md hover:bg-white/8 text-white/40" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="mt-2.5 text-[12px] text-[oklch(0.66_0.025_250)]">{message}</p>
    </div>
  )
}

/* ───────────── block detail ───────────── */

export function BlockDetail({ hash, onClose, onOpenTx }: { hash: string; onClose: () => void; onOpenTx: (hash: string) => void }) {
  const [block, setBlock] = useState<NervaBlock | null>(null)
  const [txs, setTxs] = useState<NervaTransaction[]>([])
  const [error, setError] = useState('')
  const [loadingTxs, setLoadingTxs] = useState(false)

  useEffect(() => {
    let alive = true
    setBlock(null); setTxs([]); setError('')
    ;(async () => {
      try {
        const b = await getBlock(hash)
        if (!alive) return
        setBlock(b)
        const hashes = b?.json?.tx_hashes ?? []
        if (hashes.length > 0) {
          setLoadingTxs(true)
          const t = await getTransactions(hashes)
          if (alive) setTxs(t)
        }
      } catch {
        if (alive) setError('Block not found: it may be orphaned or the network is unreachable.')
      } finally {
        if (alive) setLoadingTxs(false)
      }
    })()
    return () => { alive = false }
  }, [hash])

  if (error) return <ErrorPanel message={error} onClose={onClose} />
  if (!block) return <Loading label="fetching block" />

  const h: NervaBlockHeader = block.block_header
  const coinbase = txs.find((t) => t.block_height === h.height && (t.json?.vin?.[0] as any)?.gen) ?? null
  const transfers = txs.filter((t) => t.tx_hash !== coinbase?.tx_hash)

  return (
    <div className="panel-nerva rounded-md overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/8">
        <Boxes className="w-4 h-4 text-[oklch(0.78_0.06_237)]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.6_0.012_250)]">
          Block #{h.height.toLocaleString()}
        </span>
        <a
          href={`${NERVA_LINKS.explorer}/?hash=${hash}#block` }
          target="_blank"
          rel="noreferrer"
          className="ml-1 text-white/30 hover:text-[oklch(0.78_0.06_237)] transition-colors"
          aria-label="View on official explorer"
          title="View on the official NERVA explorer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button onClick={onClose} className="ml-auto p-1.5 rounded-md hover:bg-white/8 text-white/40" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 max-h-[calc(100vh-320px)] overflow-y-auto">
        <Row label="Hash">
          <span className="inline-flex items-center gap-1.5">{shortenHash(hash, 14, 10)} <CopyButton text={hash} /></span>
        </Row>
        <Row label="Prev hash"><span className="inline-flex items-center gap-1.5">{shortenHash(h.prev_hash, 10, 6)} <CopyButton text={h.prev_hash} /></span></Row>
        <Row label="Timestamp">{formatTimestamp(h.timestamp)} <span className="text-white/40">({timeAgo(h.timestamp)})</span></Row>
        <Row label="Reward">{formatXnv(h.reward, 4)} XNV</Row>
        <Row label="Size">{formatBytes(h.block_size)}</Row>
        <Row label="Transactions">{String(h.num_txes ?? 0)} {h.num_txes === 0 && <Badge tone="neutral">coinbase only · 86 B</Badge>}</Row>
        <Row label="Difficulty">{h.difficulty.toLocaleString()}</Row>
        <Row label="Cumulative">{(Number(h.cumulative_difficulty) / 1e12).toFixed(2)} T</Row>
        <Row label="Version">v{h.major_version}.{h.minor_version} {h.major_version >= 13 && <Badge tone="violet">CN-Adaptive v6</Badge>}</Row>
        <Row label="Nonce">{h.nonce.toLocaleString()}</Row>
        {h.miner_tx_hash && (
          <Row label="Miner tx">
            <button
              onClick={() => onOpenTx(h.miner_tx_hash!)}
              className="text-[oklch(0.78_0.06_237)] hover:text-[oklch(0.9_0.1_215)] transition-colors underline decoration-dotted underline-offset-2"
            >
              {shortenHash(h.miner_tx_hash, 12, 8)}
            </button>
          </Row>
        )}

        {/* transactions */}
        {loadingTxs && (
          <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-[oklch(0.6_0.012_250)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> loading transactions…
          </div>
        )}
        {transfers.length > 0 && (
          <div className="mt-4">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[oklch(0.57_0.012_250)] mb-2 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" /> Transfers in this block
            </div>
            <div className="space-y-2">
              {transfers.map((t) => (
                <button
                  key={t.tx_hash}
                  onClick={() => onOpenTx(t.tx_hash)}
                  className="w-full rounded-lg border border-white/8 bg-white/[0.03] hover:border-[oklch(0.78_0.06_237)]/40 hover:bg-[oklch(0.78_0.06_237)]/6 px-3.5 py-2.5 text-left transition-all group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Mono className="text-[11px] text-white/70 group-hover:text-[oklch(0.86_0.1_220)]">{shortenHash(t.tx_hash, 12, 8)}</Mono>
                    {(() => {
                      const parsed = parseTxExtra(t.json?.extra)
                      return parsed.paymentIdLong ? <Badge tone="violet">payment id</Badge> : null
                    })()}
                  </div>
                  <div className="mt-1 font-mono text-[9.5px] text-[oklch(0.55_0.01_250)]">
                    {(t.json?.vin?.length ?? 0)} inputs · {(t.json?.vout?.length ?? 0)} outputs · amount encrypted (RingCT)
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {!loadingTxs && transfers.length === 0 && (h.num_txes ?? 0) === 0 && (
          <div className="mt-4 rounded-lg border border-white/8 bg-white/[0.02] px-3.5 py-3 font-mono text-[10px] text-[oklch(0.57_0.012_250)] flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5" /> This block contains only the miner reward: the solo miner&rsquo;s 0.3 XNV.
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────────── transaction detail ───────────── */

export function TxDetail({ hash, onClose, onBackToBlock }: { hash: string; onClose: () => void; onBackToBlock: (hash: string) => void }) {
  const [tx, setTx] = useState<NervaTransaction | null>(null)
  const [block, setBlock] = useState<NervaBlock | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setTx(null); setBlock(null); setError('')
    ;(async () => {
      try {
        const [t] = await getTransactions([hash])
        if (!alive) return
        if (!t) { setError('Transaction not found on-chain or in the mempool.'); return }
        setTx(t)
        if (!t.in_pool && t.block_height) {
          try {
            const { getBlockHeaderByHeight, getBlock } = await import('@/lib/nerva/api')
            const bh = await getBlockHeaderByHeight(t.block_height)
            const b = await getBlock(bh.hash)
            if (alive) setBlock(b)
          } catch { /* header fetch failed, fine */ }
        }
      } catch {
        if (alive) setError('Transaction lookup failed: the network may be unreachable.')
      }
    })()
    return () => { alive = false }
  }, [hash])

  if (error) return <ErrorPanel message={error} onClose={onClose} />
  if (!tx) return <Loading label="fetching transaction" />

  const parsed = parseTxExtra(tx.json?.extra)
  const isCoinbase = (tx.json?.vin?.[0] as any)?.gen != null
  const coinbaseAmount = isCoinbase ? (tx.json?.vout?.[0]?.amount ?? 0) : 0
  const outputs = tx.json?.vout ?? []
  const rctType = tx.json?.rct_signatures?.type

  return (
    <div className="panel-nerva rounded-md overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/8">
        <HashIcon className="w-4 h-4 text-[oklch(0.78_0.06_237)]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.6_0.012_250)]">Transaction</span>
        {tx.in_pool ? <Badge tone="green">in mempool</Badge> : <Badge>confirmed</Badge>}
        {isCoinbase && <Badge tone="violet">coinbase</Badge>}
        <button onClick={onClose} className="ml-auto p-1.5 rounded-md hover:bg-white/8 text-white/40" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 max-h-[calc(100vh-320px)] overflow-y-auto">
        <Row label="Hash">
          <span className="inline-flex items-center gap-1.5">{shortenHash(hash, 12, 8)} <CopyButton text={hash} /></span>
        </Row>
        {tx.in_pool ? (
          <Row label="Status"><span className="text-[oklch(0.75_0.11_160)]">waiting in the mempool, not yet in a block</span></Row>
        ) : (
          <>
            <Row label="Block">
              {block ? (
                <span className="inline-flex items-center gap-2">
                  <button onClick={() => onBackToBlock(block.block_header.hash)} className="inline-flex items-center gap-1.5 text-[oklch(0.78_0.06_237)] hover:text-[oklch(0.9_0.1_215)] transition-colors">
                    <ArrowLeft className="w-3 h-3" /> #{tx.block_height?.toLocaleString()}
                  </button>
                </span>
              ) : (
                <>#{tx.block_height?.toLocaleString()}</>
              )}
            </Row>
            <Row label="Timestamp">{tx.block_timestamp ? formatTimestamp(tx.block_timestamp) : 'n/a'}</Row>
          </>
        )}

        {isCoinbase ? (
          <>
            <Row label="Type">miner reward <Badge tone="violet">generation</Badge></Row>
            <Row label="Amount">
              <span className="text-[oklch(0.78_0.06_237)] font-semibold">{formatXnv(coinbaseAmount)} XNV</span>
            </Row>
            <Row label="Unlock">
              <span className="inline-flex items-center gap-1.5"><Unlock className="w-3 h-3 opacity-60" /> height {tx.json?.unlock_time} ({NERVA_CONSTANTS.coinbaseMaturity}-block maturity)</span>
            </Row>
          </>
        ) : (
          <>
            <Row label="Inputs">
              <span className="inline-flex items-center gap-1.5">{tx.json?.vin?.length ?? 0} <Badge tone="violet">ring ×{NERVA_CONSTANTS.ringSize}</Badge></span>
            </Row>
            <Row label="Outputs">{outputs.length}</Row>
            <Row label="Amount">
              <span className="inline-flex items-center gap-1.5 text-white/60">
                encrypted <Coins className="w-3 h-3 opacity-60" />
              </span>
              <span className="block text-[10px] text-[oklch(0.55_0.01_250)] mt-0.5">RingCT hides transfer amounts; only the network can verify no inflation</span>
            </Row>
            <Row label="RingCT type">{rctType != null ? `type ${rctType}` : 'n/a'}</Row>
            {tx.json?.unlock_time ? (
              <Row label="Unlock">
                <span className="inline-flex items-center gap-1.5"><Unlock className="w-3 h-3 opacity-60" /> {tx.json.unlock_time > 1e9 ? 'time-locked' : `+${Math.max(0, Number(tx.json.unlock_time) - (tx.block_height ?? 0))} blocks (spendable age ${NERVA_CONSTANTS.spendableAge})`}</span>
              </Row>
            ) : null}
          </>
        )}

        {/* tx_extra, parsed live */}
        <div className="mt-4 rounded-lg border border-white/8 bg-white/[0.02] px-3.5 py-3">
          <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[oklch(0.57_0.012_250)]">
            <FileJson className="w-3.5 h-3.5" /> tx_extra, parsed ({(tx.json?.extra ?? []).length} bytes)
          </div>
          <div className="mt-2.5 space-y-1.5 font-mono text-[11px]">
            {parsed.txPubkey && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[oklch(0.6_0.012_250)] text-[9.5px] uppercase tracking-[0.12em]">tx pubkey</span>
                <span className="text-white/70">{bytesToHex(parsed.txPubkey).slice(0, 20)}… <CopyButton text={bytesToHex(parsed.txPubkey)} /></span>
              </div>
            )}
            {parsed.paymentIdLong && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[oklch(0.74_0.07_306)] text-[9.5px] uppercase tracking-[0.12em]">payment id (clear)</span>
                <span className="text-[oklch(0.74_0.07_306)]">{parsed.paymentIdLong.slice(0, 16)}… <CopyButton text={parsed.paymentIdLong} /></span>
              </div>
            )}
            {parsed.paymentIdShort && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[oklch(0.57_0.012_250)] text-[9.5px] uppercase tracking-[0.12em]">payment id (encrypted)</span>
                <span className="text-white/55">{bytesToHex(parsed.paymentIdShort)} · needs view key</span>
              </div>
            )}
            {parsed.mergeMining && (
              <div className="text-white/50 text-[10px]">merge-mining tag present</div>
            )}
            {!parsed.txPubkey && !parsed.paymentIdLong && !parsed.paymentIdShort && (
              <div className="text-white/40 text-[10px]">no payment id carried, pure private transfer</div>
            )}
          </div>
        </div>

        {/* output keys */}
        {outputs.length > 0 && outputs[0]?.target?.key && (
          <div className="mt-3">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[oklch(0.57_0.012_250)] mb-2">
              one-time output keys
            </div>
            <div className="space-y-1">
              {outputs.slice(0, 4).map((o, i) => (
                <div key={i} className="font-mono text-[10px] text-white/55 flex items-center gap-2">
                  <span className="text-[oklch(0.5_0.01_250)]">#{i}</span>
                  {o.target?.key ? shortenHash(o.target.key, 10, 6) : 'n/a'}
                  {isCoinbase && i === 0 && <span className="text-[oklch(0.75_0.11_160)]">{formatXnv(o.amount)} XNV</span>}
                </div>
              ))}
              {outputs.length > 4 && <div className="font-mono text-[9.5px] text-[oklch(0.5_0.01_250)]">+{outputs.length - 4} more…</div>}
            </div>
          </div>
        )}

        <div className="mt-4">
          <a
            href={`${NERVA_LINKS.explorer}/?hash=${hash}#tx`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-white/45 hover:text-[oklch(0.78_0.06_237)] transition-colors uppercase tracking-[0.1em]"
          >
            On the official explorer <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
