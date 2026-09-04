'use client'

/**
 * NervaLink creator: stateless XNV payment links.
 *
 * A random long payment id is minted client-side, the invoice is encoded
 * into the link itself (base64url JSON), and the QR encodes the canonical
 * `nerva:` URI (wallet2::make_uri format) so wallets pre-fill everything.
 * Nothing is stored anywhere: the link IS the invoice.
 */

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2, Copy, Check, ArrowRight, Wallet, ShieldCheck, Sparkles,
  Radar, AlertTriangle, QrCode, ExternalLink,
} from 'lucide-react'
import { Reveal } from '@/components/site/reveal'
import {
  encodeInvoice, generatePaymentId, isValidNervaAddress,
  buildNervaUri, renderQrDataUrl, atomicToDisplay, TTL_OPTIONS,
  type NervaInvoice,
} from '@/lib/nerva/nlink'
import { parseXnv, getBlockCount } from '@/lib/nerva/api'

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

/* ───────────── the creator ───────────── */

export function LinkCreator() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [touched, setTouched] = useState(false)
  const [invoice, setInvoice] = useState<NervaInvoice | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [minting, setMinting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')

  useEffect(() => { setOrigin(window.location.origin) }, [])

  const addrCheck = useMemo(() => isValidNervaAddress(form.address), [form.address])
  const amountAtomic = useMemo(() => (form.amount.trim() === '' ? 0n : parseXnv(form.amount)), [form.amount])
  const amountValid = form.amount.trim() === '' || amountAtomic !== null

  const linkUrl = useMemo(() => {
    if (!invoice) return ''
    return `${origin}/nerva/pay?d=${encodeInvoice(invoice)}`
  }, [invoice, origin])

  const nervaUri = useMemo(() => (invoice ? buildNervaUri(invoice) : ''), [invoice])

  /* QR for the nerva: URI (regenerated when invoice changes) */
  useEffect(() => {
    if (!invoice) { setQr(null); return }
    let alive = true
    void renderQrDataUrl(buildNervaUri(invoice), 340).then((url) => {
      if (alive) setQr(url)
    }).catch(() => {
      if (alive) setQr(null)
    })
    return () => { alive = false }
  }, [invoice])

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
      requestAnimationFrame(() => {
        document.getElementById('nlink-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } finally {
      setMinting(false)
    }
  }

  const copy = (text: string, key: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1600)
    })
  }

  const reset = () => {
    setInvoice(null)
    setForm(INITIAL)
    setTouched(false)
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

        <div className="mt-10 grid lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* ── form / result ── */}
          <div>
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
                      <>Minting the reference…</>
                    ) : (
                      <>
                        <Sparkles className="w-[17px] h-[17px]" />
                        Mint the payment link
                      </>
                    )}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  id="nlink-result"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="space-y-5"
                >
                  {/* the link */}
                  <div className="panel-nerva rounded-lg p-6 sm:p-7 border-l-2 border-l-[oklch(0.72_0.12_160)]">
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[oklch(0.72_0.12_160)]" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.72_0.12_160)]">
                        Link minted, save it: it exists nowhere else
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2.5 rounded-md bg-[oklch(0.12_0.018_255)] border border-white/10 pl-4 pr-2 h-12">
                      <span className="font-mono text-[11.5px] text-[oklch(0.83_0.055_237)] truncate flex-1">{linkUrl}</span>
                      <button
                        onClick={() => copy(linkUrl, 'link')}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 bg-[oklch(0.78_0.06_237)]/15 text-[oklch(0.83_0.055_237)] font-mono text-[10.5px] hover:bg-[oklch(0.78_0.06_237)]/25 transition-colors"
                      >
                        {copied === 'link' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied === 'link' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
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
                  </div>

                  {/* QR + URI */}
                  <div className="panel-nerva rounded-lg p-6 sm:p-7">
                    <div className="flex flex-col sm:flex-row gap-7 items-center">
                      <div className="shrink-0">
                        {qr ? (
                          <img
                            src={qr}
                            alt="Payment QR code, nerva: URI"
                            className="w-[170px] h-[170px] rounded-md border border-white/12 bg-[#eef4fb]"
                          />
                        ) : (
                          <div className="w-[170px] h-[170px] rounded-md border border-white/10 bg-white/[0.03] flex items-center justify-center">
                            <QrCode className="w-8 h-8 text-white/20" />
                          </div>
                        )}
                        <div className="mt-2.5 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-[oklch(0.5_0.01_250)]">
                          scan with any XNV wallet
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 w-full">
                        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[oklch(0.6_0.012_250)]">
                          The nerva: URI your payer will scan
                        </div>
                        <div className="mt-3 rounded-lg bg-[oklch(0.12_0.018_255)] border border-white/10 p-3.5 font-mono text-[10.5px] leading-relaxed text-white/70 break-all max-h-32 overflow-y-auto">
                          {nervaUri}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2.5">
                          <button
                            onClick={() => copy(nervaUri, 'uri')}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-white/12 bg-white/[0.03] hover:bg-white/8 font-mono text-[10.5px] text-white/70 transition-all"
                          >
                            {copied === 'uri' ? <Check className="w-3.5 h-3.5 text-[oklch(0.72_0.12_160)]" /> : <Copy className="w-3.5 h-3.5" />}
                            Copy URI
                          </button>
                          <button
                            onClick={() => copy(invoice.pid, 'pid')}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-white/12 bg-white/[0.03] hover:bg-white/8 font-mono text-[10.5px] text-white/70 transition-all"
                          >
                            {copied === 'pid' ? <Check className="w-3.5 h-3.5 text-[oklch(0.72_0.12_160)]" /> : <Copy className="w-3.5 h-3.5" />}
                            Copy payment id
                          </button>
                        </div>
                        <div className="mt-4 space-y-1.5 font-mono text-[10px] text-[oklch(0.55_0.01_250)]">
                          <div>amount: <span className="text-white/70">{invoice.amt === '0' ? 'free (payer chooses)' : `${atomicToDisplay(invoice.amt)} XNV`}</span></div>
                          <div>reference: <span className="text-[oklch(0.74_0.07_306)]">{invoice.pid.slice(0, 24)}…</span></div>
                          <div>expires: <span className="text-white/70">{new Date(invoice.exp * 1000).toLocaleString()}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* how it works */}
            <Reveal delay={0.1}>
              <div className="mt-8 panel-nerva rounded-lg p-6 sm:p-7">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4.5 h-4.5 w-[18px] h-[18px] text-[oklch(0.78_0.06_237)]" />
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
          <div className="lg:sticky lg:top-24 space-y-4">
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
