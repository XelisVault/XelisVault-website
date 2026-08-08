'use client'

import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { ArrowDown, Shield, Lock, Zap, Rocket, AlertCircle } from 'lucide-react'
import { useDemo } from '@/lib/demo-store'
import { CountdownTimer, useLaunchStatus } from '@/components/app/launch-gate'

export function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const openApp = useDemo((s) => s.openApp)
  const { isLaunched } = useLaunchStatus()
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (isLaunched) return
    const interval = setInterval(() => forceUpdate(n => n + 1), 1000)
    return () => clearInterval(interval)
  }, [isLaunched])

  const titleY = useTransform(scrollYProgress, [0, 1], [0, -120])
  const titleOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const logoScale = useTransform(scrollYProgress, [0, 1], [1, 1.4])
  const logoOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const subY = useTransform(scrollYProgress, [0, 1], [0, -60])

  // mouse parallax
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
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background"
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute inset-0 bg-noise opacity-[0.025]" />

      {/* Radial glow */}
      <motion.div
        style={{
          x: smx,
          y: smy,
        }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] pointer-events-none"
      >
        <div className="absolute inset-0 rounded-full bg-vault/15 blur-[120px] animate-pulse-glow" />
        <div className="absolute inset-[15%] rounded-full bg-vault/10 blur-[80px]" />
      </motion.div>

      {/* Orbital rings */}
      <motion.div
        style={{ scale: logoScale, opacity: logoOpacity }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <div className="relative w-[700px] h-[700px] md:w-[900px] md:h-[900px]">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`hero-orbit-${i}`}
              animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
              transition={{ duration: 60 + i * 30, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-vault/10"
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
      </motion.div>

      {/* Center logo */}
      <motion.div
        style={{ scale: logoScale, opacity: logoOpacity }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <div className="relative w-32 h-32 md:w-40 md:h-40">
          <div className="absolute inset-0 rounded-2xl overflow-hidden ring-1 ring-vault/30 shadow-[0_0_80px_-10px_var(--vault)]">
            <img
              src="/images/xelisvault-logo.png"
              alt="Xelis Vault"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </motion.div>

      {/* Top label */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="absolute top-24 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full glass-panel px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        v7.0 · Testnet delayed — new target Aug 30
      </motion.div>

      {/* Main content */}
      <motion.div
        style={{ y: titleY, opacity: titleOpacity }}
        className="relative z-10 max-w-5xl mx-auto px-5 text-center pt-32"
      >
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="font-display text-[44px] sm:text-6xl md:text-7xl lg:text-[88px] font-semibold tracking-[-0.04em] leading-[0.95]"
        >
          <span className="block text-gradient-mono">Confidential Finance</span>
          <span className="block mt-2 text-gradient-vault">for the Privacy Era</span>
        </motion.h1>

        <motion.p
          style={{ y: subY }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mt-7 max-w-2xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed"
        >
          The first confidential financial platform on the XELIS BlockDAG.
          Deposit XEL, borrow xUSD, trade on VaultSwap, tokenize real-world assets,
          and govern privately — secured by native Twisted ElGamal homomorphic encryption.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          {isLaunched ? (
            <button
              onClick={openApp}
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-vault px-7 text-sm font-semibold text-white hover:bg-vault/85 transition-all hover:shadow-[0_0_36px_-6px_var(--vault)]"
            >
              <Rocket className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              Launch App
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex h-12 items-center gap-3 rounded-full border border-amber-500/40 bg-amber-500/10 px-6">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-mono text-amber-200">Launch delayed — working on it</span>
              </div>
              <span className="text-xs text-muted-foreground/60 font-mono">New target: August 30, 2026 · 14:00 UTC</span>
            </div>
          )}
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
          transition={{ duration: 1, delay: 1 }}
          className="mt-16 grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto"
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
              transition={{ duration: 0.6, delay: 1.1 + i * 0.1 }}
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
        transition={{ delay: 1.5, duration: 1 }}
        style={{ opacity: titleOpacity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-xs text-muted-foreground"
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
