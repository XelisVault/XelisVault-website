'use client'

/**
 * NERVA watch-only tracker.
 *
 * Enter an address + its secret VIEW key: the scanner checks every output of
 * every transaction for the one-time keys that only the address can produce
 * (crypto.cpp math: P = B + Hs(8aR‖n)·G). Incoming payments appear; amounts
 * stay sealed (RingCT) and the spend key is never asked for — it should never
 * be typed anywhere except the official wallet.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Eye, Radar, ShieldCheck, ShieldAlert, Play, Square, Trash2, ArrowUpRight,
  Clock3, Blocks as BlocksIcon, KeyRound, Fingerprint, AlertTriangle,
} from 'lucide-react'

import { copyText, middleTruncate } from '@/lib/clipboard'
import {
  decodeAddress, viewKeyMatches, parseSecretKeyHex, bytesToHex,
} from '@/lib/nerva/cryptonote'
import { getBlockCount, NERVA_CONSTANTS } from '@/lib/nerva/api'
import {
  scanWatch, loadWatchState, saveWatchState, clearWatchState, mergeWatchState,
  type WatchMatch, type WatchProgress, type WatchState,
} from '@/lib/nerva/watch'

function MonoLabel({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[oklch(0.55_0.01_250)]">{children}</div>
}

/* quick presets: scan window sizes in blocks (60 s blocks) */
const WINDOWS = [
  { label: 'last hour', blocks: 60 },
  { label: 'last day', blocks: 1_440 },
  { label: 'last week', blocks: 10_080 },
  { label: 'last 15 days', blocks: 21_600 },
]

/* ───────────────── result card ───────────────── */

function MatchCard({ m, tip, onCopy }: { m: WatchMatch; tip: number; onCopy: (v: string, ok: boolean) => void }) {
  const confirmations = m.inPool ? 0 : Math.max(0, tip - m.height + 1)
  const settled = confirmations >= NERVA_CONSTANTS.spendableAge
  return (
    <div className="rounded-md border border-white/8 bg-white/[0.02] px-4 py-4 hover:border-[oklch(0.78_0.06_237)]/30 transition-colors">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {m.inPool ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-sm bg-[oklch(0.72_0.12_160)]/15 text-[oklch(0.78_0.12_150)]">
            <Clock3 className="w-3 h-3" /> in mempool
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-sm ${
            settled ? 'bg-[oklch(0.72_0.12_160)]/15 text-[oklch(0.78_0.12_150)]' : 'bg-[oklch(0.78_0.06_237)]/12 text-[oklch(0.85_0.07_237)]'
          }`}>
            <BlocksIcon className="w-3 h-3" /> {confirmations}/{NERVA_CONSTANTS.spendableAge} conf{settled ? ' · settled' : ''}
          </span>
        )}
        <span className="font-mono text-[11px] text-white/50">
          {m.inPool ? 'pending' : `block ${m.height.toLocaleString()}`} · {new Date(m.timestamp * 1000).toLocaleString()}
        </span>
        <span className="font-mono text-[10.5px] text-[oklch(0.8_0.13_290)]/80">
          {m.outputs.length} output{m.outputs.length > 1 ? 's' : ''} → you
        </span>
        <button
          type="button"
          onClick={() => { void copyText(m.txHash).then((ok) => onCopy(m.txHash, ok)) }}
          title="Copy tx hash"
          className="ml-auto font-mono text-[10.5px] text-[oklch(0.83_0.055_237)] hover:text-white transition-colors truncate max-w-[280px] sm:max-w-[360px]"
        >
          {middleTruncate(m.txHash, 16, 10)}
        </button>
        <a
          href={`https://explorer.nerva.one/?tx=${m.txHash}#tx_details`}
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/40 hover:text-[oklch(0.78_0.06_237)] transition-colors shrink-0"
        >
          explorer <ArrowUpRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

/* ───────────────── page ───────────────── */

type Phase = 'idle' | 'scanning' | 'done'

export function WatchWallet() {
  const [address, setAddress] = useState('')
  const [viewKey, setViewKey] = useState('')
  const [windowIdx, setWindowIdx] = useState(1) // default: last day
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState<WatchProgress | null>(null)
  const [state, setState] = useState<WatchState | null>(null)
  const [tip, setTip] = useState<number>(0)
  const [copied, setCopied] = useState('')
  const [scanNote, setScanNote] = useState<string | null>(null)
  const stopRef = useRef(false)

  /* static validation, all client-side */
  const decoded = useMemo(() => {
    const d = decodeAddress(address)
    return d && d.tag === 0x3800n ? d : null
  }, [address])
  const viewBytes = useMemo(() => parseSecretKeyHex(viewKey), [viewKey])
  const viewOk = useMemo(
    () => decoded && viewBytes ? viewKeyMatches(viewBytes, decoded.viewPub) : false,
    [decoded, viewBytes]
  )
  const formOk = decoded !== null && viewBytes !== null && viewOk

  /* prefill from localStorage watch state */
  useEffect(() => {
    try {
      const last = localStorage.getItem('nwatch:last')
      if (last) setAddress(last)
    } catch { /* noop */ }
  }, [])

  const onCopy = (v: string, ok: boolean) => {
    if (ok) { setCopied(v); setTimeout(() => setCopied(''), 1400) }
  }

  const startScan = useCallback(async () => {
    if (!decoded || !viewBytes || !viewOk) return
    stopRef.current = false
    setPhase('scanning')
    setScanNote(null)
    try {
      const tipHeight = await getBlockCount()
      setTip(tipHeight)
      const prev = loadWatchState(address)
      // resume from the cursor when it exists, else the chosen window
      const from = prev && prev.cursor > 0
        ? prev.cursor + 1
        : Math.max(0, tipHeight - WINDOWS[windowIdx].blocks + 1)
      const rangeBlocks = tipHeight - from + 1
      if (rangeBlocks > 21_600 + 60) {
        setScanNote(`History is long (${rangeBlocks.toLocaleString()} blocks). This session scans the newest 15 days in detail; re-run to advance further.`)
      }
      const result = await scanWatch(decoded.spendPub, viewBytes, from, tipHeight, {
        onProgress: (p) => setProgress(p),
        shouldStop: () => stopRef.current,
      })
      const merged = mergeWatchState(prev, result)
      setState(merged)
      saveWatchState(address, merged)
      try { localStorage.setItem('nwatch:last', address) } catch { /* noop */ }
      setScanNote((n) => n ?? `${result.checkedTxs.toLocaleString()} transactions checked across ${result.scannedBlocks.toLocaleString()} blocks.`)
    } catch {
      setScanNote('Scan interrupted — the network was unreachable. Press start again; progress is kept.')
    } finally {
      setPhase('done')
    }
  }, [decoded, viewBytes, viewOk, address, windowIdx])

  const forget = () => {
    clearWatchState(address)
    setState(null)
    setScanNote('Local record cleared (cursor and found payments). Next scan starts from the selected window.')
  }

  return (
    <div className="pt-32 sm:pt-36 pb-24">
      <div className="mx-auto max-w-5xl px-5 md:px-8">

        {/* hero */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <MonoLabel>Tools · Watch-only</MonoLabel>
          <h1 className="mt-4 text-3xl sm:text-[42px] leading-[1.05] font-bold text-white">
            Watch payments arrive,<br />
            <span className="text-[oklch(0.78_0.06_237)]">without the spend key</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[oklch(0.72_0.012_250)]">
            A view key can prove what arrived on an address without being able to
            spend a thing. The scanner replays the one-time-key math of the chain
            (<span className="font-mono text-[12px]">crypto.cpp</span>: output key = spendPub + Hs(8·view·txPub‖n)·G)
            over recent blocks, right in your browser. Perfect for cold storage,
            cashier duty, or proving a NervaLink payment landed.
          </p>
        </motion.div>

        {/* form */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-9 rounded-md border border-white/10 bg-white/[0.02] p-6"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="addr" className="font-mono text-[9px] uppercase tracking-[0.16em] text-[oklch(0.55_0.01_250)]">
                NERVA address (standard, NV…)
              </label>
              <input
                id="addr"
                value={address}
                onChange={(e) => { setAddress(e.target.value.trim()); setState(null) }}
                spellCheck={false}
                autoComplete="off"
                placeholder="NVAjsQEK9k…"
                className="mt-2 w-full rounded-md border border-white/12 bg-[oklch(0.12_0.018_255)] px-3.5 h-11 font-mono text-[12px] text-white outline-none focus:border-[oklch(0.78_0.06_237)]/50 transition-colors placeholder:text-white/20"
              />
              <div className="mt-1.5 font-mono text-[10px] min-h-[14px]">
                {address && !decoded && <span className="text-[oklch(0.7_0.12_50)]">not a valid standard NERVA address (97 chars, NV…)</span>}
              </div>
            </div>
            <div>
              <label htmlFor="vkey" className="font-mono text-[9px] uppercase tracking-[0.16em] text-[oklch(0.55_0.01_250)]">
                Secret view key (64 hex — it can only watch, never spend)
              </label>
              <input
                id="vkey"
                value={viewKey}
                onChange={(e) => setViewKey(e.target.value.trim())}
                spellCheck={false}
                autoComplete="off"
                placeholder="64 hexadecimal characters"
                className="mt-2 w-full rounded-md border border-white/12 bg-[oklch(0.12_0.018_255)] px-3.5 h-11 font-mono text-[12px] text-white outline-none focus:border-[oklch(0.78_0.06_237)]/50 transition-colors placeholder:text-white/20"
              />
              <div className="mt-1.5 font-mono text-[10px] min-h-[14px] flex items-center gap-1.5">
                {viewBytes && decoded && (
                  viewOk ? (
                    <span className="inline-flex items-center gap-1.5 text-[oklch(0.75_0.12_150)]">
                      <ShieldCheck className="w-3.5 h-3.5" /> view key verified: matches the address&apos;s public view key (a·G = A)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[oklch(0.7_0.12_50)]">
                      <ShieldAlert className="w-3.5 h-3.5" /> this view key does not match the address
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap gap-1.5">
                {WINDOWS.map((w, i) => (
                  <button
                    key={w.label}
                    onClick={() => setWindowIdx(i)}
                    className={`px-3 h-8 rounded-sm border font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                      windowIdx === i
                        ? 'border-[oklch(0.78_0.06_237)]/50 bg-[oklch(0.78_0.06_237)]/10 text-[oklch(0.88_0.1_225)]'
                        : 'border-white/10 text-white/50 hover:text-white/85 hover:border-white/25'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
              {phase === 'scanning' ? (
                <button
                  onClick={() => { stopRef.current = true }}
                  className="inline-flex h-11 items-center gap-2 rounded-md px-5 text-[13.5px] font-semibold border border-[oklch(0.7_0.15_45)]/50 text-[oklch(0.78_0.13_50)] hover:bg-[oklch(0.7_0.15_45)]/10 transition-colors"
                >
                  <Square className="w-4 h-4" /> Stop
                </button>
              ) : (
                <button
                  onClick={() => { void startScan() }}
                  disabled={!formOk}
                  className="inline-flex h-11 items-center gap-2 rounded-md px-6 text-[13.5px] font-semibold bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] hover:bg-[oklch(0.7_0.08_236)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" /> {state ? 'Scan again' : 'Start scanning'}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* progress */}
        <AnimatePresence>
          {phase === 'scanning' && progress && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-6 rounded-md border border-[oklch(0.78_0.06_237)]/25 bg-[oklch(0.78_0.06_237)]/[0.05] px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <Radar className="w-4 h-4 text-[oklch(0.78_0.06_237)] animate-pulse" />
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/75">
                  {progress.phase === 'headers' && 'fetching block headers…'}
                  {progress.phase === 'mempool' && 'checking mempool…'}
                  {progress.phase === 'txs' && 'checking transactions…'}
                </span>
                <span className="ml-auto font-mono text-[10px] text-white/45 tabular-nums">
                  {progress.phase === 'headers'
                    ? `${progress.scanned.toLocaleString()} / ${progress.total.toLocaleString()} blocks`
                    : progress.phase === 'txs'
                      ? `${progress.scanned} / ${progress.total} tx-blocks`
                      : `${progress.total} pending`}
                </span>
              </div>
              <div className="mt-3 h-[3px] rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[oklch(0.78_0.06_237)] transition-[width] duration-300"
                  style={{
                    width: progress.phase === 'headers'
                      ? `${Math.min(100, (progress.scanned / Math.max(1, progress.total)) * 100)}%`
                      : progress.phase === 'txs'
                        ? `${Math.min(100, (progress.scanned / Math.max(1, progress.total)) * 100)}%`
                        : '100%',
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* results */}
        {state && phase !== 'scanning' && (
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="mt-8"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[20px] font-semibold text-white">
                {state.matches.length === 0
                  ? 'No incoming payments found'
                  : `${state.matches.length} payment${state.matches.length > 1 ? 's' : ''} detected`}
              </h2>
              {state.cursor > 0 && (
                <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[oklch(0.55_0.01_250)]">
                  scanned up to block {state.cursor.toLocaleString()}
                </span>
              )}
              {state.matches.length > 0 && (
                <button
                  onClick={forget}
                  className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-sm border border-white/10 font-mono text-[9.5px] uppercase tracking-[0.1em] text-white/50 hover:text-[oklch(0.75_0.13_50)] hover:border-[oklch(0.7_0.15_45)]/40 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> clear local record
                </button>
              )}
            </div>

            {state.matches.length > 0 && (
              <div className="mt-4 space-y-2.5">
                {state.matches.slice().reverse().map((m) => (
                  <MatchCard key={m.txHash} m={m} tip={tip || state.cursor} onCopy={onCopy} />
                ))}
              </div>
            )}

            {scanNote && (
              <div className="mt-4 flex gap-2.5 rounded-md border border-white/8 bg-white/[0.02] px-4 py-3">
                <Fingerprint className="w-4 h-4 mt-0.5 shrink-0 text-[oklch(0.78_0.06_237)]" />
                <p className="text-[12px] leading-relaxed text-[oklch(0.7_0.01_250)]">{scanNote}</p>
              </div>
            )}

            <div className="mt-4 flex gap-2.5 rounded-md border border-[oklch(0.7_0.15_45)]/25 bg-[oklch(0.7_0.15_45)]/[0.05] px-4 py-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-[oklch(0.75_0.15_60)]" />
              <p className="text-[12px] leading-relaxed text-[oklch(0.75_0.01_250)]">
                Amounts are not shown: RingCT seals them, and only the full wallet
                (spend key) can open the commitments. If nothing appears while you
                expected a payment, it may predate the scanned window or use a
                subaddress — subaddresses are not scanned here.
              </p>
            </div>
          </motion.div>
        )}

        {/* privacy model */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 grid sm:grid-cols-3 gap-3.5"
        >
          <div className="rounded-md border border-white/8 bg-white/[0.02] p-5">
            <KeyRound className="w-4 h-4 text-[oklch(0.78_0.06_237)]" />
            <div className="mt-3 font-semibold text-[13.5px] text-white">What the view key sees</div>
            <p className="mt-2 text-[12px] leading-relaxed text-[oklch(0.68_0.012_250)]">
              Every output your address can claim, as it lands, with tx hashes and
              confirmations. Enough to act, nothing to steal.
            </p>
          </div>
          <div className="rounded-md border border-white/8 bg-white/[0.02] p-5">
            <Eye className="w-4 h-4 text-[oklch(0.78_0.06_237)]" />
            <div className="mt-3 font-semibold text-[13.5px] text-white">What it never sees</div>
            <p className="mt-2 text-[12px] leading-relaxed text-[oklch(0.68_0.012_250)]">
              Amounts (sealed by RingCT), what you sent, and the spend key — the
              scan works from public chain data plus the view key only.
            </p>
          </div>
          <div className="rounded-md border border-white/8 bg-white/[0.02] p-5">
            <Radar className="w-4 h-4 text-[oklch(0.78_0.06_237)]" />
            <div className="mt-3 font-semibold text-[13.5px] text-white">Where it runs</div>
            <p className="mt-2 text-[12px] leading-relaxed text-[oklch(0.68_0.012_250)]">
              Entirely in this browser, against the public explorer API. The cursor
              and found payments persist locally per address — this device only.
            </p>
          </div>
        </motion.div>

        {/* cross-links */}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/nerva/paper-wallet"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-white/10 bg-white/[0.02] text-[13px] font-medium text-white/75 hover:border-[oklch(0.78_0.06_237)]/40 hover:text-white transition-colors"
          >
            <KeyRound className="w-4 h-4 text-[oklch(0.78_0.06_237)]" /> Mint a paper wallet (keys + mnemonic)
          </Link>
          <Link
            href="/nerva/link"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-white/10 bg-white/[0.02] text-[13px] font-medium text-white/75 hover:border-[oklch(0.78_0.06_237)]/40 hover:text-white transition-colors"
          >
            <Eye className="w-4 h-4 text-[oklch(0.78_0.06_237)]" /> Collect payments with a NervaLink
          </Link>
        </div>
      </div>
    </div>
  )
}
