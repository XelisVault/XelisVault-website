'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wallet, Loader2, AlertCircle, Server, Sparkles, KeyRound, Eye, Lock, Plus } from 'lucide-react'
import { useWallet } from '@/lib/wallet-store'
import { CreateWalletModal } from './create-wallet-modal'
import { ImportWalletModal } from './import-wallet-modal'
import { UnlockWalletModal } from './unlock-wallet-modal'

type SubModal = 'create' | 'import' | 'unlock' | null

export function WalletConnectModal() {
  const { showConnectModal, setShowConnectModal, connect, connectionState, error, storedWallets, refreshStoredWallets } = useWallet()
  const [subModal, setSubModal] = useState<SubModal>(null)

  useEffect(() => {
    if (showConnectModal) refreshStoredWallets()
  }, [showConnectModal, refreshStoredWallets])

  useEffect(() => {
    if (!showConnectModal) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !subModal) setShowConnectModal(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showConnectModal, setShowConnectModal, subModal])

  const hasStoredWallets = storedWallets.length > 0

  return (
    <>
      <AnimatePresence>
        {showConnectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => connectionState !== 'connecting' && setShowConnectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl glass-panel border border-border"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-vault/15 border border-vault/30 flex items-center justify-center text-vault">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-display font-semibold text-sm">Connect Wallet</div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      XELIS Testnet · August 30
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => connectionState !== 'connecting' && setShowConnectModal(false)}
                  className="w-8 h-8 rounded-full border border-border bg-card/40 hover:bg-card/80 flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-3">
                {error && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-red-300 leading-relaxed">{error}</div>
                  </div>
                )}

                {connectionState === 'connecting' ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-10 h-10 mx-auto text-vault animate-spin mb-4" />
                    <p className="text-sm text-muted-foreground">Connecting...</p>
                  </div>
                ) : (
                  <>
                    {/* Primary: Web Wallet (unlock or create) */}
                    {hasStoredWallets && (
                      <button
                        onClick={() => setSubModal('unlock')}
                        className="w-full text-left rounded-xl border border-vault/40 bg-vault/10 hover:bg-vault/15 hover:border-vault/60 p-4 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-vault/15 border border-vault/30 flex items-center justify-center text-vault shrink-0 group-hover:bg-vault/25 transition-all">
                            <Lock className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">Unlock Web Wallet</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-vault/15 text-vault">RECOMMENDED</span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                              {storedWallets.length} wallet{storedWallets.length !== 1 ? 's' : ''} stored in this browser. Unlock with your password.
                            </p>
                          </div>
                        </div>
                      </button>
                    )}

                    <button
                      onClick={() => setSubModal('create')}
                      className={`w-full text-left rounded-xl border ${hasStoredWallets ? 'border-border bg-card/30 hover:bg-card/50' : 'border-vault/40 bg-vault/10 hover:bg-vault/15 hover:border-vault/60'} p-4 transition-all group`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-vault/15 border border-vault/30 flex items-center justify-center text-vault shrink-0 group-hover:bg-vault/25 transition-all">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">Create New Wallet</span>
                            {!hasStoredWallets && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-vault/15 text-vault">RECOMMENDED</span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            Generate a fresh 25-word seed phrase. Encrypted in your browser.
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setSubModal('import')}
                      className="w-full text-left rounded-xl border border-border bg-card/30 hover:bg-card/50 hover:border-vault/40 p-4 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-card/60 border border-border flex items-center justify-center text-muted-foreground group-hover:text-vault group-hover:border-vault/30 transition-all">
                          <KeyRound className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-sm">Import Wallet</span>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            Restore from seed phrase, or watch an address in view-only mode.
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Separator */}
                    <div className="pt-2">
                      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-2">
                        <div className="flex-1 h-px bg-border" />
                        Advanced
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    </div>

                    {/* Local RPC (advanced) */}
                    <button
                      onClick={() => connect()}
                      className="w-full text-left rounded-xl border border-border bg-card/20 hover:bg-card/40 p-4 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-card/60 border border-border flex items-center justify-center text-muted-foreground group-hover:text-vault group-hover:border-vault/30 transition-all">
                          <Server className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-sm">Local Wallet (RPC)</span>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            Connect to xelis_wallet running on 127.0.0.1:18082. For power users.
                          </p>
                          <div className="mt-2 flex items-center gap-1.5">
                            <code className="text-[10px] font-mono text-muted-foreground/80 bg-background/60 px-2 py-0.5 rounded">127.0.0.1:18082</code>
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="pt-3 border-t border-border">
                      <div className="flex items-start gap-2 text-[10px] font-mono text-muted-foreground leading-relaxed">
                        <span className="shrink-0 mt-0.5 text-vault">🔒</span>
                        <span>
                          Your seed phrase is encrypted with AES-256-GCM and never leaves your browser.
                          For signing transactions, the wallet connects to your local xelis_wallet daemon.
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-modals */}
      <AnimatePresence>
        {subModal === 'create' && (
          <CreateWalletModal
            onClose={() => setSubModal(null)}
            onCreated={() => {
              setSubModal(null)
              setShowConnectModal(false)
            }}
          />
        )}
        {subModal === 'import' && (
          <ImportWalletModal
            onClose={() => setSubModal(null)}
            onImported={() => {
              setSubModal(null)
              setShowConnectModal(false)
            }}
          />
        )}
        {subModal === 'unlock' && (
          <UnlockWalletModal
            onClose={() => setSubModal(null)}
            onUnlocked={() => {
              setSubModal(null)
              setShowConnectModal(false)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
