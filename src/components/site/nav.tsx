'use client'

import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Menu, X, Github, ExternalLink, Rocket } from 'lucide-react'
import { useDemo } from '@/lib/demo-store'
import { useLaunchStatus } from '@/components/app/launch-gate'

const LINKS = [
  { label: 'Vision', href: '#vision' },
  { label: 'Protocol', href: '#protocol' },
  { label: 'Architecture', href: '#architecture' },
  { label: 'xUSD', href: '#xusd' },
  { label: 'VLT', href: '#vlt' },
  { label: 'Oracle', href: '#oracle' },
  { label: 'Contracts', href: '#contracts' },
  { label: 'VaultChat', href: '#vaultchat' },
  { label: 'Roadmap', href: '#roadmap' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { scrollY } = useScroll()
  const openApp = useDemo((s) => s.openApp)
  const { isLaunched } = useLaunchStatus()

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
          <a href="#top" className="flex items-center gap-2.5 group">
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
              onClick={openApp}
              disabled={!isLaunched}
              className="hidden md:inline-flex h-9 items-center gap-2 rounded-full bg-vault px-4 text-[13px] font-semibold text-white hover:bg-vault/85 transition-all hover:shadow-[0_0_24px_-4px_var(--vault)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Rocket className="w-3.5 h-3.5" />
              {isLaunched ? 'Launch App' : 'Delayed'}
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
            className="fixed inset-0 z-[70] lg:hidden bg-background/95 backdrop-blur-xl"
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
              {LINKS.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="py-4 text-2xl font-display font-medium border-b border-border"
                >
                  {l.label}
                </motion.a>
              ))}
              <div className="flex gap-3 mt-8">
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
                  className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-vault text-white font-semibold disabled:opacity-40"
                >
                  <Rocket className="w-4 h-4" /> {isLaunched ? 'Launch App' : 'Delayed'}
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
