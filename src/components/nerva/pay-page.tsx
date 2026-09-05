'use client'

/**
 * NervaLink checkout: the payment page.
 *
 * The invoice is decoded from the URL (stateless), a QR of the `nerva:` URI
 * is rendered locally, and the page polls the public explorer API every
 * ~10s (with jitter) to follow the payment: mempool → 1 confirmation →
 * 10 confirmations (spendable). No third-party script, no storage.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy, Check, Wallet, Radar, Clock, ShieldCheck, ExternalLink,
  AlertTriangle, CheckCircle2, Loader2, LinkIcon, EyeOff,
} from 'lucide-react'
import {
  decodeInvoice, buildNervaUri, renderQrDataUrl, detectPayment,
  invoicePhase, loadPaymentCache, savePaymentCache, clearPaymentCache,
  type NervaInvoice, type DetectionResult, type ScanProgress,
} from '@/lib/nerva/nlink'
import { atomicToDisplay } from '@/lib/nerva/nlink'
import { getBlockCount, shortenHash, formatTimestamp, NERVA_LINKS, NERVA_CONSTANTS } from '@/lib/nerva/api'
import { copyText } from '@/lib/clipboard'

/* ───────────── countdown ───────────── */

function useCountdown(expiresAt: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const left = Math.max(0, expiresAt - now)
  const h = Math.floor(left / 3_600_000)
  const m = Math.floor((left % 3_600_000) / 60_000)
  const s = Math.floor((left % 60_000) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return { expired: left <= 0, text: `${pad(h)}:${pad(m)}:${pad(s)}` }
}

/* ───────────── status ring ───────────── */

type Phase = DetectionResult['status'] | 'link-expired'

type PhaseIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties }>

const PHASES: Record<Phase, { label: string; sub: string; color: string; icon: PhaseIcon }> = {
  pending: {
    label: 'Listening for your payment',
    sub: 'Scanning the mempool and every new block · every 10 seconds',
    color: 'oklch(0.78 0.06 237)',
    icon: Radar,
  },
  detected: {
    label: 'Payment seen',
    sub: 'Your transaction is on the network, waiting for its first block',
    color: 'oklch(0.78 0.13 290)',
    icon: EyeOff,
  },
  confirmed: {
    label: 'Payment confirmed',
    sub: 'Included in a block, follow it to full settlement',
    color: 'oklch(0.8 0.11 200)',
    icon: CheckCircle2,
  },
  settled: {
    label: 'Payment settled',
    sub: '10 confirmations, the funds are spendable on the receiver side',
    color: 'oklch(0.72 0.12 160)',
    icon: CheckCircle2,
  },
  expired: {
    label: 'Link expired',
    sub: 'This invoice passed its lifetime, ask the merchant for a fresh link',
    color: 'oklch(0.65 0.15 25)',
    icon: Clock,
  },
  'link-expired': {
    label: 'Link expired',
    sub: 'This invoice passed its lifetime, ask the merchant for a fresh link',
    color: 'oklch(0.65 0.15 25)',
    icon: Clock,
  },
}

function StatusRing({ phase, confirmations }: { phase: Phase; confirmations: number }) {
  const conf = PHASES[phase]
  const target = NERVA_CONSTANTS.spendableAge
  const pct = phase === 'expired' || phase === 'link-expired' ? 0 : Math.min(1, confirmations / target)
  const Icon: PhaseIcon = conf.icon
  const R = 44
  const C = 2 * Math.PI * R
  return (
    <div className="relative w-[108px] h-[108px] shrink-0">
      <svg viewBox="0 0 108 108" className="w-full h-full -rotate-90">
        <circle cx="54" cy="54" r={R} fill="none" stroke="oklch(0.93 0.012 250 / 10%)" strokeWidth="3.5" />
        <motion.circle
          cx="54" cy="54" r={R} fill="none"
          stroke={conf.color} strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={C}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 8px ${conf.color} / 0.5)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Icon className={`w-6 h-6 ${(phase === 'pending' || phase === 'detected') ? 'animate-pulse' : ''}`} style={{ color: conf.color }} />
        {confirmations > 0 && (
          <div className="mt-1 font-mono text-[13px] font-bold tabular-nums" style={{ color: conf.color }}>
            {confirmations}/{target}
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────────── the checkout page ───────────── */

const STATUS_RANK: Record<string, number> = { pending: 0, detected: 1, confirmed: 2, settled: 3, expired: 0 }

/** never regress: once a payment is seen on-chain it stays seen */
function mergeResults(prev: DetectionResult | null, r: DetectionResult): DetectionResult {
  if (!prev) return r
  if ((STATUS_RANK[r.status] ?? 0) > (STATUS_RANK[prev.status] ?? 0)) return r
  if (r.status === prev.status && r.status !== 'pending') return r // fresher confirmations
  return prev
}

export function PayPage() {
  const params = useSearchParams()
  const token = params.get('d') ?? ''
  const invoice = useMemo(() => decodeInvoice(token), [token])

  const [qr, setQr] = useState<string | null>(null)
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [netHeight, setNetHeight] = useState<number>(0)
  const [copied, setCopied] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [scan, setScan] = useState<ScanProgress | null>(null)
  const [verified, setVerified] = useState(false)
  const [hasLocal, setHasLocal] = useState(false)
  const countdown = useCountdown(invoice ? invoice.exp * 1000 : 0)

  const busy = useRef(false)
  const knownTx = useRef<string | undefined>(undefined)
  const cursor = useRef<number>(-1)
  const resultRef = useRef<DetectionResult | null>(null)
  const verifiedRef = useRef(false)

  const uri = useMemo(() => (invoice ? buildNervaUri(invoice) : ''), [invoice])

  /* a payment found earlier is remembered in THIS browser (the data never
     leaves it): rehydrate it so a revisit shows the paid state instantly,
     while the watcher below re-verifies it against the chain */
  useEffect(() => {
    if (!invoice) return
    const cached = loadPaymentCache(invoice.pid)
    if (cached) {
      knownTx.current = cached.txHash
      setHasLocal(true)
      const provisional: DetectionResult = {
        status: cached.status,
        txHash: cached.txHash,
        blockHeight: cached.blockHeight,
        txTimestamp: cached.txTimestamp,
        inPool: cached.inPool,
        confirmations: cached.confirmations,
        checkedTxs: 0,
        scannedBlocks: 0,
        networkHeight: cached.networkHeight,
      }
      resultRef.current = provisional
      setResult(provisional)
    }
  }, [invoice])

  /* QR generated locally, never via a third-party service */
  useEffect(() => {
    if (!invoice) return
    let alive = true
    void renderQrDataUrl(buildNervaUri(invoice), 420).then((url) => {
      if (alive) setQr(url)
    }).catch(() => {})
    return () => { alive = false }
  }, [invoice])

  /* the watcher: verify the known tx hash (instant, age-independent), then
     scan the FULL history since link creation — paged, with progress — and
     afterwards follow the mempool + each new block. A payment, once found,
     is saved locally so refreshing or coming back days later still shows
     the paid state with its receipt */
  const watch = useCallback(async () => {
    if (!invoice || busy.current) return
    if (resultRef.current?.status === 'settled' && verifiedRef.current) return
    busy.current = true
    try {
      const tip = await getBlockCount()
      setNetHeight(tip)
      const { result: r, scannedUpTo } = await detectPayment(invoice, tip, {
        knownTxHash: knownTx.current,
        scanFrom: cursor.current + 1,
        onProgress: setScan,
      })
      if (scannedUpTo > cursor.current) cursor.current = scannedUpTo
      if (r.status !== 'pending' && r.txHash) {
        knownTx.current = r.txHash
        savePaymentCache(invoice.pid, r)
        setHasLocal(true)
      }
      setResult((prev) => {
        const merged = mergeResults(prev, r)
        resultRef.current = merged
        return merged
      })
      setOffline(false)
      setVerified(true)
      verifiedRef.current = true
    } catch {
      setOffline(true)
    } finally {
      setScan(null)
      busy.current = false
    }
  }, [invoice])

  useEffect(() => {
    if (!invoice) return
    void watch()
    const jitter = 9500 + Math.random() * 2500
    const id = setInterval(() => void watch(), jitter)
    return () => clearInterval(id)
  }, [invoice, watch])

  const forgetLocal = () => {
    if (!invoice) return
    clearPaymentCache(invoice.pid)
    knownTx.current = undefined
    setHasLocal(false)
  }

  /* invalid link screen */
  if (!invoice) {
    return (
      <div className="relative pt-36 pb-32 flex items-center justify-center min-h-screen">
        <div className="absolute inset-0 circuit-bg opacity-25" />
        <div className="relative panel-nerva rounded-lg p-8 max-w-md mx-5 text-center">
          <AlertTriangle className="w-9 h-9 mx-auto text-[oklch(0.75_0.13_80)]" />
          <h1 className="mt-5 text-xl font-bold text-white">This payment link is invalid</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-[oklch(0.66_0.025_250)]">
            The link was truncated, corrupted, or created by a different tool. Ask
            the merchant for a fresh NervaLink.
          </p>
          <Link
            href="/nerva/link"
            className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-md px-6 text-[13.5px] font-semibold bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] hover:bg-[oklch(0.7_0.08_236)] transition-colors"
          >
            <LinkIcon className="w-4 h-4" /> Create one yourself
          </Link>
        </div>
      </div>
    )
  }

  /* a payment, once seen, always wins over the link's own expiry */
  const paid = !!result && (result.status === 'detected' || result.status === 'confirmed' || result.status === 'settled')
  const phase: Phase = paid
    ? (result as DetectionResult).status
    : invoicePhase(invoice) === 'expired' ? 'link-expired' : 'pending'
  const conf = PHASES[phase]
  const freeAmount = invoice.amt === '0'
  const showTx = result?.txHash
  const settled = phase === 'settled'

  const copy = (text: string, key: string) => {
    void copyText(text).then((ok) => {
      if (!ok) return
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  return (
    <div className="relative pt-28 pb-24 min-h-screen">
      <div className="absolute inset-0 circuit-bg opacity-25" />
      <div
        className="absolute inset-x-0 top-0 h-[380px]"
        style={{
          background:
            phase === 'settled'
              ? 'radial-gradient(ellipse 70% 60% at 50% 0%, oklch(0.2 0.07 160 / 0.35), transparent 70%)'
              : 'radial-gradient(ellipse 70% 60% at 50% 0%, oklch(0.19 0.04 250 / 0.4), transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-xl px-5">
        {/* merchant header */}
        <div className="text-center">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.32em] text-[oklch(0.6_0.012_250)]">
            NervaLink checkout
          </div>
          <div className="mt-3 flex items-center justify-center gap-2.5">
            <img src="/images/nerva/nerva-mark.png" alt="" className="w-5 h-5" />
            <span className="font-mono font-bold tracking-[0.18em] text-white text-[15px]">
              {invoice.n || 'NERVA payment'}
            </span>
          </div>
          {invoice.d && (
            <div className="mt-2.5 text-[13px] text-[oklch(0.7_0.012_250)]">{invoice.d}</div>
          )}
        </div>

        {/* amount */}
        <div className="mt-8 text-center">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.26em] text-[oklch(0.58_0.025_250)]">
            Amount requested
          </div>
          <div className="mt-2.5 font-mono font-bold tabular-nums text-[40px] leading-none text-gradient-nerva">
            {freeAmount ? 'Any amount' : atomicToDisplay(invoice.amt)}
            {!freeAmount && <span className="text-[20px] ml-2 text-[oklch(0.7_0.08_220)]">XNV</span>}
          </div>
          {freeAmount && (
            <div className="mt-2 font-mono text-[11px] text-[oklch(0.55_0.01_250)]">
              the payer chooses the sum, a donation-style link
            </div>
          )}
        </div>

        {/* status card */}
        <motion.div
          layout
          className="mt-8 panel-nerva rounded-lg p-6 sm:p-7"
        >
          <div className="flex items-center gap-5 sm:gap-6">
            <StatusRing phase={phase} confirmations={result?.confirmations ?? 0} />
            <div className="min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="font-semibold text-[16px] text-white">{conf.label}</div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[oklch(0.66_0.025_250)]">
                    {conf.sub}
                  </p>
                  {phase === 'pending' && (
                    <div className="mt-2.5 inline-flex items-center gap-2 font-mono text-[10px] text-[oklch(0.6_0.012_250)]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {offline ? 'reconnecting to the network…' : `network height ${netHeight.toLocaleString()} · scanned ${result?.scannedBlocks ?? 0} blocks`}
                    </div>
                  )}
                  {showTx && (
                    <a
                      href={`${NERVA_LINKS.explorer}/?hash=${result.txHash}#tx`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1.5 font-mono text-[11px] text-[oklch(0.78_0.06_237)] hover:text-[oklch(0.9_0.1_215)] transition-colors"
                    >
                      tx {shortenHash(result.txHash!, 10, 6)} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* deep-scan progress: the page is actively searching the history */}
          {phase === 'pending' && scan && scan.total > 2 && (
            <div className="mt-5 pt-4 border-t border-white/8">
              <div className="flex items-center justify-between font-mono text-[10px] text-[oklch(0.6_0.012_250)]">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {scan.phase === 'headers' ? 'searching the chain history' : 'inspecting blocks with transactions'}
                </span>
                <span className="tabular-nums">{scan.scanned}/{scan.total}</span>
              </div>
              <div className="mt-2.5 h-1 rounded-full bg-white/8 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: conf.color }}
                  animate={{ width: `${Math.max(3, Math.round((scan.scanned / scan.total) * 100))}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* countdown */}
          {invoice.exp > 0 && !paid && (
            <div className="mt-5 pt-4 border-t border-white/8 flex items-center justify-between">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[oklch(0.55_0.025_250)]">
                Link expires in
              </span>
              <span className={`font-mono tabular-nums text-[14px] font-semibold ${countdown.expired ? 'text-[oklch(0.7_0.14_25)]' : 'text-white/85'}`}>
                {countdown.expired ? '00:00:00' : countdown.text}
              </span>
            </div>
          )}
        </motion.div>

        {/* receipt: shown as soon as a payment is seen — and on every revisit */}
        {paid && result && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 panel-nerva rounded-lg p-6 sm:p-7"
          >
            <div className="flex items-center justify-between gap-4 pb-4 mb-5 border-b border-white/8">
              <div className="min-w-0">
                <div className="font-semibold text-[14px] text-white">Payment receipt</div>
                <div className="mt-0.5 font-mono text-[10px] text-[oklch(0.58_0.025_250)]">
                  {offline ? 'connection lost · retrying…' : verified ? 'verified against the chain just now' : 're-verifying on the chain…'}
                </div>
              </div>
              <span
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
                  settled
                    ? 'border-[oklch(0.72_0.12_160)]/30 text-[oklch(0.72_0.12_160)]'
                    : 'border-[oklch(0.78_0.06_237)]/30 text-[oklch(0.78_0.06_237)]'
                }`}
              >
                {settled ? 'spendable' : phase === 'confirmed' ? 'confirming' : 'in mempool'}
              </span>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => result.txHash && copy(result.txHash, 'tx')}
                className="w-full min-w-0 flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3.5 py-2.5 hover:border-[oklch(0.78_0.06_237)]/35 transition-colors group"
                title="Click to copy the transaction hash"
              >
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[oklch(0.5_0.01_250)] shrink-0">Transaction</span>
                <span className="font-mono text-[10px] text-white/65 truncate min-w-0">{shortenHash(result.txHash ?? '', 10, 6)}</span>
                {copied === 'tx' ? <Check className="w-3.5 h-3.5 text-[oklch(0.72_0.12_160)] shrink-0" /> : <Copy className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 shrink-0" />}
              </button>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[oklch(0.5_0.01_250)] shrink-0">Block</span>
                <span className="font-mono text-[10px] text-white/65">
                  {result.inPool ? 'mempool · waiting for its first block' : result.blockHeight ? `#${result.blockHeight.toLocaleString()}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[oklch(0.5_0.01_250)] shrink-0">Paid at</span>
                <span className="font-mono text-[10px] text-white/65">
                  {result.txTimestamp ? formatTimestamp(result.txTimestamp) : result.inPool ? 'pending' : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[oklch(0.5_0.01_250)] shrink-0">Confirmations</span>
                <span className="font-mono text-[10px] text-white/65 tabular-nums">
                  {result.confirmations} / {NERVA_CONSTANTS.spendableAge}
                  {settled && <span className="text-[oklch(0.72_0.12_160)]"> · spendable</span>}
                </span>
              </div>
            </div>
            <a
              href={`${NERVA_LINKS.explorer}/?hash=${result.txHash}#tx`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] text-[oklch(0.78_0.06_237)] hover:text-[oklch(0.9_0.1_215)] transition-colors"
            >
              view the transaction on the explorer <ExternalLink className="w-3 h-3" />
            </a>
          </motion.div>
        )}

        {/* QR card, only while waiting */}
        {phase === 'pending' && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 panel-nerva rounded-lg p-6 sm:p-7 flex flex-col items-center"
          >
            <div className="self-start w-full flex items-center justify-between gap-4 pb-4 mb-5 border-b border-white/8">
              <div className="min-w-0">
                <div className="font-semibold text-[14px] text-white">Scan this code to pay</div>
                <div className="mt-0.5 font-mono text-[10px] text-[oklch(0.58_0.025_250)]">with NervaOne or any NERVA wallet</div>
              </div>
              {!countdown.expired && (
                <span className="inline-flex items-center gap-1.5 shrink-0 font-mono tabular-nums text-[12px] font-semibold text-white/85 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
                  <Clock className="w-3.5 h-3.5 text-[oklch(0.78_0.06_237)]" />
                  {countdown.text}
                </span>
              )}
            </div>
            {qr ? (
              <img
                src={qr}
                alt="NERVA payment QR code"
                className="w-[240px] h-[240px] rounded-md bg-[#eef4fb] border border-white/15"
              />
            ) : (
              <div className="w-[240px] h-[240px] rounded-md bg-white/[0.04] border border-white/10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white/30" />
              </div>
            )}
            <p className="mt-4 text-[12px] text-[oklch(0.62_0.012_250)] text-center max-w-xs leading-relaxed">
              Address{freeAmount ? '' : ', amount'} and reference are pre-filled
              by the code{freeAmount ? '; you choose how much to send' : ''}.
            </p>
            <a
              href={uri}
              className="mt-5 inline-flex h-11 items-center justify-center gap-2.5 rounded-md px-7 text-[13.5px] font-semibold bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] hover:bg-[oklch(0.7_0.08_236)] transition-colors"
            >
              <Wallet className="w-[17px] h-[17px]" />
              Open in my wallet
            </a>
            <div className="mt-4 w-full">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[oklch(0.55_0.01_250)] pb-2.5">
                or copy the details for a manual payment
              </div>
              <div className="space-y-2">
              <button
                onClick={() => copy(invoice.a, 'addr')}
                className="w-full min-w-0 flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3.5 py-2.5 hover:border-[oklch(0.78_0.06_237)]/35 transition-colors group"
                title="Click to copy"
              >
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[oklch(0.5_0.01_250)] shrink-0">Address</span>
                <span className="font-mono text-[10px] text-white/65 truncate min-w-0">{invoice.a}</span>
                {copied === 'addr' ? <Check className="w-3.5 h-3.5 text-[oklch(0.72_0.12_160)] shrink-0" /> : <Copy className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 shrink-0" />}
              </button>
              <button
                onClick={() => copy(invoice.pid, 'pid')}
                className="w-full min-w-0 flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3.5 py-2.5 hover:border-[oklch(0.78_0.06_237)]/35 transition-colors group"
                title="Click to copy"
              >
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[oklch(0.5_0.01_250)] shrink-0">Reference</span>
                <span className="font-mono text-[10px] text-[oklch(0.8_0.13_290)]/80 truncate min-w-0">{invoice.pid}</span>
                {copied === 'pid' ? <Check className="w-3.5 h-3.5 text-[oklch(0.72_0.12_160)] shrink-0" /> : <Copy className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 shrink-0" />}
              </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* honesty note */}
        <div className="mt-6 flex items-start gap-3 rounded-md border border-white/8 bg-white/[0.02] p-4">
          <ShieldCheck className="w-4 h-4 text-[oklch(0.78_0.06_237)] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[11.5px] leading-relaxed text-[oklch(0.64_0.012_250)]">
              This checkout runs entirely in your browser against the public explorer
              API — no server ever stores anything. When a payment is found, a private
              copy of the result is kept in this browser only, so coming back to the
              link later still shows the paid state; the chain stays the source of truth
              and every visit re-verifies it. RingCT keeps the amount itself encrypted,
              so the receiver verifies the exact sum in their wallet. If your wallet
              refuses the long payment id, send manually to the address above: detection
              works either way.
            </p>
            {hasLocal && (
              <button
                onClick={forgetLocal}
                className="mt-2.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/35 hover:text-[oklch(0.78_0.06_237)] transition-colors"
                title="Remove the local copy of this payment from this browser"
              >
                <EyeOff className="w-3 h-3" /> clear the local record
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/nerva"
            className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/40 hover:text-[oklch(0.78_0.06_237)] transition-colors"
          >
            ← Back to the Nerva world
          </Link>
        </div>
      </div>
    </div>
  )
}
