'use client'

import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useRef, useEffect } from 'react'
import { ArrowDown, Shield, Lock, Zap, Github } from 'lucide-react'
import { useDemo } from '@/lib/demo-store'
import { useCountdownState } from '@/lib/countdown'
import { CinematicCountdown } from '@/components/site/cinematic-countdown'
import { LiveNetworkStrip } from '@/components/site/live-network-strip'
import { ProgressiveLaunchButton, useLaunchProgress } from '@/components/site/progressive-launch-button'

// NOTE: the launch celebration & the T-10s final sequence are rendered
// globally by <LaunchExperience /> (root layout) so every page ignites.

export function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const openApp = useDemo((s) => s.openApp)
  const { progress } = useLaunchProgress()
  const { isLaunched } = useCountdownState()

  // mouse parallax for background glow only
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
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background pt-24 pb-16"
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

      {/* When launched: restore the beautiful hero logo + orbital rings */}
      {isLaunched && (
        <>
          {/* Center logo (restored when launched) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 150, delay: 0.2 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
          >
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 40px -10px var(--vault)',
                  '0 0 70px -10px var(--vault)',
                  '0 0 40px -10px var(--vault)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden ring-2 ring-vault/40"
            >
              <img
                src="/images/xelisvault-logo.png"
                alt="Xelis Vault"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </motion.div>

          {/* Orbital rings (restored, more visible when launched) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-50">
            <div className="relative w-[700px] h-[700px] md:w-[1000px] md:h-[1000px]">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={`hero-orbit-${i}`}
                  animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                  transition={{ duration: 60 + i * 30, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border border-vault/20"
                  style={{ transform: `scale(${1 - i * 0.18})` }}
                >
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-vault"
                    style={{ boxShadow: '0 0 20px var(--vault)' }}
                  />
                  {i === 0 && (
                    <div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-xusd"
                      style={{ boxShadow: '0 0 16px var(--xusd)' }}
                    />
                  )}
                  {i === 1 && (
                    <div
                      className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-1.5 h-1.5 rounded-full bg-vlt"
                      style={{ boxShadow: '0 0 16px var(--vlt)' }}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* When NOT launched: dimmer orbital rings behind countdown */}
      {!isLaunched && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-25">
          <div className="relative w-[700px] h-[700px] md:w-[1000px] md:h-[1000px]">
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
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 max-w-5xl mx-auto px-5 text-center flex flex-col items-center">
        {/* Version badge / Live badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className={`flex items-center gap-2 rounded-full glass-panel px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-[0.2em] mb-6 ${
            isLaunched ? 'text-emerald-400' : 'text-muted-foreground'
          }`}
        >
          <motion.span
            animate={{ opacity: isLaunched ? [0.4, 1, 0.4] : [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`w-1.5 h-1.5 rounded-full ${isLaunched ? 'bg-emerald-400' : 'bg-vault'}`}
          />
          {isLaunched
            ? 'Testnet LIVE · Connect your wallet'
            : 'v11.5 · 51 contracts · XELIS BlockDAG'}
        </motion.div>

        {/* Title — more compact before launch so the dial stays in view */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
          className={`font-display font-semibold tracking-[-0.04em] leading-[0.95] ${
            isLaunched
              ? 'text-[40px] sm:text-6xl md:text-7xl lg:text-[80px]'
              : 'text-[36px] sm:text-5xl md:text-6xl lg:text-[64px]'
          }`}
        >
          <span className="block text-gradient-mono">Confidential Finance</span>
          <span className="block mt-2 text-gradient-vault">for the Privacy Era</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mt-6 max-w-2xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed"
        >
          The first confidential financial platform on the XELIS BlockDAG.
          Deposit XEL, borrow xUSD, trade on VaultSwap, tokenize real-world assets,
          and govern privately — secured by native Twisted ElGamal encryption.
        </motion.p>

        {/* COUNTDOWN (when not launched) — with logo in the ring */}
        {!isLaunched && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="mt-6 mb-4 scale-[0.85] [@media(min-height:950px)]:scale-95 [@media(min-height:1080px)]:scale-100"
          >
            <CinematicCountdown />
          </motion.div>
        )}

        {/* CTA buttons — progressive launch button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: isLaunched ? 0.8 : 1 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-3"
        >
          <ProgressiveLaunchButton
            progress={progress}
            isLaunched={isLaunched}
            onLaunch={openApp}
          />
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

        {/* Live network strip — real on-chain numbers from the public testnet */}
        <div className="mt-6">
          <LiveNetworkStrip />
        </div>

        {/* Quick pillars */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="mt-10 grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto"
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
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 1 }}
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
