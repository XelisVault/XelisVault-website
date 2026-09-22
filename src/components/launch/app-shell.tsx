// VaultLaunch app shell — status line, ledger sidebar, topbar, wallet modal,
// celebration overlay, and the demo engine provider.
//
// Layout mirrors the XELIS Vault testnet app (numbered ledger index, hairline
// borders, warm ink) so the two applications feel like siblings: same house,
// different floor.

'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useEngine, type DemoEvent } from '@/lib/launch/engine'
import { useLaunchWallet, initLaunchWalletSync } from '@/lib/launch/wallet'
import { mainnetConnectError } from '@/lib/launch/xswd'
import { fmtXel } from '@/lib/launch/math'
import { AnimatedNumber, BracketButton, SquareDot, pad2 } from './shared'
import { LaunchpadView } from './launchpad-view'
import { TradingView } from './trading-view'
import { DexView } from './dex-view'
import { PortfolioView } from './portfolio-view'
import { cn } from '@/lib/utils'

export type AppView = 'launchpad' | 'trading' | 'dex' | 'portfolio'

const NAV: { id: AppView; label: string; group: string }[] = [
  { id: 'launchpad', label: 'Launchpad', group: 'Market' },
  { id: 'trading', label: 'Curve Trading', group: 'Market' },
  { id: 'dex', label: 'LaunchDEX', group: 'Market' },
  { id: 'portfolio', label: 'Portfolio', group: 'Account' },
]

const VIEW_TITLES: Record<AppView, { title: string; desc: string }> = {
  launchpad: { title: 'Launchpad', desc: 'Every proposal, every stage of the lifecycle' },
  trading: { title: 'Curve Trading', desc: 'Bonding curves: live prices, buy and sell' },
  dex: { title: 'LaunchDEX', desc: 'Permanent-liquidity pools: swap, provide, earn' },
  portfolio: { title: 'Portfolio', desc: 'The demo treasury, positions and LP earnings' },
}

// ─────────────────────────────────────────────────────────────────
// Engine provider — starts the simulation once, client-side
// ─────────────────────────────────────────────────────────────────
function EngineProvider({ children }: { children: ReactNode }) {
  const start = useEngine((s) => s.start)
  useEffect(() => {
    start()
    initLaunchWalletSync()
  }, [start])
  return <>{children}</>
}

// ─────────────────────────────────────────────────────────────────
// Wallet connect modal — demo playground or real XSWD (mainnet)
// ─────────────────────────────────────────────────────────────────
function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const wallet = useLaunchWallet()
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) { setError(null); setConnecting(false) }
  }, [open])

  async function connect() {
    setConnecting(true)
    setError(null)
    try {
      await wallet.connectXswd()
      onClose()
    } catch (e) {
      setError(mainnetConnectError(e))
    } finally {
      setConnecting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="relative w-full max-w-md border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* corner brackets on the modal itself */}
            <span aria-hidden className="absolute -left-px -top-px h-3 w-3 border-l-2 border-t-2 border-vault" />
            <span aria-hidden className="absolute -right-px -top-px h-3 w-3 border-r-2 border-t-2 border-vault" />
            <span aria-hidden className="absolute -bottom-px -left-px h-3 w-3 border-b-2 border-l-2 border-vault" />
            <span aria-hidden className="absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 border-vault" />

            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-vault/40 hover:text-vault"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="border-b border-border px-6 py-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-vault">Connect</div>
              <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">Choose your wallet</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                VaultLaunch targets XELIS mainnet. The demo wallet is a playground
                with fictional funds; XSWD connects your real Genesix wallet.
              </p>
            </div>

            <div className="space-y-3 px-6 py-5">
              {/* Demo option */}
              <button
                onClick={() => { wallet.connectDemo(); onClose() }}
                className={cn(
                  'group flex w-full items-center justify-between border px-4 py-3.5 text-left transition-colors',
                  wallet.mode === 'demo' ? 'border-vault/50 bg-vault/10' : 'border-border bg-background/50 hover:border-vault/40 hover:bg-vault/5'
                )}
              >
                <div className="flex items-center gap-3.5">
                  <span className="flex h-9 w-9 items-center justify-center border border-vault/40 bg-vault/10 font-mono text-sm text-vault">◈</span>
                  <div>
                    <div className="text-sm font-semibold">Demo wallet</div>
                    <div className="font-mono text-[10px] text-muted-foreground">250,000 XEL playground · fictional data</div>
                  </div>
                </div>
                {wallet.mode === 'demo' && <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-vault">active</span>}
              </button>

              {/* XSWD option */}
              <button
                onClick={connecting ? undefined : connect}
                disabled={connecting}
                className={cn(
                  'flex w-full items-center justify-between border px-4 py-3.5 text-left transition-colors disabled:opacity-70',
                  wallet.mode === 'xswd' ? 'border-xusd/50 bg-xusd/10' : 'border-border bg-background/50 hover:border-xusd/40 hover:bg-xusd/5'
                )}
              >
                <div className="flex items-center gap-3.5">
                  <span className="flex h-9 w-9 items-center justify-center border border-xusd/40 bg-xusd/10 font-mono text-sm text-xusd">⬡</span>
                  <div>
                    <div className="text-sm font-semibold">XSWD · mainnet</div>
                    <div className="font-mono text-[10px] text-muted-foreground">Genesix / xelis_wallet · ws://127.0.0.1:44325</div>
                  </div>
                </div>
                {connecting
                  ? <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-xusd">linking…</span>
                  : wallet.mode === 'xswd' && <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-xusd">live</span>}
              </button>

              {connecting && (
                <div className="border border-border bg-background/60 px-3.5 py-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
                  {wallet.xswdState === 'awaiting-approval' && 'Waiting for wallet approval · check Genesix…'}
                  {wallet.xswdState === 'connecting' && 'Opening secure channel…'}
                </div>
              )}

              {error && (
                <div className="border border-destructive/40 bg-destructive/10 px-3.5 py-3 font-mono text-[10px] leading-relaxed text-destructive">
                  {error}
                  <div className="mt-1.5 text-destructive/80">
                    Run Genesix against a MAINNET daemon with XSWD enabled (Settings · integrations), then retry.
                  </div>
                </div>
              )}

              <p className="pt-1 text-center font-mono text-[9px] leading-relaxed text-muted-foreground/85">
                XSWD follows your wallet&apos;s network · contracts deploy at the mainnet launch,
                trading runs on demo data until then.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────
// Celebration overlay — acceptance, graduation and migration events
// ─────────────────────────────────────────────────────────────────
function CelebrationOverlay() {
  const event = useEngine((s) => s.event)
  const clearEvent = useEngine((s) => s.clearEvent)

  if (!event) return null

  const goTo = (view: 'trading' | 'dex', id: string) => {
    useEngine.setState({ pendingNav: { view, id }, event: null })
  }

  return (
    <AnimatePresence>
      <motion.div
        key={event.kind + event.ts}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[92] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm"
        onClick={clearEvent}
      >
        {/* square confetti: champagne, teal, bordeaux */}
        {Array.from({ length: 22 }).map((_, i) => (
          <motion.span
            key={i}
            className={cn('absolute h-1.5 w-1.5', i % 3 === 0 ? 'bg-vault' : i % 3 === 1 ? 'bg-xusd' : 'bg-vlt')}
            style={{ left: '50%', top: '50%' }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: Math.cos((i / 22) * Math.PI * 2) * (130 + (i % 5) * 42),
              y: Math.sin((i / 22) * Math.PI * 2) * (130 + (i % 5) * 42),
              opacity: 0,
              rotate: 180,
            }}
            transition={{ duration: 1.4, ease: [0.15, 0.8, 0.4, 1] }}
            aria-hidden
          />
        ))}

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          className="relative w-full max-w-lg border border-border bg-card px-8 py-9 text-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <span aria-hidden className="absolute -left-px -top-px h-4 w-4 border-l-2 border-t-2 border-vault" />
          <span aria-hidden className="absolute -right-px -top-px h-4 w-4 border-r-2 border-t-2 border-vault" />
          <span aria-hidden className="absolute -bottom-px -left-px h-4 w-4 border-b-2 border-l-2 border-vault" />
          <span aria-hidden className="absolute -bottom-px -right-px h-4 w-4 border-b-2 border-r-2 border-vault" />

          <button
            onClick={clearEvent}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-vault/40 hover:text-vault"
          >
            <X className="h-4 w-4" />
          </button>

          {event.kind === 'accepted' && (
            <>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-vault">validation passed</div>
              <h3 className="mt-4 font-display text-4xl font-medium tracking-tight">
                {event.name} <span className="italic text-vault">is live</span>
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                The community said yes: quorum reached, approval above 80%.
                The bonding curve just opened with its 500 XEL seed. Price
                discovery starts now.
              </p>
              <BracketButton variant="primary" size="lg" className="mt-7 w-full" onClick={() => goTo('trading', event.projectId)}>
                Trade {event.ticker} on the curve
              </BracketButton>
            </>
          )}

          {event.kind === 'graduating' && (
            <>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-vault-soft">4× crossed</div>
              <h3 className="mt-4 font-display text-4xl font-medium tracking-tight">
                {event.name} is <span className="italic text-vault">graduating</span>
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Curve reserves reached 4× the seed. The atomic migration is
                running: curve reserves and token inventory are seeding a
                brand-new LaunchDEX pool.
              </p>
              <div className="mt-6 space-y-2 font-mono text-[11px]">
                {['collecting curve reserves', 'seeding the LaunchDEX pool', 'locking the seed forever'].map((s, i) => (
                  <motion.div
                    key={s}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.7 }}
                    className="flex items-center justify-center gap-2.5 text-muted-foreground"
                  >
                    <span className="h-1.5 w-1.5 bg-vault" /> {s}
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {event.kind === 'migrated' && (
            <>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-xusd">migration complete</div>
              <h3 className="mt-4 font-display text-4xl font-medium tracking-tight">
                {event.name} is on <span className="italic text-xusd">LaunchDEX</span>
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                The seed liquidity is protocol-locked forever: the floor can
                never be pulled. Every swap pays 0.30%, half to liquidity
                providers, pro-rata, exitable at any time.
              </p>
              <div className="mt-6 grid grid-cols-3 divide-x divide-border border border-border">
                {[['SEED LOCKED', 'FOREVER'], ['SWAP FEE', '0.30%'], ['LP SHARE', '50%']].map(([k, v]) => (
                  <div key={k} className="px-2 py-3">
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{k}</div>
                    <div className="mt-1 font-mono text-xs font-bold text-xusd">{v}</div>
                  </div>
                ))}
              </div>
              <BracketButton variant="teal" size="lg" className="mt-7 w-full" onClick={() => goTo('dex', event.projectId)}>
                Trade {event.ticker} on the DEX
              </BracketButton>
            </>
          )}

          <button
            onClick={clearEvent}
            className="mt-4 w-full py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            keep browsing
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────
// The shell
// ─────────────────────────────────────────────────────────────────
export function LaunchAppShell() {
  const [view, setViewRaw] = useState<AppView>('launchpad')
  const [focus, setFocus] = useState<string | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)

  const wallet = useLaunchWallet()
  const engineXel = useEngine((s) => s.xel)
  const speed = useEngine((s) => s.speed)
  const setSpeed = useEngine((s) => s.setSpeed)

  const setView = (v: AppView, id?: string) => {
    setViewRaw(v)
    if (id !== undefined) setFocus(id)
    if (typeof window !== 'undefined') {
      // keep the focus target in the URL so the view can react on back-nav
      try { window.history.replaceState({}, '', `/launch`) } catch { /* ignore */ }
    }
  }

  // Consume engine navigation requests (from celebration CTAs)
  useEffect(() => {
    const unsub = useEngine.subscribe((s) => {
      if (s.pendingNav) {
        setViewRaw(s.pendingNav.view)
        setFocus(s.pendingNav.id)
        useEngine.setState({ pendingNav: null })
      }
    })
    return unsub
  }, [])

  const groups = Array.from(new Set(NAV.map((n) => n.group)))
  const activeIndex = NAV.findIndex((n) => n.id === view)
  const title = VIEW_TITLES[view]
  const isDemo = wallet.mode === 'demo'
  const balance = isDemo ? engineXel : (wallet.xswdBalanceXel ?? 0)

  return (
    <EngineProvider>
      <div className="app-dark flex min-h-screen flex-col bg-background">
        {/* STATUS LINE — flat ink strip */}
        <div className="shrink-0 border-b border-border bg-[oklch(0.105_0.008_80)]">
          <div className="px-4 md:px-6 py-2 flex items-center justify-center gap-2.5 text-center">
            <SquareDot className={isDemo ? 'text-vault' : 'text-emerald-400'} />
            <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-foreground/70">
              <span className="text-vault font-semibold">Mainnet · private preview</span>
              <span className="opacity-40 mx-2">·</span>
              {isDemo
                ? 'demo data · every project, trade and price on this screen is fictional'
                : wallet.xswdState === 'connected'
                  ? `XSWD live${wallet.xswdNetwork ? ` · network: ${wallet.xswdNetwork}` : ''} · trading stays in demo until contracts deploy`
                  : 'XSWD connecting…'}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          {/* SIDEBAR — numbered ledger index */}
          <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border">
            {/* Brand: the protocol logo, never forgotten */}
            <div className="border-b border-border p-5">
              <a href="/" className="flex items-center gap-2.5" title="Back to xelisvault.xyz">
                <div className="relative w-9 h-9 overflow-hidden ring-1 ring-vault/40">
                  <img src="/images/xelisvault-logo.png" alt="Xelis Vault" className="w-full h-full object-cover" />
                </div>
                <div className="leading-none">
                  <div className="font-display font-semibold text-sm tracking-tight">
                    XELIS<span className="text-vault">Vault</span>
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground mt-1">VaultLaunch</div>
                </div>
              </a>
            </div>

            <nav className="flex-1 overflow-y-auto py-5 space-y-6" aria-label="VaultLaunch views">
              {groups.map((g) => (
                <div key={g}>
                  <div className="px-5 mb-2 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/85">{g}</div>
                  <div>
                    {NAV.filter((n) => n.group === g).map((n) => {
                      const globalIdx = NAV.indexOf(n)
                      const isActive = view === n.id
                      return (
                        <button
                          key={n.id}
                          onClick={() => setView(n.id)}
                          className={`w-full flex items-baseline gap-3 px-5 py-2 text-sm transition-colors border-l-2 ${
                            isActive
                              ? 'border-vault text-foreground bg-vault/5'
                              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-card/70'
                          }`}
                        >
                          <span className={`font-mono text-[10px] tracking-wider ${isActive ? 'text-vault' : 'text-muted-foreground/85'}`}>
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
            <div className="p-5 border-t border-border space-y-2.5">
              <a
                href="https://github.com/XelisVault/xelis-vault"
                target="_blank"
                rel="noreferrer"
                className="block text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground hover:text-vault transition-colors"
              >
                Source on GitHub ↗
              </a>
              <a
                href="/#vaultlaunch"
                className="block text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground hover:text-vault transition-colors"
              >
                ← xelisvault.xyz
              </a>
            </div>
          </aside>

          {/* MAIN AREA */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* TOPBAR */}
            <header className="shrink-0 border-b border-border bg-background">
              <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
                {/* Mobile: brand */}
                <div className="flex items-center gap-2.5 md:hidden min-w-0">
                  <div className="w-7 h-7 shrink-0 overflow-hidden ring-1 ring-vault/40">
                    <img src="/images/xelisvault-logo.png" alt="Xelis Vault" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-sm font-semibold tracking-tight truncate">{title.title}</div>
                    <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">VaultLaunch</div>
                  </div>
                </div>

                {/* Title (desktop) */}
                <div className="hidden md:block">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[10px] text-vault tracking-[0.18em]">{pad2(activeIndex)}</span>
                    <h1 className="font-display text-lg font-semibold tracking-tight">{title.title}</h1>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{title.desc}</p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Simulation speed (demo nicety) */}
                  <div className="hidden sm:flex items-center border border-border bg-card/60" title="Simulation speed">
                    {[1, 4, 16].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        className={cn(
                          'px-2.5 py-1.5 font-mono text-[11px] font-semibold transition-colors',
                          speed === s ? 'bg-vault/15 text-vault' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>

                  {/* Wallet */}
                  <button
                    onClick={() => setConnectOpen(true)}
                    className="flex items-center gap-2.5 border border-border bg-card/70 px-3 py-2 transition-colors hover:border-vault/40"
                  >
                    <span className={cn('h-1.5 w-1.5', isDemo ? 'bg-vault' : wallet.xswdState === 'connected' ? 'bg-emerald-400' : 'bg-vault-soft')} />
                    <span className="font-mono text-xs font-semibold tabular-nums">
                      {isDemo ? (
                        <AnimatedNumber value={balance} format={(v) => `${fmtXel(v)} XEL`} />
                      ) : wallet.xswdAddress ? (
                        <span>{wallet.xswdAddress.slice(0, 10)}…</span>
                      ) : (
                        'connecting…'
                      )}
                    </span>
                    <span className="hidden lg:inline text-[9px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                      {isDemo ? 'demo' : 'xswd'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Mobile nav (horizontal ledger) */}
              <div className="md:hidden border-t border-border">
                <div className="hide-scrollbar flex items-end gap-5 overflow-x-auto scroll-smooth px-4 pt-2 pb-2.5">
                  {NAV.map((n) => {
                    const isActive = view === n.id
                    const globalIdx = NAV.indexOf(n)
                    return (
                      <button
                        key={n.id}
                        onClick={() => setView(n.id)}
                        className={`shrink-0 inline-flex items-baseline gap-1.5 pb-1.5 pt-1.5 text-xs font-medium transition-colors border-b-2 ${
                          isActive ? 'border-vault text-foreground' : 'border-transparent text-muted-foreground'
                        }`}
                      >
                        <span className={`font-mono text-[9px] tracking-wider ${isActive ? 'text-vault' : 'text-muted-foreground/85'}`}>
                          {pad2(globalIdx)}
                        </span>
                        {n.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </header>

            {/* CONTENT */}
            <main className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 md:p-6 lg:p-8"
                >
                  {view === 'launchpad' && <LaunchpadView setView={setView} />}
                  {view === 'trading' && <TradingView setView={setView} focusId={focus} />}
                  {view === 'dex' && <DexView setView={setView} focusId={focus} />}
                  {view === 'portfolio' && <PortfolioView setView={setView} />}
                </motion.div>
              </AnimatePresence>

              {/* Footer */}
              <footer className="border-t border-border/60 px-4 md:px-6 py-4">
                <p className="text-center font-mono text-[10px] leading-relaxed text-muted-foreground">
                  VaultLaunch · XELIS mainnet · private preview · specs frozen in
                  LAUNCHPAD.md and DEX.md · internal audits only, no external audit yet
                </p>
              </footer>
            </main>
          </div>
        </div>

        <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
        <CelebrationOverlay />
      </div>
    </EngineProvider>
  )
}
