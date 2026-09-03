'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import { useDemo, type ModuleId } from '@/lib/demo-store'
import { useWallet } from '@/lib/wallet-store'
import { GetStarted } from './modules/get-started'
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
import { Airdrop } from './modules/airdrop'
import { Contracts } from './modules/contracts'
import { TokenIcon } from './token-icon'
import { WalletConnectModal } from './wallet-connect-modal'
import { LaunchGate, useLaunchStatus } from './launch-gate'

/* Typographic navigation — a numbered ledger index, in the tradition of
   private-bank stationery. No iconography. */
const NAV: { id: ModuleId; label: string; group: string }[] = [
  { id: 'get-started', label: 'Get Started', group: 'Start' },
  { id: 'dashboard', label: 'Dashboard', group: 'Start' },
  { id: 'vault', label: 'Vault Engine', group: 'Core' },
  { id: 'swap', label: 'VaultSwap', group: 'Core' },
  { id: 'psm', label: 'PSM', group: 'Core' },
  { id: 'savings', label: 'Savings', group: 'Core' },
  { id: 'mixer', label: 'Privacy Mixer', group: 'Privacy' },
  { id: 'chat', label: 'VaultChat', group: 'Privacy' },
  { id: 'oracle', label: 'Oracle', group: 'Network' },
  { id: 'governance', label: 'Governance', group: 'Network' },
  { id: 'miner', label: 'Miner', group: 'Network' },
  { id: 'airdrop', label: 'Airdrop', group: 'Rewards' },
  { id: 'contracts', label: 'Contracts', group: 'Rewards' },
]

const MODULE_TITLES: Record<ModuleId, { title: string; desc: string }> = {
  'get-started': { title: 'Get Started', desc: 'Set up your wallet, get funds, start mining' },
  dashboard: { title: 'Dashboard', desc: 'Live protocol and network overview' },
  vault: { title: 'Vault Engine', desc: 'Deposit XEL collateral · borrow xUSD privately' },
  swap: { title: 'VaultSwap', desc: 'Confidential AMM with MEV protection' },
  psm: { title: 'Peg Stability Module', desc: 'Mint / redeem xUSD at oracle price' },
  mixer: { title: 'Privacy Mixer', desc: 'Note-based mixing for XEL, xUSD and VLT, no sender link' },
  savings: { title: 'Savings Rate', desc: 'Earn adjustable APY on xUSD deposits' },
  governance: { title: 'Governance', desc: 'VLT holders shape the protocol' },
  chat: { title: 'VaultChat', desc: 'End-to-end encrypted messaging' },
  oracle: { title: 'StakedOracle', desc: 'Decentralized price feeds' },
  miner: { title: 'Miner', desc: 'Unified mining layer · oracle + chat relayer' },
  airdrop: { title: 'Airdrop', desc: 'Testnet contribution points toward 500,000 VLT' },
  contracts: { title: 'Contracts', desc: 'All deployed contracts, resolved live from the registry' },
}

const pad2 = (n: number) => String(n + 1).padStart(2, '0')

export function DemoApp() {
  const { open, closeApp, activeModule, setModule } = useDemo()
  const {
    connectionType, address: walletAddress, setShowConnectModal, connectionState,
    showConnectModal, xelBalance, xusdBalance, vltBalance, xelPrice, refreshBalances, disconnect,
  } = useWallet()
  const { isLaunched } = useLaunchStatus()

  // BLOCK app from opening if not launched yet
  const effectivelyOpen = open && isLaunched

  // hard guard: a corrupted store value can never blank the app again
  const moduleTitle = MODULE_TITLES[activeModule] ?? MODULE_TITLES['get-started']

  const isWalletConnected = connectionType !== null && connectionState === 'connected'
  const displayAddress = walletAddress || ''

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
    if (!effectivelyOpen) return
    const tab = tabRefs.current[activeModule]
    if (tab) {
      tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
    updateScrollIndicators()
  }, [activeModule, open, updateScrollIndicators, effectivelyOpen])

  // Auto-refresh balances every 15s when XSWD-connected
  useEffect(() => {
    if (!effectivelyOpen || !isWalletConnected || connectionType !== 'xswd') return
    const interval = setInterval(() => refreshBalances(), 15000)
    return () => clearInterval(interval)
  }, [effectivelyOpen, isWalletConnected, connectionType, refreshBalances])

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
  }, [effectivelyOpen])

  const portfolioUsd =
    xelBalance * xelPrice + xusdBalance + vltBalance * 0.02

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
          className="app-dark fixed inset-0 z-[80] bg-background flex flex-col"
        >
          {/* STATUS LINE — flat ink strip, mono, hairline border */}
          <div className="shrink-0 border-b border-border bg-[oklch(0.105_0.008_80)]">
            <div className="px-4 md:px-6 py-2 flex items-center justify-center gap-2.5 text-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-foreground/70">
                <span className="text-vault font-semibold">Testnet live</span>
                <span className="opacity-40 mx-2">·</span>
                {isWalletConnected
                  ? 'XSWD wallet connected · transactions require wallet approval'
                  : 'Live protocol data · connect a wallet to interact'}
              </span>
            </div>
          </div>

          {/* MAIN APP */}
          <div className="flex-1 flex overflow-hidden">
            {/* SIDEBAR — numbered ledger index */}
            <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border">
              {/* Brand */}
              <div className="p-5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-8 h-8 rounded-[3px] overflow-hidden ring-1 ring-vault/40">
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
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">App · Testnet</div>
                  </div>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex-1 overflow-y-auto py-5 space-y-6 custom-scrollbar">
                {groups.map((g) => (
                  <div key={g}>
                    <div className="px-5 mb-2 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/70">
                      {g}
                    </div>
                    <div>
                      {NAV.filter((n) => n.group === g).map((n) => {
                        const globalIdx = NAV.indexOf(n)
                        const isActive = activeModule === n.id
                        return (
                          <button
                            key={n.id}
                            onClick={() => setModule(n.id)}
                            className={`w-full flex items-baseline gap-3 px-5 py-2 text-sm transition-colors border-l-2 ${
                              isActive
                                ? 'border-vault text-foreground bg-vault/5'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-card/70'
                            }`}
                          >
                            <span className={`font-mono text-[10px] tracking-wider ${isActive ? 'text-vault' : 'text-muted-foreground/70'}`}>
                              {pad2(globalIdx)}
                            </span>
                            <span className="font-medium">{n.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              {/* Footer */}
              <div className="p-5 border-t border-border">
                <a
                  href="https://github.com/XelisVault/xelis-vault"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground hover:text-vault transition-colors"
                >
                  Source on GitHub ↗
                </a>
              </div>
            </aside>

            {/* MAIN AREA */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* TOPBAR */}
              <header className="shrink-0 border-b border-border bg-background">
                <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
                  {/* Mobile: brand + portfolio value */}
                  <div className="flex items-center gap-3 md:hidden min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-[3px] overflow-hidden ring-1 ring-vault/40 shrink-0">
                      <img src="/images/xelisvault-logo.png" alt="Xelis Vault" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-sm font-semibold tracking-tight truncate">
                        {moduleTitle.title}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        ${portfolioUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Title (desktop) */}
                  <div className="hidden md:block">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-[10px] text-vault tracking-[0.18em]">{pad2(activeIndex)}</span>
                      <h1 className="font-display text-lg font-semibold tracking-tight">
                        {moduleTitle.title}
                      </h1>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{moduleTitle.desc}</p>
                  </div>

                  {/* Wallet bar */}
                  <div className="flex items-center gap-2">
                    {/* Portfolio value (desktop only) */}
                    {isWalletConnected && (
                      <div className="hidden md:flex items-baseline gap-2 border-l border-border pl-4">
                        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Portfolio</span>
                        <span className="text-sm font-display font-semibold">
                          ${portfolioUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {/* Balances (desktop only) */}
                    {isWalletConnected && connectionType === 'xswd' && (
                      <div className="hidden lg:flex items-center gap-3 border-l border-border pl-4">
                        {[
                          { sym: 'XEL' as const, amount: xelBalance },
                          { sym: 'xUSD' as const, amount: xusdBalance },
                          { sym: 'VLT' as const, amount: vltBalance },
                        ].map((b) => (
                          <div key={b.sym} className="flex items-center gap-1.5">
                            <TokenIcon symbol={b.sym} size="xs" />
                            <span className="text-xs font-mono text-foreground/80">
                              {b.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Address / Connect Wallet button */}
                    <button
                      onClick={() => setShowConnectModal(true)}
                      className={`flex items-center gap-2 border px-3 py-1.5 transition-colors ${
                        isWalletConnected
                          ? 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10'
                          : 'border-vault/40 text-vault hover:bg-vault/10'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse${
                        isWalletConnected ? 'bg-emerald-400' : 'bg-amber-400'
                      }`} />
                      <span className="text-xs font-mono">
                        {displayAddress ? `${displayAddress.slice(0, 8)}...${displayAddress.slice(-4)}` : 'Connect'}
                      </span>
                      {isWalletConnected && connectionType === 'xswd' && (
                        <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 hidden sm:inline">live</span>
                      )}
                    </button>

                    {isWalletConnected && (
                      <button
                        onClick={disconnect}
                        title="Disconnect"
                        className="hidden sm:flex items-center px-2 text-[10px] font-mono uppercase tracking-[0.14em] border border-border text-muted-foreground hover:border-destructive/40 hover:text-red-300 hover:bg-destructive/5 transition-colors"
                      >
                        exit
                      </button>
                    )}

                    {/* Close */}
                    <button
                      onClick={closeApp}
                      aria-label="Close app"
                      className="w-9 h-9 border border-border hover:border-vault/40 hover:text-vault flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Mobile nav (horizontal scroll with arrows) */}
                <div className="md:hidden relative">
                  <div className="flex items-center px-3 pb-2.5">
                    <button
                      onClick={() => scrollNav('left')}
                      disabled={!canScrollLeft}
                      aria-label="Scroll left"
                      className={`shrink-0 w-7 h-7 flex items-center justify-center transition-opacity ${
                        canScrollLeft ? 'text-vault opacity-100' : 'opacity-20 cursor-default'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div
                      ref={navScrollRef}
                      onScroll={updateScrollIndicators}
                      className="hide-scrollbar flex-1 flex items-end gap-5 overflow-x-auto scroll-smooth px-2"
                    >
                      {NAV.map((n) => {
                        const isActive = activeModule === n.id
                        const globalIdx = NAV.indexOf(n)
                        return (
                          <button
                            key={n.id}
                            ref={(el) => { tabRefs.current[n.id] = el }}
                            onClick={() => setModule(n.id)}
                            className={`shrink-0 inline-flex items-baseline gap-1.5 pb-1.5 pt-2 text-xs font-medium transition-colors border-b-2 ${
                              isActive
                                ? 'border-vault text-foreground'
                                : 'border-transparent text-muted-foreground'
                            }`}
                          >
                            <span className={`font-mono text-[9px] tracking-wider ${isActive ? 'text-vault' : 'text-muted-foreground/70'}`}>
                              {pad2(globalIdx)}
                            </span>
                            {n.label}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      onClick={() => scrollNav('right')}
                      disabled={!canScrollRight}
                      aria-label="Scroll right"
                      className={`shrink-0 w-7 h-7 flex items-center justify-center transition-opacity ${
                        canScrollRight ? 'text-vault opacity-100' : 'opacity-20 cursor-default'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between px-4 pb-2">
                    <div className="text-[10px] font-mono text-muted-foreground">
                      <span className="text-vault font-semibold">{activeIndex + 1}</span>
                      <span className="opacity-50"> / {NAV.length}</span>
                    </div>
                    {canScrollRight && (
                      <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                        <span>swipe for more</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {/* CONTENT */}
              <main className="flex-1 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeModule}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 md:p-6 lg:p-8"
                  >
                    {activeModule === 'get-started' && <GetStarted />}
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
                    {activeModule === 'airdrop' && <Airdrop />}
                    {activeModule === 'contracts' && <Contracts />}
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>
          </div>
        </motion.div>
      )}

      {/* Wallet Connect Modal, always rendered when app is open */}
      <WalletConnectModal />
    </AnimatePresence>
  )
}
