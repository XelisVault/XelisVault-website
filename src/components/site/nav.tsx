'use client'

import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Menu, X, Github, ExternalLink, Rocket, ChevronDown } from 'lucide-react'
import { useDemo } from '@/lib/demo-store'
import { useCountdownState } from '@/lib/countdown'
import { useLaunchStatus } from '@/components/app/launch-gate'

const LINKS = [
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

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'glass-panel py-3' : 'py-5 bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-7xl px-5 md:px-8 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 rounded-md overflow-hidden ring-1 ring-vault/40 group-hover:ring-vault transition-all">
              <img
                src="/images/xelisvault-logo.png"
                alt="Xelis Vault"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-display font-semibold text-[15px] tracking-tight">
              XELIS<span className="text-vault">Vault</span>
            </span>
          </a>

          <nav className="hidden lg:flex items-center gap-7">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-vault scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </a>
            ))}

            {/* Resources dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setResourcesOpen(true)}
              onMouseLeave={() => setResourcesOpen(false)}
            >
              <button
                className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
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
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 pt-2 w-80"
                  >
                    <div className="rounded-2xl glass-panel p-2 shadow-2xl">
                      {RESOURCES.map((r) => (
                        <a
                          key={r.href}
                          href={r.href}
                          className="block rounded-xl px-3 py-2.5 hover:bg-card/60 transition-colors"
                        >
                          <div className="text-sm font-medium">{r.label}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{r.desc}</div>
                        </a>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/XelisVault/xelis-vault"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card/40 hover:bg-card/80 hover:border-vault/40 px-4 text-[13px] font-medium transition-all"
            >
              <Github className="w-4 h-4" />
              GitHub
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <button
              onClick={() => openApp()}
              disabled={!isLaunched}
              className={`hidden md:inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-semibold text-white transition-all hover:shadow-[0_0_24px_-4px_var(--vault)] disabled:cursor-not-allowed ${
                isLaunched
                  ? 'bg-vault hover:bg-vault/85'
                  : isFinalCountdown
                    ? 'bg-amber-600/80 animate-pulse'
                    : 'bg-vault/80'
              }`}
            >
              <Rocket className="w-3.5 h-3.5" />
              {isLaunched ? (
                'Launch App'
              ) : (
                <span className="font-mono tabular-nums tracking-tight">
                  T–{days}d {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:
                  {String(seconds).padStart(2, '0')}
                </span>
              )}
            </button>
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-card/60"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] lg:hidden bg-background/95 backdrop-blur-xl overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-5">
              <span className="font-display font-semibold text-[15px]">Menu</span>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-card"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex flex-col px-5 mt-4">
              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground/60 mb-2 mt-4">Home sections</div>
              {LINKS.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * i }}
                  className="py-3 text-xl font-display font-medium border-b border-border/60"
                >
                  {l.label}
                </motion.a>
              ))}

              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground/60 mb-2 mt-6">Resources</div>
              {RESOURCES.map((r, i) => (
                <motion.a
                  key={r.href}
                  href={r.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * (i + LINKS.length) }}
                  className="py-3 border-b border-border/60"
                >
                  <div className="text-xl font-display font-medium">{r.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div>
                </motion.a>
              ))}

              <div className="flex gap-3 mt-8 mb-12">
                <a
                  href="https://github.com/XelisVault/xelis-vault"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-card/60"
                >
                  <Github className="w-4 h-4" /> GitHub
                </a>
                <button
                  onClick={() => { if (isLaunched) { openApp(); setOpen(false) } }}
                  disabled={!isLaunched}
                  className={`flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-full text-white font-semibold disabled:cursor-not-allowed ${
                    isLaunched ? 'bg-vault' : 'bg-vault/70'
                  }`}
                >
                  <Rocket className="w-4 h-4" />
                  {isLaunched ? (
                    'Launch App'
                  ) : (
                    <span className="font-mono tabular-nums">
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
