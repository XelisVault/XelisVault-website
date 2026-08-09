'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

/**
 * Launch Celebration Overlay
 *
 * Plays once when the countdown reaches zero (testnet launch moment).
 * Full-screen animation: burst of particles, "TESTNET LAUNCHED" reveal,
 * vault door opening effect, then fades to reveal the normal hero.
 *
 * Plays for ~4 seconds, then calls onComplete.
 */

const BURST_PARTICLES = 40

export function LaunchCelebration({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'burst' | 'reveal' | 'fade'>('burst')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 800)
    const t2 = setTimeout(() => setPhase('fade'), 3200)
    const t3 = setTimeout(() => onComplete(), 4200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [onComplete])

  const particles = Array.from({ length: BURST_PARTICLES }, (_, i) => {
    const angle = (i / BURST_PARTICLES) * Math.PI * 2
    const distance = 200 + Math.random() * 300
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      delay: Math.random() * 0.2,
      size: 3 + Math.random() * 4,
      color: ['oklch(0.62 0.22 295)', 'oklch(0.7 0.2 320)', 'oklch(0.78 0.16 195)'][i % 3],
    }
  })

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === 'fade' ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className="fixed inset-0 z-[100] bg-background flex items-center justify-center overflow-hidden pointer-events-none"
      >
        {/* Radial glow burst */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: phase === 'burst' ? [0, 2, 3] : 4,
            opacity: phase === 'fade' ? 0 : [0, 0.8, 0.4],
          }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute w-[600px] h-[600px] rounded-full bg-vault/30 blur-[100px]"
        />

        {/* Particle burst */}
        <div className="absolute left-1/2 top-1/2">
          {phase === 'burst' && particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: p.x,
                y: p.y,
                opacity: [1, 1, 0],
                scale: [1, 0.5, 0],
              }}
              transition={{
                duration: 1.5,
                delay: p.delay,
                ease: 'easeOut',
              }}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: p.color,
                width: p.size,
                height: p.size,
                boxShadow: `0 0 8px ${p.color}`,
              }}
            />
          ))}
        </div>

        {/* Vault door opening (two halves sliding apart) */}
        <AnimatePresence>
          {phase !== 'fade' && (
            <>
              <motion.div
                initial={{ x: 0 }}
                animate={{ x: phase === 'reveal' ? '-100%' : '-30%' }}
                transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
                className="absolute left-0 top-0 bottom-0 w-1/2 bg-background border-r border-vault/30"
                style={{
                  backgroundImage: 'linear-gradient(90deg, transparent, oklch(0.62 0.22 295 / 0.05))',
                }}
              />
              <motion.div
                initial={{ x: 0 }}
                animate={{ x: phase === 'reveal' ? '100%' : '30%' }}
                transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
                className="absolute right-0 top-0 bottom-0 w-1/2 bg-background border-l border-vault/30"
                style={{
                  backgroundImage: 'linear-gradient(270deg, transparent, oklch(0.62 0.22 295 / 0.05))',
                }}
              />
            </>
          )}
        </AnimatePresence>

        {/* "TESTNET LAUNCHED" text */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 30 }}
          animate={{
            opacity: phase === 'fade' ? 0 : 1,
            scale: phase === 'burst' ? 0.5 : phase === 'reveal' ? 1 : 1.1,
            y: 0,
          }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative z-10 text-center"
        >
          {/* Logo with glow */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 150, delay: 0.3 }}
            className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-2xl overflow-hidden ring-2 ring-vault shadow-[0_0_60px_var(--vault)] mb-6"
          >
            <img
              src="/images/xelisvault-logo.png"
              alt="Xelis Vault"
              className="w-full h-full object-cover"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xs font-mono uppercase tracking-[0.4em] text-vault mb-3"
          >
            The vault is open
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="font-display text-5xl md:text-7xl font-semibold tracking-[-0.04em] leading-[1]"
          >
            <span className="text-gradient-vault">Testnet</span>
            <br />
            <span className="text-gradient-mono">Launched</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'fade' ? 0 : 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-5 py-2.5"
          >
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-emerald-400"
            />
            <span className="text-sm font-mono font-semibold text-emerald-300 uppercase tracking-wider">
              Live · Connect your wallet
            </span>
          </motion.div>
        </motion.div>

        {/* Bottom progress bar showing celebration is ending */}
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: 4, ease: 'linear' }}
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-vault origin-left"
        />
      </motion.div>
    </AnimatePresence>
  )
}
