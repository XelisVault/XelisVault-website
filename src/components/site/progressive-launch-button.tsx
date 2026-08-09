'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Lock, Rocket } from 'lucide-react'

/**
 * Progressive Launch Button
 *
 * The button "builds itself" as we approach the launch date:
 * - Background fill grows from left to right (matching countdown progress)
 * - Lock icon's shackle lifts progressively (vault unsealing metaphor)
 * - Border solidifies from dashed to solid
 * - At 100%: lock → rocket, button glows, becomes clickable
 *
 * progress: 0 to 1 (0 = just announced, 1 = launch time)
 */

const LAUNCH_DATE = new Date('2026-08-30T14:00:00Z').getTime()
const START_DATE = new Date('2026-08-09T00:00:00Z').getTime()
const TOTAL_DURATION = LAUNCH_DATE - START_DATE

export function useLaunchProgress() {
  const [, tick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => tick(n => n + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const now = Date.now()
  const elapsed = now - START_DATE
  const progress = Math.max(0, Math.min(1, elapsed / TOTAL_DURATION))
  const isLaunched = now >= LAUNCH_DATE
  return { progress, isLaunched }
}

export function ProgressiveLaunchButton({
  progress,
  isLaunched,
  onLaunch,
}: {
  progress: number
  isLaunched: boolean
  onLaunch: () => void
}) {
  const pct = Math.round(progress * 100)

  // Lock shackle rotation: 0deg (locked) at progress=0, -90deg (open) at progress=1
  const shackleRotation = -90 * progress

  return (
    <motion.button
      onClick={isLaunched ? onLaunch : undefined}
      disabled={!isLaunched}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 1 }}
      whileHover={isLaunched ? { scale: 1.03 } : {}}
      whileTap={isLaunched ? { scale: 0.98 } : {}}
      className="group relative inline-flex h-12 items-center gap-2.5 rounded-full px-7 text-sm font-semibold transition-all overflow-hidden"
      style={{
        background: isLaunched ? 'var(--vault)' : 'oklch(0.07 0.02 280)',
        border: isLaunched
          ? '1px solid var(--vault)'
          : `1px ${progress > 0.5 ? 'solid' : 'dashed'} oklch(0.62 0.22 295 / ${0.3 + progress * 0.4})`,
        color: isLaunched ? '#fff' : 'var(--foreground)',
        cursor: isLaunched ? 'pointer' : 'not-allowed',
        boxShadow: isLaunched
          ? '0 0 36px -6px var(--vault)'
          : `0 0 ${progress * 24}px -8px var(--vault)`,
      }}
    >
      {/* Progress fill (grows from left to right) */}
      {!isLaunched && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(90deg, oklch(0.62 0.22 295 / 0.15), oklch(0.62 0.22 295 / 0.3))',
            width: `${progress * 100}%`,
            transition: 'width 0.5s ease-out',
          }}
        />
      )}

      {/* Scan line effect (subtle, only before launch) */}
      {!isLaunched && (
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, oklch(0.62 0.22 295 / 0.1), transparent)',
          }}
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      {/* Content */}
      <div className="relative flex items-center gap-2.5 z-10">
        {/* Lock / Rocket icon */}
        {isLaunched ? (
          <motion.div
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <Rocket className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          </motion.div>
        ) : (
          <div className="relative w-4 h-4 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              {/* Lock body */}
              <rect x="5" y="11" width="14" height="10" rx="2" fill={progress > 0.7 ? 'oklch(0.62 0.22 295 / 0.3)' : 'none'} stroke="currentColor" />
              {/* Shackle (rotates open as progress increases) */}
              <motion.path
                d="M 8 11 L 8 7 Q 8 4, 12 4 Q 16 4, 16 7 L 16 11"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                style={{
                  transformOrigin: '12px 11px',
                  transform: `rotate(${shackleRotation}deg)`,
                  transition: 'transform 0.5s ease-out',
                  opacity: 0.5 + progress * 0.5,
                }}
              />
            </svg>
          </div>
        )}

        {/* Text */}
        <span className="font-semibold">
          {isLaunched
            ? 'Launch App'
            : progress >= 0.95
            ? 'Almost there...'
            : `Sealing · ${pct}%`}
        </span>
      </div>

      {/* Glow ring when ready */}
      {isLaunched && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 0 0 oklch(0.62 0.22 295 / 0.4)',
              '0 0 0 8px oklch(0.62 0.22 295 / 0)',
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.button>
  )
}
