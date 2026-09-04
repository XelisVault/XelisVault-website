'use client'

/**
 * NervaLink creator: stateless XNV payment links.
 *
 * A random long payment id is minted client-side, the invoice is encoded
 * into the link itself (base64url JSON), and the QR encodes either the
 * canonical `nerva:` URI (wallet2::make_uri format, so wallets pre-fill
 * everything) or the shareable checkout URL. Nothing is stored anywhere:
 * the link IS the invoice.
 *
 * Layout contract (the overflow bug this file killed once): every chain
 * from the 1fr grid track down to a truncated hash MUST be
 * shrinkable. The grid track uses minmax(0,1fr) and every text-bearing
 * flex child carries min-w-0, otherwise a ~500 char payment URL inflates
 * its min-content size and pushes the panel 2800px past the viewport.
 */

import { useMemo, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2, Copy, Check, ArrowRight, Wallet, ShieldCheck, Sparkles,
  Radar, AlertTriangle, QrCode, ExternalLink, ScanLine, Clock, LinkIcon,
} from 'lucide-react'
import { Reveal } from '@/components/site/reveal'
import {
  encodeInvoice, generatePaymentId, isValidNervaAddress,
  buildNervaUri, renderQrDataUrl, atomicToDisplay, TTL_OPTIONS,
  type NervaInvoice,
} from '@/lib/nerva/nlink'
import { parseXnv, getBlockCount } from '@/lib/nerva/api'
import { copyText, middleTruncate } from '@/lib/clipboard'

/* ───────────── form state ───────────── */

interface FormState {
  address: string
  amount: string
  description: string
  name: string
  ttlIndex: number
}

const INITIAL: FormState = { address: '', amount: '', description: '', name: '', ttlIndex: 1 }

function Field({ label, hint, children, error }: {
  label: string; hint?: string; children: React.ReactNode; error?: string
}) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.62_0.025_250)]">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <div className="mt-1.5 font-mono text-[10px] text-[oklch(0.75_0.13_25)]">{error}</div>
      ) : hint ? (
        <div className="mt-1.5 font-mono text-[9.5px] text-[oklch(0.5_0.01_250)]">{hint}</div>
      ) : null}
    </div>
  )
}

const inputCls =
  'w-full h-11 rounded-lg bg-white/[0.04] border border-white/10 focus:border-[oklch(0.78_0.06_237)]/60 outline-none px-3.5 font-mono text-[12.5px] text-white/90 placeholder:text-white/25 transition-colors'

/* ───────────── live countdown for the minted link ───────────── */

function useExpiryCountdown(expiresAt: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const left = Math.max(0, expiresAt * 1000 - now)
  const h = Math.floor(left / 3_600_000)
  const m = Math.floor((left % 3_600_000) / 60_000)
  const s = Math.floor((left % 60_000) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return { expired: left <= 0, text: h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}` }
}

/* ───────────── success medallion: ring + check draw themselves ───────────── */

function SuccessMedallion() {
  return (
    <div className="relative w-[52px] h-[52px] shrink-0">
      <svg viewBox="0 0 56 56" className="w-full h-full">
        <motion.circle
          cx="28" cy="28" r="26" fill="none"
          stroke="oklch(0.72 0.12 160 / 0.35)" strokeWidth="1.5"
        />
        <motion.circle
          cx="28" cy="28" r="26" fill="none"
          stroke="oklch(0.72 0.12 160)" strokeWidth="2" strokeLinecap="round"
          pathLength={1} strokeDasharray="1 1"
          initial={{ pathLength: 0, rotate: -90 }}
          animate={{ pathLength: 1, rotate: -90 }}
          transition={{ duration: 0.85, ease: [0.22, 0.61, 0.36, 1] }}
          style={{ transformOrigin: 'center' }}
        />
        <motion.path
          d="M17 28.5l7.5 7.5L39 20" fill="none"
          stroke="oklch(0.78 0.13 160)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} strokeDasharray="1 1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.55, ease: 'easeOut' }}
        />
      </svg>
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: '0 0 26px oklch(0.72 0.12 160 / 0.45)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.9, 0] }}
        transition={{ duration: 1.4, delay: 0.6, times: [0, 0.25, 1] }}
        aria-hidden
      />
    </div>
  )
}

/* ───────────── viewfinder QR: corner brackets + scan sweep ───────────── */

function ViewfinderQr({ qr, size = 216 }: { qr: string | null; size?: number }) {
  return (
    <div className="relative p-3.5 shrink-0" style={{ width: size + 28, height: size + 28 }}>
      {/* corner brackets: a scanner locking onto the code */}
      {[
        'top-0 left-0 border-t-2 border-l-2',
        'top-0 right-0 border-t-2 border-r-2',
        'bottom-0 left-0 border-b-2 border-l-2',
        'bottom-0 right-0 border-b-2 border-r-2',
      ].map((pos) => (
        <motion.span
          key={pos}
          className={`absolute w-6 h-6 border-[oklch(0.78_0.06_237)] ${pos}`}
          initial={{ opacity: 0, scale: 1.35 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
          aria-hidden
        />
      ))}
      {qr ? (
        <motion.img
          src={qr}
          alt="Payment QR code"
          className="rounded-sm border border-white/10"
          style={{ width: size, height: size }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        />
      ) : (
        <div
          className="rounded-sm border border-white/10 bg-white/[0.04] flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <QrCode className="w-9 h-9 text-white/20" />
        </div>
      )}
      {/* one scan sweep across the freshly minted code */}
      <motion.div
        className="absolute left-3.5 right-3.5 h-[2px] rounded-full"
        style={{
          background: 'linear-gradient(90deg, transparent, oklch(0.78 0.06 237 / 0.85), transparent)',
          boxShadow: '0 0 12px oklch(0.78 0.06 237 / 0.5)',
        }}
        initial={{ top: '12%', opacity: 0 }}
        animate={{ top: ['12%', '86%'], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.6, delay: 0.5, times: [0, 0.15, 0.85, 1], ease: 'easeInOut' }}
        aria-hidden
      />
    </div>
  )
}

/* ───────────── a click-to-copy fact row ───────────── */

function CopyRow({ label, value, display, mono = 'steel' }: {
  label: string; value: string; display?: string; mono?: 'steel' | 'mauve' | 'plain'
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => { void copyText(value).then((ok) => { if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1600) } }) }}
      className="group w-full min-w-0 flex items-center gap-3 rounded-md border border-white/8 bg-white/[0.02] px-3.5 py-2.5 hover:border-[oklch(0.78_0.06_237)]/35 hover:bg-[oklch(0.78_0.06_237)]/[0.05] transition-colors text-left"
      title="Click to copy"
    >
      <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[oklch(0.55_0.01_250)] shrink-0 w-[76px]">{label}</span>
      <span className={`flex-1 min-w-0 font-mono text-[10.5px] truncate ${
        mono === 'mauve' ? 'text-[oklch(0.8_0.13_290)]/85'
        : mono === 'steel' ? 'text-[oklch(0.83_0.055_237)]'
        : 'text-white/70'
      }`}>{display ?? value}</span>
      {copied
        ? <Check className="w-3.5 h-3.5 text-[oklch(0.72_0.12_160)] shrink-0" />
        : <Copy className="w-3.5 h-3.5 text-white/25 group-hover:text-white/60 shrink-0 transition-colors" />}
    </button>
  )
}

/* ───────────── the creator ───────────── */

type QrMode = 'wallet' | 'page'

export function LinkCreator() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [touched, setTouched] = useState(false)
  const [invoice, setInvoice] = useState<NervaInvoice | null>(null)
  const [qrMode, setQrMode] = useState<QrMode>('wallet')
  const [qr, setQr] = useState<string | null>(null)
  const [minting, setMinting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setOrigin(window.location.origin) }, [])

  const addrCheck = useMemo(() => isValidNervaAddress(form.address), [form.address])
  const amountAtomic = useMemo(() => (form.amount.trim() === '' ? 0n : parseXnv(form.amount)), [form.amount])
  const amountValid = form.amount.trim() === '' || amountAtomic !== null

  const linkUrl = useMemo(() => {
    if (!invoice) return ''
    return `${origin}/nerva/pay?d=${encodeInvoice(invoice)}`
  }, [invoice, origin])

  const nervaUri = useMemo(() => (invoice ? buildNervaUri(invoice) : ''), [invoice])
  const countdown = useExpiryCountdown(invoice?.exp ?? 0)

  /* QR for the active mode: nerva: URI (wallet) or checkout URL (share) */
  useEffect(() => {
    if (!invoice) { setQr(null); return }
    let alive = true
    const data = qrMode === 'wallet' ? buildNervaUri(invoice) : linkUrl
    void renderQrDataUrl(data, 360).then((url) => {
      if (alive) setQr(url)
    }).catch(() => {
      if (alive) setQr(null)
    })
    return () => { alive = false }
  }, [invoice, qrMode, linkUrl])

  const mint = async () => {
    setTouched(true)
    if (!addrCheck.ok || !amountValid) return
    setMinting(true)
    try {
      let height = 0
      try { height = await getBlockCount() } catch { height = 0 }
      const ttl = TTL_OPTIONS[form.ttlIndex].seconds
      const inv: NervaInvoice = {
        v: 1,
        a: form.address.trim(),
        amt: amountAtomic !== null ? amountAtomic.toString() : '0',
        d: form.description.trim() || undefined,
        n: form.name.trim() || undefined,
        pid: generatePaymentId(),
        h: height,
        exp: Math.floor(Date.now() / 1000) + ttl,
      }
      setInvoice(inv)
      setQrMode('wallet')
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } finally {
      setMinting(false)
    }
  }

  const copyLink = () => {
    if (!linkUrl) return
    void copyText(linkUrl).then((ok) => {
      if (ok) {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }
    })
  }

  const reset = () => {
    setInvoice(null)
    setForm(INITIAL)
    setTouched(false)
    setCopied(false)
  }

  return (
    <div className="relative pt-28 pb-20 min-h-screen">
      <div className="absolute inset-0 circuit-bg opacity-30 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-[420px]"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 0%, oklch(0.19 0.04 250 / 0.4), transparent 70%)' }} />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        {/* header */}
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md bg-[oklch(0.78_0.06_237)]/12 border border-[oklch(0.78_0.06_237)]/25 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-[oklch(0.78_0.06_237)]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">NervaLink</h1>
          </div>
          <p className="mt-4 text-[14.5px] leading-relaxed text-[oklch(0.7_0.012_250)]">
            Payment links for NERVA: a mini Stripe-style checkout with zero
            infrastructure. The invoice lives <span className="text-white/90 font-medium">entirely inside the link</span>:
            no database, no account, no keys. Whoever opens it gets a QR the wallet
            understands, and the page itself watches the chain for the payment.
          </p>
        </div>

        <div className="mt-10 grid lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
          {/* ── form / result ── */}
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              {!invoice ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="panel-nerva rounded-lg p-6 sm:p-8"
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
                    1 · Your receiving details
                  </div>

                  <div className="mt-6 space-y-5">
                    <Field
                      label="Your NERVA address"
                      hint="Standard address from NervaOne or nerva-wallet-cli, starts with NV"
                      error={touched ? (addrCheck.ok ? undefined : addrCheck.reason) : undefined}
                    >
                      <input
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        placeholder="NV…"
                        className={inputCls}
                        spellCheck={false}
                        autoComplete="off"
                      />
                    </Field>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <Field
                        label="Amount (XNV), optional"
                        hint="Leave empty for a free-amount / donation link"
                        error={touched && !amountValid ? 'Invalid number' : undefined}
                      >
                        <input
                          value={form.amount}
                          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                          placeholder="e.g. 12.5"
                          className={inputCls}
                          inputMode="decimal"
                        />
                      </Field>
                      <Field label="Your name / brand" hint="Shown to the payer on the checkout">
                        <input
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="e.g. Sato's Coffee"
                          className={inputCls}
                          maxLength={60}
                        />
                      </Field>
                    </div>

                    <Field label="Description" hint="What this payment is for (max 140 chars)">
                      <input
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 140) }))}
                        placeholder="e.g. Order #1042, whole bean 1kg"
                        className={inputCls}
                        maxLength={140}
                      />
                    </Field>

                    <Field label="Link lifetime" hint="After expiry the checkout shows “expired” and stops scanning">
                      <div className="flex flex-wrap gap-2">
                        {TTL_OPTIONS.map((t, i) => (
                          <button
                            key={t.seconds}
                            onClick={() => setForm((f) => ({ ...f, ttlIndex: i }))}
                            className={`h-10 px-4 rounded-md font-mono text-[11.5px] border transition-all ${
                              form.ttlIndex === i
                                ? 'border-[oklch(0.78_0.06_237)]/70 bg-[oklch(0.78_0.06_237)]/12 text-[oklch(0.83_0.055_237)]'
                                : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>

                  <button
                    onClick={() => void mint()}
                    disabled={minting}
                    className="mt-8 w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2.5 rounded-md px-8 text-[14.5px] font-semibold bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] hover:bg-[oklch(0.7_0.08_236)] transition-colors disabled:opacity-60"
                  >
                    {minting ? (
                      <>
                        <motion.span
                          className="w-[17px] h-[17px] rounded-full border-2 border-[oklch(0.13_0.02_255)]/30 border-t-[oklch(0.13_0.02_255)]"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                        Minting the reference…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-[17px] h-[17px]" />
                        Mint the payment link
                      </>
                    )}
                  </button>
                </motion.div>
              ) : (
                /* ══════════ THE MINTED LINK ══════════ */
                <motion.div
                  key="result"
                  ref={resultRef}
                  id="nlink-result"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="space-y-5 scroll-mt-24"
                >
                  {/* success header */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.05 }}
                    className="panel-nerva rounded-lg px-6 sm:px-7 py-5 flex items-center gap-5"
                  >
                    <SuccessMedallion />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[15px] text-white">
                        Your payment link is live
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-[oklch(0.6_0.012_250)] truncate">
                        reference <span className="text-[oklch(0.8_0.13_290)]/85">{invoice.pid.slice(0, 16)}…</span>
                        {' · '}stateless, it exists nowhere but this URL
                      </div>
                    </div>
                    {!countdown.expired && (
                      <div className="shrink-0 hidden sm:flex flex-col items-end">
                        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[oklch(0.55_0.01_250)]">expires in</span>
                        <span className="font-mono tabular-nums text-[13px] font-semibold text-white/85 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[oklch(0.78_0.06_237)]" />
                          {countdown.text}
                        </span>
                      </div>
                    )}
                  </motion.div>

                  {/* THE link: click anywhere to copy the shareable URL */}
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.12 }}
                    className="panel-nerva rounded-lg overflow-hidden"
                  >
                    <div className="px-6 sm:px-7 pt-5 pb-4 border-b border-white/8 flex items-center justify-between gap-4">
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.62_0.025_250)] min-w-0">
                        2 · Share this payment link
                      </div>
                      <div className="font-mono text-[9.5px] text-[oklch(0.55_0.01_250)] shrink-0 hidden sm:block">
                        send it to your payer, exactly as is
                      </div>
                    </div>

                    <div className="p-5 sm:p-6">
                      <motion.button
                        type="button"
                        onClick={copyLink}
                        whileTap={{ scale: 0.985 }}
                        className={`group relative w-full min-w-0 flex items-center gap-3 rounded-md border pl-4 pr-3 py-3 text-left transition-all overflow-hidden ${
                          copied
                            ? 'border-[oklch(0.72_0.12_160)]/60 bg-[oklch(0.72_0.12_160)]/10'
                            : 'border-white/12 bg-[oklch(0.12_0.018_255)] hover:border-[oklch(0.78_0.06_237)]/45'
                        }`}
                        title="Click to copy the full payment link"
                      >
                        {/* one shimmer sweep the first time the link appears */}
                        <motion.span
                          className="absolute inset-y-0 w-1/3 pointer-events-none"
                          style={{
                            background: 'linear-gradient(100deg, transparent, oklch(0.78 0.06 237 / 0.12), transparent)',
                          }}
                          initial={{ x: '-140%' }}
                          animate={{ x: '420%' }}
                          transition={{ duration: 1.5, delay: 0.55, ease: 'easeInOut' }}
                          aria-hidden
                        />
                        <LinkIcon className={`w-4 h-4 shrink-0 transition-colors ${copied ? 'text-[oklch(0.72_0.12_160)]' : 'text-[oklch(0.78_0.06_237)]'}`} />
                        <span className={`flex-1 min-w-0 font-mono text-[11.5px] sm:text-[12.5px] truncate ${
                          copied ? 'text-[oklch(0.78_0.13_160)]' : 'text-[oklch(0.83_0.055_237)]'
                        }`}>
                          {copied
                            ? 'Copied. The full link is in your clipboard.'
                            : middleTruncate(linkUrl, 56, 22)}
                        </span>
                        <span className={`shrink-0 inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 font-mono text-[11px] font-semibold transition-colors ${
                          copied
                            ? 'bg-[oklch(0.72_0.12_160)]/18 text-[oklch(0.78_0.13_160)]'
                            : 'bg-[oklch(0.78_0.06_237)]/15 text-[oklch(0.83_0.055_237)] group-hover:bg-[oklch(0.78_0.06_237)]/25'
                        }`}>
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? 'Copied' : 'Copy'}
                        </span>
                      </motion.button>

                      <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
                        <Link
                          href={`/nerva/pay?d=${encodeInvoice(invoice)}`}
                          className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-md text-[13.5px] font-semibold bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] hover:bg-[oklch(0.7_0.08_236)] transition-colors"
                        >
                          Open the checkout <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={reset}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-[13.5px] font-medium border border-white/12 bg-white/[0.03] hover:bg-white/8 text-white/75 transition-colors"
                        >
                          Create another
                        </button>
                      </div>
                      <div className="mt-3.5 font-mono text-[9.5px] text-[oklch(0.5_0.01_250)]">
                        Anyone opening it lands directly on the checkout: no side selection, no account, nothing to install.
                      </div>
                    </div>
                  </motion.div>

                  {/* QR card with wallet / page toggle */}
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.2 }}
                    className="panel-nerva rounded-lg overflow-hidden"
                  >
                    <div className="px-6 sm:px-7 py-5 border-b border-white/8 flex flex-wrap items-center justify-between gap-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.62_0.025_250)]">
                        3 · Show a QR instead
                      </div>
                      {/* segmented mode toggle */}
                      <div className="flex rounded-md border border-white/10 bg-[oklch(0.12_0.018_255)] p-0.5">
                        <button
                          onClick={() => setQrMode('wallet')}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-[5px] px-3 font-mono text-[10.5px] transition-all ${
                            qrMode === 'wallet'
                              ? 'bg-[oklch(0.78_0.06_237)]/18 text-[oklch(0.83_0.055_237)]'
                              : 'text-white/45 hover:text-white/70'
                          }`}
                        >
                          <Wallet className="w-3.5 h-3.5" /> Wallet
                        </button>
                        <button
                          onClick={() => setQrMode('page')}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-[5px] px-3 font-mono text-[10.5px] transition-all ${
                            qrMode === 'page'
                              ? 'bg-[oklch(0.78_0.06_237)]/18 text-[oklch(0.83_0.055_237)]'
                              : 'text-white/45 hover:text-white/70'
                          }`}
                        >
                          <ScanLine className="w-3.5 h-3.5" /> Page link
                        </button>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
                      <ViewfinderQr qr={qr} />
                      <div className="flex-1 min-w-0 w-full">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={qrMode}
                            initial={{ opacity: 0, x: qrMode === 'wallet' ? -8 : 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: qrMode === 'wallet' ? 8 : -8 }}
                            transition={{ duration: 0.22 }}
                          >
                            {qrMode === 'wallet' ? (
                              <>
                                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.6_0.012_250)]">
                                  Payer scans with their XNV wallet
                                </div>
                                <p className="mt-2 text-[12px] leading-relaxed text-[oklch(0.66_0.012_250)]">
                                  A canonical <span className="font-mono text-white/80">nerva:</span> URI that
                                  NervaOne and the CLI wallet parse natively: address, amount and reference
                                  are pre-filled on their side.
                                </p>
                                <div className="mt-3">
                                  <CopyRow label="nerva: URI" value={nervaUri} display={middleTruncate(nervaUri, 26, 10)} mono="mauve" />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.6_0.012_250)]">
                                  Payer scans with a phone camera
                                </div>
                                <p className="mt-2 text-[12px] leading-relaxed text-[oklch(0.66_0.012_250)]">
                                  Opens the hosted checkout page on their phone: amount, countdown
                                  and live payment detection, without installing anything.
                                </p>
                                <div className="mt-3">
                                  <CopyRow label="page link" value={linkUrl} display={middleTruncate(linkUrl, 30, 12)} />
                                </div>
                              </>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>

                  {/* invoice details */}
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.28 }}
                    className="panel-nerva rounded-lg overflow-hidden"
                  >
                    <div className="px-6 sm:px-7 py-5 border-b border-white/8">
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.62_0.025_250)]">
                        4 · Invoice details
                      </div>
                    </div>
                    <div className="p-5 sm:p-6 grid sm:grid-cols-2 gap-2.5">
                      <div className="rounded-md border border-white/8 bg-white/[0.02] px-3.5 py-2.5 flex items-center gap-3">
                        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[oklch(0.55_0.01_250)] shrink-0 w-[76px]">amount</span>
                        <span className="flex-1 min-w-0 font-mono text-[11px] text-white/80 truncate">
                          {invoice.amt === '0' ? 'free, payer chooses' : `${atomicToDisplay(invoice.amt)} XNV`}
                        </span>
                      </div>
                      <div className="rounded-md border border-white/8 bg-white/[0.02] px-3.5 py-2.5 flex items-center gap-3">
                        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[oklch(0.55_0.01_250)] shrink-0 w-[76px]">expires</span>
                        <span className="flex-1 min-w-0 font-mono text-[11px] text-white/80 truncate">
                          {new Date(invoice.exp * 1000).toLocaleString()}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <CopyRow label="address" value={invoice.a} display={middleTruncate(invoice.a, 34, 10)} mono="plain" />
                      </div>
                      <div className="sm:col-span-2">
                        <CopyRow label="reference" value={invoice.pid} display={middleTruncate(invoice.pid, 30, 12)} mono="mauve" />
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* how it works */}
            <Reveal delay={0.1}>
              <div className="mt-8 panel-nerva rounded-lg p-6 sm:p-7">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-[18px] h-[18px] text-[oklch(0.78_0.06_237)]" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
                    How NervaLink works, the honest version
                  </span>
                </div>
                <div className="mt-5 grid sm:grid-cols-3 gap-4">
                  {[
                    {
                      icon: Sparkles,
                      title: '1 · Mint',
                      body: 'A random 32-byte reference (payment id) is generated in your browser and encoded into the link together with amount and expiry. Nothing is transmitted.',
                    },
                    {
                      icon: Wallet,
                      title: '2 · Pay',
                      body: 'The payer scans the QR, a canonical nerva: URI that NervaOne and the CLI wallet parse natively, pre-filling address, amount and reference.',
                    },
                    {
                      icon: Radar,
                      title: '3 · Watch',
                      body: 'The checkout page polls the public explorer API every ~10s, scanning the mempool and new blocks for your reference, following it to 10 confirmations.',
                    },
                  ].map((s) => (
                    <div key={s.title} className="rounded-md border border-white/8 bg-white/[0.02] p-4">
                      <s.icon className="w-4 h-4 text-[oklch(0.78_0.06_237)]" />
                      <div className="mt-2.5 font-mono text-[11px] font-semibold text-white/85">{s.title}</div>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-[oklch(0.64_0.012_250)]">{s.body}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-start gap-3 rounded-md border border-[oklch(0.7_0.1_75)]/25 bg-[oklch(0.6_0.1_75)]/8 p-4">
                  <AlertTriangle className="w-4 h-4 text-[oklch(0.75_0.1_80)] shrink-0 mt-0.5" />
                  <p className="text-[11.5px] leading-relaxed text-[oklch(0.7_0.012_250)]">
                    RingCT amounts are encrypted on-chain: the checkout detects your
                    reference and its confirmations, not the exact amount. Verify the
                    final amount in your wallet (it pairs the payment id with the received
                    sum). Recent CLI wallet versions gate long payment ids behind
                    <span className="font-mono text-white/75"> --long-payment-id-support</span>;
                    NervaOne and URI payments handle them natively. If in doubt, the
                    checkout also shows your plain address as a fallback.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          {/* ── side summary ── */}
          <div className="lg:sticky lg:top-24 space-y-4 min-w-0">
            <div className="panel-nerva rounded-lg p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
                Architecture
              </div>
              <ul className="mt-4 space-y-3">
                {[
                  ['Stateless', 'the invoice is the URL: no DB, no server'],
                  ['Keyless', 'no seed, no spend key, no view key, ever'],
                  ['Serverless', 'runs on Vercel static + the public explorer API'],
                  ['Private', 'the payer scans a QR; nothing is logged here'],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-start gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[oklch(0.72_0.12_160)] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono text-[11px] text-white/85 font-semibold">{k}</span>
                      <span className="block text-[11px] text-[oklch(0.6_0.012_250)] leading-snug mt-0.5">{v}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="panel-nerva rounded-lg p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
                Where does the money go?
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-[oklch(0.66_0.025_250)]">
                Straight from the payer&rsquo;s wallet to yours, peer to peer, as
                designed. XelisVault&rsquo;s Nerva side never touches funds: it draws
                QR codes and reads public blocks. That is all it can do.
              </p>
              <Link
                href="/nerva/explorer"
                className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] text-[oklch(0.78_0.06_237)] hover:text-[oklch(0.86_0.05_237)] transition-colors"
              >
                See the live chain <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
