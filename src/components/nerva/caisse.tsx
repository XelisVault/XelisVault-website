'use client'

/**
 * NERVA POS — the merchant point-of-sale terminal.
 *
 * The shop keeper types an amount on a big keypad, hits "Charge", the
 * customer scans the full-screen QR with their wallet (or any phone
 * camera via the checkout link), and the page watches the chain
 * (mempool → 10 confirmations) until it lands. Every completed sale is
 * sealed (SHA-256) and chained into a local journal, and a thermal-style
 * PDF receipt is one click away.
 *
 * Sales are v2 invoices: the QR pays an INTEGRATED address (8-byte payment
 * id embedded) so every default NERVA wallet attaches the reference
 * automatically. With the optional secret VIEW KEY in settings, the
 * terminal detects payments in real time by decrypting the integrated id
 * — the same math an official wallet runs, in this browser. Without it,
 * the customer declares the tx hash on the checkout page.
 *
 * The XNV/USD conversion is LIVE by default (CoinGecko → CoinPaprika via
 * /api/nerva/price, USD reference + EUR secondary); a manual override is
 * available in settings. Config, journal and receipts never leave the
 * browser. No account, no server, no spend keys.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Store, Settings2, Delete, Printer, Download, Check, NotebookText,
  Volume2, VolumeX, ArrowLeft, ArrowRight, ShieldCheck, Trash2, FileJson,
  CheckCircle2, Loader2, Radar, AlertTriangle, QrCode, Wallet, ScanLine, X,
  RefreshCw,
} from 'lucide-react'
import {
  encodeInvoice, generatePaymentId8, buildNervaUri, renderQrDataUrl,
  atomicToDisplay, detectPayment, savePaymentCache, invoiceCacheKey,
  type NervaInvoice, type DetectionResult,
} from '@/lib/nerva/nlink'
import { parseXnv, formatXnv, getBlockCount, NERVA_CONSTANTS } from '@/lib/nerva/api'
import {
  loadMerchantConfig, saveMerchantConfig, configReady,
  parsedViewKey, validateViewKey,
  type MerchantConfig,
} from '@/lib/nerva/merchant'
import { useNervaPrice, xnvAtomicToUsd as xnvAtomicToUsdLive, xnvAtomicToEur as xnvAtomicToEurLive, priceCaption } from '@/lib/nerva/price'
import {
  loadJournal, appendJournal, buildJournalEntry, verifyJournal, clearJournal,
  exportJournalJson, type JournalEntry,
} from '@/lib/nerva/receipt-chain'
import { buildReceiptPdf, downloadPdf, printPdf } from '@/lib/nerva/pdf'
import { copyText } from '@/lib/clipboard'

/* ─────────────── the payment chime (WebAudio, no asset) ─────────────── */

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const notes = [659.25, 987.77] // E5 · B5 — a bright two-note "kaching"
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t0 = ctx.currentTime + i * 0.12
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.18, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0)
      osc.stop(t0 + 0.55)
    })
    setTimeout(() => void ctx.close(), 1500)
  } catch { /* audio blocked: silent */ }
}

/* ─────────────── config form ─────────────── */

const inputCls =
  'w-full h-11 rounded-lg bg-white/[0.04] border border-white/10 focus:border-[oklch(0.78_0.06_237)]/60 outline-none px-3.5 font-mono text-[12.5px] text-white/90 placeholder:text-white/25 transition-colors'

function ConfigForm({ initial, onSave, onBack }: {
  initial: MerchantConfig; onSave: (c: MerchantConfig) => void; onBack?: () => void
}) {
  const [c, setC] = useState<MerchantConfig>(initial)
  const [touched, setTouched] = useState(false)
  const { price } = useNervaPrice()
  const addrOk = useMemo(() => configReady({ ...c }), [c])
  const keyCheck = useMemo(() => (c.viewKey ? validateViewKey(c) : { ok: true }), [c])
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="panel-nerva rounded-lg p-6 sm:p-8 max-w-xl mx-auto"
    >
      <div className="flex items-center gap-2.5">
        <Settings2 className="w-4 h-4 text-[oklch(0.78_0.06_237)]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
          POS settings
        </span>
      </div>
      <div className="mt-6 space-y-5">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.62_0.025_250)]">
            Your NERVA address
          </label>
          <div className="mt-2">
            <input
              value={c.address}
              onChange={(e) => setC({ ...c, address: e.target.value.trim() })}
              placeholder="NV…"
              className={inputCls}
              spellCheck={false} autoComplete="off"
            />
          </div>
          {touched && !addrOk && (
            <div className="mt-1.5 font-mono text-[10px] text-[oklch(0.75_0.13_25)]">
              invalid address (must start with NV, ~95 characters)
            </div>
          )}
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.62_0.025_250)]">
            Secret view key — optional, unlocks auto-detection
          </label>
          <div className="mt-2">
            <input
              value={c.viewKey}
              onChange={(e) => setC({ ...c, viewKey: e.target.value.trim() })}
              placeholder="64 hex chars (wallet → view_key) — leave empty for manual mode"
              className={`${inputCls} ${touched && c.viewKey && !keyCheck.ok ? 'border-[oklch(0.75_0.13_25)]/60' : ''}`}
              spellCheck={false} autoComplete="off"
            />
          </div>
          {touched && c.viewKey && !keyCheck.ok && (
            <div className="mt-1.5 font-mono text-[10px] text-[oklch(0.75_0.13_25)]">
              {keyCheck.reason}
            </div>
          )}
          {c.viewKey && keyCheck.ok && (
            <div className="mt-1.5 font-mono text-[9.5px] text-[oklch(0.72_0.12_160)]">
              matches the address — payments auto-detected in real time. It is a view key: it can see, never spend, never leaves this browser.
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.62_0.025_250)]">
              Shop name
            </label>
            <div className="mt-2">
              <input
                value={c.name}
                onChange={(e) => setC({ ...c, name: e.target.value.slice(0, 60) })}
                placeholder="Café du Marché"
                className={inputCls} maxLength={60}
              />
            </div>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.62_0.025_250)]">
              USD / XNV rate override
            </label>
            <div className="mt-2">
              <input
                value={c.usdRate}
                onChange={(e) => setC({ ...c, usdRate: e.target.value.replace(',', '.') })}
                placeholder="leave empty = live rate"
                className={inputCls} inputMode="decimal"
              />
            </div>
            <div className="mt-1.5 font-mono text-[9.5px] text-[oklch(0.5_0.01_250)]">
              {price ? `live: 1 XNV = $${price.usd.toFixed(4)} · ${price.source}` : 'live USD rate loads automatically'}
            </div>
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={c.sound}
            onChange={(e) => setC({ ...c, sound: e.target.checked })}
            className="w-4 h-4 accent-[oklch(0.78_0.06_237)]"
          />
          <span className="text-[13px] text-white/80">Chime when a payment lands</span>
          {c.sound ? <Volume2 className="w-4 h-4 text-[oklch(0.78_0.06_237)]" /> : <VolumeX className="w-4 h-4 text-white/30" />}
        </label>
      </div>
      <div className="mt-8 flex flex-wrap gap-2.5">
        <button
          onClick={() => { setTouched(true); if (addrOk) onSave(c) }}
          className="inline-flex h-12 items-center justify-center gap-2.5 rounded-md px-8 text-[14.5px] font-semibold bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] hover:bg-[oklch(0.7_0.08_236)] transition-colors"
        >
          <Check className="w-[17px] h-[17px]" /> Save
        </button>
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md px-6 text-[13.5px] font-medium border border-white/12 bg-white/[0.03] hover:bg-white/8 text-white/75 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}
      </div>
    </motion.div>
  )
}

/* ─────────────── the sale object ─────────────── */

interface Sale {
  inv: NervaInvoice
  token: string
  verifyUrl: string
  startedAt: number
}

const SALE_TTL = 900 // 15 minutes: a shop sale is paid now, not next week

/* ─────────────── the POS ─────────────── */

type View = 'keypad' | 'charge' | 'paid' | 'journal'

export function Caisse() {
  const [config, setConfig] = useState<MerchantConfig | null>(null)
  const [view, setView] = useState<View>('keypad')
  const [editConfig, setEditConfig] = useState(false)

  const [amount, setAmount] = useState('') // keypad string, XNV or USD
  const [curInput, setCurInput] = useState<'xnv' | 'usd'>('xnv')
  const [desc, setDesc] = useState('')

  const [sale, setSale] = useState<Sale | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [qrMode, setQrMode] = useState<'wallet' | 'page'>('wallet')
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [netHeight, setNetHeight] = useState(0)
  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [frozen, setFrozen] = useState<DetectionResult | null>(null)
  const [journal, setJournal] = useState<JournalEntry[]>([])
  const [chainOk, setChainOk] = useState<boolean | null>(null)
  const [chainMsg, setChainMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const busyRef = useRef(false)
  const cursor = useRef(-1)
  const knownTx = useRef<string | undefined>(undefined)
  const landedRef = useRef(false)

  /* live XNV rate, shared singleton (USD = reference, EUR = secondary) */
  const { price, refresh } = useNervaPrice()

  /* boot: load config + journal */
  useEffect(() => {
    setConfig(loadMerchantConfig())
    setJournal(loadJournal())
  }, [])

  /* effective USD/XNV rate: manual override wins, otherwise live */
  const manualRate = Number((config?.usdRate ?? '').replace(',', '.'))
  const hasManual = Number.isFinite(manualRate) && manualRate > 0
  const liveRate = price?.usd ?? 0
  const rate = hasManual ? manualRate : liveRate
  const hasRate = rate > 0

  /** merchant view key (parsed + validated) — null in manual mode */
  const viewKeyBytes = useMemo(() => (config ? parsedViewKey(config) : null), [config])

  /* atomic → USD string with the effective rate (manual or live), integer math */
  const atomicToUsd = useCallback((atomic: string | bigint): string | null => {
    if (!hasRate) return null
    return xnvAtomicToUsdLive(atomic, rate)
  }, [hasRate, rate])

  /* atomic → EUR (live only, secondary display) */
  const atomicToEur = useCallback((atomic: string | bigint): string | null => {
    if (!price?.eur) return null
    return xnvAtomicToEurLive(atomic, price.eur)
  }, [price?.eur])

  /* derived: the amount as atomic, from the active input mode */
  const atomic = useMemo(() => {
    if (!amount) return null
    if (curInput === 'usd') {
      if (!hasRate) return null
      const usd = Number(amount.replace(',', '.'))
      if (!Number.isFinite(usd)) return null
      // usd / rate × 1e12 — micro-USD to stay integral
      const usdMicro = BigInt(Math.round(usd * 1e6))
      const rateScaled = BigInt(Math.round(rate * 1e6))
      return (usdMicro * 10n ** 12n) / (rateScaled * 10n ** 6n)
    }
    return parseXnv(amount)
  }, [amount, curInput, hasRate, rate])

  const usdEquiv = atomic !== null && atomic > 0n ? atomicToUsd(atomic) : null
  const eurEquiv = atomic !== null && atomic > 0n ? atomicToEur(atomic) : null

  /* ── keypad actions ── */
  const key = (k: string) => {
    setAmount((a) => {
      if (k === 'C') return ''
      if (k === '⌫') return a.slice(0, -1)
      if (k === ',' ) return a.includes('.') || a === '' ? a : a + '.'
      if (k === '.') return a.includes('.') || a === '' ? a : a + '.'
      if (a.replace('.', '').length >= 12) return a
      return (a === '0' ? '' : a) + k
    })
  }

  /* ── mint the invoice and open the charge screen ── */
  const charge = async () => {
    if (!config || atomic === null || atomic <= 0n) return
    setBusy(true)
    try {
      let height = 0
      try { height = await getBlockCount() } catch { height = 0 }
      const inv: NervaInvoice = {
        v: 2,
        a: config.address,
        amt: atomic.toString(),
        d: desc.trim() || undefined,
        n: config.name.trim() || undefined,
        pid8: generatePaymentId8(),
        h: height,
        exp: Math.floor(Date.now() / 1000) + SALE_TTL,
      }
      const token = encodeInvoice(inv)
      const verifyUrl = `${window.location.origin}/nerva/pay?d=${token}`
      cursor.current = height - 1
      knownTx.current = undefined
      landedRef.current = false
      setEntry(null)
      setFrozen(null)
      setResult(null)
      setSale({ inv, token, verifyUrl, startedAt: Date.now() })
      setQrMode('wallet')
      setView('charge')
    } finally {
      setBusy(false)
    }
  }

  /* ── the watcher: mempool + new blocks for THIS sale ──
     with the merchant view key: every integrated payment id is decrypted
     and matched — real auto-detection, exactly like the official wallet.
     without it: the customer declares the tx hash on the checkout page,
     and this screen picks it up here once found (known tx path). */
  const watch = useCallback(async () => {
    if (!sale || busyRef.current) return
    if (landedRef.current && result?.status === 'settled') return
    busyRef.current = true
    try {
      const tip = await getBlockCount()
      setNetHeight(tip)
      const { result: r } = await detectPayment(sale.inv, tip, {
        knownTxHash: knownTx.current,
        scanFrom: Math.max(cursor.current + 1, sale.inv.h),
        viewKey: viewKeyBytes,
      })
      if (r.scannedBlocks > 0) cursor.current = Math.max(cursor.current, tip)
      if (r.status !== 'pending' && r.txHash) {
        knownTx.current = r.txHash
        savePaymentCache(invoiceCacheKey(sale.inv), r)
        if (!landedRef.current && r.status !== 'declared') {
          // first landing: freeze the sale record, chain it, ring
          landedRef.current = true
          const ts = Date.now()
          const e = await buildJournalEntry(sale.inv, r, ts)
          appendJournal(e)
          setJournal(loadJournal())
          setEntry(e)
          setFrozen(r)
          setChainOk(null)
          if (config?.sound) playChime()
          setView('paid')
        }
      }
      setResult(r)
    } catch { /* explorer unreachable: keep the screen, retry next tick */ } finally {
      busyRef.current = false
    }
  }, [sale, viewKeyBytes, config?.sound, result?.status])

  /* polling loop, only while a sale is in flight */
  useEffect(() => {
    if (!sale) return
    void watch()
    const id = setInterval(() => void watch(), 9500 + Math.random() * 2500)
    return () => clearInterval(id)
  }, [sale, watch])

  /* QR for the active mode */
  useEffect(() => {
    if (!sale) { setQr(null); return }
    let alive = true
    const data = qrMode === 'wallet' ? buildNervaUri(sale.inv) : sale.verifyUrl
    void renderQrDataUrl(data, 420).then((url) => { if (alive) setQr(url) }).catch(() => {})
    return () => { alive = false }
  }, [sale, qrMode])

  const newSale = () => {
    setSale(null); setAmount(''); setDesc(''); setResult(null)
    setEntry(null); setFrozen(null); setView('keypad')
  }

  /* ── receipt actions ── */
  const receiptBytes = useCallback(async () => {
    if (!sale) return null
    return buildReceiptPdf(sale.inv, frozen, {
      verifyUrl: sale.verifyUrl,
      generatedAt: entry?.ts,
      usd: atomicToUsd(sale.inv.amt) ?? undefined,
      eur: atomicToEur(sale.inv.amt) ?? undefined,
    })
  }, [sale, frozen, entry?.ts, atomicToUsd, atomicToEur])

  const printReceipt = async () => {
    const bytes = await receiptBytes()
    if (bytes) printPdf(bytes)
  }
  const downloadReceipt = async () => {
    const ref = sale?.inv.v === 2 ? sale.inv.pid8 : sale?.inv.pid
    const bytes = await receiptBytes()
    if (bytes) downloadPdf(bytes, `receipt-${(ref ?? 'sale').slice(0, 12)}.pdf`)
  }

  /* ── journal: verify / export / clear ── */
  const runVerify = async () => {
    const v = await verifyJournal(journal)
    setChainOk(v.ok)
    setChainMsg(v.ok
      ? `chain intact · ${v.entries} sales · head ${v.head.slice(0, 16)}…`
      : `chain broken at sale #${v.firstBad + 1} — data was modified or removed`)
  }
  const exportJournal = () => {
    const blob = new Blob([exportJournalJson(journal)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `pos-journal-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }
  const wipeJournal = () => {
    if (!window.confirm('Erase the entire sales journal? Irreversible (printed receipts stay valid).')) return
    clearJournal()
    setJournal([])
    setChainOk(null)
  }

  /* ── unpaid sale guard: leaving the charge screen ── */
  const abandonSale = () => {
    if (!landedRef.current && !window.confirm('Abandon this sale? If the customer pays after that, the transaction will still be visible in your wallet (reference in clear).')) return
    newSale()
  }

  /* ─────────────── render ─────────────── */

  if (!config) {
    return (
      <div className="relative pt-28 pb-20 min-h-screen">
        <div className="absolute inset-0 circuit-bg opacity-25" />
        <div className="relative mx-auto max-w-xl px-5">
          <div className="mb-8 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-white/40" />
          </div>
        </div>
      </div>
    )
  }

  if (editConfig || !configReady(config)) {
    return (
      <div className="relative pt-28 pb-20 min-h-screen">
        <div className="absolute inset-0 circuit-bg opacity-25" />
        <div className="relative mx-auto max-w-xl px-5">
          <ConfigForm
            initial={config}
            onSave={(c) => { saveMerchantConfig(c); setConfig(c); setEditConfig(false) }}
            onBack={configReady(config) && !editConfig ? () => setEditConfig(false) : undefined}
          />
        </div>
      </div>
    )
  }

  const paid = !!result && (result.status === 'detected' || result.status === 'confirmed' || result.status === 'settled')

  return (
    <div className="relative pt-28 pb-20 min-h-screen">
      <div className="absolute inset-0 circuit-bg opacity-25 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-[380px]"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 0%, oklch(0.19 0.04 250 / 0.4), transparent 70%)' }} />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        {/* header */}
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md bg-[oklch(0.78_0.06_237)]/12 border border-[oklch(0.78_0.06_237)]/25 flex items-center justify-center">
              <Store className="w-5 h-5 text-[oklch(0.78_0.06_237)]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">NERVA POS</h1>
              <div className="mt-0.5 font-mono text-[10px] text-[oklch(0.58_0.025_250)]">
                point-of-sale terminal · XNV · 100% local
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('journal')}
              className={`inline-flex h-10 items-center gap-2 rounded-md px-4 font-mono text-[11px] border transition-all ${
                view === 'journal'
                  ? 'border-[oklch(0.78_0.06_237)]/70 bg-[oklch(0.78_0.06_237)]/12 text-[oklch(0.83_0.055_237)]'
                  : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25'
              }`}
            >
              <NotebookText className="w-3.5 h-3.5" /> Journal · {journal.length}
            </button>
            <button
              onClick={() => setEditConfig(true)}
              className="inline-flex h-10 items-center gap-2 rounded-md px-4 font-mono text-[11px] border border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 transition-all"
            >
              <Settings2 className="w-3.5 h-3.5" /> Settings
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ══════════ KEYPAD ══════════ */}
          {view === 'keypad' && (
            <motion.div key="keypad" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mt-10 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
              <div className="panel-nerva rounded-lg p-6 sm:p-8">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
                  Amount to charge
                </div>

                {/* display */}
                <div className="mt-5 rounded-lg border border-white/10 bg-[oklch(0.12_0.018_255)] px-5 py-6 text-right">
                  <div className="font-mono font-bold tabular-nums text-[44px] leading-none text-gradient-nerva">
                    {amount === '' ? <span className="text-white/20">0</span> : amount}
                    <span className="text-[18px] ml-2 text-[oklch(0.7_0.08_220)]">
                      {curInput === 'xnv' ? 'XNV' : 'USD'}
                    </span>
                  </div>
                  <div className="mt-2 font-mono text-[11px] text-[oklch(0.6_0.012_250)]">
                    {atomic !== null && atomic > 0n && curInput === 'usd' && `≈ ${formatXnv(atomic, 4)} XNV`}
                    {atomic !== null && atomic > 0n && curInput === 'xnv' && usdEquiv && `≈ $${usdEquiv}${eurEquiv ? ` · €${eurEquiv}` : ''}`}
                  </div>
                </div>

                {/* currency toggle + live rate strip */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {hasRate && (
                    <div className="flex rounded-md border border-white/10 bg-[oklch(0.12_0.018_255)] p-0.5 w-fit">
                      {(['xnv', 'usd'] as const).map((m) => (
                        <button key={m} onClick={() => { setCurInput(m); setAmount('') }}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-[5px] px-4 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-all ${
                            curInput === m ? 'bg-[oklch(0.78_0.06_237)]/18 text-[oklch(0.83_0.055_237)]' : 'text-white/45 hover:text-white/70'
                          }`}>
                          {m === 'xnv' ? 'XNV' : 'USD'}
                        </button>
                      ))}
                    </div>
                  )}
                  {price ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-[oklch(0.72_0.12_160)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.12_160)]" />
                      {priceCaption(price)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 font-mono text-[10px] text-[oklch(0.6_0.012_250)]">
                      <Loader2 className="w-3 h-3 animate-spin" /> fetching live XNV/USD rate…
                    </span>
                  )}
                  {hasManual && (
                    <span className="font-mono text-[10px] text-[oklch(0.75_0.13_25)]">manual override: 1 XNV = ${manualRate}</span>
                  )}
                  <button
                    onClick={refresh}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/50 hover:text-white/85 hover:border-white/25 transition-all"
                    title="Refresh rate"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>

                {/* keypad */}
                <div className="mt-6 grid grid-cols-3 gap-2.5">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'].map((k) => (
                    <motion.button
                      key={k}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => key(k)}
                      className="h-14 sm:h-16 rounded-lg border border-white/10 bg-white/[0.04] hover:border-[oklch(0.78_0.06_237)]/40 hover:bg-[oklch(0.78_0.06_237)]/8 font-mono text-[20px] font-semibold text-white/90 transition-all"
                    >
                      {k === '⌫' ? <Delete className="w-5 h-5 mx-auto text-white/60" /> : k}
                    </motion.button>
                  ))}
                </div>
                <button
                  onClick={() => setAmount('')}
                  className="mt-2.5 h-10 w-full rounded-lg border border-white/8 bg-white/[0.02] font-mono text-[11px] text-white/45 hover:text-white/80 hover:border-white/20 transition-all"
                >
                  C · clear all
                </button>

                {/* note */}
                <div className="mt-6">
                  <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.62_0.025_250)]">
                    Note (optional)
                  </label>
                  <div className="mt-2">
                    <input
                      value={desc}
                      onChange={(e) => setDesc(e.target.value.slice(0, 140))}
                      placeholder="table 4, 2 coffees…"
                      className={inputCls}
                    />
                  </div>
                </div>

                <button
                  onClick={() => void charge()}
                  disabled={busy || atomic === null || atomic <= 0n}
                  className="mt-8 w-full inline-flex h-14 items-center justify-center gap-3 rounded-md text-[15px] font-semibold bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] hover:bg-[oklch(0.7_0.08_236)] transition-colors disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  Charge {atomic !== null && atomic > 0n ? `${curInput === 'xnv' ? formatXnv(atomic) + ' XNV' : amount + ' USD'}` : ''}
                </button>
              </div>

              {/* side */}
              <div className="space-y-4">
                <div className="panel-nerva rounded-lg p-6">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
                    Flow
                  </div>
                  <ol className="mt-4 space-y-3">
                    {[
                      ['1 · Amount', 'type the sum, XNV or USD at the live rate'],
                      ['2 · Customer QR', 'the customer scans with their NERVA wallet or phone'],
                      ['3 · Paid', 'auto-detected with your view key (or customer-declared), printable PDF receipt, sale sealed into the journal'],
                    ].map(([k, v]) => (
                      <li key={k} className="flex items-start gap-2.5">
                        <Check className="w-3.5 h-3.5 text-[oklch(0.72_0.12_160)] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-mono text-[11px] font-semibold text-white/85">{k}</span>
                          <span className="block text-[11px] text-[oklch(0.6_0.012_250)] leading-snug mt-0.5">{v}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="panel-nerva rounded-lg p-6">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
                    Chained journal
                  </div>
                  <p className="mt-3 text-[12px] leading-relaxed text-[oklch(0.66_0.025_250)]">
                    Every sale is sealed with SHA-256 and chained to the
                    previous one: editing or removing a sale breaks all the
                    following ones. An accounting mini-blockchain, local to
                    this terminal.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════ CHARGE (customer screen) ══════════ */}
          {view === 'charge' && sale && (
            <motion.div key="charge" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mt-10 grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-8 items-start">
              <div className="panel-nerva rounded-lg p-6 sm:p-8 flex flex-col items-center">
                <div className="self-start w-full flex items-center justify-between gap-4 pb-4 mb-5 border-b border-white/8">
                  <div className="min-w-0">
                    <div className="font-semibold text-[14px] text-white">{config.name || 'NERVA payment'}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-[oklch(0.58_0.025_250)]">
                      {desc.trim() || 'charge in progress'}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 shrink-0 font-mono tabular-nums text-[12px] font-semibold text-white/85 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
                    <Radar className="w-3.5 h-3.5 text-[oklch(0.78_0.06_237)] animate-pulse" />
                    15:00
                  </span>
                </div>

                <div className="text-center">
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.26em] text-[oklch(0.58_0.025_250)]">To pay</div>
                  <div className="mt-2 font-mono font-bold tabular-nums text-[40px] leading-none text-gradient-nerva">
                    {atomicToDisplay(sale.inv.amt)}
                    <span className="text-[20px] ml-2 text-[oklch(0.7_0.08_220)]">XNV</span>
                  </div>
                  {usdEquiv && (
                    <div className="mt-1.5 font-mono text-[12px] text-[oklch(0.6_0.012_250)]">≈ ${usdEquiv}{eurEquiv ? ` · €${eurEquiv}` : ''}</div>
                  )}
                </div>

                <div className="mt-6 flex rounded-md border border-white/10 bg-[oklch(0.12_0.018_255)] p-0.5">
                  {([['wallet', 'Wallet', Wallet], ['page', 'Phone', ScanLine]] as const).map(([m, label, Icon]) => (
                    <button key={m} onClick={() => setQrMode(m)}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-[5px] px-3.5 font-mono text-[10.5px] transition-all ${
                        qrMode === m ? 'bg-[oklch(0.78_0.06_237)]/18 text-[oklch(0.83_0.055_237)]' : 'text-white/45 hover:text-white/70'
                      }`}>
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </button>
                  ))}
                </div>

                {qr ? (
                  <img src={qr} alt="NERVA payment QR"
                    className="mt-5 w-[260px] h-[260px] rounded-md bg-[#eef4fb] border border-white/15" />
                ) : (
                  <div className="mt-5 w-[260px] h-[260px] rounded-md bg-white/[0.04] border border-white/10 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-white/30" />
                  </div>
                )}

                <p className="mt-4 text-[12px] text-[oklch(0.62_0.012_250)] text-center max-w-xs leading-relaxed">
                  {qrMode === 'wallet'
                    ? 'The customer scans with NervaOne or any NERVA wallet — this QR pays an integrated address, the reference rides encrypted and every wallet handles it automatically.'
                    : 'The customer scans with any camera app: the checkout page opens with a wallet QR included.'}
                </p>

                <button
                  onClick={abandonSale}
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-md px-5 text-[13px] font-medium border border-white/12 bg-white/[0.03] hover:bg-white/8 text-white/70 transition-colors"
                >
                  <X className="w-4 h-4" /> Cancel sale
                </button>
              </div>

              {/* merchant side: live status */}
              <div className="panel-nerva rounded-lg p-6 sm:p-8">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
                  Payment tracking
                </div>
                <div className="mt-6 flex items-center gap-5">
                  <div className="relative w-[92px] h-[92px] shrink-0">
                    <svg viewBox="0 0 92 92" className="w-full h-full -rotate-90">
                      <circle cx="46" cy="46" r="42" fill="none" stroke="oklch(0.93 0.012 250 / 10%)" strokeWidth="3" />
                      <motion.circle cx="46" cy="46" r="42" fill="none" stroke="oklch(0.78 0.06 237)" strokeWidth="3"
                        strokeLinecap="round" strokeDasharray={2 * Math.PI * 42}
                        animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - Math.min(1, (result?.confirmations ?? 0) / NERVA_CONSTANTS.spendableAge)) }}
                        transition={{ duration: 0.8 }}
                      />
                    </svg>
                    <Radar className="absolute inset-0 m-auto w-6 h-6 text-[oklch(0.78_0.06_237)] animate-pulse" />
                  </div>
                  <div>
                    <div className="font-semibold text-[16px] text-white">
                      {paid ? 'Payment received' : 'Listening to the network…'}
                    </div>
                    <div className="mt-1.5 text-[12.5px] text-[oklch(0.66_0.025_250)]">
                      {paid
                        ? `${result!.confirmations}/${NERVA_CONSTANTS.spendableAge} confirmations · height ${netHeight.toLocaleString('en-US')}`
                        : `mempool + blocks scanned · network at ${netHeight.toLocaleString('en-US')}`}
                    </div>
                    {result?.txHash && (
                      <button onClick={() => void copyText(result.txHash!)}
                        className="mt-2.5 inline-flex items-center gap-1.5 font-mono text-[10.5px] text-[oklch(0.78_0.06_237)] hover:text-[oklch(0.9_0.1_215)] transition-colors">
                        tx {result.txHash.slice(0, 10)}…
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-6 rounded-md border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-[11.5px] leading-relaxed text-[oklch(0.64_0.012_250)]">
                    {viewKeyBytes
                      ? 'Auto-detection is ON: this terminal decrypts every integrated payment reference with your view key — exactly what an official wallet does, in this browser. It can see, never spend.'
                      : 'Manual mode: payments flow fine, but NERVA encrypts references — the customer declares the tx hash on the checkout page, and you can add your view key in settings for full auto-detection.'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════ PAID ══════════ */}
          {view === 'paid' && sale && entry && (
            <motion.div key="paid" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              className="mt-10 max-w-xl mx-auto">
              <div className="panel-nerva rounded-lg p-8 text-center relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-[220px]"
                  style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 0%, oklch(0.2 0.07 160 / 0.3), transparent 70%)' }} />
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                  className="relative w-16 h-16 mx-auto rounded-full bg-[oklch(0.72_0.12_160)]/15 border border-[oklch(0.72_0.12_160)]/40 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-[oklch(0.72_0.12_160)]" />
                </motion.div>
                <h2 className="relative mt-5 text-2xl font-bold text-white">Paid</h2>
                <div className="relative mt-2 font-mono font-bold tabular-nums text-[30px] text-gradient-nerva">
                  {atomicToDisplay(sale.inv.amt)} <span className="text-[16px] text-[oklch(0.7_0.08_220)]">XNV</span>
                </div>
                {usdEquiv && <div className="relative mt-1 font-mono text-[12px] text-[oklch(0.6_0.012_250)]">≈ ${usdEquiv}{eurEquiv ? ` · €${eurEquiv}` : ''}</div>}
                <div className="relative mt-3 font-mono text-[10.5px] text-[oklch(0.58_0.025_250)]">
                  sale sealed · seal {entry.seal.slice(0, 14)}…
                  {result && ` · ${result.confirmations}/${NERVA_CONSTANTS.spendableAge} confirmations`}
                </div>

                <div className="relative mt-8 grid sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => void printReceipt()}
                    className="inline-flex h-12 items-center justify-center gap-2.5 rounded-md text-[14px] font-semibold bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] hover:bg-[oklch(0.7_0.08_236)] transition-colors"
                  >
                    <Printer className="w-[17px] h-[17px]" /> Print receipt
                  </button>
                  <button
                    onClick={() => void downloadReceipt()}
                    className="inline-flex h-12 items-center justify-center gap-2.5 rounded-md text-[14px] font-medium border border-white/12 bg-white/[0.03] hover:bg-white/8 text-white/80 transition-colors"
                  >
                    <Download className="w-[17px] h-[17px]" /> Receipt PDF
                  </button>
                </div>
                <button
                  onClick={newSale}
                  className="relative mt-3 w-full inline-flex h-12 items-center justify-center gap-2 rounded-md text-[13.5px] font-medium text-[oklch(0.83_0.055_237)] hover:bg-[oklch(0.78_0.06_237)]/10 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" /> New sale
                </button>
              </div>
            </motion.div>
          )}

          {/* ══════════ JOURNAL ══════════ */}
          {view === 'journal' && (
            <motion.div key="journal" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mt-10">
              <div className="panel-nerva rounded-lg overflow-hidden">
                <div className="px-6 sm:px-7 py-5 border-b border-white/8 flex flex-wrap items-center justify-between gap-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.62_0.025_250)]">
                    Sales journal · SHA-256 chain
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void runVerify()}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 font-mono text-[10.5px] border border-white/10 bg-white/[0.03] text-white/65 hover:border-[oklch(0.72_0.12_160)]/50 hover:text-[oklch(0.78_0.13_160)] transition-all">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verify chain
                    </button>
                    <button onClick={exportJournal} disabled={journal.length === 0}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 font-mono text-[10.5px] border border-white/10 bg-white/[0.03] text-white/65 hover:border-white/30 transition-all disabled:opacity-40">
                      <FileJson className="w-3.5 h-3.5" /> Export
                    </button>
                    <button onClick={wipeJournal} disabled={journal.length === 0}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 font-mono text-[10.5px] border border-white/10 bg-white/[0.03] text-white/45 hover:border-[oklch(0.7_0.13_25)]/50 hover:text-[oklch(0.75_0.13_25)] transition-all disabled:opacity-40">
                      <Trash2 className="w-3.5 h-3.5" /> Erase
                    </button>
                  </div>
                </div>

                {chainMsg && (
                  <div className={`px-6 sm:px-7 py-3.5 flex items-center gap-2.5 text-[12px] ${
                    chainOk ? 'text-[oklch(0.78_0.13_160)] bg-[oklch(0.72_0.12_160)]/8' : 'text-[oklch(0.75_0.13_25)] bg-[oklch(0.7_0.13_25)]/8'
                  }`}>
                    {chainOk ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    {chainMsg}
                  </div>
                )}

                {/* today's total */}
                <div className="px-6 sm:px-7 py-5 border-b border-white/8 flex flex-wrap items-baseline gap-x-8 gap-y-2">
                  <div>
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[oklch(0.55_0.01_250)]">Collected today</div>
                    <div className="mt-1 font-mono font-bold tabular-nums text-[22px] text-gradient-nerva">
                      {formatXnv(journal.filter(isToday).reduce((s, e) => s + BigInt(e.amountAtomic), 0n))} XNV
                    </div>
                  </div>
                  {hasRate && (
                    <div>
                      <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[oklch(0.55_0.01_250)]">
                        ≈ USD · {hasManual ? 'manual rate' : 'live rate'}
                      </div>
                      <div className="mt-1 font-mono font-bold tabular-nums text-[22px] text-white/70">
                        {atomicToUsd(journal.filter(isToday).reduce((s, e) => s + BigInt(e.amountAtomic), 0n)) ?? '—'}
                      </div>
                    </div>
                  )}
                </div>

                {journal.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <QrCode className="w-8 h-8 mx-auto text-white/15" />
                    <p className="mt-4 text-[13px] text-[oklch(0.6_0.012_250)]">
                      No sales yet — the first charge will seal the genesis block.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/6">
                    {[...journal].reverse().map((e) => (
                      <div key={e.pid} className="px-6 sm:px-7 py-4 flex flex-wrap items-center gap-x-5 gap-y-2 hover:bg-white/[0.02] transition-colors">
                        <div className="font-mono text-[10.5px] text-white/40 tabular-nums w-[112px] shrink-0">
                          {new Date(e.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          <div className="text-[9px] text-white/25">{new Date(e.ts).toLocaleDateString('en-US')}</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-mono font-semibold tabular-nums text-[13px] text-white/90">
                            {formatXnv(BigInt(e.amountAtomic))} XNV
                          </div>
                          <div className="mt-0.5 text-[11px] text-[oklch(0.6_0.012_250)] truncate">
                            {e.desc || 'no note'} · ref {e.pid.slice(0, 10)}…
                          </div>
                        </div>
                        <div className="font-mono text-[9.5px] text-[oklch(0.8_0.13_290)]/60 w-[86px] shrink-0 hidden sm:block" title={e.seal}>
                          seal {e.seal.slice(0, 10)}…
                        </div>
                        <span className={`shrink-0 inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] ${
                          e.status === 'settled' ? 'border-[oklch(0.72_0.12_160)]/30 text-[oklch(0.72_0.12_160)]' : 'border-[oklch(0.78_0.06_237)]/30 text-[oklch(0.78_0.06_237)]'
                        }`}>
                          {e.status === 'settled' ? 'settled' : e.status === 'pending' ? 'pending' : 'confirmed'}
                        </span>
                        <ReprintButton entry={e} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-center">
                <button onClick={() => setView(sale ? 'charge' : 'keypad')}
                  className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/40 hover:text-[oklch(0.78_0.06_237)] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> back to the terminal
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function isToday(e: JournalEntry): boolean {
  const d = new Date(e.ts)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

/** reprint a receipt straight from a journal entry */
function ReprintButton({ entry }: { entry: JournalEntry }) {
  const [busy, setBusy] = useState(false)
  const reprint = async () => {
    setBusy(true)
    try {
      // v2 entries carry a 16-hex pid8; legacy entries the 64-hex long pid
      const isV2 = /^[0-9a-f]{16}$/.test(entry.pid)
      const inv: NervaInvoice = isV2
        ? { v: 2, a: entry.address, amt: entry.amountAtomic, d: entry.desc, n: entry.merchantName, pid8: entry.pid, h: 0, exp: Math.floor(entry.ts / 1000) }
        : { v: 1, a: entry.address, amt: entry.amountAtomic, d: entry.desc, n: entry.merchantName, pid: entry.pid, h: 0, exp: Math.floor(entry.ts / 1000) }
      const r: DetectionResult | null = entry.txHash ? {
        status: entry.status === 'settled' ? 'settled' : 'confirmed',
        txHash: entry.txHash, blockHeight: entry.blockHeight, txTimestamp: Math.floor(entry.ts / 1000),
        inPool: false, confirmations: entry.confirmations ?? 0, checkedTxs: 0, scannedBlocks: 0, networkHeight: 0,
      } : null
      const bytes = await buildReceiptPdf(inv, r, { generatedAt: entry.ts })
      downloadPdf(bytes, `receipt-${entry.pid.slice(0, 12)}.pdf`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      onClick={() => void reprint()}
      disabled={busy}
      className="shrink-0 inline-flex h-9 items-center gap-1.5 rounded-md px-3 font-mono text-[10.5px] border border-white/10 bg-white/[0.03] text-white/60 hover:border-[oklch(0.78_0.06_237)]/50 hover:text-[oklch(0.83_0.055_237)] transition-all disabled:opacity-40"
      title="Reprint the receipt of this sale"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />} receipt
    </button>
  )
}
