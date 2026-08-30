'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { useCountdownState, CELEBRATION_KEY, WELCOME_KEY } from '@/lib/countdown'
import { FinalSequenceOverlay } from '@/components/site/cinematic-countdown'
import { LaunchCelebration } from '@/components/site/launch-celebration'
import { WelcomeSequence } from '@/components/site/welcome-sequence'
import { EscalationLayer } from '@/components/site/escalation-layer'
import { EasterEggs } from '@/components/site/easter-eggs'
import { useDemo } from '@/lib/demo-store'

/**
 * Global Launch Experience — mounted once in the root layout.
 *
 * The full journey, wherever the visitor is on the site:
 *
 *   T-6h → T-10min   ESCALATION — ambient energy grows: particles
 *                    stream toward the vault, colors shift violet →
 *                    amber, surges & heartbeat begin (all pages)
 *   T-10s            FINAL SEQUENCE — full-screen launch theatre
 *   T-0              THE VAULT OPENING — bolts → wheel → breach →
 *                    BlockDAG genesis → THE CHAIN (blockchain line +
 *                    every protocol feature blooms) → LIVE
 *   after T-0        LATE-COMERS get their own unique welcome:
 *                    archive playback → 21-day time-rush → the
 *                    opening speedrun → the chain → "welcome to the
 *                    new era" (once per browser per week)
 *
 *   Any time         EASTER EGGS — 8 hidden secrets (Konami, typed
 *                    words, idle screensaver, hidden cornerstone…)
 */
const WELCOME_EVER_KEY = 'xv-welcome-last'
const WELCOME_COOLDOWN_MS = 7 * 24 * 3600 * 1000 // replay at most weekly

export function LaunchExperience() {
  const { isLaunched, isFinalCountdown, finalSeconds, preview } = useCountdownState()
  const [showCelebration, setShowCelebration] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [settled, setSettled] = useState(false)
  const openApp = useDemo((s) => s.openApp)
  const pathname = usePathname()
  const router = useRouter()

  // true when the visitor was on the page BEFORE T-0 (witnessed live)
  const arrivedBeforeLaunch = useRef(!isLaunched).current

  useEffect(() => {
    if (!isLaunched || settled) return
    let mode: 'ceremony' | 'welcome' | null = null
    try {
      const url = new URL(window.location.href)
      const replay = url.searchParams.get('replay')
      if (replay === 'launch') {
        sessionStorage.removeItem(CELEBRATION_KEY)
        sessionStorage.setItem(WELCOME_KEY, '1')
        url.searchParams.delete('replay')
        window.history.replaceState({}, '', url.toString())
      } else if (replay === 'welcome') {
        sessionStorage.removeItem(WELCOME_KEY)
        sessionStorage.setItem(CELEBRATION_KEY, '1')
        url.searchParams.delete('replay')
        window.history.replaceState({}, '', url.toString())
      }

      const forceWelcome = replay === 'welcome' || preview === 'welcome'
      const sawCeremony = sessionStorage.getItem(CELEBRATION_KEY) === '1'
      const sawWelcome = sessionStorage.getItem(WELCOME_KEY) === '1'

      if (replay === 'launch') {
        mode = 'ceremony'
      } else if (forceWelcome) {
        mode = 'welcome'
      } else if (!sawCeremony && !sawWelcome) {
        if (arrivedBeforeLaunch) {
          mode = 'ceremony'
        } else {
          // true late-comer — the welcome plays at most once a week
          try {
            const last = Number(localStorage.getItem(WELCOME_EVER_KEY) || '0')
            if (!last || Date.now() - last > WELCOME_COOLDOWN_MS) mode = 'welcome'
          } catch {
            mode = 'welcome'
          }
        }
      }
    } catch {
      // private mode etc. — still play the ceremony once per mount
      mode = arrivedBeforeLaunch ? 'ceremony' : 'welcome'
    }

    if (mode === 'ceremony') {
      setShowCelebration(true)
      try {
        sessionStorage.setItem(CELEBRATION_KEY, '1')
      } catch {
        /* ignore */
      }
    } else if (mode === 'welcome') {
      setShowWelcome(true)
      try {
        sessionStorage.setItem(WELCOME_KEY, '1')
        localStorage.setItem(WELCOME_EVER_KEY, String(Date.now()))
      } catch {
        /* ignore */
      }
    }
    setSettled(true)
  }, [isLaunched, settled, arrivedBeforeLaunch, preview])

  // CTA from the cinematics: open the app if we're on the homepage,
  // otherwise route home and auto-open (?openApp=1).
  const enterApp = useCallback(() => {
    if (pathname === '/') {
      openApp()
    } else {
      router.push('/?openApp=1')
    }
  }, [pathname, openApp, router])

  // Stable callbacks — keep the phase machines from resetting.
  const handleCelebrationComplete = useCallback(() => setShowCelebration(false), [])
  const handleWelcomeComplete = useCallback(() => setShowWelcome(false), [])

  return (
    <>
      {/* T-6h → T-10s — global ambient escalation (all pages) */}
      <EscalationLayer />

      {/* T-10s → full-screen final sequence, on every page */}
      <AnimatePresence>
        {isFinalCountdown && <FinalSequenceOverlay key="final-sequence" seconds={finalSeconds} />}
      </AnimatePresence>

      {/* T-0 → the vault opening, for those who witnessed it live */}
      {showCelebration && (
        <LaunchCelebration onComplete={handleCelebrationComplete} onEnterApp={enterApp} />
      )}

      {/* after T-0 → the late-comer welcome, for everyone else */}
      {showWelcome && (
        <WelcomeSequence onComplete={handleWelcomeComplete} onEnterApp={enterApp} />
      )}

      {/* always — the hidden life of the site */}
      <EasterEggs />
    </>
  )
}
