'use client'

import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { useCountdownState, CELEBRATION_KEY } from '@/lib/countdown'
import { FinalSequenceOverlay } from '@/components/site/cinematic-countdown'
import { LaunchCelebration } from '@/components/site/launch-celebration'
import { useDemo } from '@/lib/demo-store'

/**
 * Global Launch Experience — mounted once in the root layout.
 *
 * Wherever the visitor is on the site when the clock strikes zero:
 *   T-10s  → the full-screen FINAL SEQUENCE ignites (giant digits,
 *            shockwaves, chromatic ticks, screen shake)
 *   T-0    → THE VAULT OPENING — the ~17s cinematic unlock sequence
 *            (bolts → wheel turn → breach → BlockDAG genesis → LIVE)
 *
 * The celebration plays once per browser session (sessionStorage),
 * and can be replayed at any time with ?replay=launch.
 */
export function LaunchExperience() {
  const { isLaunched, isFinalCountdown, finalSeconds } = useCountdownState()
  const [showCelebration, setShowCelebration] = useState(false)
  const [settled, setSettled] = useState(false)
  const openApp = useDemo((s) => s.openApp)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!isLaunched || settled) return
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.get('replay') === 'launch') {
        sessionStorage.removeItem(CELEBRATION_KEY)
        url.searchParams.delete('replay')
        window.history.replaceState({}, '', url.toString())
      }
      if (sessionStorage.getItem(CELEBRATION_KEY) !== '1') {
        setShowCelebration(true)
        sessionStorage.setItem(CELEBRATION_KEY, '1')
      }
    } catch {
      /* private mode etc. — still play once per mount */
      setShowCelebration(true)
    }
    setSettled(true)
  }, [isLaunched, settled])

  // CTA from the celebration: open the app if we're on the homepage,
  // otherwise route home and auto-open (?openApp=1).
  const enterApp = useCallback(() => {
    if (pathname === '/') {
      openApp()
    } else {
      router.push('/?openApp=1')
    }
  }, [pathname, openApp, router])

  // Stable callback — keeps the celebration's phase machine from resetting.
  const handleCelebrationComplete = useCallback(() => setShowCelebration(false), [])

  return (
    <>
      {/* T-10s → full-screen final sequence, on every page */}
      <AnimatePresence>
        {isFinalCountdown && <FinalSequenceOverlay key="final-sequence" seconds={finalSeconds} />}
      </AnimatePresence>

      {/* T-0 → the vault opening, once per session */}
      {showCelebration && (
        <LaunchCelebration
          onComplete={handleCelebrationComplete}
          onEnterApp={enterApp}
        />
      )}
    </>
  )
}
