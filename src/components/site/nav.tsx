'use client'

import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Menu, X, Github, ChevronDown, ArrowUpRight } from 'lucide-react'
import { useDemo } from '@/lib/demo-store'
import { useCountdownState } from '@/lib/countdown'
import { useLaunchStatus } from '@/components/app/launch-gate'
import { SoundToggle } from '@/components/site/launch-audio'
import { useSide } from '@/lib/side-store'

const LINKS = [
  { label: 'Explorer', href: '/explorer', live: true },
  { label: 'Vision', href: '/#vision' },
  { label: 'Protocol', href: '/#protocol' },
  { label: 'Architecture', href: '/#architecture' },
  { label: 'xUSD', href: '/#xusd' },
  { label: 'VLT', href: '/#vlt' },
  { label: 'Oracle', href: '/#oracle' },
  { label: 'Mining', href: '/#mining' },
  { label: 'Contracts', href: '/#contracts' },
  { label: 'VaultChat', href: '/#vaultchat' },
  { label: 'Roadmap', href: '/#roadmap' },
]

/* Desktop navigation is grouped into 3 institutional mega-groups + 2 links,
   in the Julius Baer / Pictet tradition, complexity lives in the dropdowns. */
const NAV_GROUPS = [
  {
    label: 'Protocol',
    items: [
      { label: 'The Problem', href: '/#vision' },
      { label: 'The Six Pillars', href: '/#protocol' },
      { label: 'Architecture', href: '/#architecture' },
      { label: 'Smart Contracts', href: '/#contracts' },
      { label: 'Roadmap', href: '/#roadmap' },
    ],
  },
  {
    label: 'Products',
    items: [
      { label: 'xUSD · Stablecoin', href: '/#xusd' },
      { label: 'VLT · Governance', href: '/#vlt' },
      { label: 'StakedOracle', href: '/#oracle' },
      { label: 'Mining & Delegation', href: '/#mining' },
      { label: 'VaultChat', href: '/#vaultchat' },
    ],
  },
]

// Resources shown in a dropdown on desktop and inline on mobile
const RESOURCES = [
  { label: 'Documentation', href: '/docs', desc: 'Guides, specs, contract reference' },
  { label: 'Vault Simulator', href: '/vault-simulator', desc: 'Practice before testnet launches' },
  { label: 'Security', href: '/security', desc: 'Audits, bug bounty, security model' },
  { label: 'Learn', href: '/learn', desc: 'Cryptography and DeFi concepts' },
  { label: 'Developers', href: '/developers', desc: 'SDKs, code examples, bounties' },
  { label: 'Compare', href: '/compare', desc: 'vs Aztec, Railgun, Secret Network' },
  { label: 'Community', href: '/community', desc: 'Discord, grants, ecosystem' },
  { label: 'About', href: '/about', desc: 'Mission, team, principles' },
]

const UTILITY_LINKS = [
  { label: 'Whitepaper', href: 'https://github.com/XelisVault/xelis-vault/blob/main/docs/WHITEPAPER.md' },
  { label: 'GitHub', href: 'https://github.com/XelisVault/xelis-vault' },
  { label: 'Discord', href: 'https://discord.gg/UHpYAWbG' },
]

/* The two-world switch — Xelis ⇄ Nerva, reopens the Choose Your Side gate */
function SideSwitchPill() {
  const openGate = useSide((s) => s.openGate)
  return (
    <button
      onClick={openGate}
      title="Switch protocol side — XELIS ⇄ NERVA"
      aria-label="Switch protocol side"
      className="inline-flex items-center gap-1.5 h-6 pl-1.5 pr-2.5 rounded-full border border-ink-foreground/15 hover:border-vault/50 bg-ink-foreground/4 hover:bg-vault/8 transition-all group"
    >
      <img src="/images/xelisvault-logo.png" alt="" className="w-3.5 h-3.5 rounded-[2px] ring-1 ring-white/25" />
      <span className="font-mono text-[9px] tracking-[0.1em] text-ink-foreground/60 group-hover:text-ink-foreground transition-colors">⇄</span>
      <img src="/images/nerva/nerva-mark.png" alt="" className="w-3.5 h-3.5 rounded-full ring-1 ring-white/25" />
      <span className="hidden sm:inline font-mono text-[9px] uppercase tracking-[0.14em] text-ink-foreground/70 group-hover:text-vault transition-colors">Sides</span>
    </button>
  )
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const { scrollY } = useScroll()
  const openApp = useDemo((s) => s.openApp)
  const { isLaunched } = useLaunchStatus()
  const { days, hours, minutes, seconds, isFinalCountdown } = useCountdownState()

  useMotionValueEvent(scrollY, 'change', (v) => {
    setScrolled(v > 30)
  })

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        {/* ── Utility bar (ink), the private-bank top strip ── */}
        <div className="dark-band text-[11px] tracking-wide">
          <div className="mx-auto max-w-7xl px-5 md:px-8 h-8 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono uppercase tracking-[0.14em] text-ink-foreground/75">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              {isLaunched ? 'Testnet live' : 'Testnet launches Aug 30 · 14:00 UTC'}
              <span className="hidden sm:inline text-ink-foreground/30">·</span>
              <span className="hidden sm:inline">XELIS BlockDAG · 5s finality</span>
            </div>
            <nav className="flex items-center gap-4" aria-label="Utility">
              <SideSwitchPill />
              <span className="hidden sm:inline text-ink-foreground/20">|</span>
              {UTILITY_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center gap-1 text-ink-foreground/70 hover:text-ink-foreground transition-colors"
                >
                  {l.label}
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </a>
              ))}
              <a
                href="https://github.com/XelisVault/xelis-vault"
                target="_blank"
                rel="noreferrer"
                className="sm:hidden inline-flex items-center gap-1 text-ink-foreground/70 hover:text-ink-foreground transition-colors"
              >
                GitHub
              </a>
            </nav>
          </div>
        </div>

        {/* ── Main bar ── */}
        <div
          className={`transition-all duration-300 ${
            scrolled ? 'glass-nav py-2.5' : 'py-4 bg-transparent'
          }`}
        >
          <div className="mx-auto max-w-7xl px-5 md:px-8 flex items-center justify-between gap-4">
            <a href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="relative w-9 h-9 rounded-[4px] overflow-hidden ring-1 ring-foreground/15 group-hover:ring-vault/50 transition-all">
                <img
                  src="/images/xelisvault-logo.png"
                  alt="Xelis Vault"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-display font-semibold text-[17px] tracking-[-0.01em]">
                XELIS<span className="text-vault">Vault</span>
              </span>
            </a>

            <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
              {/* Live Explorer, direct link */}
              <a
                href="/explorer"
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-[13px] font-medium text-vault hover:bg-vault/8 transition-colors"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Explorer
              </a>

              {/* Grouped mega-menus (Protocol / Products) */}
              {NAV_GROUPS.map((g) => (
                <div
                  key={g.label}
                  className="relative"
                  onMouseEnter={() => { setOpenGroup(g.label); setResourcesOpen(false) }}
                  onMouseLeave={() => setOpenGroup(null)}
                >
                  <button
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-none text-[13px] font-medium transition-colors${
                      openGroup === g.label
                        ? 'text-foreground bg-foreground/6'
                        : 'text-foreground/70 hover:text-foreground hover:bg-foreground/4'
                    }`}
                    aria-expanded={openGroup === g.label}
                  >
                    {g.label}
                    <ChevronDown className={`w-3 h-3 transition-transform ${openGroup === g.label ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {openGroup === g.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.16 }}
                        className="absolute top-full left-0 pt-2.5 w-72"
                      >
                        <div className="rounded-none glass-panel-solid p-2">
                          {g.items.map((item) => (
                            <a
                              key={item.href}
                              href={item.href}
                              className="block rounded-none px-3.5 py-2.5 text-[13px] font-medium hover:bg-vault/8 hover:text-vault transition-colors"
                            >
                              {item.label}
                            </a>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              {/* Resources dropdown, solid white editorial panel */}
              <div
                className="relative"
                onMouseEnter={() => { setResourcesOpen(true); setOpenGroup(null) }}
                onMouseLeave={() => setResourcesOpen(false)}
              >
                <button
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-none text-[13px] font-medium transition-colors${
                    resourcesOpen
                      ? 'text-foreground bg-foreground/6'
                      : 'text-foreground/70 hover:text-foreground hover:bg-foreground/4'
                  }`}
                  aria-expanded={resourcesOpen}
                >
                  Resources
                  <ChevronDown className={`w-3 h-3 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {resourcesOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.16 }}
                      className="absolute top-full right-0 pt-3 w-[540px]"
                    >
                      <div className="rounded-none glass-panel-solid p-3">
                        <div className="grid grid-cols-2 gap-1">
                          {RESOURCES.map((r) => (
                            <a
                              key={r.href}
                              href={r.href}
                              className="group block rounded-none px-3.5 py-2.5 hover:bg-vault/8 transition-colors"
                            >
                              <div className="text-[13px] font-semibold leading-tight group-hover:text-vault transition-colors">{r.label}</div>
                              <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{r.desc}</div>
                            </a>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-border flex items-center justify-between px-3 pb-1">
                          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                            All 8 resource centres
                          </span>
                          <a
                            href="/docs"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-vault hover:gap-1.5 transition-all"
                          >
                            Open the library
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <SoundToggle />
              <a
                href="https://github.com/XelisVault/xelis-vault"
                target="_blank"
                rel="noreferrer"
                className="hidden md:inline-flex h-9 items-center gap-2 rounded-none border border-border bg-card/60 hover:bg-card hover:border-vault/40 px-4 text-[13px] font-medium transition-all"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <button
                onClick={() => openApp()}
                disabled={!isLaunched}
                className={`hidden md:inline-flex h-9 items-center px-5 text-[13px] font-semibold transition-colors hover:bg-vault hover:text-primary-foreground disabled:cursor-not-allowed${
                  isLaunched
                    ? 'bg-ink text-ink-foreground hover:bg-vault hover:text-primary-foreground'
                    : isFinalCountdown
                      ? 'bg-amber-600/90 text-white animate-pulse'
                      : 'bg-ink/80 text-ink-foreground'
                }`}
              >
                {isLaunched ? (
                  'Launch App'
                ) : (
                  <span className="font-mono tabular-nums tracking-tight" suppressHydrationWarning>
                    T–{days}d {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:
                    {String(seconds).padStart(2, '0')}
                  </span>
                )}
              </button>
              <button
                onClick={() => setOpen(true)}
                className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-[3px] hover:bg-foreground/5"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] lg:hidden bg-background/98 backdrop-blur-xl overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-5">
              <span className="font-display font-semibold text-[17px]">Menu</span>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[3px] hover:bg-foreground/5"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex flex-col px-5 mt-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/70 mb-2 mt-4">Home sections</div>
              {LINKS.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * i }}
                  className="py-3 text-xl font-display font-medium border-b border-border/60 flex items-center gap-2"
                >
                  {(l as any).live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  {l.label}
                </motion.a>
              ))}

              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/70 mb-2 mt-6">Resources</div>
              {RESOURCES.map((r, i) => (
                <motion.a
                  key={r.href}
                  href={r.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * (i + LINKS.length) }}
                  className="py-3 border-b border-border/60 flex items-baseline justify-between gap-4"
                >
                  <div className="text-lg font-display font-medium leading-tight">{r.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 text-right">{r.desc}</div>
                </motion.a>
              ))}

              <div className="flex gap-3 mt-8 mb-12">
                <a
                  href="https://github.com/XelisVault/xelis-vault"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-none border border-border bg-card"
                >
                  <Github className="w-4 h-4" /> GitHub
                </a>
                <button
                  onClick={() => { if (isLaunched) { openApp(); setOpen(false) } }}
                  disabled={!isLaunched}
                  className={`flex-1 inline-flex h-12 items-center justify-center rounded-none font-semibold disabled:cursor-not-allowed${
                    isLaunched
                      ? 'bg-ink text-ink-foreground'
                      : 'bg-ink/70 text-ink-foreground/80'
                  }`}
                >
                  {isLaunched ? (
                    'Launch App'
                  ) : (
                    <span className="font-mono tabular-nums" suppressHydrationWarning>
                      T–{days}d {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:
                      {String(seconds).padStart(2, '0')}
                    </span>
                  )}
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
