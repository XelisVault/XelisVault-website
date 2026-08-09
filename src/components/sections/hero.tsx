'use client'

import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'
import { useRef, useEffect } from 'react'
import { ArrowDown, Shield, Lock, Zap, Rocket, Github } from 'lucide-react'
import { useDemo } from '@/lib/demo-store'
import { useLaunchStatus } from '@/components/app/launch-gate'
import { CinematicCountdown } from '@/components/site/cinematic-countdown'

export function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const openApp = useDemo((s) => s.openApp)
  const { isLaunched } = useLaunchStatus()

  const titleY = useTransform(scrollYProgress, [0, 1], [0, -80])
  const titleOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const subY = useTransform(scrollYProgress, [0, 1], [0, -40])

  // mouse parallax for background glow
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const smx = useSpring(mx, { stiffness: 80, damping: 20 })
  const smy = useSpring(my, { stiffness: 80, damping: 20 })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2
      mx.set(x * 20)
      my.set(y * 20)
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [mx, my])

  return (
    <section
      ref={ref}
      id="top"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background pt-24 pb-12"
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute inset-0 bg-noise opacity-[0.025]" />

      {/* Radial glow with mouse parallax */}
      <motion.div
        style={{ x: smx, y: smy }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] pointer-events-none"
      >
        <div className="absolute inset-0 rounded-full bg-vault/15 blur-[120px] animate-pulse-glow" />
        <div className="absolute inset-[15%] rounded-full bg-vault/10 blur-[80px]" />
      </motion.div>

      {/* Subtle orbital rings in background (behind countdown) */}
      <motion.div
        style={{ opacity: titleOpacity }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <div className="relative w-[700px] h-[700px] md:w-[1000px] md:h-[1000px] opacity-30">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`hero-orbit-${i}`}
              animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
              transition={{ duration: 80 + i * 30, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-vault/10"
              style={{ transform: `scale(${1 - i * 0.18})` }}
            >
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-vault/60"
                style={{ boxShadow: '0 0 12px var(--vault)' }}
              />
              {i === 0 && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-1 rounded-full bg-xusd/60"
                  style={{ boxShadow: '0 0 10px var(--xusd)' }}
                />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Main content */}
      <motion.div
        style={{ y: titleY, opacity: titleOpacity }}
        className="relative z-10 max-w-5xl mx-auto px-5 text-center flex flex-col items-center"
      >
        {/* Version badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="flex items-center gap-2 rounded-full glass-panel px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-vault animate-pulse" />
          v10.2 · 46 contracts · XELIS BlockDAG
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="font-display text-[40px] sm:text-6xl md:text-7xl lg:text-[80px] font-semibold tracking-[-0.04em] leading-[0.95]"
        >
          <span className="block text-gradient-mono">Confidential Finance</span>
          <span className="block mt-2 text-gradient-vault">for the Privacy Era</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          style={{ y: subY }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mt-6 max-w-2xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed"
        >
          The first confidential financial platform on the XELIS BlockDAG.
          Deposit XEL, borrow xUSD, trade on VaultSwap, tokenize real-world assets,
          and govern privately — secured by native Twisted ElGamal encryption.
        </motion.p>

        {/* THE COUNTDOWN — hero centerpiece */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mt-10 mb-6"
        >
          {isLaunched ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-3 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-8 py-4"
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2.5 h-2.5 rounded-full bg-emerald-400"
              />
              <span className="font-display text-lg font-semibold text-emerald-300">
                Testnet is LIVE — Connect your wallet
              </span>
            </motion.div>
          ) : (
            <CinematicCountdown />
          )}
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <button
            onClick={openApp}
            disabled={!isLaunched}
            className="group inline-flex h-12 items-center gap-2 rounded-full bg-vault px-7 text-sm font-semibold text-white hover:bg-vault/85 transition-all hover:shadow-[0_0_36px_-6px_var(--vault)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Rocket className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            {isLaunched ? 'Launch App' : 'Launches Aug 30'}
          </button>
          <a
            href="https://github.com/XelisVault/xelis-vault"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card/40 hover:bg-card/80 hover:border-vault/40 px-7 text-sm font-semibold transition-all"
          >
            <Github className="w-4 h-4" />
            View on GitHub
          </a>
          <a
            href="#protocol"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card/40 hover:bg-card/80 hover:border-vault/40 px-7 text-sm font-semibold transition-all"
          >
            Explore the Protocol
            <ArrowDown className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Quick pillars */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="mt-14 grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto"
        >
          {[
            { icon: Shield, label: 'Encrypted by Default', sub: 'Native homomorphic' },
            { icon: Lock, label: 'Zero-Knowledge', sub: 'Prove without revealing' },
            { icon: Zap, label: 'BlockDAG Fast', sub: '5s finality' },
          ].map((p, i) => (
            <motion.div
              key={`hero-pillar-${i}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.3 + i * 0.1 }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div className="w-10 h-10 rounded-lg glass-panel flex items-center justify-center text-vault">
                <p.icon className="w-4 h-4" />
              </div>
              <div className="text-xs md:text-sm font-medium">{p.label}</div>
              <div className="text-[10px] md:text-xs text-muted-foreground font-mono uppercase tracking-wider">
                {p.sub}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 1 }}
        style={{ opacity: titleOpacity }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-xs text-muted-foreground"
      >
        <span className="font-mono uppercase tracking-[0.3em]">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="w-5 h-9 rounded-full border border-border flex items-start justify-center p-1.5"
        >
          <div className="w-1 h-1.5 rounded-full bg-vault" />
        </motion.div>
      </motion.div>
    </section>
  )
}
