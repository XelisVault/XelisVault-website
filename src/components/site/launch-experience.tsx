'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { useCountdownState, CELEBRATION_KEY } from '@/lib/countdown'
import { FinalSequenceOverlay } from '@/components/site/cinematic-countdown'
import { LaunchCelebration } from '@/components/site/launch-celebration'
import { EscalationLayer } from '@/components/site/escalation-layer'
import { EasterEggs } from '@/components/site/easter-eggs'
import { LaunchAudio } from '@/components/site/launch-audio'
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
 *                    (only for those who witnessed the countdown live)
 *
 *   Any time         EASTER EGGS — 8 hidden secrets (Konami, typed
 *                    words, idle screensaver, hidden cornerstone…)
 */

export function LaunchExperience() {
  const { isLaunched, isFinalCountdown, finalSeconds, preview } = useCountdownState()
  const [showCelebration, setShowCelebration] = useState(false)
  const [settled, setSettled] = useState(false)
  const openApp = useDemo((s) => s.openApp)
  const pathname = usePathname()
  const router = useRouter()

  // true when the visitor was on the page BEFORE T-0 (witnessed live)
  const arrivedBeforeLaunch = useRef(!isLaunched).current

  useEffect(() => {
    if (!isLaunched || settled) return
    let mode: 'ceremony' | null = null
    try {
      const url = new URL(window.location.href)
      const replay = url.searchParams.get('replay')
      if (replay === 'launch') {
        sessionStorage.removeItem(CELEBRATION_KEY)
        url.searchParams.delete('replay')
        window.history.replaceState({}, '', url.toString())
      }

      const sawCeremony = sessionStorage.getItem(CELEBRATION_KEY) === '1'

      if (replay === 'launch') {
        mode = 'ceremony'
      } else if (!sawCeremony && arrivedBeforeLaunch) {
        mode = 'ceremony'
      }
    } catch {
      // private mode etc. — only ever for live witnesses
      if (arrivedBeforeLaunch) mode = 'ceremony'
    }

    if (mode === 'ceremony') {
      setShowCelebration(true)
      try {
        sessionStorage.setItem(CELEBRATION_KEY, '1')
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

  return (
    <>
      {/* the soundtrack, synced to the same clock as the visuals */}
      <LaunchAudio ceremony={showCelebration} welcome={false} />

      {/* T-6h → T-10s, global ambient escalation (all pages) */}
      <EscalationLayer />

      {/* T-10s → full-screen final sequence, on every page */}
      <AnimatePresence>
        {isFinalCountdown && <FinalSequenceOverlay key="final-sequence" seconds={finalSeconds} />}
      </AnimatePresence>

      {/* T-0 → the vault opening, for those who witnessed it live */}
      {showCelebration && (
        <LaunchCelebration onComplete={handleCelebrationComplete} onEnterApp={enterApp} />
      )}

      {/* always, the hidden life of the site */}
      <EasterEggs />
    </>
  )
}
