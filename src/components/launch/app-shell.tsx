// VaultLaunch app shell — the live MAINNET terminal.
//
// One shell, six views:
//   • Launchpad     — every project, every status, community validation
//   • Create        — propose a coin (the real 526+ XEL transaction)
//   • Curve Trading — bonding-curve pairs, real buy/sell
//   • LaunchDEX     — migrated pools, swaps, liquidity provision
//   • Portfolio     — the connected wallet's real holdings & LP positions
//   • Guide         — the full on-site documentation
//
// The data layer is the mainnet store (chain = backend): the shell only
// boots the poller and renders. The wallet is XSWD-only (Genesix /
// xelis_wallet on mainnet) — there is no demo mode anymore.

'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useMainnet } from '@/lib/launch/mainnet-store'
import { useLaunchWallet, initLaunchWalletSync } from '@/lib/launch/wallet'
import { TOPO_SECONDS } from '@/lib/launch/protocol'
import { LaunchpadView, type AppView } from './launchpad-view'
import { TradingView } from './trading-view'
import { DexView } from './dex-view'
import { PortfolioView } from './portfolio-view'
import { ProposeView } from './propose-view'
import { GuideView } from './guide-view'
import { BracketButton, SquareDot, pad2 } from './shared'
import { ProjectLogo } from './logos'

// ── Navigation ───────────────────────────────────────────────────────

const NAV: { id: AppView; label: string; group: string }[] = [
  { id: 'launchpad', label: 'Launchpad', group: 'Market' },
  { id: 'trading', label: 'Curve Trading', group: 'Market' },
  { id: 'dex', label: 'LaunchDEX', group: 'Market' },
  { id: 'create', label: 'Create a Coin', group: 'Create' },
  { id: 'portfolio', label: 'Portfolio', group: 'Account' },
  { id: 'guide', label: 'Guide & Docs', group: 'Learn' },
]

const VIEW_TITLES: Record<AppView, { title: string; desc: string }> = {
  launchpad: {
    title: 'Launchpad',
    desc: 'Every project on the XELIS mainnet — validation, bonding curves and migrated pools, straight from the contracts.',
  },
  trading: {
    title: 'Curve Trading',
    desc: 'Bonding-curve pairs — buy and sell against the curve, 0.50% fee, graduation at 2× the seed.',
  },
  dex: {
    title: 'LaunchDEX',
    desc: 'Permanent-liquidity pools for graduated tokens — swaps at 0.30%, providers earn 50% of the fees.',
  },
  create: {
    title: 'Create a Coin',
    desc: 'Propose a project to the community — 526 XEL minimum, validation in ~1 hour, direct listing at 2 000 XEL.',
  },
  portfolio: {
    title: 'Portfolio',
    desc: 'Your real mainnet wallet — XEL, launched tokens and liquidity-provider positions.',
  },
  guide: {
    title: 'Guide & Docs',
    desc: 'How the launchpad works, how to verify every address yourself, fees, liquidity, FAQ.',
  },
}

// ── Boot: start the mainnet poller + wallet sync (client only) ──────

function MainnetProvider({ children }: { children: React.ReactNode }) {
  const start = useMainnet((s) => s.start)
  useEffect(() => {
    start()
    initLaunchWalletSync()
  }, [start])
  return <>{children}</>
}

// ── Smart sidebar (proximity rail, desktop) ─────────────────────────

function useSmartSidebar() {
  const [expanded, setExpanded] = useState(false)
  const [canHover, setCanHover] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    setCanHover(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setCanHover(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  useEffect(() => {
    if (!canHover) return
    const onMove = (e: MouseEvent) => {
      const x = e.clientX
      if (x <= 96) setExpanded(true)
      else if (x >= 340) setExpanded(false)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [canHover])
  return { expanded, setExpanded, canHover }
}

function SmartSidebar({ view, onSelect }: { view: AppView; onSelect: (v: AppView) => void }) {
  const { expanded, setExpanded, canHover } = useSmartSidebar()
  const activeIndex = NAV.findIndex((n) => n.id === view)
  const groups = [...new Set(NAV.map((n) => n.group))]

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-background/60 backdrop-blur-sm transition-[width] duration-200 md:flex',
        expanded ? 'w-60' : 'w-[58px]',
      )}
      onMouseLeave={() => canHover && setExpanded(false)}
    >
      {/* brand */}
      <Link href="/" className="flex h-14 items-center gap-2.5 border-b border-border px-3">
        <ProjectLogo ticker="XEL" size="sm" className="h-7 w-7 shrink-0" />
        {expanded && (
          <div className="overflow-hidden">
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
              XELIS<span className="text-vault">Vault</span>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              VaultLaunch
            </div>
          </div>
        )}
      </Link>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {groups.map((group) => (
          <div key={group} className="mb-5">
            {expanded && (
              <div className="mb-1.5 px-2 font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground/60">
                {group}
              </div>
            )}
            {NAV.filter((n) => n.group === group).map((n) => {
              const idx = NAV.indexOf(n)
              const active = n.id === view
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    onSelect(n.id)
                    if (!canHover) setExpanded(false)
                  }}
                  title={n.label}
                  className={cn(
                    'group relative mb-0.5 flex w-full items-center gap-2.5 px-2 py-2 text-left font-mono text-[11px] transition-colors',
                    active
                      ? 'bg-vault/10 text-vault'
                      : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
                  )}
                >
                  <span className={cn('w-6 shrink-0 text-center text-[9px] tabular-nums', active ? 'text-vault' : 'text-muted-foreground/50')}>
                    {pad2(idx)}
                  </span>
                  {expanded && <span className="truncate">{n.label}</span>}
                  {active && <span className="absolute right-0 top-1/2 h-4 w-[2px] -translate-y-1/2 bg-vault" />}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* footer */}
      <div className="border-t border-border p-2">
        <a
          href="https://github.com/XelisVault/xelis-vault"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 px-2 py-2 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          title="Protocol source (contracts, docs, runbooks)"
        >
          <span className="w-6 text-center">GH</span>
          {expanded && <span>github.com/XelisVault</span>}
        </a>
        <Link
          href="/#vaultlaunch"
          className="flex items-center gap-2.5 px-2 py-2 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          title="Back to xelisvault.xyz"
        >
          <span className="w-6 text-center">←</span>
          {expanded && <span>xelisvault.xyz</span>}
        </Link>
      </div>
    </aside>
  )
}

// ── Wallet connect modal (XSWD · mainnet only) ──────────────────────

function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const wallet = useLaunchWallet()
  const { toast } = useToast()
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (open && wallet.state === 'connected') onClose()
  }, [open, wallet.state, onClose])

  const connect = async () => {
    setConnecting(true)
    try {
      await wallet.connect()
      toast({
        title: 'Wallet connected',
        description: wallet.isMainnet === false
          ? 'Connected — but the wallet is NOT on mainnet. Switch your daemon to the XELIS mainnet.'
          : 'Live on the XELIS mainnet. Real funds, real transactions.',
      })
      onClose()
    } catch {
      // the store holds the error message
    } finally {
      setConnecting(false)
    }
  }

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md border border-border bg-background p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          Connect wallet
        </div>
        <h3 className="mb-4 text-lg font-semibold text-foreground">XSWD · XELIS mainnet</h3>

        <div className="mb-5 border border-border bg-foreground/[0.03] p-4 text-sm leading-relaxed text-muted-foreground">
          <p className="mb-2 text-foreground">Genesix (or xelis_wallet) on mainnet</p>
          <ol className="list-inside list-decimal space-y-1 font-mono text-[11px]">
            <li>Open Genesix with a mainnet daemon</li>
            <li>Settings → XSWD → enabled (ws://127.0.0.1:44325)</li>
            <li>Accept the VaultLaunch connection popup</li>
          </ol>
          <p className="mt-2 text-[11px]">
            Every action is a real mainnet transaction signed by your wallet. The site never sees your keys.
          </p>
        </div>

        {wallet.state === 'error' && wallet.message && (
          <p className="mb-4 border border-destructive/40 bg-destructive/10 p-3 font-mono text-[11px] leading-relaxed text-destructive">
            {wallet.message}
          </p>
        )}
        {wallet.state === 'awaiting-approval' && (
          <p className="mb-4 border border-vault/40 bg-vault/10 p-3 font-mono text-[11px] text-vault">
            Waiting for approval in the wallet…
          </p>
        )}
        {wallet.isMainnet === false && (
          <p className="mb-4 border border-destructive/40 bg-destructive/10 p-3 font-mono text-[11px] text-destructive">
            Your wallet daemon is on {wallet.network ?? 'an unknown network'} — VaultLaunch needs the MAINNET.
          </p>
        )}

        <div className="flex gap-2">
          <BracketButton
            variant="strong"
            onClick={connect}
            disabled={connecting || wallet.state === 'connecting' || wallet.state === 'awaiting-approval'}
          >
            {connecting || wallet.state === 'connecting' || wallet.state === 'awaiting-approval'
              ? 'connecting…'
              : 'connect genesix'}
          </BracketButton>
          <BracketButton variant="quiet" onClick={onClose}>
            close
          </BracketButton>
        </div>
      </motion.div>
    </div>
  )
}

// ── The shell ────────────────────────────────────────────────────────

export function LaunchAppShell({ initialView }: { initialView?: AppView }) {
  const [view, setViewRaw] = useState<AppView>(initialView ?? 'launchpad')
  const [focus, setFocus] = useState<string | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const wallet = useLaunchWallet()
  const nodeStatus = useMainnet((s) => s.status)
  const topoheight = useMainnet((s) => s.topoheight)
  const lastSyncMs = useMainnet((s) => s.lastSyncMs)
  const refresh = useMainnet((s) => s.refresh)
  const [, setTick] = useState(0)

  // "synced Xs ago" label
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 5000)
    return () => clearInterval(t)
  }, [])
  const syncedAgo = lastSyncMs ? Math.max(0, Math.round((Date.now() - lastSyncMs) / 1000)) : null

  const setView = (v: AppView, id?: string) => {
    setViewRaw(v)
    setFocus(id || null)
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/launch')
    }
    contentRef.current?.scrollTo({ top: 0 })
  }

  const activeIndex = NAV.findIndex((n) => n.id === view)
  const title = VIEW_TITLES[view]
  const connected = wallet.state === 'connected' && wallet.address != null
  const address = wallet.address
  const xelBalance = wallet.xelBalance

  return (
    <MainnetProvider>
      <div className="app-dark flex min-h-screen flex-col bg-background text-foreground">
        {/* ── status line: MAINNET LIVE ── */}
        <div className="flex h-7 items-center justify-between gap-3 border-b border-border bg-foreground/[0.02] px-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn('inline-block h-1.5 w-1.5 rounded-full', nodeStatus === 'live' ? 'animate-pulse bg-emerald-400' : nodeStatus === 'offline' ? 'bg-destructive' : 'bg-vault')} />
            <span className="text-foreground">Mainnet</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="truncate">
              {nodeStatus === 'live'
                ? `live · topo ${topoheight.toLocaleString('en-US')}${syncedAgo != null ? ` · synced ${syncedAgo}s ago` : ''}`
                : nodeStatus === 'offline'
                  ? 'node unreachable · retrying'
                  : 'connecting to node.xelis.io…'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void refresh(true)}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            title="Force a full rescan of both contracts"
          >
            resync
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <SmartSidebar view={view} onSelect={(v) => setView(v)} />

          <div className="flex min-w-0 flex-1 flex-col">
            {/* ── topbar ── */}
            <div className="flex h-14 items-center justify-between gap-3 border-b border-border px-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-3">
                {/* mobile brand */}
                <div className="md:hidden">
                  <ProjectLogo ticker="XEL" size="sm" className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="hidden font-mono text-[9px] text-muted-foreground/50 md:inline">{pad2(activeIndex)}</span>
                    <h1 className="truncate font-mono text-sm font-bold uppercase tracking-[0.14em] text-foreground">
                      {title.title}
                    </h1>
                  </div>
                  <p className="hidden truncate text-[10px] text-muted-foreground lg:block">{title.desc}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {nodeStatus === 'offline' && (
                  <span className="hidden font-mono text-[9px] uppercase tracking-[0.14em] text-destructive sm:inline">
                    offline
                  </span>
                )}
                {connected && wallet.isMainnet === false && (
                  <span className="hidden font-mono text-[9px] uppercase tracking-[0.14em] text-destructive sm:inline">
                    wrong network
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setConnectOpen(true)}
                  className="flex items-center gap-2 border border-border bg-foreground/[0.03] px-2.5 py-1.5 font-mono text-[10px] transition-colors hover:border-vault/50"
                >
                  <span className={cn('inline-block h-1.5 w-1.5 rounded-full', connected ? 'bg-emerald-400' : 'bg-vault')} />
                  {connected && address ? (
                    <>
                      <span className="tabular-nums text-foreground">
                        {xelBalance != null ? `${xelBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })} XEL` : '…'}
                      </span>
                      <span className="text-muted-foreground">
                        {address.slice(0, 8)}…{address.slice(-4)}
                      </span>
                    </>
                  ) : (
                    <span className="text-vault">connect wallet</span>
                  )}
                </button>
              </div>
            </div>

            {/* ── mobile nav ── */}
            <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-1.5 md:hidden">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setView(n.id)}
                  className={cn(
                    'shrink-0 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors',
                    n.id === view
                      ? 'border-vault/60 bg-vault/10 text-vault'
                      : 'border-border text-muted-foreground',
                  )}
                >
                  {n.label}
                </button>
              ))}
            </div>

            {/* ── content ── */}
            <div ref={contentRef} className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={view + (focus ?? '')}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="mx-auto w-full max-w-7xl p-3 sm:p-4 lg:p-6"
                >
                  {view === 'launchpad' && <LaunchpadView setView={setView} />}
                  {view === 'trading' && <TradingView setView={setView} focusId={focus} />}
                  {view === 'dex' && <DexView setView={setView} focusId={focus} />}
                  {view === 'create' && <ProposeView setView={setView} />}
                  {view === 'portfolio' && <PortfolioView setView={setView} />}
                  {view === 'guide' && <GuideView setView={setView} />}
                </motion.div>
              </AnimatePresence>

              {/* footer */}
              <footer className="border-t border-border px-4 py-4 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
                VaultLaunch · XELIS mainnet · live since 23.09.2026 · {TOPO_SECONDS}s topoheights ·
                specs frozen in LAUNCHPAD.md and DEX.md · internal audits + CI only, no external audit yet
              </footer>
            </div>
          </div>
        </div>

        <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
      </div>
    </MainnetProvider>
  )
}
