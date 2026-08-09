'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, EyeOff, Loader2, Lock, ArrowRight, Trash2, AlertCircle } from 'lucide-react'
import { useWallet, listStoredWallets } from '@/lib/wallet-store'

export function UnlockWalletModal({ onClose, onUnlocked }: { onClose: () => void; onUnlocked: () => void }) {
  const { unlockWebWallet, deleteWallet, storedWallets, refreshStoredWallets } = useWallet()
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    refreshStoredWallets()
  }, [refreshStoredWallets])

  const handleUnlock = async () => {
    if (!selectedWallet) return
    setError(null)
    setUnlocking(true)
    try {
      await unlockWebWallet(selectedWallet, password)
      onUnlocked()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unlock')
    } finally {
      setUnlocking(false)
    }
  }

  const handleDelete = (name: string) => {
    deleteWallet(name)
    refreshStoredWallets()
    setConfirmDelete(null)
    if (selectedWallet === name) {
      setSelectedWallet(null)
      setPassword('')
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
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl glass-panel border border-border"
      >
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-vault/15 border border-vault/30 flex items-center justify-center text-vault">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-display font-semibold text-sm">Unlock Wallet</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {storedWallets.length} wallet{storedWallets.length !== 1 ? 's' : ''} stored
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
          {storedWallets.length === 0 ? (
            <div className="text-center py-8">
              <Lock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No wallets stored yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create or import one to get started.</p>
            </div>
          ) : (
            <>
              {/* Wallet list */}
              <div className="space-y-2 mb-4">
                {storedWallets.map((w) => (
                  <div
                    key={w.name}
                    className={`rounded-xl border p-3 transition-all cursor-pointer ${
                      selectedWallet === w.name
                        ? 'border-vault/40 bg-vault/5'
                        : 'border-border bg-card/30 hover:bg-card/50'
                    }`}
                    onClick={() => {
                      setSelectedWallet(w.name)
                      setPassword('')
                      setError(null)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${selectedWallet === w.name ? 'bg-vault' : 'bg-muted-foreground/40'}`} />
                        <div>
                          <div className="text-sm font-medium">{w.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground/60">
                            {w.network} · created {new Date(w.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {confirmDelete === w.name ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDelete(w.name)}
                            className="text-[10px] font-mono text-red-400 hover:text-red-300 px-2 py-1"
                          >
                            Confirm delete
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-[10px] font-mono text-muted-foreground hover:text-foreground px-2 py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDelete(w.name)
                          }}
                          className="text-muted-foreground/40 hover:text-red-400 transition-colors p-1"
                          title="Delete wallet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Password input */}
              {selectedWallet && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <div className="relative mt-4">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                      placeholder="Password"
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
                </motion.div>
              )}

              {error && (
                <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                onClick={handleUnlock}
                disabled={!selectedWallet || !password || unlocking}
                className="mt-5 w-full h-11 rounded-full bg-vault text-white font-semibold text-sm hover:bg-vault/85 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {unlocking ? 'Decrypting...' : 'Unlock'}
                {!unlocking && <ArrowRight className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
