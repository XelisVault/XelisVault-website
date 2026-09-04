'use client'

/**
 * NervaShell: the skin of the NERVA world.
 *
 * Wraps every /nerva page in the .nerva-world design system (deep navy,
 * signal cyan, electric violet), with its own navigation, live network
 * heartbeat strip, world intro, and footer. Completely independent from
 * the Xelis "Maison" skin. Two worlds, two interfaces.
 */

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, X, ArrowUpRight, Radio, Cpu, Link2, Radar, BookOpen, Globe, Github, MessageSquare, Map as MapIcon } from 'lucide-react'
import { useSide } from '@/lib/side-store'
import { useLiveInfo } from '@/components/nerva/live-info'

const NAV_LINKS = [
  { label: 'Overview', href: '/nerva', icon: Radio },
  { label: 'Explorer', href: '/nerva/explorer', icon: Radar, live: true },
  { label: 'Payment Links', href: '/nerva/link', icon: Link2 },
]

const ECOSYSTEM = [
  { label: 'nerva.one', href: 'https://nerva.one/', icon: Globe },
  { label: 'Docs', href: 'https://docs.nerva.one/', icon: BookOpen },
  { label: 'Explorer', href: 'https://explorer.nerva.one/', icon: Radar },
  { label: 'Node map', href: 'https://map.nerva.one/', icon: MapIcon },
  { label: 'GitHub', href: 'https://github.com/nerva-project', icon: Github },
  { label: 'Discord', href: 'https://discord.gg/ufysfvcFwe', icon: MessageSquare },
]

const INTRO_KEY = 'xv-nerva-intro-v1'

/* ── world intro: one short heartbeat per session ── */
function WorldIntro() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let seen = false
    try { seen = sessionStorage.getItem(INTRO_KEY) === '1' } catch { /* ignore */ }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!seen) {
      try { sessionStorage.setItem(INTRO_KEY, '1') } catch { /* ignore */ }
    }
    if (seen || reduce) return
    // async flip (post-paint): one short heartbeat per session
    const raf = setTimeout(() => setShow(true), 60)
    const hide = setTimeout(() => setShow(false), 1750)
    return () => { clearTimeout(raf); clearTimeout(hide) }
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.55 } }}
          className="fixed inset-0 z-[80] bg-[oklch(0.11_0.018_255)] flex flex-col items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute inset-0 circuit-bg opacity-40" />
          <motion.img
            src="/images/nerva/nerva-mark.png"
            alt=""
            initial={{ scale: 0.82, opacity: 0, filter: 'brightness(2.5)' }}
            animate={{ scale: 1, opacity: 1, filter: 'brightness(1)' }}
            transition={{ duration: 0.85, ease: [0.22, 0.61, 0.36, 1] }}
            className="relative w-20 h-20 drop-shadow-[0_0_28px_oklch(0.78_0.06_237_/_0.6)]"
          />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mt-6 font-mono text-[11px] tracking-[0.45em] uppercase text-[oklch(0.75_0.1_225)]"
          >
            Signal acquired
          </motion.div>
          {/* scan sweep */}
          <motion.div
            initial={{ y: '-100vh' }}
            animate={{ y: '100vh' }}
            transition={{ duration: 1.3, ease: 'easeInOut' }}
            className="absolute left-0 right-0 h-24"
            style={{ background: 'linear-gradient(180deg, transparent, oklch(0.78 0.06 237 / 0.08), transparent)' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── the two-world switch, Nerva side ── */
function SideSwitchPill() {
  const openGate = useSide((s) => s.openGate)
  return (
    <button
      onClick={openGate}
      title="Switch protocol side: NERVA ⇄ XELIS"
      aria-label="Switch protocol side"
      className="inline-flex items-center gap-1.5 h-6 pl-1.5 pr-2.5 rounded-full border border-white/15 hover:border-[oklch(0.78_0.06_237)]/60 bg-white/4 hover:bg-[oklch(0.78_0.06_237)]/10 transition-all group"
    >
      <img src="/images/nerva/nerva-mark.png" alt="" className="w-3.5 h-3.5 rounded-full ring-1 ring-white/25" />
      <span className="font-mono text-[9px] tracking-[0.1em] text-white/55 group-hover:text-white/85 transition-colors">⇄</span>
      <img src="/images/xelis-logo.svg" alt="XELIS" className="w-3.5 h-3.5" />
      <span className="hidden sm:inline font-mono text-[9px] uppercase tracking-[0.14em] text-white/65 group-hover:text-[oklch(0.78_0.06_237)] transition-colors">Sides</span>
    </button>
  )
}

/* ── live network heartbeat strip ── */
function HeartbeatStrip() {
  const { info } = useLiveInfo()
  const height = info?.height
  const peers = (info?.incoming_connections_count ?? 0) + (info?.outgoing_connections_count ?? 0)
  return (
    <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[oklch(0.64_0.012_250)]">
      <span className="relative mr-1.5 inline-flex h-1.5 w-1.5 align-middle">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[oklch(0.72_0.12_160)] opacity-70 animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.12_160)]" />
      </span>
      <span className="tabular-nums text-[oklch(0.78_0.06_237)]">{typeof height === 'number' ? height.toLocaleString() : '····'}</span>
      <span className="hidden sm:inline"> · mainnet · 60s blocks</span>
      <span className="hidden md:inline"> · {peers} peers</span>
    </div>
  )
}

export function NervaShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div className="nerva-world min-h-screen flex flex-col bg-background text-foreground selection:bg-[oklch(0.78_0.06_237_/_0.3)]">
      <WorldIntro />

      <motion.header
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        {/* utility strip */}
        <div className="bg-[oklch(0.12_0.018_255)] border-b border-white/6">
          <div className="mx-auto max-w-7xl px-5 md:px-8 h-8 flex items-center justify-between gap-4">
            <HeartbeatStrip />
            <nav className="flex items-center gap-4" aria-label="Utility">
              <SideSwitchPill />
              <a
                href="https://nerva.one/"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1 text-white/60 hover:text-white/90 transition-colors"
              >
                nerva.one <ArrowUpRight className="w-3 h-3 opacity-60" />
              </a>
              <a
                href="https://discord.gg/ufysfvcFwe"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1 text-white/60 hover:text-white/90 transition-colors"
              >
                Discord <ArrowUpRight className="w-3 h-3 opacity-60" />
              </a>
            </nav>
          </div>
        </div>

        {/* main bar */}
        <div
          className={`transition-all duration-300 ${
            scrolled ? 'glass-nerva py-2.5 border-b border-white/8' : 'py-4 bg-transparent'
          }`}
        >
          <div className="mx-auto max-w-7xl px-5 md:px-8 flex items-center justify-between gap-4">
            <Link href="/nerva" className="flex items-center gap-3 group shrink-0">
              <div className="relative">
                <div className="absolute -inset-2 rounded-full blur-lg opacity-30 group-hover:opacity-60 transition-opacity"
                  style={{ background: 'radial-gradient(circle, oklch(0.78 0.06 237 / 0.6), transparent 70%)' }} />
                <img
                  src="/images/nerva/nerva-mark.png"
                  alt="NERVA"
                  className="relative w-9 h-9 drop-shadow-[0_0_10px_oklch(0.78_0.06_237_/_0.35)]"
                />
              </div>
              <div className="leading-none">
                <div className="font-mono font-bold tracking-[0.24em] text-[15px] text-white">
                  NERVA
                </div>
                <div className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-[oklch(0.64_0.012_250)] mt-1">
                  XelisVault · Nerva side
                </div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1" aria-label="Main">
              {NAV_LINKS.map((l) => {
                const active = l.href === '/nerva' ? pathname === '/nerva' : pathname.startsWith(l.href)
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-[13px] font-medium transition-colors ${
                      active
                        ? 'text-[oklch(0.88_0.1_225)] bg-[oklch(0.78_0.06_237)]/10'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {l.live && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-[oklch(0.72_0.12_160)] opacity-70 animate-ping" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.12_160)]" />
                      </span>
                    )}
                    {l.label}
                  </Link>
                )
              })}
              <a
                href="https://docs.nerva.one/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                Docs <ArrowUpRight className="w-3 h-3 opacity-60" />
              </a>
            </nav>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/nerva/link"
                className="hidden sm:inline-flex h-9 items-center gap-2 rounded-md px-4 text-[13px] font-semibold bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] hover:bg-[oklch(0.7_0.08_236)] transition-colors"
              >
                <Link2 className="w-4 h-4" />
                Create payment link
              </Link>
              <button
                onClick={() => setOpen(true)}
                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/5"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="flex-1 relative">{children}</main>

      {/* footer */}
      <footer className="relative mt-20 border-t border-white/8 bg-[oklch(0.12_0.018_255)]">
        <div className="absolute inset-0 circuit-bg opacity-30 pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 md:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between gap-10">
            <div className="max-w-sm">
              <div className="flex items-center gap-2.5">
                <img src="/images/nerva/nerva-mark.png" alt="NERVA" className="w-7 h-7" />
                <span className="font-mono font-bold tracking-[0.22em] text-white text-sm">NERVA</span>
              </div>
              <p className="mt-4 text-[12.5px] leading-relaxed text-[oklch(0.64_0.012_250)]">
                The Nerva side of XelisVault: an independent interface into the NERVA
                network with live telemetry, an explorer and stateless payment links,
                all running client-side against the public explorer API. XelisVault
                holds no keys and no funds. Not affiliated with, only grateful guests
                of, the Nerva project.
              </p>
              <p className="mt-3 text-[11px] text-[oklch(0.5_0.01_250)] font-mono">
                XNV unit: 10^12 atomic units · ring size 5 · 60s blocks
              </p>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40 mb-4">This world</div>
              <ul className="space-y-2.5">
                {NAV_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[13px] text-white/65 hover:text-[oklch(0.78_0.06_237)] transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40 mb-4">NERVA ecosystem</div>
              <ul className="space-y-2.5">
                {ECOSYSTEM.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13px] text-white/65 hover:text-[oklch(0.78_0.06_237)] transition-colors">
                      {l.label} <ArrowUpRight className="w-3 h-3 opacity-50" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="font-mono text-[10px] tracking-[0.14em] text-white/35 uppercase">
              XelisVault · Two protocols, one standard: privacy
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-[oklch(0.64_0.012_250)]" />
              <span className="font-mono text-[10px] tracking-[0.14em] text-white/35 uppercase">
                One CPU, one vote · S. Nakamoto
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] md:hidden bg-[oklch(0.11_0.018_255)]/98 backdrop-blur-xl overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-5">
              <span className="font-mono font-bold tracking-[0.2em] text-white">NERVA</span>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/5"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex flex-col px-5 mt-2">
              {NAV_LINKS.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="py-3.5 text-lg font-medium border-b border-white/8 flex items-center gap-3 text-white/85"
                  >
                    {l.live && <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.12_160)] animate-pulse" />}
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/35 mt-7 mb-3">Ecosystem</div>
              {ECOSYSTEM.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 border-b border-white/8 flex items-center justify-between text-white/65"
                >
                  {l.label} <ArrowUpRight className="w-4 h-4 opacity-50" />
                </a>
              ))}
              <div className="h-10" />
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
