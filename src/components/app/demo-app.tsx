'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Vault,
  ArrowLeftRight,
  Coins,
  Wind,
  PiggyBank,
  Vote,
  MessageSquareLock,
  Activity,
  Pickaxe,
  X,
  ExternalLink,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Wallet,
} from 'lucide-react'
import { useDemo, type ModuleId } from '@/lib/demo-store'
import { useWallet } from '@/lib/wallet-store'
import { Dashboard } from './modules/dashboard'
import { VaultEngine } from './modules/vault-engine'
import { VaultSwap } from './modules/vault-swap'
import { PSM } from './modules/psm'
import { Mixer } from './modules/mixer'
import { Savings } from './modules/savings'
import { Governance } from './modules/governance'
import { VaultChat } from './modules/vault-chat'
import { Oracle } from './modules/oracle'
import { Miner } from './modules/miner'
import { TokenIcon } from './token-icon'
import { WalletConnectModal } from './wallet-connect-modal'
import { LaunchGate, useLaunchStatus } from './launch-gate'

const NAV: { id: ModuleId; label: string; icon: typeof LayoutDashboard; group: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  { id: 'vault', label: 'Vault Engine', icon: Vault, group: 'Core' },
  { id: 'swap', label: 'VaultSwap', icon: ArrowLeftRight, group: 'Core' },
  { id: 'psm', label: 'PSM', icon: Coins, group: 'Core' },
  { id: 'savings', label: 'Savings Rate', icon: PiggyBank, group: 'Core' },
  { id: 'mixer', label: 'Privacy Mixer', icon: Wind, group: 'Privacy' },
  { id: 'chat', label: 'VaultChat', icon: MessageSquareLock, group: 'Privacy' },
  { id: 'oracle', label: 'Oracle', icon: Activity, group: 'Network' },
  { id: 'governance', label: 'Governance', icon: Vote, group: 'Network' },
  { id: 'miner', label: 'Miner', icon: Pickaxe, group: 'Network' },
]

const MODULE_TITLES: Record<ModuleId, { title: string; desc: string }> = {
  dashboard: { title: 'Dashboard', desc: 'Your confidential portfolio overview' },
  vault: { title: 'Vault Engine', desc: 'Deposit XEL collateral · borrow xUSD privately' },
  swap: { title: 'VaultSwap', desc: 'Confidential AMM with MEV protection' },
  psm: { title: 'Peg Stability Module', desc: 'Mint / redeem xUSD at $1 oracle price' },
  mixer: { title: 'Privacy Mixer', desc: 'ZK anonymity set for xUSD and VLT' },
  savings: { title: 'Savings Rate', desc: 'Earn adjustable APY on xUSD deposits' },
  governance: { title: 'Governance', desc: 'VLT holders shape the protocol' },
  chat: { title: 'VaultChat', desc: 'End-to-end encrypted messaging' },
  oracle: { title: 'StakedOracle', desc: 'Decentralized price feeds' },
  miner: { title: 'XelisVaultMiner', desc: 'Unified mining layer · oracle + chat relayer' },
}

export function DemoApp() {
  const { open, closeApp, activeModule, setModule, tick } = useDemo()
  const { connectionType, address: walletAddress, setShowConnectModal, connectionState, showConnectModal, xelBalance: walletXel, xusdBalance: walletXusd, vltBalance: walletVlt, xelPrice: walletXelPrice, refreshBalances } = useWallet()
  const { isLaunched } = useLaunchStatus()

  // BLOCK app from opening if not launched yet
  const effectivelyOpen = open && isLaunched

  // NO DEMO FALLBACK — only real wallet data
  const isWalletConnected = connectionType === 'local-rpc' && connectionState === 'connected'
  const displayAddress = walletAddress || ''
  const displayXelBalance = walletXel
  const displayXusdBalance = walletXusd
  const displayVltBalance = walletVlt
  const displayXelPrice = walletXelPrice
  const displayVltPrice = 0 // TODO: fetch from pool

  // HARD GATE: no wallet = only connect screen, NOTHING else
  const showConnectScreen = effectivelyOpen && !isWalletConnected
  const shouldShowModal = effectivelyOpen && !isWalletConnected && !showConnectModal

  // Mobile nav scroll state
  const navScrollRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const activeIndex = NAV.findIndex((n) => n.id === activeModule)

  const updateScrollIndicators = useCallback(() => {
    const el = navScrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }, [])

  const scrollNav = useCallback((dir: 'left' | 'right') => {
    const el = navScrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.7
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }, [])

  // Auto-scroll active tab into view + update scroll indicators
  useEffect(() => {
    if (!effectivelyOpen || !isWalletConnected) return
    const tab = tabRefs.current[activeModule]
    if (tab) {
      tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
    updateScrollIndicators()
  }, [activeModule, open, isWalletConnected, updateScrollIndicators])

  // Auto-refresh balances every 10s when wallet connected
  useEffect(() => {
    if (!effectivelyOpen || !isWalletConnected) return
    const interval = setInterval(() => refreshBalances(), 10000)
    return () => clearInterval(interval)
  }, [effectivelyOpen, isWalletConnected, refreshBalances])

  // Auto-open connect modal if no wallet connected (hard gate)
  useEffect(() => {
    if (shouldShowModal) {
      setShowConnectModal(true)
    }
  }, [shouldShowModal, setShowConnectModal])

  // savings accrual + price jitter — only when wallet connected
  useEffect(() => {
    if (!effectivelyOpen || !isWalletConnected) return
    const interval = setInterval(tick, 5000)
    return () => clearInterval(interval)
  }, [effectivelyOpen, isWalletConnected, tick])

  // esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) closeApp()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, closeApp])

  // body scroll lock
  useEffect(() => {
    if (effectivelyOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  const portfolioUsd =
    displayXelBalance * displayXelPrice + displayXusdBalance + displayVltBalance * displayVltPrice

  const groups = Array.from(new Set(NAV.map((n) => n.group)))

  return (
    <AnimatePresence>
      {open && !isLaunched && (
        <LaunchGate>{null}</LaunchGate>
      )}
      {effectivelyOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[80] bg-background flex flex-col"
        >
          {/* BANNER: testnet status */}
          {isWalletConnected ? (
            <div className="shrink-0 bg-gradient-to-r from-emerald-500/20 via-emerald-500/15 to-emerald-500/20 border-b border-emerald-500/30">
              <div className="px-4 md:px-6 py-2 flex items-center justify-center gap-2 text-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-xs font-mono text-emerald-200">
                  <span className="font-bold uppercase tracking-wider">Testnet Live</span>
                  <span className="opacity-70 mx-2">·</span>
                  Wallet connected · Real on-chain data · Transactions require wallet approval
                </span>
              </div>
            </div>
          ) : (
            <div className="shrink-0 bg-gradient-to-r from-vault/20 via-vault/15 to-vault/20 border-b border-vault/30">
              <div className="px-4 md:px-6 py-2 flex items-center justify-center gap-2 text-center">
                <span className="w-2 h-2 rounded-full bg-vault animate-pulse shrink-0" />
                <span className="text-xs font-mono text-vault">
                  <span className="font-bold uppercase tracking-wider">XELIS Vault Testnet</span>
                  <span className="opacity-70 mx-2">·</span>
                  Connect your wallet to interact with real contracts
                </span>
              </div>
            </div>
          )}

          {/* CONNECT WALLET SCREEN — shown when no wallet connected */}
          {showConnectScreen && (
            <div className="flex-1 flex items-center justify-center p-4">
              <ConnectScreen onConnect={() => setShowConnectModal(true)} />
            </div>
          )}

          {/* MAIN APP — shown when wallet is connected */}
          {!showConnectScreen && (
          <div className="flex-1 flex overflow-hidden">
            {/* SIDEBAR */}
            <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card/30">
              {/* Brand */}
              <div className="p-5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-8 h-8 rounded-md overflow-hidden ring-1 ring-vault/40">
                    <img
                      src="/images/xelisvault-logo.png"
                      alt="Xelis Vault"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="leading-none">
                    <div className="font-display font-semibold text-sm tracking-tight">
                      XELIS<span className="text-vault">Vault</span>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">App · Demo</div>
                  </div>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex-1 overflow-y-auto p-3 space-y-5">
                {groups.map((g) => (
                  <div key={g}>
                    <div className="px-3 mb-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">
                      {g}
                    </div>
                    <div className="space-y-0.5">
                      {NAV.filter((n) => n.group === g).map((n) => {
                        const isActive = activeModule === n.id
                        return (
                          <button
                            key={n.id}
                            onClick={() => setModule(n.id)}
                            className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
                              isActive
                                ? 'bg-vault/15 text-vault border border-vault/30'
                                : 'text-muted-foreground hover:text-foreground hover:bg-card/60 border border-transparent'
                            }`}
                          >
                            <n.icon className="w-4 h-4 shrink-0" />
                            <span className="font-medium">{n.label}</span>
                            {isActive && <span className="ml-auto w-1 h-1 rounded-full bg-vault" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              {/* Footer */}
              <div className="p-3 border-t border-border">
                <a
                  href="https://github.com/XelisVault/xelis-vault"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-card/60 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View source on GitHub
                </a>
              </div>
            </aside>

            {/* MAIN AREA */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* TOPBAR */}
              <header className="shrink-0 border-b border-border bg-card/20 backdrop-blur">
                <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
                  {/* Mobile: brand + portfolio value */}
                  <div className="flex items-center gap-3 md:hidden min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-md overflow-hidden ring-1 ring-vault/40 shrink-0">
                      <img src="/images/xelisvault-logo.png" alt="Xelis Vault" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-sm font-semibold tracking-tight truncate">
                        {MODULE_TITLES[activeModule].title}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        ${portfolioUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Title (desktop) */}
                  <div className="hidden md:block">
                    <h1 className="font-display text-lg font-semibold tracking-tight">
                      {MODULE_TITLES[activeModule].title}
                    </h1>
                    <p className="text-xs text-muted-foreground">{MODULE_TITLES[activeModule].desc}</p>
                  </div>

                  {/* Wallet bar */}
                  <div className="flex items-center gap-2">
                    {/* Portfolio value (desktop only) */}
                    <div className="hidden md:flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1.5">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">Portfolio</span>
                      <span className="text-sm font-semibold font-mono">
                        ${portfolioUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Balances (desktop only) */}
                    <div className="hidden lg:flex items-center gap-1.5">
                      {[
                        { sym: 'XEL' as const, amount: displayXelBalance },
                        { sym: 'xUSD' as const, amount: displayXusdBalance },
                        { sym: 'VLT' as const, amount: displayVltBalance },
                      ].map((b) => (
                        <div key={b.sym} className="flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-2.5 py-1.5">
                          <TokenIcon symbol={b.sym} size="xs" />
                          <span className="text-xs font-mono">
                            {b.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Address / Connect Wallet button */}
                    <button
                      onClick={() => setShowConnectModal(true)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all hover:scale-[1.02] ${
                        isWalletConnected
                          ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-vault/10 border-vault/30 hover:bg-vault/20'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        isWalletConnected ? 'bg-emerald-400' : 'bg-amber-400'
                      }`} />
                      <span className="text-xs font-mono">
                        {displayAddress.slice(0, 6)}...{displayAddress.slice(-4)}
                      </span>
                      {isWalletConnected && (
                        <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 hidden sm:inline">LIVE</span>
                      )}
                      <Wallet className="w-3 h-3 opacity-60" />
                    </button>

                    {/* Close */}
                    <button
                      onClick={closeApp}
                      aria-label="Close app"
                      className="w-9 h-9 rounded-full border border-border bg-card/40 hover:bg-card/80 hover:border-red-500/30 flex items-center justify-center transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Mobile nav (horizontal scroll with arrows + fade + counter) */}
                <div className="md:hidden relative">
                  <div className="flex items-center px-3 pb-2.5">
                    {/* Left arrow */}
                    <button
                      onClick={() => scrollNav('left')}
                      disabled={!canScrollLeft}
                      aria-label="Scroll left"
                      className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        canScrollLeft ? 'bg-card/60 border border-border text-vault' : 'opacity-20 cursor-default'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Scrollable tabs */}
                    <div
                      ref={navScrollRef}
                      onScroll={updateScrollIndicators}
                      className="hide-scrollbar flex-1 flex items-center gap-1.5 overflow-x-auto scroll-smooth px-2"
                    >
                      {NAV.map((n) => {
                        const isActive = activeModule === n.id
                        return (
                          <button
                            key={n.id}
                            ref={(el) => { tabRefs.current[n.id] = el }}
                            onClick={() => setModule(n.id)}
                            className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all min-w-[80px] ${
                              isActive
                                ? 'bg-vault text-white shadow-[0_0_20px_-6px_var(--vault)]'
                                : 'text-muted-foreground bg-card/40 border border-border'
                            }`}
                          >
                            <n.icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-vault'}`} />
                            {n.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Right arrow */}
                    <button
                      onClick={() => scrollNav('right')}
                      disabled={!canScrollRight}
                      aria-label="Scroll right"
                      className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        canScrollRight ? 'bg-card/60 border border-border text-vault' : 'opacity-20 cursor-default'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Page counter + swipe hint */}
                  <div className="flex items-center justify-between px-4 pb-2">
                    <div className="text-[10px] font-mono text-muted-foreground">
                      <span className="text-vault font-bold">{activeIndex + 1}</span>
                      <span className="opacity-50"> / {NAV.length}</span>
                    </div>
                    {canScrollRight && (
                      <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground animate-pulse">
                        <span>swipe for more</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {/* CONTENT */}
              <main className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeModule}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 md:p-6 lg:p-8"
                  >
                    {activeModule === 'dashboard' && <Dashboard />}
                    {activeModule === 'vault' && <VaultEngine />}
                    {activeModule === 'swap' && <VaultSwap />}
                    {activeModule === 'psm' && <PSM />}
                    {activeModule === 'mixer' && <Mixer />}
                    {activeModule === 'savings' && <Savings />}
                    {activeModule === 'governance' && <Governance />}
                    {activeModule === 'chat' && <VaultChat />}
                    {activeModule === 'oracle' && <Oracle />}
                    {activeModule === 'miner' && <Miner />}
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>
          </div>
          )}
        </motion.div>
      )}

      {/* Wallet Connect Modal — always rendered when app is open */}
      <WalletConnectModal />
    </AnimatePresence>
  )
}

function ConnectScreen({ onConnect }: { onConnect: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md text-center"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="w-20 h-20 mx-auto rounded-2xl overflow-hidden ring-2 ring-vault/40 shadow-[0_0_60px_-10px_var(--vault)] mb-6"
      >
        <img src="/images/xelisvault-logo.png" alt="Xelis Vault" className="w-full h-full object-cover" />
      </motion.div>

      <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-3">
        Welcome to <span className="text-gradient-vault">XELIS Vault</span>
      </h1>
      <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-sm mx-auto">
        Connect your Xelis wallet to interact with real testnet contracts.
        Your seed phrase never leaves your wallet — every transaction requires your approval.
      </p>

      <button
        onClick={onConnect}
        className="inline-flex h-13 items-center gap-2 rounded-full bg-vault px-8 py-3.5 text-base font-semibold text-white hover:bg-vault/85 transition-all hover:shadow-[0_0_48px_-8px_var(--vault)] mb-4"
      >
        <Wallet className="w-5 h-5" />
        Connect Wallet
      </button>

      <div className="mt-8 flex items-center justify-center gap-4 text-[10px] font-mono text-muted-foreground/60">
        <span>🔒 Encrypted by default</span>
        <span>·</span>
        <span>zk-proof verified</span>
        <span>·</span>
        <span>5s finality</span>
      </div>
    </motion.div>
  )
}
