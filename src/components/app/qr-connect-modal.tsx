'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, CheckCircle2, Smartphone, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { useWallet } from '@/lib/wallet-store'

export function QRConnectModal() {
  const { showQRModal, setShowQRModal, qrData, channelId, connectionState, error, realAddress, connectionType } = useWallet()
  const [qrImage, setQrImage] = useState<string>('')
  const [copied, setCopied] = useState(false)

  // Generate QR code when qrData changes
  useEffect(() => {
    if (!qrData) return
    let active = true
    QRCode.toDataURL(qrData, {
      width: 280,
      margin: 1,
      color: { dark: '#0a0a0f', light: '#ffffff' },
    }).then(url => {
      if (active) setQrImage(url)
    }).catch(() => {})
    return () => { active = false }
  }, [qrData])

  // Clear QR when modal closes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!showQRModal) setQrImage('')
  }, [showQRModal])

  useEffect(() => {
    if (!showQRModal) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowQRModal(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showQRModal, setShowQRModal])

  const copyJSON = () => {
    if (!qrData) return
    navigator.clipboard?.writeText(qrData)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isConnected = connectionState === 'connected' && connectionType === 'xswd-connect'

  return (
    <AnimatePresence>
      {showQRModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] bg-background/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => !isConnected && setShowQRModal(false)}
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
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-vlt/15 border border-vlt/30 flex items-center justify-center text-vlt">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-display font-semibold text-sm">Connect Genesix Wallet</div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Scan QR or paste connection data
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="w-8 h-8 rounded-full border border-border bg-card/40 hover:bg-card/80 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {isConnected ? (
                /* Success state */
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4"
                  >
                    <CheckCircle2 className="w-8 h-8" />
                  </motion.div>
                  <h3 className="font-display text-lg font-semibold mb-2">Wallet Connected!</h3>
                  <p className="text-xs text-muted-foreground mb-3">Your Genesix wallet is now connected.</p>
                  <code className="text-xs font-mono text-vault bg-card/40 px-3 py-1.5 rounded-lg break-all">
                    {realAddress}
                  </code>
                </div>
              ) : error ? (
                /* Error state */
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400 mb-4">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">Connection Error</h3>
                  <p className="text-xs text-muted-foreground">{error}</p>
                </div>
              ) : !qrData ? (
                /* Loading state - waiting for relay */
                <div className="text-center py-12">
                  <Loader2 className="w-10 h-10 mx-auto text-vlt animate-spin mb-4" />
                  <p className="text-sm text-muted-foreground">Connecting to relay server...</p>
                </div>
              ) : (
                /* QR code + JSON state */
                <>
                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative p-4 bg-white rounded-2xl">
                      {qrImage ? (
                        <img src={qrImage} alt="QR Code" className="w-64 h-64" />
                      ) : (
                        <div className="w-64 h-64 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-vlt animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Scan with Genesix Wallet</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-1">
                        Open Genesix → Connect → Scan QR
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">OR</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* JSON paste option */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Connection Data (JSON)
                      </span>
                      <button
                        onClick={copyJSON}
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-vault hover:text-vault/80 transition-colors"
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="rounded-xl bg-background/60 border border-border p-3 max-h-32 overflow-y-auto">
                      <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all leading-relaxed">
                        {qrData}
                      </pre>
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
                      In Genesix: tap <strong className="text-foreground">Connect</strong> → <strong className="text-foreground">Paste</strong> → paste this JSON
                    </p>
                  </div>

                  {/* Waiting state */}
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 text-vlt animate-spin" />
                    <span className="text-xs text-muted-foreground">Waiting for wallet to connect...</span>
                  </div>

                  {/* Channel ID */}
                  {channelId && (
                    <div className="text-center">
                      <span className="text-[9px] font-mono text-muted-foreground/50">
                        Channel: {channelId.slice(0, 12)}...
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Footer */}
              {!isConnected && (
                <div className="pt-3 border-t border-border">
                  <div className="flex items-start gap-2 text-[10px] font-mono text-muted-foreground leading-relaxed">
                    <span className="shrink-0 mt-0.5">🔒</span>
                    <span>
                      End to end encrypted via AES-256-GCM. The relay never sees your data.
                      <a
                        href="https://github.com/xelis-project/xswd-connect"
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1 text-vlt hover:underline inline-flex items-center gap-0.5"
                      >
                        Learn more <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
