'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { CinematicCountdown } from '@/components/site/cinematic-countdown'
import { useCountdownState } from '@/lib/countdown'

// New target: August 30, 2026 at 14:00 UTC
// (delegates to the shared countdown module — single source of truth)
// NOTE: the T-10s final sequence & the unlock celebration are rendered
// globally by <LaunchExperience /> (root layout) above this gate.

export function useLaunchStatus() {
  const { msLeft, isLaunched, launchDate, preview } = useCountdownState()
  return { timeLeft: msLeft, isLaunched, launchDate, preview }
}

export function CountdownTimer({ compact = false }: { compact?: boolean }) {
  const { timeLeft, isLaunched } = useLaunchStatus()

  if (isLaunched) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2 rounded-none bg-emerald-500/15 border border-emerald-500/40 px-4 py-2"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-sm font-mono font-bold text-emerald-300 uppercase tracking-wider">
          Testnet Live
        </span>
      </motion.div>
    )
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 rounded-none glass-panel px-4 py-2">
        <span className="text-xs font-mono text-muted-foreground">New target in</span>
        <span className="text-xs font-mono font-bold text-vault">
          {days}d {hours}h {minutes}m {seconds}s
        </span>
      </div>
    )
  }

  const units = [
    { label: 'Days', value: days },
    { label: 'Hours', value: hours },
    { label: 'Minutes', value: minutes },
    { label: 'Seconds', value: seconds },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="flex flex-col items-center gap-6"
    >
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.3em] text-vault">
        Revised Launch Countdown
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        {units.map((unit, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="relative">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-none glass-panel flex items-center justify-center">
                <motion.span
                  key={unit.value}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="font-display text-3xl md:text-5xl font-semibold text-gradient-vault tabular-nums"
                >
                  {String(unit.value).padStart(2, '0')}
                </motion.span>
              </div>
              <div className="absolute inset-0 rounded-none bg-vault/5 blur-xl -z-10" />
            </div>
            <div className="mt-2 text-[10px] md:text-xs font-mono uppercase tracking-wider text-muted-foreground">
              {unit.label}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs font-mono text-muted-foreground/60">
        Revised target: August 30, 2026 · 14:00 UTC
      </div>
    </motion.div>
  )
}

export function LaunchGate({ children }: { children: React.ReactNode }) {
  const { isLaunched } = useCountdownState()
  const [showDetails, setShowDetails] = useState(false)

  if (isLaunched) return <>{children}</>

  return (
    <div className="fixed inset-0 z-[80] bg-background flex flex-col items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-vault/8 blur-[140px]" />

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
        className="relative w-24 h-24 rounded-none overflow-hidden ring-2 ring-vault/40 mb-8"
      >
        <img src="/images/xelisvault-logo.png" alt="Xelis Vault" className="w-full h-full object-cover" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative text-center mb-8 max-w-2xl"
      >
        <div className="inline-flex items-center gap-2 rounded-none bg-amber-500/15 border border-amber-500/40 px-4 py-2 mb-6">
          <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
            Testnet Launching August 30
          </span>
        </div>

        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-4">
          One more <span className="text-gradient-vault">stretch</span>
        </h1>

        <p className="text-muted-foreground leading-relaxed mb-8 text-sm md:text-base max-w-xl mx-auto">
          We promised the testnet today. We are not quite ready. Here is exactly
          what happened, what we are doing about it, and when you can expect to
          connect your wallet and start interacting with real contracts.
        </p>

        {/* Bouton cliquable pour voir les détails */}
        <motion.button
          onClick={() => setShowDetails(!showDetails)}
          className="inline-flex items-center gap-2 rounded-none border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-6 py-3 text-sm font-semibold text-amber-200 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {showDetails ? 'Hide details' : 'Read the full update'}
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </motion.button>

        {/* Panneau de détails dépliable */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
              className="overflow-hidden mt-6"
            >
              <div className="rounded-none glass-panel p-6 md:p-8 text-left space-y-5 max-w-2xl mx-auto">
                {/* Issue 1: XSWD */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                    <span className="font-mono text-[11px] tracking-wider text-amber-300">1 ·</span>
                    XSWD Protocol Integration Issues
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-7">
                    During final integration testing, we discovered that the XSWD (XELIS Secure
                    WebSocket DApp) protocol was not properly handling cross-contract call
                    permissions in certain edge cases. Wallet connections would silently fail
                    when a transaction involved multiple contract calls, which is the case for
                    nearly every VaultEngine and PSM operation. We cannot ship a wallet
                    connection that drops transactions without warning.
                  </p>
                </div>

                {/* Issue 2: Contract vulnerabilities */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-300">
                    <span className="font-mono text-[11px] tracking-wider text-amber-300">2 ·</span>
                    Critical Vulnerabilities Found in Contracts
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-7">
                    Our internal audit, conducted during final pre-launch review, identified
                    several critical issues in the deployed contracts:
                  </p>
                  <ul className="text-sm text-muted-foreground leading-relaxed pl-7 space-y-1 mt-2">
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">→</span>
                      <span><strong className="text-foreground">VaultEngine:</strong> The liquidation
                      queue could be front-run by watching the mempool, allowing attackers to
                      steal collateral before legitimate liquidators could act.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">→</span>
                      <span><strong className="text-foreground">PSM:</strong> A rounding error in
                      the fee calculation could be exploited to mint small amounts of xUSD
                      without depositing the corresponding XEL collateral.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">→</span>
                      <span><strong className="text-foreground">VaultSwapV2:</strong> The TWAP
                      oracle could be manipulated by sandwich attacks during periods of low
                      liquidity, allowing unfair swaps.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">→</span>
                      <span><strong className="text-foreground">XelisVaultMiner:</strong> The
                      heartbeat system did not properly handle chain reorganizations, which
                      could cause miners to be incorrectly slashed.</span>
                    </li>
                  </ul>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-7 mt-2">
                    These are not minor bugs. They are fundamental issues that could result in
                    loss of funds. We must fix them before launching.
                  </p>
                </div>

                {/* Issue 3: Contract redeployment */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                    <span className="font-mono text-[11px] tracking-wider text-amber-300">3 ·</span>
                    Contract Redeployment Required
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-7">
                    Fixing the above vulnerabilities requires modifying and redeploying all
                    affected contracts. This means new contract addresses, reconfiguration of
                    cross-contract references, re-testing of every entry point, and re-verification
                    on the explorer. This process is methodical and cannot be rushed.
                  </p>
                </div>

                {/* Issue 4: CLI tool */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-vault">
                    <span className="font-mono text-[11px] tracking-wider text-amber-300">4 ·</span>
                    What We're Doing Right Now
                  </div>
                  <ul className="text-sm text-muted-foreground leading-relaxed pl-7 space-y-1.5 mt-2">
                    <li className="flex items-start gap-2">
                      <span className="text-vault mt-0.5 font-mono text-xs">→</span>
                      <span>Patching all 4 contracts and redeploying on testnet</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-vault mt-0.5 font-mono text-xs">→</span>
                      <span>Rewriting the XSWD integration to handle edge cases properly</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-vault mt-0.5 font-mono text-xs">→</span>
                      <span>Building a <strong className="text-foreground">CLI tool</strong> on GitHub
                      that lets you interact with all contracts directly, deposit, borrow, swap,
                      mine, stake, without needing the web app</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-vault mt-0.5 font-mono text-xs">→</span>
                      <span>Writing a dedicated <strong className="text-foreground">miner script</strong>
                      with full setup wizard, register, stake, heartbeat, earn rewards</span>
                    </li>
                  </ul>
                </div>

                {/* Timeline */}
                <div className="rounded-none bg-vault/5 border border-vault/20 p-4 mt-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-vault mb-2">Revised Timeline</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-muted-foreground">Aug 5-15: Contract patches + redeployment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-muted-foreground">Aug 15-22: XSWD fix + CLI tool release</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-vault animate-pulse" />
                      <span className="text-vault font-semibold">Aug 30-30: Full testnet launch</span>
                    </div>
                  </div>
                </div>

                {/* Apology */}
                <div className="border-t border-border pt-4 mt-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We know you have been waiting for a long time. We also know that launching
                    broken contracts would be worse than waiting a few more weeks. The privacy
                    and security of your funds is not something we will compromise on, even if
                    it means disappointing you today.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                    The protocol is real. The contracts work. The testnet will launch on
                    August 30, 2026 at 14:00 UTC. We just need a little more time to make
                    sure everything is perfect.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed italic mt-4 border-l-2 border-vault/40 pl-3">
                    Thank you for believing in privacy.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="relative mb-8">
        <CinematicCountdown />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex flex-wrap items-center justify-center gap-3"
      >
        <a
          href="https://github.com/XelisVault/xelis-vault"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-none border border-border bg-card/40 hover:bg-card/80 hover:border-vault/40 px-5 text-sm font-semibold transition-all"
        >
          Follow progress on GitHub
        </a>
        <a
          href="https://discord.gg/UHpYAWbG"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-none bg-vault text-background px-5 text-sm font-semibold transition-all hover:bg-vault/85"
        >
          Join Discord for updates
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mt-8 text-xs font-mono text-muted-foreground/40"
      >
        The team is working around the clock · Check back soon
      </motion.div>
    </div>
  )
}
