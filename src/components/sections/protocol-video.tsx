'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Shield, Coins, Activity, Zap, Vote, Globe, Sparkles, ArrowRight } from 'lucide-react'

const SCENES = [
  {
    id: 0,
    duration: 4500,
    render: () => <SceneIntro />,
  },
  {
    id: 1,
    duration: 5000,
    render: () => <SceneProblem />,
  },
  {
    id: 2,
    duration: 5000,
    render: () => <SceneSolution />,
  },
  {
    id: 3,
    duration: 5000,
    render: () => <SceneXUSD />,
  },
  {
    id: 4,
    duration: 5000,
    render: () => <SceneOracle />,
  },
  {
    id: 5,
    duration: 5000,
    render: () => <SceneVLT />,
  },
  {
    id: 6,
    duration: 5000,
    render: () => <SceneGovernance />,
  },
  {
    id: 7,
    duration: 6000,
    render: () => <SceneFinale />,
  },
]

const TOTAL_DURATION = SCENES.reduce((acc, s) => acc + s.duration, 0)

export function ProtocolVideo() {
  const [scene, setScene] = useState(0)
  const [progress, setProgress] = useState(0)
  const [started, setStarted] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const oscillatorsRef = useRef<OscillatorNode[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start ambient music
  const startMusic = useCallback(() => {
    if (audioCtxRef.current) return
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return

    const ctx = new AudioContext()
    const masterGain = ctx.createGain()
    masterGain.gain.value = 0
    masterGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 2)
    masterGain.connect(ctx.destination)

    // Ambient pad — A minor pentatonic
    const frequencies = [110, 164.81, 220, 329.63, 440] // A2, E3, A3, E4, A4
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()

      osc.type = i % 2 === 0 ? 'sine' : 'triangle'
      osc.frequency.value = freq

      filter.type = 'lowpass'
      filter.frequency.value = 600 + i * 200
      filter.Q.value = 2

      gain.gain.value = 0
      gain.gain.linearRampToValueAtTime(0.08 / (i * 0.5 + 1), ctx.currentTime + 3)

      lfo.frequency.value = 0.2 + i * 0.08
      lfoGain.gain.value = 1.5
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      lfo.start()

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(masterGain)
      osc.start()

      oscillatorsRef.current.push(osc, lfo)
    })

    audioCtxRef.current = ctx
    masterGainRef.current = masterGain
  }, [])

  // Auto-start when section enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started) {
          setStarted(true)
          startMusic()
        }
      },
      { threshold: 0.5 }
    )
    const section = document.getElementById('protocol-video')
    if (section) observer.observe(section)
    return () => observer.disconnect()
  }, [started, startMusic])

  // Scene progression
  useEffect(() => {
    if (!started) return

    let elapsed = 0
    intervalRef.current = setInterval(() => {
      elapsed += 100
      const newProgress = (elapsed / TOTAL_DURATION) * 100

      if (newProgress >= 100) {
        // Loop
        elapsed = 0
        setScene(0)
        setProgress(0)
      } else {
        setProgress(newProgress)
        let sceneTime = 0
        for (let i = 0; i < SCENES.length; i++) {
          sceneTime += SCENES[i].duration
          if (elapsed < sceneTime) {
            setScene(i)
            break
          }
        }
      }
    }, 100)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [started])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      oscillatorsRef.current.forEach(o => { try { o.stop() } catch {} })
      if (audioCtxRef.current) audioCtxRef.current.close()
    }
  }, [])

  return (
    <section id="protocol-video" className="relative h-screen min-h-[600px] overflow-hidden bg-background flex items-center justify-center">
      {/* Background layers */}
      <div className="absolute inset-0 bg-grid opacity-10" />
      <div className="absolute inset-0 bg-noise opacity-[0.02]" />

      {/* Scene container */}
      <div className="relative w-full h-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full h-full flex items-center justify-center"
          >
            {SCENES[scene].render()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border/50">
        <motion.div
          className="h-full bg-gradient-to-r from-vault via-xusd to-vlt"
          style={{ width: `${progress}%` }}
        />
      </div>
    </section>
  )
}

// ===== SCENE 0: INTRO =====
function SceneIntro() {
  return (
    <div className="relative text-center px-4">
      {/* Animated rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-vault/20"
            initial={{ width: 100, height: 100, opacity: 0 }}
            animate={{
              width: [100, 800],
              height: [100, 800],
              opacity: [0, 0.4, 0],
            }}
            transition={{
              duration: 3,
              delay: i * 0.7,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
        className="relative w-24 h-24 md:w-32 md:h-32 mx-auto rounded-3xl overflow-hidden ring-2 ring-vault/40 shadow-[0_0_80px_-10px_var(--vault)] mb-8"
      >
        <img src="/images/xelisvault-logo.png" alt="Xelis Vault" className="w-full h-full object-cover" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="relative"
      >
        <div className="text-xs font-mono uppercase tracking-[0.4em] text-vault mb-3">v11.5 · Audit-remediated (18/18)</div>
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold tracking-[-0.04em] leading-[0.9]">
          <span className="text-gradient-mono">XELIS</span>
          <br />
          <span className="text-gradient-vault">Vault</span>
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-6 text-sm md:text-base text-muted-foreground font-mono"
        >
          Confidential Finance for the Privacy Era
        </motion.p>
      </motion.div>
    </div>
  )
}

// ===== SCENE 1: THE PROBLEM =====
function SceneProblem() {
  return (
    <div className="relative text-center px-4 max-w-3xl">
      {/* Glitch effect background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-red-500/30 font-mono text-xs"
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 0.8, 0], y: [0, -30 - i * 10], x: [(i - 4) * 40, (i - 4) * 60] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
          >
            {['0x4f9a', 'balance: 142.7', 'LTV: 49.8%', 'debt: $920', '0x9d3e', '$8,420', '0xc2b1', 'front-run'][i]}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="relative w-20 h-20 mx-auto rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400 mb-6"
      >
        <Lock className="w-10 h-10" />
        {/* Scan line */}
        <motion.div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="absolute left-0 right-0 h-px bg-red-400/60"
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative"
      >
        <div className="text-xs font-mono uppercase tracking-[0.3em] text-red-400 mb-3">The Problem</div>
        <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-tight mb-6">
          Every DeFi platform
          <br />
          <span className="text-red-400">is fully transparent.</span>
        </h2>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
          Your positions. Your strategies. Your holdings.
          <br />
          <span className="text-red-300/80">Visible to everyone.</span>
        </p>
      </motion.div>
    </div>
  )
}

// ===== SCENE 2: THE SOLUTION =====
function SceneSolution() {
  return (
    <div className="relative text-center px-4 max-w-3xl">
      {/* Encryption particles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-vault/40"
            initial={{
              x: (Math.random() - 0.5) * 600,
              y: (Math.random() - 0.5) * 400,
              opacity: 0,
            }}
            animate={{
              opacity: [0, 0.8, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="relative w-20 h-20 mx-auto rounded-2xl bg-vault/15 border border-vault/40 flex items-center justify-center text-vault mb-6 shadow-[0_0_60px_-10px_var(--vault)]"
      >
        <Shield className="w-10 h-10" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative"
      >
        <div className="text-xs font-mono uppercase tracking-[0.3em] text-vault mb-3">The Solution</div>
        <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-tight mb-6">
          <span className="text-gradient-vault">Encrypted</span>
          <br />
          by default.
        </h2>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
          Built on XELIS native homomorphic encryption.
          <br />
          <span className="text-vault">Your financial life stays private.</span>
        </p>

        {/* Feature badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          {['Encrypted balances', 'Zero-knowledge proofs', '5s finality'].map((f, i) => (
            <motion.div
              key={f}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 + i * 0.15 }}
              className="px-3 py-1.5 rounded-full glass-panel text-xs font-mono text-vault"
            >
              {f}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

// ===== SCENE 3: xUSD =====
function SceneXUSD() {
  return (
    <div className="relative text-center px-4 max-w-3xl">
      {/* Orbiting tokens */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="relative w-[400px] h-[400px]"
        >
          {[0, 120, 240].map((deg, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 w-8 h-8 -translate-x-1/2 -translate-y-1/2"
              style={{ transform: `rotate(${deg}deg) translateX(180px) rotate(-${deg}deg)` }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                className="w-full h-full rounded-full bg-xusd/20 border border-xusd/40 shadow-[0_0_20px_var(--xusd)]"
              />
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="relative w-20 h-20 mx-auto rounded-2xl overflow-hidden ring-2 ring-xusd/40 shadow-[0_0_60px_-10px_var(--xusd)] mb-6"
      >
        <img src="/images/xusd-logo.jpg" alt="xUSD" className="w-full h-full object-cover" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative"
      >
        <div className="text-xs font-mono uppercase tracking-[0.3em] text-xusd mb-3">Stablecoin</div>
        <h2 className="font-display text-5xl md:text-7xl font-semibold tracking-tight leading-none mb-4">
          <span className="text-gradient-xusd">xUSD</span>
        </h2>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-6">
          USD-pegged. Encrypted transfers.
          <br />
          Backed by XEL collateral at 150% ratio.
        </p>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-center gap-6"
        >
          {[
            { value: '$1', label: 'Peg' },
            { value: '150%', label: 'Collateral' },
            { value: '0.5%', label: 'PSM fee' },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 + i * 0.15 }}
            >
              <div className="font-display text-2xl font-semibold text-xusd">{s.value}</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

// ===== SCENE 4: ORACLE =====
function SceneOracle() {
  const providers = [12.45, 12.46, 12.44, 12.47, 12.45, 12.43]
  const median = 12.45

  return (
    <div className="relative text-center px-4 max-w-3xl">
      {/* Price chart background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
        <svg viewBox="0 0 600 200" className="w-full max-w-2xl">
          <motion.path
            d="M 0,100 L 50,90 L 100,95 L 150,80 L 200,85 L 250,70 L 300,75 L 350,60 L 400,65 L 450,50 L 500,55 L 550,40 L 600,45"
            fill="none"
            stroke="var(--vault)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, ease: 'easeInOut' }}
          />
        </svg>
      </div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="relative w-20 h-20 mx-auto rounded-2xl bg-vault/15 border border-vault/40 flex items-center justify-center text-vault mb-6"
      >
        <Activity className="w-10 h-10" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative"
      >
        <div className="text-xs font-mono uppercase tracking-[0.3em] text-vault mb-3">Decentralized Oracle</div>
        <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-tight mb-6">
          <span className="text-gradient-vault">StakedOracle</span>
        </h2>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8">
          Permissionless. Reputation-based. Median aggregation every 25 seconds.
        </p>

        {/* Price providers animation */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {providers.map((price, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.8 + i * 0.1 }}
              className={`px-3 py-2 rounded-xl border font-mono text-sm ${
                price === median
                  ? 'bg-vault/15 border-vault/40 text-vault'
                  : 'bg-card/40 border-border text-muted-foreground'
              }`}
            >
              ${price.toFixed(2)}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="mt-4 text-xs font-mono text-vault"
        >
          → Median: ${median.toFixed(2)}
        </motion.div>
      </motion.div>
    </div>
  )
}

// ===== SCENE 5: VLT =====
function SceneVLT() {
  return (
    <div className="relative text-center px-4 max-w-3xl">
      {/* Burn effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-vlt/60"
            initial={{
              x: (Math.random() - 0.5) * 300,
              y: 100,
              opacity: 0,
            }}
            animate={{
              y: [100, -200 - Math.random() * 100],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 2 + Math.random(),
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="relative w-20 h-20 mx-auto rounded-2xl bg-vlt/15 border border-vlt/40 flex items-center justify-center text-vlt mb-6 shadow-[0_0_60px_-10px_var(--vlt)]"
      >
        <Zap className="w-10 h-10" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative"
      >
        <div className="text-xs font-mono uppercase tracking-[0.3em] text-vlt mb-3">Governance Token</div>
        <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-tight mb-6">
          <span className="text-gradient-vault">VLT</span>
          <span className="text-muted-foreground text-2xl md:text-3xl ml-3">deflationary</span>
        </h2>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8">
          10M fixed supply. 50% of fees burned.
          <br />
          Supply divides by 3 in 10 years.
        </p>

        {/* Supply curve */}
        <div className="flex items-end justify-center gap-2 h-20">
          {[10, 8.5, 7, 6, 5, 4, 3].map((v, i) => (
            <motion.div
              key={i}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: `${v * 8}px`, opacity: 1 }}
              transition={{ delay: 0.8 + i * 0.1, type: 'spring' }}
              className="w-8 rounded-t bg-gradient-to-t from-vlt/20 to-vlt/80"
            >
              <div className="text-[9px] font-mono text-vlt text-center -mt-4">{v}M</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

// ===== SCENE 6: GOVERNANCE =====
function SceneGovernance() {
  return (
    <div className="relative text-center px-4 max-w-3xl">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="relative w-20 h-20 mx-auto rounded-2xl bg-vlt/15 border border-vlt/40 flex items-center justify-center text-vlt mb-6"
      >
        <Vote className="w-10 h-10" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative"
      >
        <div className="text-xs font-mono uppercase tracking-[0.3em] text-vlt mb-3">On-Chain Governance</div>
        <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-tight mb-6">
          <span className="text-gradient-vault">Community</span>
          <br />
          controlled.
        </h2>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8">
          VLT holders propose, vote, and execute.
          <br />
          5-day timelock. Guardian multisig for emergencies.
        </p>

        {/* Vote bar */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: '100%' }}
          transition={{ delay: 0.8 }}
          className="max-w-md mx-auto"
        >
          <div className="flex h-3 rounded-full overflow-hidden bg-card/60">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '72%' }}
              transition={{ delay: 1, duration: 1 }}
              className="bg-emerald-500/70"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '28%' }}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="bg-red-500/70"
            />
          </div>
          <div className="mt-2 flex justify-between text-xs font-mono">
            <span className="text-emerald-400">72% For</span>
            <span className="text-red-400">28% Against</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

// ===== SCENE 7: FINALE =====
function SceneFinale() {
  return (
    <div className="relative text-center px-4">
      {/* Burst effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              backgroundColor: ['var(--vault)', 'var(--xusd)', 'var(--vlt)'][i % 3],
            }}
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{
              x: (Math.random() - 0.5) * 800,
              y: (Math.random() - 0.5) * 600,
              opacity: [0, 1, 0],
              scale: [0, 2, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
        className="relative w-20 h-20 mx-auto rounded-2xl overflow-hidden ring-2 ring-vault/40 shadow-[0_0_80px_-10px_var(--vault)] mb-8"
      >
        <img src="/images/xelisvault-logo.png" alt="Xelis Vault" className="w-full h-full object-cover" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="relative"
      >
        <div className="text-xs font-mono uppercase tracking-[0.4em] text-vault mb-3">Privacy, proven.</div>
        <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold tracking-[-0.04em] leading-[0.9] mb-6">
          <span className="text-gradient-vault">The future</span>
          <br />
          <span className="text-gradient-mono">is private.</span>
        </h2>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-muted-foreground"
        >
          <span>51 contracts</span>
          <span className="text-vault">·</span>
          <span>966 entries</span>
          <span className="text-vault">·</span>
          <span>MIT licensed</span>
          <span className="text-vault">·</span>
          <span>v11.5</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          className="mt-8"
        >
          <a
            href="#cta"
            className="inline-flex items-center gap-2 text-sm font-semibold text-vault hover:gap-3 transition-all"
          >
            Explore the protocol
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </motion.div>
    </div>
  )
}
