'use client'

/**
 * Tickets prix NERVA — printable price tags.
 *
 * Each tag carries a wallet-native `nerva:` QR (address + exact amount +
 * unique reference), so a customer scans and pays the shelf price with
 * their phone. One A4 sheet = 10 tags with dashed crop lines; the PDF is
 * generated fully client-side.
 *
 * Items reuse the caisse merchant config (address, shop name, EUR rate).
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Tag, Plus, Trash2, Printer, Download, Store, Settings2, Loader2,
  Check, QrCode, AlertTriangle, ArrowRight,
} from 'lucide-react'
import { generatePaymentId } from '@/lib/nerva/nlink'
import { parseXnv, formatXnv, NERVA_CONSTANTS } from '@/lib/nerva/api'
import {
  loadMerchantConfig, saveMerchantConfig, configReady, xnvAtomicToEur,
  type MerchantConfig,
} from '@/lib/nerva/merchant'
import { buildTagsPdf, downloadPdf, printPdf, type TagSpec } from '@/lib/nerva/pdf'

/* ─────────────── an item on the sheet ─────────────── */

interface Item {
  id: string
  name: string
  priceInput: string   // in the active currency
  currency: 'xnv' | 'eur'
  qty: number
}

const ITEMS_KEY = 'nerva-tickets-items-v1'
const MAX_TAGS = 100

const inputCls =
  'w-full h-11 rounded-lg bg-white/[0.04] border border-white/10 focus:border-[oklch(0.78_0.06_237)]/60 outline-none px-3.5 font-mono text-[12.5px] text-white/90 placeholder:text-white/25 transition-colors'

/* ─────────────── the tickets page ─────────────── */

export function Tickets() {
  const [config, setConfig] = useState<MerchantConfig | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [editConfig, setEditConfig] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  /* form */
  const [name, setName] = useState('')
  const [priceInput, setPriceInput] = useState('')
  const [currency, setCurrency] = useState<'xnv' | 'eur'>('xnv')
  const [qty, setQty] = useState(1)

  useEffect(() => {
    setConfig(loadMerchantConfig())
    try {
      const raw = localStorage.getItem(ITEMS_KEY)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) setItems(arr.filter((i) => i && typeof i.name === 'string'))
      }
    } catch { /* fresh start */ }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(ITEMS_KEY, JSON.stringify(items)) } catch { /* ignore */ }
  }, [items])

  const rate = Number((config?.eurRate ?? '').replace(',', '.'))
  const hasRate = Number.isFinite(rate) && rate > 0

  /* price → atomic */
  const priceAtomic = (item: Item): string | null => {
    const val = item.priceInput.trim()
    if (!val) return null
    if (item.currency === 'eur') {
      if (!hasRate) return null
      const eur = Number(val.replace(',', '.'))
      if (!Number.isFinite(eur) || eur <= 0) return null
      return String(BigInt(Math.round(eur / rate * 10 ** NERVA_CONSTANTS.unitPlaces)))
    }
    const atomic = parseXnv(val)
    return atomic !== null && atomic > 0n ? atomic.toString() : null
  }

  const tagCount = items.reduce((s, i) => s + Math.max(1, Math.min(50, i.qty)), 0)

  const addItem = () => {
    const probe: Item = { id: '', name: name.trim(), priceInput: priceInput.trim(), currency, qty }
    const atomic = priceAtomic(probe)
    if (!probe.name || atomic === null) {
      setError(!probe.name ? 'nom manquant' : hasRate || currency === 'xnv' ? 'prix invalide' : 'réglez un taux EUR/XNV d’abord')
      return
    }
    setError('')
    setItems((arr) => [...arr, { ...probe, id: crypto.randomUUID?.() ?? String(Math.random()) }])
    setName('')
    setPriceInput('')
    setQty(1)
  }

  const removeItem = (id: string) => setItems((arr) => arr.filter((i) => i.id !== id))

  /* build the PDF: one unique reference per printed tag */
  const buildSpecs = (): TagSpec[] => {
    const specs: TagSpec[] = []
    for (const item of items) {
      const atomic = priceAtomic(item) ?? '0'
      const n = Math.max(1, Math.min(50, item.qty))
      for (let k = 0; k < n; k++) {
        specs.push({
          name: item.name,
          amountAtomic: atomic,
          eur: item.currency === 'eur' ? item.priceInput.replace('.', ',')
            : hasRate ? (xnvAtomicToEur(atomic, config!.eurRate) ?? undefined) : undefined,
          pid: generatePaymentId(),
          address: config!.address,
          merchantName: config!.name || undefined,
        })
      }
    }
    return specs
  }

  const generate = async (mode: 'print' | 'download') => {
    if (!config || items.length === 0 || tagCount > MAX_TAGS) return
    setBusy(true)
    try {
      const specs = buildSpecs()
      const bytes = await buildTagsPdf(specs)
      if (mode === 'print') printPdf(bytes)
      else downloadPdf(bytes, `tickets-prix-${new Date().toISOString().slice(0, 10)}.pdf`)
    } finally {
      setBusy(false)
    }
  }

  /* ─────────────── render ─────────────── */

  if (!config) {
    return (
      <div className="relative pt-28 pb-20 min-h-screen">
        <div className="absolute inset-0 circuit-bg opacity-25" />
        <div className="relative mx-auto max-w-xl px-5 text-center pt-16">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-white/40" />
        </div>
      </div>
    )
  }

  if (editConfig || !configReady(config)) {
    return (
      <div className="relative pt-28 pb-20 min-h-screen">
        <div className="absolute inset-0 circuit-bg opacity-25" />
        <div className="relative mx-auto max-w-xl px-5">
          <div className="panel-nerva rounded-lg p-6 sm:p-8">
            <div className="flex items-center gap-2.5">
              <Settings2 className="w-4 h-4 text-[oklch(0.78_0.06_237)]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
                Réglages boutique (partagés avec la caisse)
              </span>
            </div>
            <div className="mt-6 space-y-5">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.62_0.025_250)]">
                  Votre adresse NERVA
                </label>
                <div className="mt-2">
                  <input
                    value={config.address}
                    onChange={(e) => setConfig({ ...config, address: e.target.value })}
                    placeholder="NV…" className={inputCls} spellCheck={false} autoComplete="off"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.62_0.025_250)]">
                    Nom de la boutique
                  </label>
                  <div className="mt-2">
                    <input
                      value={config.name}
                      onChange={(e) => setConfig({ ...config, name: e.target.value.slice(0, 60) })}
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
                      value={config.eurRate}
                      onChange={(e) => setConfig({ ...config, eurRate: e.target.value.replace(',', '.') })}
                      placeholder="ex. 0.085" className={inputCls} inputMode="decimal"
                    />
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (!configReady(config)) return
                saveMerchantConfig(config)
                setEditConfig(false)
              }}
              className="mt-8 inline-flex h-12 items-center justify-center gap-2.5 rounded-md px-8 text-[14.5px] font-semibold bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] hover:bg-[oklch(0.7_0.08_236)] transition-colors"
            >
              <Check className="w-[17px] h-[17px]" /> Enregistrer
            </button>
          </div>
        </div>
      </div>
    )
  }

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
              <Tag className="w-5 h-5 text-[oklch(0.78_0.06_237)]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Tickets prix</h1>
              <div className="mt-0.5 font-mono text-[10px] text-[oklch(0.58_0.025_250)]">
                étiquettes prix en XNV, QR payable · A4, 10 par page
              </div>
            </div>
          </div>
          <Link
            href="/nerva/caisse"
            className="inline-flex h-10 items-center gap-2 rounded-md px-4 font-mono text-[11px] border border-white/10 bg-white/[0.03] text-white/55 hover:border-[oklch(0.78_0.06_237)]/50 hover:text-[oklch(0.83_0.055_237)] transition-all"
          >
            <Store className="w-3.5 h-3.5" /> Caisse
          </Link>
        </div>

        <div className="mt-10 grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
          {/* ── form + list ── */}
          <div className="panel-nerva rounded-lg p-6 sm:p-8 min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
              Ajouter un produit
            </div>

            <div className="mt-6 grid sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.62_0.025_250)]">
                  Nom du produit
                </label>
                <div className="mt-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 40))}
                    onKeyDown={(e) => { if (e.key === 'Enter') addItem() }}
                    placeholder="ex. Café expresso bio"
                    className={inputCls} maxLength={40}
                  />
                </div>
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.62_0.025_250)]">
                  Prix
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addItem() }}
                    placeholder={currency === 'xnv' ? '2.5' : '1,20'}
                    className={inputCls} inputMode="decimal"
                  />
                  <div className="flex rounded-lg border border-white/10 bg-[oklch(0.12_0.018_255)] p-0.5 shrink-0">
                    {(['xnv', 'eur'] as const).map((c) => (
                      <button key={c} onClick={() => setCurrency(c)}
                        className={`inline-flex h-9 items-center rounded-[5px] px-3 font-mono text-[10.5px] uppercase transition-all ${
                          currency === c ? 'bg-[oklch(0.78_0.06_237)]/18 text-[oklch(0.83_0.055_237)]' : 'text-white/45 hover:text-white/70'
                        }`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                {currency === 'eur' && !hasRate && (
                  <div className="mt-1.5 font-mono text-[9.5px] text-[oklch(0.75_0.13_25)]">
                    réglez un taux EUR/XNV dans les réglages de la caisse
                  </div>
                )}
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.62_0.025_250)]">
                  Nombre d’étiquettes
                </label>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 5, 10].map((n) => (
                    <button key={n} onClick={() => setQty(n)}
                      className={`flex-1 h-11 rounded-lg font-mono text-[12px] border transition-all ${
                        qty === n
                          ? 'border-[oklch(0.78_0.06_237)]/70 bg-[oklch(0.78_0.06_237)]/12 text-[oklch(0.83_0.055_237)]'
                          : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 font-mono text-[10.5px] text-[oklch(0.75_0.13_25)]">
                <AlertTriangle className="w-3.5 h-3.5" /> {error}
              </div>
            )}

            <button
              onClick={addItem}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-md px-6 text-[13.5px] font-semibold border border-[oklch(0.78_0.06_237)]/50 bg-[oklch(0.78_0.06_237)]/12 text-[oklch(0.83_0.055_237)] hover:bg-[oklch(0.78_0.06_237)]/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Ajouter à la planche
            </button>

            {/* item list */}
            <div className="mt-8 pt-6 border-t border-white/8">
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
                  Produits · {items.length}
                </div>
                {items.length > 0 && (
                  <button
                    onClick={() => setItems([])}
                    className="font-mono text-[10px] text-white/35 hover:text-[oklch(0.75_0.13_25)] transition-colors"
                  >
                    vider
                  </button>
                )}
              </div>
              {items.length === 0 ? (
                <div className="mt-5 py-10 text-center">
                  <QrCode className="w-7 h-7 mx-auto text-white/15" />
                  <p className="mt-3 text-[12.5px] text-[oklch(0.6_0.012_250)]">
                    La planche est vide — ajoutez vos premiers produits.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <AnimatePresence initial={false}>
                    {items.map((item) => {
                      const atomic = priceAtomic(item)
                      const eur = atomic && hasRate ? xnvAtomicToEur(atomic, config.eurRate) : null
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          className="flex items-center gap-4 rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-[13.5px] font-medium text-white/90 truncate">{item.name}</div>
                            <div className="mt-0.5 font-mono text-[10.5px] text-[oklch(0.6_0.012_250)]">
                              {atomic ? formatXnv(BigInt(atomic)) : '?'} XNV
                              {eur && ` · ≈ ${eur} EUR`} · ×{item.qty}
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-white/40 hover:border-[oklch(0.7_0.13_25)]/50 hover:text-[oklch(0.75_0.13_25)] transition-all"
                            title="Retirer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* ── side: print + preview ── */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="panel-nerva rounded-lg p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
                Planche A4
              </div>
              {/* mini sheet preview */}
              <div className="mt-4 rounded-lg border border-white/10 bg-white p-3">
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: Math.min(10, Math.max(tagCount, 4)) }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[52px] rounded-[3px] border border-dashed border-[#9aa7b8] flex items-center px-2 gap-2 overflow-hidden"
                    >
                      <div className="w-[34px] h-[34px] shrink-0 grid grid-cols-5 gap-[1px]">
                        {Array.from({ length: 25 }).map((_, k) => (
                          <div key={k} className={k % 3 === 0 || k % 7 === 0 ? 'bg-[#060a14]' : ''} />
                        ))}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[7px] font-bold text-[#060a14] uppercase truncate">
                          {items[i % Math.max(items.length, 1)]?.name || 'produit'}
                        </div>
                        <div className="text-[8.5px] font-bold text-[#060a14] font-mono">
                          {items[i % Math.max(items.length, 1)]
                            ? `${formatXnv(BigInt(priceAtomic(items[i % Math.max(items.length, 1)]) ?? 0n))} XNV`
                            : '0 XNV'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between font-mono text-[10.5px]">
                <span className="text-[oklch(0.6_0.012_250)]">
                  {tagCount} étiquette{tagCount > 1 ? 's' : ''} · {Math.ceil(tagCount / 10)} page{Math.ceil(tagCount / 10) > 1 ? 's' : ''}
                </span>
                {tagCount > MAX_TAGS && <span className="text-[oklch(0.75_0.13_25)]">max {MAX_TAGS}</span>}
              </div>

              <div className="mt-5 grid gap-2.5">
                <button
                  onClick={() => void generate('print')}
                  disabled={busy || items.length === 0 || tagCount === 0 || tagCount > MAX_TAGS}
                  className="inline-flex h-12 items-center justify-center gap-2.5 rounded-md text-[14px] font-semibold bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] hover:bg-[oklch(0.7_0.08_236)] transition-colors disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-[17px] h-[17px] animate-spin" /> : <Printer className="w-[17px] h-[17px]" />}
                  Imprimer la planche
                </button>
                <button
                  onClick={() => void generate('download')}
                  disabled={busy || items.length === 0 || tagCount === 0 || tagCount > MAX_TAGS}
                  className="inline-flex h-12 items-center justify-center gap-2.5 rounded-md text-[14px] font-medium border border-white/12 bg-white/[0.03] hover:bg-white/8 text-white/80 transition-colors disabled:opacity-50"
                >
                  <Download className="w-[17px] h-[17px]" /> PDF
                </button>
              </div>
            </div>

            <div className="panel-nerva rounded-lg p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">
                Comment ça marche
              </div>
              <ul className="mt-4 space-y-3 text-[11.5px] leading-relaxed text-[oklch(0.64_0.012_250)]">
                <li className="flex gap-2.5">
                  <Store className="w-3.5 h-3.5 text-[oklch(0.78_0.06_237)] shrink-0 mt-0.5" />
                  Chaque étiquette embarque votre adresse, le prix exact et une référence unique : le client scanne, son wallet pré-remplit tout.
                </li>
                <li className="flex gap-2.5">
                  <QrCode className="w-3.5 h-3.5 text-[oklch(0.78_0.06_237)] shrink-0 mt-0.5" />
                  Les paiements arrivent pair-à-pair dans votre wallet ; la référence en clair vous permet de rattacher chaque vente à son produit.
                </li>
                <li className="flex gap-2.5">
                  <ArrowRight className="w-3.5 h-3.5 text-[oklch(0.78_0.06_237)] shrink-0 mt-0.5" />
                  Imprimez, découpez, posez en rayon. Le QR reste valide indéfiniment : il encode une URI <span className="font-mono text-white/75">nerva:</span> standard.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
