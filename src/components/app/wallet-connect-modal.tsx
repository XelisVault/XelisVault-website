'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wallet, Loader2, AlertCircle, CheckCircle2, Server } from 'lucide-react'
import { useWallet } from '@/lib/wallet-store'

export function WalletConnectModal() {
  const { showConnectModal, setShowConnectModal, connect, connectionState, error } = useWallet()

  useEffect(() => {
    if (!showConnectModal) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowConnectModal(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showConnectModal, setShowConnectModal])

  return (
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
            className="w-full max-w-sm rounded-2xl glass-panel border border-border"
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
                    XELIS Testnet
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
            <div className="p-5 space-y-4">
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-red-300 leading-relaxed">{error}</div>
                </div>
              )}

              {connectionState === 'connecting' ? (
                <div className="text-center py-8">
                  <Loader2 className="w-10 h-10 mx-auto text-vault animate-spin mb-4" />
                  <p className="text-sm text-muted-foreground">Connecting to wallet...</p>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => connect()}
                    className="w-full text-left rounded-xl border border-vault/30 bg-vault/5 hover:bg-vault/10 hover:border-vault/40 p-4 transition-all group cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-vault/15 border border-vault/30 flex items-center justify-center text-vault shrink-0 group-hover:bg-vault/25 transition-all">
                        <Server className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">Local Wallet (RPC)</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-vault/15 text-vault">TESTNET</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          Connect to your local xelis_wallet on port 18082. Requires wallet running with RPC enabled.
                        </p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <code className="text-[10px] font-mono text-vault/80 bg-background/60 px-2 py-0.5 rounded">127.0.0.1:18082</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <div className="flex items-start gap-2 text-[10px] font-mono text-muted-foreground leading-relaxed">
                      <span className="shrink-0 mt-0.5">🔒</span>
                      <span>
                        Your seed phrase never leaves your wallet. Every transaction requires wallet approval.
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
  )
}
