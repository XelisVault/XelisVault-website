'use client'

/**
 * Caisse NERVA — the merchant point-of-sale terminal.
 *
 * The shop keeper types an amount on a big keypad, hits "Encaisser", the
 * customer scans the full-screen QR with their wallet, and the page
 * watches the chain (mempool → 10 confirmations) until it lands. Every
 * encaissé sale is sealed (SHA-256) and chained into a local journal,
 * and a thermal-style PDF receipt is one click away.
 *
 * Everything is local: config, journal and receipts never leave the
 * browser. No account, no server, no keys.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Store, Settings2, Delete, Printer, Download, Check, NotebookText,
  Volume2, VolumeX, ArrowLeft, ArrowRight, ShieldCheck, Trash2, FileJson,
  CheckCircle2, Loader2, Radar, AlertTriangle, QrCode, Wallet, ScanLine, X,
} from 'lucide-react'
import {
  encodeInvoice, generatePaymentId, buildNervaUri, renderQrDataUrl,
  atomicToDisplay, detectPayment, savePaymentCache,
  type NervaInvoice, type DetectionResult,
} from '@/lib/nerva/nlink'
import { parseXnv, formatXnv, getBlockCount, NERVA_CONSTANTS } from '@/lib/nerva/api'
import {
  loadMerchantConfig, saveMerchantConfig, configReady, xnvAtomicToEur,
  type MerchantConfig,
} from '@/lib/nerva/merchant'
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
  const addrOk = useMemo(() => configReady({ ...c }), [c])
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="panel-nerva rounded-lg p-6 sm:p-8 max-w-xl mx-auto"
    >
      <div className="flex items-center gap-2.5">
        <Settings2 className="w-4 h-4 text-[oklch(0.78_0.06_237)]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
          Réglages de la caisse
        </span>
      </div>
      <div className="mt-6 space-y-5">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.62_0.025_250)]">
            Votre adresse NERVA
          </label>
          <div className="mt-2">
            <input
              value={c.address}
              onChange={(e) => setC({ ...c, address: e.target.value })}
              placeholder="NV…"
              className={inputCls}
              spellCheck={false} autoComplete="off"
            />
          </div>
          {touched && !addrOk && (
            <div className="mt-1.5 font-mono text-[10px] text-[oklch(0.75_0.13_25)]">
              adresse invalide (doit commencer par NV, 95 caractères)
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.62_0.025_250)]">
              Nom de la boutique
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
              Taux EUR / XNV (optionnel)
            </label>
            <div className="mt-2">
              <input
                value={c.eurRate}
                onChange={(e) => setC({ ...c, eurRate: e.target.value.replace(',', '.') })}
                placeholder="ex. 0.085"
                className={inputCls} inputMode="decimal"
              />
            </div>
            <div className="mt-1.5 font-mono text-[9.5px] text-[oklch(0.5_0.01_250)]">
              affichage seul, entré à la main
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
          <span className="text-[13px] text-white/80">Sonnerie quand un paiement arrive</span>
          {c.sound ? <Volume2 className="w-4 h-4 text-[oklch(0.78_0.06_237)]" /> : <VolumeX className="w-4 h-4 text-white/30" />}
        </label>
      </div>
      <div className="mt-8 flex flex-wrap gap-2.5">
        <button
          onClick={() => { setTouched(true); if (addrOk) onSave(c) }}
          className="inline-flex h-12 items-center justify-center gap-2.5 rounded-md px-8 text-[14.5px] font-semibold bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] hover:bg-[oklch(0.7_0.08_236)] transition-colors"
        >
          <Check className="w-[17px] h-[17px]" /> Enregistrer
        </button>
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md px-6 text-[13.5px] font-medium border border-white/12 bg-white/[0.03] hover:bg-white/8 text-white/75 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
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

/* ─────────────── the caisse ─────────────── */

type View = 'keypad' | 'charge' | 'paid' | 'journal'

export function Caisse() {
  const [config, setConfig] = useState<MerchantConfig | null>(null)
  const [view, setView] = useState<View>('keypad')
  const [editConfig, setEditConfig] = useState(false)

  const [amount, setAmount] = useState('') // keypad string, XNV
  const [curInput, setCurInput] = useState<'xnv' | 'eur'>('xnv')
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

  /* boot: load config + journal */
  useEffect(() => {
    setConfig(loadMerchantConfig())
    setJournal(loadJournal())
  }, [])

  /* derived: the amount as atomic, from the active input mode */
  const rate = Number((config?.eurRate ?? '').replace(',', '.'))
  const hasRate = Number.isFinite(rate) && rate > 0

  const atomic = useMemo(() => {
    if (!amount) return null
    if (curInput === 'eur') {
      if (!hasRate) return null
      const eur = Number(amount.replace(',', '.'))
      if (!Number.isFinite(eur)) return null
      return BigInt(Math.round(eur / rate * 10 ** NERVA_CONSTANTS.unitPlaces))
    }
    return parseXnv(amount)
  }, [amount, curInput, hasRate, rate])

  const eurEquiv = atomic && hasRate ? xnvAtomicToEur(atomic.toString(), config!.eurRate) : null

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
  const encaisser = async () => {
    if (!config || atomic === null || atomic <= 0n) return
    setBusy(true)
    try {
      let height = 0
      try { height = await getBlockCount() } catch { height = 0 }
      const inv: NervaInvoice = {
        v: 1,
        a: config.address,
        amt: atomic.toString(),
        d: desc.trim() || undefined,
        n: config.name.trim() || undefined,
        pid: generatePaymentId(),
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

  /* ── the watcher: mempool + new blocks for THIS sale ── */
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
      })
      if (r.scannedBlocks > 0) cursor.current = Math.max(cursor.current, tip)
      if (r.status !== 'pending' && r.txHash) {
        knownTx.current = r.txHash
        savePaymentCache(sale.inv.pid, r)
        if (!landedRef.current) {
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
  }, [sale, config?.sound, result?.status])

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
    })
  }, [sale, frozen, entry?.ts])

  const printReceipt = async () => {
    const bytes = await receiptBytes()
    if (bytes) printPdf(bytes)
  }
  const downloadReceipt = async () => {
    const bytes = await receiptBytes()
    if (bytes) downloadPdf(bytes, `recu-${sale?.inv.pid.slice(0, 12)}.pdf`)
  }

  /* ── journal: verify / export / clear ── */
  const runVerify = async () => {
    const v = await verifyJournal(journal)
    setChainOk(v.ok)
    setChainMsg(v.ok
      ? `chaîne intacte · ${v.entries} ventes · tête ${v.head.slice(0, 16)}…`
      : `chaîne rompue à la vente #${v.firstBad + 1} — donnée modifiée ou supprimée`)
  }
  const exportJournal = () => {
    const blob = new Blob([exportJournalJson(journal)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `caisse-journal-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }
  const wipeJournal = () => {
    if (!window.confirm('Effacer tout le journal des ventes ? Irréversible (les reçus papier restent valides).')) return
    clearJournal()
    setJournal([])
    setChainOk(null)
  }

  /* ── unpaid sale guard: leaving the charge screen ── */
  const abandonSale = () => {
    if (!landedRef.current && !window.confirm('Abandonner cette vente ? Si le client paie après, la transaction restera visible dans votre wallet (référence en clair).')) return
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
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Caisse NERVA</h1>
              <div className="mt-0.5 font-mono text-[10px] text-[oklch(0.58_0.025_250)]">
                terminal point de vente · XNV · 100 % local
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
              <Settings2 className="w-3.5 h-3.5" /> Réglages
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ══════════ KEYBOARD ══════════ */}
          {view === 'keypad' && (
            <motion.div key="keypad" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mt-10 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
              <div className="panel-nerva rounded-lg p-6 sm:p-8">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
                  Montant à encaisser
                </div>

                {/* display */}
                <div className="mt-5 rounded-lg border border-white/10 bg-[oklch(0.12_0.018_255)] px-5 py-6 text-right">
                  <div className="font-mono font-bold tabular-nums text-[44px] leading-none text-gradient-nerva">
                    {amount === '' ? <span className="text-white/20">0</span> : amount}
                    <span className="text-[18px] ml-2 text-[oklch(0.7_0.08_220)]">
                      {curInput === 'xnv' ? 'XNV' : 'EUR'}
                    </span>
                  </div>
                  <div className="mt-2 font-mono text-[11px] text-[oklch(0.6_0.012_250)]">
                    {atomic !== null && atomic > 0n && curInput === 'eur' && `≈ ${formatXnv(atomic)} XNV`}
                    {atomic !== null && atomic > 0n && curInput === 'xnv' && eurEquiv && `≈ ${eurEquiv} EUR`}
                  </div>
                </div>

                {/* currency toggle */}
                {hasRate && (
                  <div className="mt-4 flex rounded-md border border-white/10 bg-[oklch(0.12_0.018_255)] p-0.5 w-fit">
                    {(['xnv', 'eur'] as const).map((m) => (
                      <button key={m} onClick={() => { setCurInput(m); setAmount('') }}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-[5px] px-4 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-all ${
                          curInput === m ? 'bg-[oklch(0.78_0.06_237)]/18 text-[oklch(0.83_0.055_237)]' : 'text-white/45 hover:text-white/70'
                        }`}>
                        {m === 'xnv' ? 'XNV' : 'EUR'}
                      </button>
                    ))}
                  </div>
                )}

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
                  C · tout effacer
                </button>

                {/* note */}
                <div className="mt-6">
                  <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.62_0.025_250)]">
                    Note (optionnel)
                  </label>
                  <div className="mt-2">
                    <input
                      value={desc}
                      onChange={(e) => setDesc(e.target.value.slice(0, 140))}
                      placeholder="table 4, 2 cafés…"
                      className={inputCls}
                    />
                  </div>
                </div>

                <button
                  onClick={() => void encaisser()}
                  disabled={busy || atomic === null || atomic <= 0n}
                  className="mt-8 w-full inline-flex h-14 items-center justify-center gap-3 rounded-md text-[15px] font-semibold bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] hover:bg-[oklch(0.7_0.08_236)] transition-colors disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  Encaisser {atomic !== null && atomic > 0n ? `${curInput === 'xnv' ? formatXnv(atomic) + ' XNV' : amount + ' EUR'}` : ''}
                </button>
              </div>

              {/* side */}
              <div className="space-y-4">
                <div className="panel-nerva rounded-lg p-6">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
                    Déroulé
                  </div>
                  <ol className="mt-4 space-y-3">
                    {[
                      ['1 · Montant', 'tapez la somme, XNV ou EUR si un taux est réglé'],
                      ['2 · QR client', 'le client scanne avec son wallet NERVA'],
                      ['3 · Encaissé', 'détection live, reçu PDF imprimable, vente scellée dans le journal'],
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
                    Journal chaîné
                  </div>
                  <p className="mt-3 text-[12px] leading-relaxed text-[oklch(0.66_0.025_250)]">
                    Chaque vente est scellée par SHA-256 et chaînée à la précédente :
                    modifier ou supprimer une vente casse toutes les suivantes. Un
                    mini-blockchain de comptabilité, local à cette caisse.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════ CHARGE (écran client) ══════════ */}
          {view === 'charge' && sale && (
            <motion.div key="charge" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mt-10 grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-8 items-start">
              <div className="panel-nerva rounded-lg p-6 sm:p-8 flex flex-col items-center">
                <div className="self-start w-full flex items-center justify-between gap-4 pb-4 mb-5 border-b border-white/8">
                  <div className="min-w-0">
                    <div className="font-semibold text-[14px] text-white">{config.name || 'Paiement NERVA'}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-[oklch(0.58_0.025_250)]">
                      {desc.trim() || 'encaissement en cours'}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 shrink-0 font-mono tabular-nums text-[12px] font-semibold text-white/85 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
                    <Radar className="w-3.5 h-3.5 text-[oklch(0.78_0.06_237)] animate-pulse" />
                    15:00
                  </span>
                </div>

                <div className="text-center">
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.26em] text-[oklch(0.58_0.025_250)]">À payer</div>
                  <div className="mt-2 font-mono font-bold tabular-nums text-[40px] leading-none text-gradient-nerva">
                    {atomicToDisplay(sale.inv.amt)}
                    <span className="text-[20px] ml-2 text-[oklch(0.7_0.08_220)]">XNV</span>
                  </div>
                  {eurEquiv && (
                    <div className="mt-1.5 font-mono text-[12px] text-[oklch(0.6_0.012_250)]">≈ {eurEquiv} EUR</div>
                  )}
                </div>

                <div className="mt-6 flex rounded-md border border-white/10 bg-[oklch(0.12_0.018_255)] p-0.5">
                  {([['wallet', 'Wallet', Wallet], ['page', 'Téléphone', ScanLine]] as const).map(([m, label, Icon]) => (
                    <button key={m} onClick={() => setQrMode(m)}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-[5px] px-3.5 font-mono text-[10.5px] transition-all ${
                        qrMode === m ? 'bg-[oklch(0.78_0.06_237)]/18 text-[oklch(0.83_0.055_237)]' : 'text-white/45 hover:text-white/70'
                      }`}>
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </button>
                  ))}
                </div>

                {qr ? (
                  <img src={qr} alt="QR de paiement NERVA"
                    className="mt-5 w-[260px] h-[260px] rounded-md bg-[#eef4fb] border border-white/15" />
                ) : (
                  <div className="mt-5 w-[260px] h-[260px] rounded-md bg-white/[0.04] border border-white/10 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-white/30" />
                  </div>
                )}

                <p className="mt-4 text-[12px] text-[oklch(0.62_0.012_250)] text-center max-w-xs leading-relaxed">
                  {qrMode === 'wallet'
                    ? 'Le client scanne avec NervaOne ou tout wallet NERVA : adresse, montant et référence sont pré-remplis.'
                    : 'Le client scanne avec l’appareil photo : la page de paiement s’ouvre, QR wallet inclus.'}
                </p>

                <button
                  onClick={abandonSale}
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-md px-5 text-[13px] font-medium border border-white/12 bg-white/[0.03] hover:bg-white/8 text-white/70 transition-colors"
                >
                  <X className="w-4 h-4" /> Annuler la vente
                </button>
              </div>

              {/* merchant side: live status */}
              <div className="panel-nerva rounded-lg p-6 sm:p-8">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
                  Suivi du paiement
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
                      {paid ? 'Paiement reçu' : 'En écoute du réseau…'}
                    </div>
                    <div className="mt-1.5 text-[12.5px] text-[oklch(0.66_0.025_250)]">
                      {paid
                        ? `${result!.confirmations}/${NERVA_CONSTANTS.spendableAge} confirmations · hauteur ${netHeight.toLocaleString('fr-FR')}`
                        : `mempool + blocs scannés · réseau à ${netHeight.toLocaleString('fr-FR')}`}
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
                    La détection tourne dans ce navigateur contre l’API publique de
                    l’explorer. RingCT chiffre les montants on-chain : c’est votre
                    wallet qui associera la référence affichée au montant exact.
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
                <h2 className="relative mt-5 text-2xl font-bold text-white">Encaissé</h2>
                <div className="relative mt-2 font-mono font-bold tabular-nums text-[30px] text-gradient-nerva">
                  {atomicToDisplay(sale.inv.amt)} <span className="text-[16px] text-[oklch(0.7_0.08_220)]">XNV</span>
                </div>
                {eurEquiv && <div className="relative mt-1 font-mono text-[12px] text-[oklch(0.6_0.012_250)]">≈ {eurEquiv} EUR</div>}
                <div className="relative mt-3 font-mono text-[10.5px] text-[oklch(0.58_0.025_250)]">
                  vente scellée · empreinte {entry.seal.slice(0, 14)}…
                  {result && ` · ${result.confirmations}/${NERVA_CONSTANTS.spendableAge} confirmations`}
                </div>

                <div className="relative mt-8 grid sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => void printReceipt()}
                    className="inline-flex h-12 items-center justify-center gap-2.5 rounded-md text-[14px] font-semibold bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] hover:bg-[oklch(0.7_0.08_236)] transition-colors"
                  >
                    <Printer className="w-[17px] h-[17px]" /> Imprimer le reçu
                  </button>
                  <button
                    onClick={() => void downloadReceipt()}
                    className="inline-flex h-12 items-center justify-center gap-2.5 rounded-md text-[14px] font-medium border border-white/12 bg-white/[0.03] hover:bg-white/8 text-white/80 transition-colors"
                  >
                    <Download className="w-[17px] h-[17px]" /> Reçu PDF
                  </button>
                </div>
                <button
                  onClick={newSale}
                  className="relative mt-3 w-full inline-flex h-12 items-center justify-center gap-2 rounded-md text-[13.5px] font-medium text-[oklch(0.83_0.055_237)] hover:bg-[oklch(0.78_0.06_237)]/10 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" /> Nouvelle vente
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
                    Journal des ventes · chaîne SHA-256
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void runVerify()}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 font-mono text-[10.5px] border border-white/10 bg-white/[0.03] text-white/65 hover:border-[oklch(0.72_0.12_160)]/50 hover:text-[oklch(0.78_0.13_160)] transition-all">
                      <ShieldCheck className="w-3.5 h-3.5" /> Vérifier la chaîne
                    </button>
                    <button onClick={exportJournal} disabled={journal.length === 0}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 font-mono text-[10.5px] border border-white/10 bg-white/[0.03] text-white/65 hover:border-white/30 transition-all disabled:opacity-40">
                      <FileJson className="w-3.5 h-3.5" /> Exporter
                    </button>
                    <button onClick={wipeJournal} disabled={journal.length === 0}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 font-mono text-[10.5px] border border-white/10 bg-white/[0.03] text-white/45 hover:border-[oklch(0.7_0.13_25)]/50 hover:text-[oklch(0.75_0.13_25)] transition-all disabled:opacity-40">
                      <Trash2 className="w-3.5 h-3.5" /> Effacer
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
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[oklch(0.55_0.01_250)]">Total encaissé aujourd’hui</div>
                    <div className="mt-1 font-mono font-bold tabular-nums text-[22px] text-gradient-nerva">
                      {formatXnv(journal.filter(isToday).reduce((s, e) => s + BigInt(e.amountAtomic), 0n))} XNV
                    </div>
                  </div>
                  {hasRate && (
                    <div>
                      <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[oklch(0.55_0.01_250)]">≈ EUR (taux réglé)</div>
                      <div className="mt-1 font-mono font-bold tabular-nums text-[22px] text-white/70">
                        {xnvAtomicToEur(String(journal.filter(isToday).reduce((s, e) => s + BigInt(e.amountAtomic), 0n)), config.eurRate) ?? '—'}
                      </div>
                    </div>
                  )}
                </div>

                {journal.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <QrCode className="w-8 h-8 mx-auto text-white/15" />
                    <p className="mt-4 text-[13px] text-[oklch(0.6_0.012_250)]">
                      Aucune vente pour l’instant — le premier encaissement scellera le bloc genesis.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/6">
                    {[...journal].reverse().map((e, ri) => (
                      <div key={e.pid} className="px-6 sm:px-7 py-4 flex flex-wrap items-center gap-x-5 gap-y-2 hover:bg-white/[0.02] transition-colors">
                        <div className="font-mono text-[10.5px] text-white/40 tabular-nums w-[112px] shrink-0">
                          {new Date(e.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          <div className="text-[9px] text-white/25">{new Date(e.ts).toLocaleDateString('fr-FR')}</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-mono font-semibold tabular-nums text-[13px] text-white/90">
                            {formatXnv(BigInt(e.amountAtomic))} XNV
                          </div>
                          <div className="mt-0.5 text-[11px] text-[oklch(0.6_0.012_250)] truncate">
                            {e.desc || 'sans note'} · réf {e.pid.slice(0, 10)}…
                          </div>
                        </div>
                        <div className="font-mono text-[9.5px] text-[oklch(0.8_0.13_290)]/60 w-[86px] shrink-0 hidden sm:block" title={e.seal}>
                          sceau {e.seal.slice(0, 10)}…
                        </div>
                        <span className={`shrink-0 inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] ${
                          e.status === 'settled' ? 'border-[oklch(0.72_0.12_160)]/30 text-[oklch(0.72_0.12_160)]' : 'border-[oklch(0.78_0.06_237)]/30 text-[oklch(0.78_0.06_237)]'
                        }`}>
                          {e.status === 'settled' ? 'règlé' : e.status === 'pending' ? 'attente' : 'confirmé'}
                        </span>
                        <ReprintButton entry={e} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-center">
                <button onClick={() => setView(sale ? 'charge' : 'keypad')}
                  className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/40 hover:text-[oklch(0.78_0.06_237)] transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> retour à la caisse
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
      const inv: NervaInvoice = {
        v: 1, a: entry.address, amt: entry.amountAtomic, d: entry.desc,
        n: entry.merchantName, pid: entry.pid, h: 0, exp: Math.floor(entry.ts / 1000),
      }
      const r: DetectionResult | null = entry.txHash ? {
        status: entry.status === 'settled' ? 'settled' : 'confirmed',
        txHash: entry.txHash, blockHeight: entry.blockHeight, txTimestamp: Math.floor(entry.ts / 1000),
        inPool: false, confirmations: entry.confirmations ?? 0, checkedTxs: 0, scannedBlocks: 0, networkHeight: 0,
      } : null
      const bytes = await buildReceiptPdf(inv, r, { generatedAt: entry.ts })
      downloadPdf(bytes, `recu-${entry.pid.slice(0, 12)}.pdf`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      onClick={() => void reprint()}
      disabled={busy}
      className="shrink-0 inline-flex h-9 items-center gap-1.5 rounded-md px-3 font-mono text-[10.5px] border border-white/10 bg-white/[0.03] text-white/60 hover:border-[oklch(0.78_0.06_237)]/50 hover:text-[oklch(0.83_0.055_237)] transition-all disabled:opacity-40"
      title="Réimprimer le reçu de cette vente"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />} reçu
    </button>
  )
}
