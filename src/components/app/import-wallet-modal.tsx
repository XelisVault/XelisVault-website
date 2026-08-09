'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, Eye, EyeOff, Loader2, KeyRound, Wallet, AlertCircle } from 'lucide-react'
import { useWallet, parseMnemonicString, validateMnemonic } from '@/lib/wallet-store'

type Tab = 'seed' | 'view-only'

export function ImportWalletModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const { importWebWalletFromMnemonic, connectViewOnly } = useWallet()
  const [tab, setTab] = useState<Tab>('seed')
  const [name, setName] = useState('')
  const [mnemonicInput, setMnemonicInput] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [viewOnlyAddress, setViewOnlyAddress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const handleImportSeed = async () => {
    setError(null)
    if (!name.trim()) {
      setError('Please choose a name for your wallet')
      return
    }
    const words = parseMnemonicString(mnemonicInput)
    if (words.length < 24) {
      setError(`Expected 24 or 25 words, got ${words.length}. Please check your seed phrase.`)
      return
    }
    const validation = validateMnemonic(words)
    if (!validation.valid) {
      setError(validation.error || 'Invalid seed phrase')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== passwordConfirm) {
      setError('Passwords do not match')
      return
    }
    setImporting(true)
    try {
      await importWebWalletFromMnemonic(name.trim(), password, words)
      onImported()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import wallet')
    } finally {
      setImporting(false)
    }
  }

  const handleViewOnly = async () => {
    setError(null)
    if (!viewOnlyAddress.trim()) {
      setError('Please enter an address')
      return
    }
    try {
      await connectViewOnly(viewOnlyAddress.trim())
      onImported()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
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
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="font-display font-semibold text-sm">Import Wallet</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Restore from seed or watch an address
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
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-full bg-card/40 border border-border mb-5">
            <button
              onClick={() => setTab('seed')}
              className={`flex-1 h-9 rounded-full text-xs font-medium transition-all ${
                tab === 'seed' ? 'bg-vault text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Recovery phrase
            </button>
            <button
              onClick={() => setTab('view-only')}
              className={`flex-1 h-9 rounded-full text-xs font-medium transition-all ${
                tab === 'view-only' ? 'bg-vault text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              View-only (address)
            </button>
          </div>

          <AnimatePresence mode="wait">
            {tab === 'seed' && (
              <motion.div key="seed" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Wallet name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Restored Wallet"
                      className="w-full h-11 rounded-xl border border-border bg-card/40 px-4 text-sm focus:outline-none focus:border-vault/40 focus:bg-card/60 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Seed phrase (24 or 25 words)
                    </label>
                    <textarea
                      value={mnemonicInput}
                      onChange={(e) => setMnemonicInput(e.target.value)}
                      placeholder="abbey abducts ability ablaze abnormal abort..."
                      rows={5}
                      className="w-full rounded-xl border border-border bg-card/40 p-4 text-sm font-mono focus:outline-none focus:border-vault/40 focus:bg-card/60 transition-all resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="New password"
                        className="w-full h-11 rounded-xl border border-border bg-card/40 px-4 pr-10 text-sm focus:outline-none focus:border-vault/40 focus:bg-card/60 transition-all"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full h-11 rounded-xl border border-border bg-card/40 px-4 text-sm focus:outline-none focus:border-vault/40 focus:bg-card/60 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleImportSeed}
                  disabled={importing}
                  className="mt-5 w-full h-11 rounded-full bg-vault text-white font-semibold text-sm hover:bg-vault/85 transition-all disabled:opacity-40 inline-flex items-center justify-center gap-2"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {importing ? 'Importing...' : 'Import wallet'}
                  {!importing && <ArrowRight className="w-4 h-4" />}
                </button>
              </motion.div>
            )}

            {tab === 'view-only' && (
              <motion.div key="view-only" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <div className="rounded-xl bg-vault/5 border border-vault/30 p-4 mb-5 flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-vault shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">View-only mode</strong> lets you watch any XELIS
                    address without the seed. You can see balances and transaction history, but you
                    cannot send transactions. Useful for monitoring cold wallets.
                  </div>
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    XELIS address
                  </label>
                  <input
                    type="text"
                    value={viewOnlyAddress}
                    onChange={(e) => setViewOnlyAddress(e.target.value)}
                    placeholder="xet:..."
                    className="w-full h-11 rounded-xl border border-border bg-card/40 px-4 text-sm font-mono focus:outline-none focus:border-vault/40 focus:bg-card/60 transition-all"
                  />
                </div>

                {error && (
                  <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleViewOnly}
                  className="mt-5 w-full h-11 rounded-full bg-vault text-white font-semibold text-sm hover:bg-vault/85 transition-all inline-flex items-center justify-center gap-2"
                >
                  Watch address
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
