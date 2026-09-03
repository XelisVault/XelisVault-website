'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Check, Copy, Download, Terminal, Wallet, X, Zap } from 'lucide-react'
import { useWallet } from '@/lib/wallet-store'
import { copyText, CLI_INSTALL, GENESIX_URL } from '@/lib/xelis/cli'
import { Badge } from './shared'

type Method = 'xswd' | 'cli'

export function WalletConnectModal() {
  const {
    showConnectModal, setShowConnectModal, connectXSWD,
    connectionState, connectionType, error, address, disconnect,
  } = useWallet()
  const [method, setMethod] = useState<Method>('xswd')
  const [copied, setCopied] = useState<'linux' | 'windows' | null>(null)
  const [xswdError, setXswdError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isConnected = connectionType !== null && connectionState === 'connected'

  // Auto-switch to CLI tab only when the wallet cannot be reached at all
  // (WebSocket error / open timeout). Approval timeouts and refusals must
  // stay on the XSWD tab so the user can simply click Retry.
  useEffect(() => {
    if (connectionState === 'error' && error) {
      setXswdError(error)
      if (error.includes('Cannot reach') || error.includes('not detected')) {
        setMethod('cli')
      }
    }
  }, [connectionState, error])

  useEffect(() => {
    if (showConnectModal) {
      setXswdError(null)
      setBusy(false)
      if (isConnected) setMethod('xswd')
    }
  }, [showConnectModal, isConnected])

  const tryXSWD = async () => {
    setXswdError(null)
    setBusy(true)
    await connectXSWD()
    setBusy(false)
  }

  const copy = async (which: 'linux' | 'windows') => {
    if (await copyText(which === 'linux' ? CLI_INSTALL.linux : CLI_INSTALL.windows)) {
      setCopied(which)
      setTimeout(() => setCopied(null), 1600)
    }
  }

  return (
    <AnimatePresence>
      {showConnectModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="app-dark fixed inset-0 z-[90] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => setShowConnectModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-vault/40">
                  <img src="/images/xelisvault-logo.png" alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{isConnected ? 'Wallet connected' : 'Connect your wallet'}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">XSWD · follows your wallet network</div>
                </div>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="w-8 h-8 rounded-full hover:bg-muted/50 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Connected state */}
            {isConnected ? (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-emerald-300">
                      XSWD, full access
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground truncate mt-0.5">{address}</div>
                  </div>
                </div>
                <button
                  onClick={() => { disconnect(); setShowConnectModal(false) }}
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-all"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <>
                {/* Method tabs */}
                <div className="flex border-b border-border">
                  {([
                    ['xswd', 'XSWD', Zap],
                    ['cli', 'CLI', Terminal],
                  ] as const).map(([id, label, Icon]) => (
                    <button
                      key={id}
                      onClick={() => setMethod(id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition-all border-b-2 ${
                        method === id ? 'border-vault text-vault bg-vault/5' : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {/* XSWD */}
                  {method === 'xswd' && (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Connect <span className="text-foreground font-medium">Genesix</span> (or xelis_wallet) via
                        XSWD, the official XELIS dApp protocol. Approve the XELIS Vault application in the wallet
                        popup, then confirm permissions once. Your keys never leave the wallet. Balances are
                        confidential by design, they decrypt inside the wallet, never on this page.
                      </p>
                      <a
                        href={GENESIX_URL} target="_blank" rel="noreferrer"
                        className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/50 px-4 py-3 hover:border-vault/40 transition-colors"
                      >
                        <span className="flex items-center gap-2.5 text-xs">
                          <Download className="w-4 h-4 text-vault" />
                          Get Genesix, the official XELIS wallet
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">free</span>
                      </a>

                      <button
                        onClick={tryXSWD}
                        disabled={busy || connectionState === 'connecting' || connectionState === 'awaiting-approval' || connectionState === 'authorizing'}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-vault px-4 py-3 text-sm font-semibold text-white hover:bg-vault/85 transition-all disabled:opacity-60"
                      >
                        <Wallet className="w-4 h-4" />
                        {connectionState === 'connecting' && 'Looking for wallet…'}
                        {connectionState === 'awaiting-approval' && 'Approve in your wallet…'}
                        {connectionState === 'authorizing' && 'Confirm permissions…'}
                        {connectionState !== 'connecting' && connectionState !== 'awaiting-approval' && connectionState !== 'authorizing' && (busy ? 'Connecting…' : 'Connect via XSWD')}
                      </button>

                      {(connectionState === 'awaiting-approval' || connectionState === 'authorizing') && (
                        <div className="rounded-xl border border-vault/30 bg-vault/10 p-3.5 text-xs text-vault leading-relaxed">
                          {connectionState === 'awaiting-approval' ? (
                            <>
                              <span className="font-semibold">Step 1 of 2 —</span> accept the{' '}
                              <span className="font-semibold">XELIS Vault</span> application in the Genesix popup.
                              You have 5 minutes, the site waits for you.
                            </>
                          ) : (
                            <>
                              <span className="font-semibold">Step 2 of 2 —</span> confirm the{' '}
                              <span className="font-semibold">permissions popup</span> (one grouped popup for
                              everything: address, balances, transactions). No further prompts after this.
                            </>
                          )}
                          <div className="mt-2 text-[10px] font-mono text-muted-foreground">
                            ws://127.0.0.1:44325/xswd · localhost is allowed from HTTPS on Chrome, Edge and Firefox
                          </div>
                        </div>
                      )}

                      {xswdError && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-200 leading-relaxed">
                              {xswdError}
                              <div className="mt-2 flex gap-2">
                                <button onClick={tryXSWD} className="rounded-lg border border-amber-500/40 px-2.5 py-1 text-[11px] font-medium hover:bg-amber-500/20 transition-colors">
                                  Retry
                                </button>
                                <button onClick={() => setMethod('cli')} className="rounded-lg border border-amber-500/40 px-2.5 py-1 text-[11px] font-medium hover:bg-amber-500/20 transition-colors">
                                  Use the CLI instead
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
                        Permissions requested: address, balances, assets, transaction building. Every transaction
                        still requires an explicit approval in the wallet.
                      </p>
                    </div>
                  )}

                  {/* CLI */}
                  {method === 'cli' && (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        No wallet popup? Run the official CLI instead, it includes a full wallet, miner, swap and
                        governance tooling. One line to install:
                      </p>

                      {(['linux', 'windows'] as const).map((os) => (
                        <button
                          key={os}
                          onClick={() => copy(os)}
                          className="group w-full flex items-center gap-3 rounded-xl border border-border bg-background/80 px-4 py-3 text-left hover:border-vault/40 transition-colors"
                        >
                          <Terminal className="w-4 h-4 text-vault shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                              {os === 'linux' ? 'linux / macOS' : 'windows powershell'}
                            </div>
                            <code className="block truncate font-mono text-[11px] mt-0.5">
                              {os === 'linux' ? CLI_INSTALL.linux : CLI_INSTALL.windows}
                            </code>
                          </div>
                          {copied === os
                            ? <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                            : <Copy className="w-4 h-4 text-muted-foreground group-hover:text-vault shrink-0" />}
                        </button>
                      ))}

                      <div className="rounded-xl border border-border bg-background/40 p-3.5 space-y-2">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">after install</div>
                        {[
                          { cmd: 'xvault --setup', desc: 'guided first-run setup (wallet + config)' },
                          { cmd: 'xvault --balance', desc: 'check balances' },
                          { cmd: 'xvault-miner --miner', desc: 'start mining oracle prices' },
                        ].map((c) => (
                          <div key={c.cmd} className="flex items-baseline gap-2 text-[11px]">
                            <code className="font-mono text-vault shrink-0">{c.cmd}</code>
                            <span className="text-muted-foreground">{c.desc}</span>
                          </div>
                        ))}
                      </div>

                      <p className="text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
                        Installs to ~/.xelis-vault · Python 3.10+ · no telemetry · uninstall anytime
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
