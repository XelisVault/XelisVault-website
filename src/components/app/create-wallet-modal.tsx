'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ArrowRight, ArrowLeft, Copy, Check, AlertTriangle,
  Shield, Eye, EyeOff, Loader2, Sparkles,
} from 'lucide-react'
import { useWallet, generateMnemonic, parseMnemonicString, validateMnemonic } from '@/lib/wallet-store'
import { mnemonicToString } from '@/lib/wallet/mnemonic'

type Step = 'name' | 'generate' | 'confirm' | 'password' | 'done'

export function CreateWalletModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { createWebWallet } = useWallet()
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [mnemonic, setMnemonic] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [savedAcknowledged, setSavedAcknowledged] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const handleStart = () => {
    if (!name.trim()) {
      setError('Please choose a name for your wallet')
      return
    }
    setError(null)
    setMnemonic(generateMnemonic())
    setStep('generate')
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(mnemonicToString(mnemonic))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConfirm = () => {
    const inputWords = parseMnemonicString(confirmInput)
    if (inputWords.length === 0) {
      setConfirmError('Please type your 25 words to confirm you saved them')
      return
    }
    const validation = validateMnemonic(inputWords)
    if (!validation.valid) {
      setConfirmError(validation.error || 'The words you typed do not match')
      return
    }
    // Compare to the original (case-insensitive)
    const original = mnemonic.map(w => w.toLowerCase())
    const input = inputWords.map(w => w.toLowerCase())
    if (original.length !== input.length || !original.every((w, i) => w === input[i])) {
      setConfirmError('The words do not match the ones we generated. Please check carefully.')
      return
    }
    setConfirmError(null)
    setStep('password')
  }

  const handleCreate = async () => {
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== passwordConfirm) {
      setError('Passwords do not match')
      return
    }
    setCreating(true)
    try {
      await createWebWallet(name.trim(), password, mnemonic)
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create wallet')
    } finally {
      setCreating(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] bg-background/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl glass-panel border border-border"
      >
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-vault/15 border border-vault/30 flex items-center justify-center text-vault">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-display font-semibold text-sm">Create New Wallet</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Step {step === 'name' ? 1 : step === 'generate' ? 2 : step === 'confirm' ? 3 : step === 'password' ? 4 : 5} of 5
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-border bg-card/40 hover:bg-card/80 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">
            {/* Step 1: Name */}
            {step === 'name' && (
              <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-display text-xl font-semibold mb-2">Name your wallet</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Choose a name to identify this wallet. The name is stored locally and is not sent anywhere.
                </p>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  placeholder="e.g. My Testnet Wallet"
                  autoFocus
                  className="w-full h-11 rounded-xl border border-border bg-card/40 px-4 text-sm focus:outline-none focus:border-vault/40 focus:bg-card/60 transition-all"
                />
                {error && (
                  <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleStart}
                  className="mt-6 w-full h-11 rounded-full bg-vault text-white font-semibold text-sm hover:bg-vault/85 transition-all inline-flex items-center justify-center gap-2"
                >
                  Generate seed phrase
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Step 2: Show seed */}
            {step === 'generate' && (
              <motion.div key="generate" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/40 p-4 mb-5 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200 leading-relaxed">
                    <strong className="text-amber-100">Write these 25 words down on paper.</strong>{' '}
                    They are the only way to recover your wallet if you lose access to this browser.
                    Anyone with these words can steal all your funds. We cannot recover them for you.
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card/30 p-4 mb-4">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {mnemonic.map((word, i) => (
                      <div key={i} className="rounded-lg bg-background/60 border border-border/60 px-3 py-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground/60 tabular-nums">{i + 1}</span>
                          <span className="text-sm font-mono">{word}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-5">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 h-9 rounded-full border border-border bg-card/40 hover:bg-card/80 px-4 text-xs font-medium transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy all'}
                  </button>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={savedAcknowledged}
                      onChange={(e) => setSavedAcknowledged(e.target.checked)}
                      className="accent-vault"
                    />
                    I saved my seed phrase
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('name')}
                    className="inline-flex items-center gap-2 h-11 rounded-full border border-border bg-card/40 hover:bg-card/80 px-5 text-sm font-medium transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={() => savedAcknowledged ? setStep('confirm') : null}
                    disabled={!savedAcknowledged}
                    className="flex-1 h-11 rounded-full bg-vault text-white font-semibold text-sm hover:bg-vault/85 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirm */}
            {step === 'confirm' && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-display text-xl font-semibold mb-2">Confirm your seed phrase</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Type your 25 words to prove you saved them. This protects you from losing access later.
                </p>
                <textarea
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="abbey abducts ability ablaze abnormal abort..."
                  rows={6}
                  autoFocus
                  className="w-full rounded-xl border border-border bg-card/40 p-4 text-sm font-mono focus:outline-none focus:border-vault/40 focus:bg-card/60 transition-all resize-none"
                />
                {confirmError && (
                  <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
                    {confirmError}
                  </div>
                )}
                <div className="flex gap-2 mt-5">
                  <button
                    onClick={() => setStep('generate')}
                    className="inline-flex items-center gap-2 h-11 rounded-full border border-border bg-card/40 hover:bg-card/80 px-5 text-sm font-medium transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 h-11 rounded-full bg-vault text-white font-semibold text-sm hover:bg-vault/85 transition-all inline-flex items-center justify-center gap-2"
                  >
                    Confirm
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Password */}
            {step === 'password' && (
              <motion.div key="password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-display text-xl font-semibold mb-2">Set a password</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  This password encrypts your wallet on this device. There is no recovery — if you forget it, you must restore from your seed phrase.
                </p>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (min 8 characters)"
                      autoFocus
                      className="w-full h-11 rounded-xl border border-border bg-card/40 px-4 pr-11 text-sm focus:outline-none focus:border-vault/40 focus:bg-card/60 transition-all"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                      placeholder="Confirm password"
                      className="w-full h-11 rounded-xl border border-border bg-card/40 px-4 pr-11 text-sm focus:outline-none focus:border-vault/40 focus:bg-card/60 transition-all"
                    />
                  </div>
                </div>
                {error && (
                  <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
                    {error}
                  </div>
                )}
                <div className="mt-4 flex items-start gap-2 text-[11px] text-muted-foreground/70 leading-relaxed">
                  <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0 text-vault" />
                  <span>
                    Encrypted with AES-256-GCM + PBKDF2 (600,000 iterations). Stored only in your browser. Never sent to any server.
                  </span>
                </div>
                <div className="flex gap-2 mt-5">
                  <button
                    onClick={() => setStep('confirm')}
                    className="inline-flex items-center gap-2 h-11 rounded-full border border-border bg-card/40 hover:bg-card/80 px-5 text-sm font-medium transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex-1 h-11 rounded-full bg-vault text-white font-semibold text-sm hover:bg-vault/85 transition-all disabled:opacity-40 inline-flex items-center justify-center gap-2"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {creating ? 'Encrypting...' : 'Create wallet'}
                    {!creating && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Done */}
            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center py-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                    className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4"
                  >
                    <Check className="w-8 h-8 text-emerald-400" />
                  </motion.div>
                  <h2 className="font-display text-xl font-semibold mb-2">Wallet created</h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Your wallet <strong className="text-foreground">{name}</strong> is encrypted and stored in this browser.
                    You can now connect to it from the wallet selector.
                  </p>
                  <button
                    onClick={onCreated}
                    className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-vault px-6 text-sm font-semibold text-white hover:bg-vault/85 transition-all"
                  >
                    Connect to this wallet
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
