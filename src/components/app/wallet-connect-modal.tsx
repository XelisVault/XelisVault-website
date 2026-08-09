'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Wallet, Loader2, AlertCircle, Server, Eye, ExternalLink,
  Download, Shield, ChevronDown, ChevronUp, Link2,
} from 'lucide-react'
import { useWallet } from '@/lib/wallet-store'
import { getXSWDClient, type XSWDConnectionState } from '@/lib/wallet/xswd-client'
import { ImportWalletModal } from './import-wallet-modal'

export function WalletConnectModal() {
  const {
    showConnectModal, setShowConnectModal,
    connectXSWD, connectViewOnly,
    connectionState, error,
  } = useWallet()
  const [showGenesixGuide, setShowGenesixGuide] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [xswdState, setXswdState] = useState<XSWDConnectionState>('disconnected')
  const [viewOnlyAddress, setViewOnlyAddress] = useState('')
  const [viewOnlyError, setViewOnlyError] = useState<string | null>(null)

  // Subscribe to XSWD state changes for live status display
  useEffect(() => {
    if (!showConnectModal) return
    const client = getXSWDClient()
    const unsub = client.onStateChange((state) => setXswdState(state))
    setXswdState(client.getState())
    return unsub
  }, [showConnectModal])

  useEffect(() => {
    if (!showConnectModal) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showImport) setShowConnectModal(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showConnectModal, setShowConnectModal, showImport])

  const handleConnectGenesix = async () => {
    try {
      await connectXSWD()
    } catch {
      // error is set in store
    }
  }

  const handleViewOnly = async () => {
    setViewOnlyError(null)
    if (!viewOnlyAddress.trim()) {
      setViewOnlyError('Please enter an address')
      return
    }
    try {
      await connectViewOnly(viewOnlyAddress.trim())
    } catch (e) {
      setViewOnlyError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const isConnecting = connectionState === 'connecting' || xswdState === 'connecting' || xswdState === 'awaiting-approval'

  return (
    <>
      <AnimatePresence>
        {showConnectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => !isConnecting && setShowConnectModal(false)}
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
              <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background/95 backdrop-blur-md z-10">
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
                  onClick={() => !isConnecting && setShowConnectModal(false)}
                  className="w-8 h-8 rounded-full border border-border bg-card/40 hover:bg-card/80 flex items-center justify-center transition-all"
                  disabled={isConnecting}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {error && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-red-300 leading-relaxed">{error}</div>
                  </div>
                )}

                {/* Status indicator if connecting */}
                {isConnecting && (
                  <div className="rounded-xl bg-vault/10 border border-vault/30 p-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-vault animate-spin shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-vault">
                        {xswdState === 'awaiting-approval' ? 'Waiting for approval...' : 'Connecting to Genesix...'}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {xswdState === 'awaiting-approval'
                          ? 'A popup should appear in your Genesix wallet. Click "Accept" to connect.'
                          : 'Make sure Genesix is running with XSWD enabled.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Primary: Genesix via XSWD */}
                <button
                  onClick={handleConnectGenesix}
                  disabled={isConnecting}
                  className="w-full text-left rounded-xl border border-vault/40 bg-vault/10 hover:bg-vault/15 hover:border-vault/60 p-4 transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-vault/15 border border-vault/30 flex items-center justify-center text-vault shrink-0 group-hover:bg-vault/25 transition-all">
                      <Link2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">Genesix Wallet (XSWD)</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-vault/15 text-vault">RECOMMENDED</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        Connect to Genesix wallet via the official XSWD protocol. Your seed phrase stays in Genesix — this dApp only sees your address and signs transactions with your approval.
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <code className="text-[10px] font-mono text-vault/80 bg-background/60 px-2 py-0.5 rounded">ws://127.0.0.1:44325/xswd</code>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Install Genesix guide (collapsible) */}
                <div className="rounded-xl border border-border bg-card/20 overflow-hidden">
                  <button
                    onClick={() => setShowGenesixGuide(!showGenesixGuide)}
                    className="w-full flex items-center justify-between p-3 hover:bg-card/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Download className="w-4 h-4 text-vault" />
                      <span>Don&apos;t have Genesix?</span>
                    </div>
                    {showGenesixGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <AnimatePresence>
                    {showGenesixGuide && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed space-y-2">
                          <p><strong className="text-foreground">1.</strong> Download Genesix from the official GitHub:</p>
                          <a
                            href="https://github.com/xelis-project/xelis-genesix-wallet/releases"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-vault hover:underline ml-4"
                          >
                            github.com/xelis-project/xelis-genesix-wallet <ExternalLink className="w-3 h-3" />
                          </a>
                          <p><strong className="text-foreground">2.</strong> Create or import a wallet in Genesix.</p>
                          <p><strong className="text-foreground">3.</strong> Open Genesix settings → enable <code className="text-vault">XSWD Server</code>.</p>
                          <p><strong className="text-foreground">4.</strong> Come back here and click &quot;Genesix Wallet (XSWD)&quot; above.</p>
                          <p><strong className="text-foreground">5.</strong> Genesix shows a popup → click &quot;Accept&quot; to authorize this dApp.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Separator */}
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
                  <div className="flex-1 h-px bg-border" />
                  Or watch without signing
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* View-only mode */}
                <div className="rounded-xl border border-border bg-card/20 p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-card/60 border border-border flex items-center justify-center text-muted-foreground shrink-0">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">View-only mode</div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        Watch any XELIS address without connecting a wallet. See balances and history, but cannot send transactions.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={viewOnlyAddress}
                      onChange={(e) => setViewOnlyAddress(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleViewOnly()}
                      placeholder="xet:..."
                      className="flex-1 h-10 rounded-lg border border-border bg-card/40 px-3 text-xs font-mono focus:outline-none focus:border-vault/40 focus:bg-card/60 transition-all"
                    />
                    <button
                      onClick={handleViewOnly}
                      className="h-10 px-4 rounded-lg border border-border bg-card/40 hover:bg-card/80 hover:border-vault/40 text-xs font-medium transition-all"
                    >
                      Watch
                    </button>
                  </div>
                  {viewOnlyError && (
                    <div className="mt-2 text-[11px] text-red-400">{viewOnlyError}</div>
                  )}
                </div>

                {/* Security note */}
                <div className="pt-3 border-t border-border">
                  <div className="flex items-start gap-2 text-[10px] font-mono text-muted-foreground leading-relaxed">
                    <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-vault" />
                    <span>
                      XSWD is the official XELIS wallet protocol. Your seed phrase never leaves Genesix.
                      Every transaction requires your explicit approval in the wallet popup.
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import wallet modal (kept for view-only address entry convenience) */}
      <AnimatePresence>
        {showImport && (
          <ImportWalletModal
            onClose={() => setShowImport(false)}
            onImported={() => {
              setShowImport(false)
              setShowConnectModal(false)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
