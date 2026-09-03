'use client'

import { motion, useInView, animate } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { useDemo } from '@/lib/demo-store'
import { useCountdownState } from '@/lib/countdown'
import { CinematicCountdown } from '@/components/site/cinematic-countdown'
import { LiveNetworkStrip } from '@/components/site/live-network-strip'
import { ProgressiveLaunchButton, useLaunchProgress } from '@/components/site/progressive-launch-button'

// NOTE: the launch celebration & the T-10s final sequence are rendered
// globally by <LaunchExperience /> (root layout) so every page ignites.

/* Count-up figure for the institutional stats band */
function Figure({ value, suffix = '', label, sub, delay = 0 }: {
  value: number
  suffix?: string
  label: string
  sub: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, {
      duration: 1.6,
      delay,
      ease: [0.21, 0.47, 0.32, 0.98],
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString('en-US')),
    })
    return () => controls.stop()
  }, [inView, value, delay])

  return (
    <div ref={ref} className="px-4 py-6 md:py-8 text-center md:text-left">
      <div className="font-display text-3xl md:text-4xl font-semibold text-gradient-vault tabular-nums tracking-[-0.02em]">
        {display}
        {suffix}
      </div>
      <div className="mt-2 text-[13px] font-medium text-foreground/85">{label}</div>
      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground mt-1">{sub}</div>
    </div>
  )
}

export function Hero() {
  const openApp = useDemo((s) => s.openApp)
  const { progress } = useLaunchProgress()
  const { isLaunched } = useCountdownState()

  return (
    <section
      id="top"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background pt-32 md:pt-36 pb-10"
    >
      {/* Background layers: ivory paper, faint ink grid, soft champagne light */}
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0 bg-paper" />
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] pointer-events-none">
        <div className="absolute inset-0 rounded-full bg-vault/8 blur-[120px]" />
      </div>

      {/* Main content: editorial two-column composition */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-[1.02fr_0.98fr] gap-12 lg:gap-16 items-center">

          {/* LEFT: the statement */}
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
            {/* Live badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className={`inline-flex items-center gap-2 px-4 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] mb-7 ${
                isLaunched
                  ? 'text-emerald-700'
                  : 'text-muted-foreground'
              }`}
            >
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`w-1.5 h-1.5 rounded-full ${isLaunched ? 'bg-emerald-500' : 'bg-vault'}`}
              />
              {isLaunched
                ? 'Testnet live · Connect your wallet'
                : 'v11.5 · 51 contracts · XELIS BlockDAG'}
            </motion.div>

            {/* Headline: the private-bank statement */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="font-display font-medium tracking-[-0.015em] leading-[1.02] text-[42px] sm:text-6xl md:text-7xl lg:text-[76px]"
            >
              <span className="block text-ink">Confidential finance,</span>
              <span className="block mt-2 italic font-light text-gradient-vault">
                held to a private-banking standard.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="mt-7 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed"
            >
              The first confidential financial platform on the XELIS BlockDAG.
              Deposit XEL, borrow xUSD, trade on VaultSwap, tokenize real-world
              assets, and govern privately, secured by native Twisted ElGamal
              encryption. Every balance encrypted. Every audit public. Every
              decision on-chain.
            </motion.p>

            {/* COUNTDOWN (when not launched) */}
            {!isLaunched && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, delay: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
                className="mt-6 mb-4 scale-[0.8] origin-center lg:origin-left"
              >
                <CinematicCountdown />
              </motion.div>
            )}

            {/* CTA row: one primary action, one quiet editorial link */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: isLaunched ? 0.75 : 1 }}
              className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-7 gap-y-4"
            >
              <ProgressiveLaunchButton
                progress={progress}
                isLaunched={isLaunched}
                onLaunch={() => openApp()}
              />
              <a
                href="#protocol"
                className="group inline-flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              >
                <span className="border-b border-foreground/25 group-hover:border-vault group-hover:text-vault transition-colors pb-0.5">
                  Explore the Protocol
                </span>
              </a>
            </motion.div>

            {/* Live network figures: a discreet editorial ticker, no boxes */}
            <div className="mt-7 lg:text-left flex justify-center lg:justify-start">
              <LiveNetworkStrip />
            </div>
          </div>

          {/* RIGHT: the framed view */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="relative hidden md:block"
          >
            {/* The framed image with gold offset border */}
            <div className="relative">
              {/* offset gold frame */}
              <div className="absolute -inset-3 rounded-[6px] border border-vault/35 pointer-events-none" />
              <div className="absolute -inset-3 translate-x-2.5 translate-y-2.5 rounded-[6px] border border-foreground/10 pointer-events-none" />

              <div className="relative aspect-[4/5] max-w-[520px] mx-auto overflow-hidden rounded-[4px] ring-1 ring-foreground/15 shadow-maison">
                <img
                  src="/images/bank/alps-hero.jpg"
                  alt="Alpine ridge in golden light: the standard of discretion and permanence"
                  className="w-full h-full object-cover animate-kenburns"
                />
                {/* Soft ink gradient at the bottom for the caption */}
                <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-oklch(0.16 0.008 80 / 0.85) via-oklch(0.16 0.008 80 / 0.45) to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-ink-foreground">
                  <div className="font-display italic text-sm opacity-90">
                    Discretion, engineered.
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] opacity-70 mt-1">
                    XELIS BlockDAG · 5-second finality
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Key figures band: hairlines only, like a financial journal */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.3 }}
          className="mt-16 md:mt-20 border-t border-b border-foreground/10 grid grid-cols-2 md:grid-cols-5"
        >
          <Figure value={51} label="Smart Contracts" sub="Silex · MIT licensed" />
          <Figure value={966} label="Entry Functions" sub="Audited surface" />
          <Figure value={5} suffix="s" label="Block Time" sub="XELIS BlockDAG" />
          <Figure value={150} suffix="%" label="Min Collateral" sub="VaultEngine" />
          <Figure value={0} label="Linkable Data Points" sub="Encrypted by default" delay={0.15} />
        </motion.div>
      </div>
    </section>
  )
}
