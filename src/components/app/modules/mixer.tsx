'use client'

// PrivacyMixer v2 — note + nullifier + shared pool (v12R-7, 2026-08-27)
//
// Contract model (contracts/privacy/PrivacyMixer.slx):
//   deposit(asset, secret)  → stores ONLY commitment = blake3(secret), credits
//                             the shared pool. No sender, no recipient stored.
//   withdraw(recipient, asset, amount, secret) → destroys the note (nullifier)
//                             and pays ANY recipient from the shared pool.
//   Any amount (XELIS encrypts attached amounts) · XEL = Hash::zero() ·
//   admin fee 1 bps on deposit (live) · withdraw fee 0 bps (live).
//
// The secret is generated in the browser (crypto.getRandomValues) and NEVER
// sent anywhere except as an invoke param to the user's own wallet (XSWD).
// Note balance checks hash the secret locally (blake3 via @noble/hashes) and
// only read the commitment on-chain.

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { EyeOff, Wind, ArrowDownToLine, ArrowUpFromLine, Search, KeyRound, Copy, Check, AlertTriangle, Shuffle } from 'lucide-react'
import { blake3 } from '@noble/hashes/blake3.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { useWallet, canSign } from '@/lib/wallet-store'
import { invoke, GAS } from '@/lib/xelis/invoke'
import { toAtomic, formatAmount, valAddr, valHash, valU64 } from '@/lib/xelis/types'
import { XEL_ASSET, XUSD_ASSET, VLT_ASSET } from '@/lib/xelis/contracts'
import { resolveContract } from '@/lib/xelis/contracts'
import { getMixerInfo, getNoteBalance, type MixerInfo } from '@/lib/xelis/reads'
import { copyText } from '@/lib/xelis/cli'
import { StatCard, Panel, AmountInput, ActionButton, TxStatusBanner, ConnectPrompt, CliFallback, Badge, type TxFeedback } from '../shared'
import { TokenIcon } from '../token-icon'

type MixAsset = 'XEL' | 'xUSD' | 'VLT'

const ASSET_HASHES: Record<MixAsset, string> = { XEL: XEL_ASSET, xUSD: XUSD_ASSET, VLT: VLT_ASSET }
const SECRET_RE = /^[0-9a-f]{64}$/

/** 32 random bytes, hex-encoded — same scheme as the CLI's secrets.token_bytes(32).hex() */
function generateSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

/** commitment = blake3(secret bytes) — matches Hash::blake3(secret.to_bytes()) in the contract */
function commitmentOf(secret: string): string {
  return bytesToHex(blake3(Uint8Array.from(secret.match(/.{2}/g)!.map((h) => parseInt(h, 16)))))
}

function SecretField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const valid = SECRET_RE.test(value.trim().toLowerCase())
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <KeyRound className="w-3.5 h-3.5 text-vault" />
        <label className="text-xs font-medium">{label ?? 'Note secret (64 hex chars)'}</label>
        {value.length > 0 && (
          <span className={`ml-auto text-[10px] font-mono ${valid ? 'text-emerald-400' : 'text-amber-400'}`}>
            {valid ? 'valid' : '64 hex chars expected'}
          </span>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="a1b2c3…"
        spellCheck={false}
        autoComplete="off"
        className="w-full rounded-xl border border-border bg-background/60 px-3.5 py-2.5 font-mono text-xs outline-none focus:border-vault/50 transition-colors"
      />
    </div>
  )
}

export function Mixer() {
  const { address, xelBalance, xusdBalance, vltBalance } = useWallet()
  const [info, setInfo] = useState<MixerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'check'>('deposit')
  const [asset, setAsset] = useState<MixAsset>('XEL')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [secret, setSecret] = useState('')
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [noteBalance, setNoteBalance] = useState<bigint | null>(null)
  const [noteChecked, setNoteChecked] = useState(false)
  const [tx, setTx] = useState<TxFeedback>({ state: 'idle' })
  const [busy, setBusy] = useState(false)
  const canTx = canSign()

  const refresh = useCallback(async () => {
    try {
      setInfo(await getMixerInfo())
    } catch { /* defaults */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 20000)
    return () => clearInterval(id)
  }, [refresh])

  const balances: Record<MixAsset, number> = { XEL: xelBalance, xUSD: xusdBalance, VLT: vltBalance }
  const assetHash = ASSET_HASHES[asset]
  const assetBalance = balances[asset]

  const secretValid = SECRET_RE.test(secret.trim().toLowerCase())

  // ----- Deposit: generate a fresh secret, invoke deposit(asset, secret) -----
  const deposit = async () => {
    if (!address) return
    const fresh = generateSecret()
    setBusy(true)
    setCreatedSecret(null)
    setTx({ state: 'broadcast', message: 'Waiting for wallet approval…' })
    try {
      const res = await invoke('PrivacyMixer', 'deposit', {
        params: [valHash(assetHash), valHash(fresh)],
        deposits: { [assetHash]: { amount: toAtomic(amount || '0') } },
        maxGas: GAS.VERY_HEAVY,
      })
      if (res.ok) {
        setCreatedSecret(fresh)
        setTx({ state: 'success', message: `Private note created for ${amount} ${asset}. Save the secret below — it is the ONLY way to withdraw.`, hash: res.hash })
      } else {
        setTx({ state: 'error', message: res.error ?? 'Deposit failed' })
      }
    } catch (e: any) {
      setTx({ state: 'error', message: String(e?.message ?? 'Deposit failed') })
    } finally {
      setBusy(false)
      setTimeout(refresh, 2500)
    }
  }

  // ----- Withdraw: withdraw(recipient, asset, amount, secret) -----
  const withdraw = async () => {
    if (!address) return
    setBusy(true)
    setTx({ state: 'broadcast', message: 'Waiting for wallet approval…' })
    try {
      const res = await invoke('PrivacyMixer', 'withdraw', {
        params: [
          valAddr(recipient.trim()),
          valHash(assetHash),
          valU64(toAtomic(amount || '0')),
          valHash(secret.trim().toLowerCase()),
        ],
        maxGas: GAS.VERY_HEAVY,
      })
      setTx(res.ok
        ? { state: 'success', message: `Withdrew ${amount} ${asset} from the shared pool to ${recipient.trim().slice(0, 16)}… — no sender link on-chain.`, hash: res.hash }
        : { state: 'error', message: res.error ?? 'Withdraw failed' })
    } catch (e: any) {
      setTx({ state: 'error', message: String(e?.message ?? 'Withdraw failed') })
    } finally {
      setBusy(false)
      setTimeout(refresh, 2500)
    }
  }

  // ----- Check note: local blake3(secret) → on-chain balance read -----
  const checkNote = async () => {
    const s = secret.trim().toLowerCase()
    if (!SECRET_RE.test(s)) return
    setBusy(true)
    setNoteChecked(false)
    try {
      const bal = await getNoteBalance(assetHash, commitmentOf(s))
      setNoteBalance(bal)
      setNoteChecked(true)
    } catch {
      setNoteBalance(null)
      setNoteChecked(true)
    } finally {
      setBusy(false)
    }
  }

  const tabs = [
    { id: 'deposit' as const, label: 'Deposit', icon: ArrowDownToLine },
    { id: 'withdraw' as const, label: 'Withdraw', icon: ArrowUpFromLine },
    { id: 'check' as const, label: 'Check note', icon: Search },
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="XEL pool" value={formatAmount(info?.poolXel)} sub="live shared pool" icon={<TokenIcon symbol="XEL" size="xs" />} loading={loading && !info} />
        <StatCard label="Total mixed" value={formatAmount(info?.totalMixedXel)} sub="XEL since v12R-7" accent="emerald" icon={<Shuffle className="w-4 h-4" />} />
        <StatCard label="Mixes" value={info?.totalMixes ?? '–'} sub="withdrawals executed" accent="vlt" />
        <StatCard label="Notes created" value={info?.noteCount ?? '–'} sub={info?.paused ? '⚠ paused' : 'active pool'} accent={info?.paused ? 'amber' : 'xusd'} icon={<EyeOff className="w-4 h-4" />} />
      </div>

      <Panel
        title="Privacy Mixer v2"
        desc="Deposit with a random secret — the contract stores only blake3(secret) and credits a shared pool. Withdraw by presenting the secret, to any address. No sender, no recipient, no amount-per-identity ever touches contract storage."
        actions={<span className="font-mono text-xs text-vault">v2 · v12R-7</span>}
      >
        {!address ? (
          <ConnectPrompt note="Connect your XELIS wallet to mix funds. The secret is generated locally in your browser." />
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1.5 mb-5 p-1 rounded-xl border border-border bg-background/50 w-fit">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setTx({ state: 'idle' }); setNoteChecked(false) }}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${tab === t.id ? 'bg-vault text-white' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Asset selector */}
            <div className="flex gap-2 mb-4">
              {(['XEL', 'xUSD', 'VLT'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAsset(a)}
                  className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                    asset === a ? 'border-vault/40 bg-vault/10' : 'border-border bg-card/40 hover:bg-card/60'
                  }`}
                >
                  <TokenIcon symbol={a} size="xs" />
                  {a}
                </button>
              ))}
            </div>

            {tab === 'deposit' && (
              <div className="space-y-4">
                <AmountInput value={amount} onChange={setAmount} symbol={asset} max={assetBalance} placeholder={asset === 'XEL' ? '0.1' : '10'} />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Any amount — XELIS encrypts the attached transfer. A {(info?.adminFeeBps ?? 1) / 100}% admin fee is taken on deposit, the rest joins the shared {asset} pool.
                  Your balance stays private: the contract never records who deposited.
                </p>
                <div className="flex items-center gap-3">
                  <ActionButton onClick={deposit} disabled={!canTx || Number(amount) <= 0} loading={busy}>
                    <Wind className="w-4 h-4" />
                    Generate secret & deposit
                  </ActionButton>
                  {!canTx && <span className="text-[11px] text-muted-foreground">Requires XSWD</span>}
                </div>

                {/* The freshly created note secret — shown ONCE after deposit */}
                {createdSecret && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-200">SAVE THIS SECRET — shown only once</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-background/80 border border-amber-500/30 px-3 py-2.5 mb-2.5">
                      <code className="flex-1 font-mono text-[11px] break-all leading-relaxed text-amber-100">{createdSecret}</code>
                      <button
                        onClick={async () => { if (await copyText(createdSecret)) { setCopied(true); setTimeout(() => setCopied(false), 1800) } }}
                        className="shrink-0 p-1.5 rounded-lg hover:bg-amber-500/20 text-amber-300 transition-colors"
                        aria-label="Copy secret"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <ul className="space-y-1 text-[11px] text-amber-200/70 leading-relaxed">
                      <li>· It is the ONLY way to withdraw your funds later — no reset, no recovery.</li>
                      <li>· It never touches the blockchain: only blake3(secret) is stored.</li>
                      <li>· Hand it to anyone off-chain to let them withdraw on your behalf.</li>
                    </ul>
                  </motion.div>
                )}
              </div>
            )}

            {tab === 'withdraw' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Withdraw to (xet: address)</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="xet:…"
                    spellCheck={false}
                    className="w-full rounded-xl border border-border bg-background/60 px-3.5 py-2.5 font-mono text-xs outline-none focus:border-vault/50 transition-colors"
                  />
                  <p className="mt-1.5 text-[11px] text-muted-foreground">The recipient can be any address — including one that never deposited. Funds come from the shared pool.</p>
                </div>
                <AmountInput value={amount} onChange={setAmount} symbol={asset} placeholder={asset === 'XEL' ? '0.1' : '10'} />
                <SecretField value={secret} onChange={setSecret} />
                <div className="flex items-center gap-3">
                  <ActionButton
                    onClick={withdraw}
                    disabled={!canTx || Number(amount) <= 0 || !recipient.trim().startsWith('xet:') || recipient.trim().length < 20 || !secretValid}
                    loading={busy}
                    variant="xusd"
                  >
                    <ArrowUpFromLine className="w-4 h-4" />
                    Withdraw privately
                  </ActionButton>
                  {!canTx && <span className="text-[11px] text-muted-foreground">Requires XSWD</span>}
                </div>
              </div>
            )}

            {tab === 'check' && (
              <div className="space-y-4">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Enter a note secret to read its remaining balance. The secret is hashed <em>locally</em> (blake3) — only the commitment
                  is used in the on-chain read, so presenting your secret here never exposes it.
                </p>
                <SecretField value={secret} onChange={setSecret} label={`Note secret (${asset} note)`} />
                <div className="flex items-center gap-3">
                  <ActionButton onClick={checkNote} disabled={!secretValid} loading={busy} variant="ghost">
                    <Search className="w-4 h-4" />
                    Check balance
                  </ActionButton>
                </div>
                {noteChecked && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-background/60 p-4">
                    {noteBalance != null && noteBalance > 0n ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">Note balance</span>
                        <span className="font-mono text-lg font-semibold text-vault">
                          {formatAmount(noteBalance)} {asset}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {noteBalance === 0n
                          ? 'This note is fully spent (nullifier consumed).'
                          : 'No note found for this secret — check the asset tab or the secret spelling.'}
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
            )}

            <div className="mt-4"><TxStatusBanner tx={tx} /></div>
          </>
        )}

        <div className="mt-4">
          <CliFallback
            title="CLI alternative — mixer"
            commands={[
              { label: 'mix', cmd: 'xvault              # menu: Privacy Mixer' },
              { label: 'dep', cmd: 'xvault              # Mixer → Deposit + create note (XEL)' },
              { label: 'wd', cmd: 'xvault              # Mixer → Withdraw from pool' },
            ]}
            note="The CLI generates the same 64-hex secrets (secrets.token_bytes(32)) and supports deposit → check note → withdraw cycles for XEL."
          />
        </div>
      </Panel>

      {/* Model explainer */}
      <Panel title="How the v2 mixer works" desc="Note + nullifier + shared pool — rewritten after the v1 privacy audit (v12R-7).">
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            {
              step: '1 · Deposit',
              title: 'Create a note',
              body: 'Deposit any amount of XEL, xUSD or VLT with a random secret. The contract stores only blake3(secret) and credits the shared pool — never your address, never the recipient.',
            },
            {
              step: '2 · Hold',
              title: 'Pool anonymity',
              body: 'Funds sit in one fungible pool per asset. XELIS encrypted transfers plus the shared pool make the anonymity set every depositor of that asset — timing analysis is the only remaining vector.',
            },
            {
              step: '3 · Withdraw',
              title: 'Nullifier & pay',
              body: 'Present the secret to withdraw any portion, to ANY address. The note is destroyed (nullifier) and the pool pays out — no on-chain field links your deposit to the withdrawal.',
            },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-vault/25 bg-vault/5 p-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-vault mb-1.5">{s.step}</div>
              <div className="text-xs font-semibold mb-2">{s.title}</div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="emerald">Mixes XEL · xUSD · VLT</Badge>
          <Badge tone="vault">Any amount</Badge>
          <Badge tone="vlt">Transferable secrets</Badge>
          <Badge tone="amber">{(info?.adminFeeBps ?? 1) / 100}% deposit fee</Badge>
          <Badge tone="muted">{(info?.withdrawFeeBps ?? 0) / 100}% withdraw fee</Badge>
        </div>
      </Panel>
    </div>
  )
}
