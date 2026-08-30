'use client'

// Sealing Chamber — the privacy story as a living animation.
// Transactions drift up from the mempool as glowing envelopes; when a block
// carrying txs lands, they are pulled into the vault and sealed forever.
// Amounts are never shown — that's the whole point.

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { XelisBlock } from '@/lib/xelis/explorer'
import { Odometer } from './fx'

interface Particle {
  id: number
  x: number // % across the chamber
  bornAt: number
  kind: 'mempool' | 'seal'
}

let pid = 0

export function SealingChamber({
  blocks,
  mempoolBlips,
  sealedTotal,
  mempoolTotal,
}: {
  blocks: XelisBlock[]
  mempoolBlips: { id: number; at: number }[]
  sealedTotal: number
  mempoolTotal: number | null
}) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [flash, setFlash] = useState(0) // increments on each seal event
  const particlesRef = useRef<Particle[]>([])
  particlesRef.current = particles

  // mempool blips → rising envelopes
  useEffect(() => {
    const last = mempoolBlips[mempoolBlips.length - 1]
    if (!last) return
    const spawn: Particle[] = []
    for (let i = 0; i < 2; i++) {
      spawn.push({ id: ++pid, x: 15 + Math.random() * 70, bornAt: Date.now(), kind: 'mempool' })
    }
    setParticles((prev) => [...prev.slice(-14), ...spawn])
    const t = setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !spawn.some((s) => s.id === p.id)))
    }, 4200)
    return () => clearTimeout(t)
  }, [mempoolBlips.length])

  // new tx-bearing block → seal burst
  const prevTopHash = useRef<string | null>(null)
  useEffect(() => {
    const top = blocks[0]
    if (!top) return
    if (prevTopHash.current === null) {
      prevTopHash.current = top.hash
      return
    }
    if (top.hash === prevTopHash.current) return
    prevTopHash.current = top.hash
    const txs = top.txs_hashes?.length ?? 0
    if (txs <= 0) return

    // implosion particles: converge to the vault at center
    const burst: Particle[] = []
    for (let i = 0; i < Math.min(8, 3 + txs); i++) {
      burst.push({ id: ++pid, x: 50, bornAt: Date.now(), kind: 'seal' })
    }
    setFlash((f) => f + 1)
    setParticles((prev) => [...prev.slice(-14), ...burst])
    const t = setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !burst.some((b) => b.id === p.id)))
    }, 1800)
    return () => clearTimeout(t)
  }, [blocks])

  return (
    <div className="rounded-2xl glass-panel p-4 md:p-5 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          <Lock className="w-3.5 h-3.5 text-orange-300/80" />
          Sealing Chamber
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/60">tx lifecycle</span>
      </div>

      {/* The chamber */}
      <div className="relative flex-1 min-h-[190px] rounded-xl border border-border/60 bg-gradient-to-b from-card/30 to-[#0d0918] overflow-hidden">
        {/* scan lines */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, #a78bfa 3px, #a78bfa 4px)' }}
        />
        {/* ambient drifting dust */}
        {[...Array(5)].map((_, i) => (
          <motion.span
            key={`dust-${i}`}
            className="absolute w-1 h-1 rounded-full bg-vault/40"
            style={{ left: `${12 + i * 19}%` }}
            animate={{ y: [140, 20, 140], opacity: [0, 0.7, 0] }}
            transition={{ duration: 7 + i * 1.7, repeat: Infinity, delay: i * 1.3, ease: 'easeInOut' }}
          />
        ))}

        {/* the vault at the center */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <motion.div
              key={`flash-${flash}`}
              initial={{ scale: 0.9, boxShadow: '0 0 0px 0px rgba(251,146,60,0)' }}
              animate={{ scale: [0.9, 1.06, 1], boxShadow: ['0 0 0px 0px rgba(251,146,60,0)', '0 0 42px 10px rgba(251,146,60,0.45)', '0 0 18px 2px rgba(167,139,250,0.25)'] }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              className="w-16 h-16 rounded-2xl border-2 border-vault/50 bg-vault/10 backdrop-blur flex items-center justify-center"
            >
              <Lock className="w-7 h-7 text-vault" />
            </motion.div>
            {/* rotating ring */}
            <motion.div
              className="absolute -inset-3 rounded-full border border-dashed border-vault/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute -inset-6 rounded-full border border-vault/15"
              animate={{ rotate: -360 }}
              transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </div>

        {/* mempool zone label */}
        <div className="absolute bottom-2 left-3 text-[9px] font-mono uppercase tracking-widest text-cyan-300/60">
          mempool
        </div>
        <div className="absolute bottom-2 right-3 text-[9px] font-mono uppercase tracking-widest text-vault/50">
          sealed forever
        </div>

        {/* particles */}
        <AnimatePresence>
          {particles.map((p) =>
            p.kind === 'mempool' ? (
              <motion.span
                key={p.id}
                initial={{ opacity: 0, y: 150, x: `${p.x}%`, scale: 0.6 }}
                animate={{ opacity: [0, 1, 1, 0.6], y: [150, 90, 60, 45], scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 4, ease: 'easeOut' }}
                className="absolute w-2.5 h-2.5 rounded-sm bg-cyan-300"
                style={{ boxShadow: '0 0 10px rgba(103,232,249,0.8)', left: 0 }}
              />
            ) : (
              <motion.span
                key={p.id}
                initial={{
                  opacity: 0.9,
                  x: `${p.x}%`,
                  y: 40 + Math.random() * 60,
                  scale: 1,
                }}
                animate={{ opacity: [0.9, 1, 0], scale: 0.2 }}
                transition={{ duration: 0.9, ease: 'easeIn' }}
                className="absolute w-3 h-3 rounded-sm bg-orange-300"
                style={{ boxShadow: '0 0 14px rgba(251,146,60,0.9)', left: 0 }}
              />
            )
          )}
        </AnimatePresence>

        {/* rising beams on seal flash */}
        <AnimatePresence>
          {flash > 0 && (
            <motion.div
              key={`beam-${flash}`}
              initial={{ opacity: 0.5, scaleY: 0.2 }}
              animate={{ opacity: 0, scaleY: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
              className="absolute left-1/2 -translate-x-1/2 bottom-0 w-24 h-full pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(251,146,60,0.35), transparent 70%)' }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* counters */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2">
          <div className="text-[9px] font-mono uppercase tracking-wider text-cyan-300/80">awaiting in mempool</div>
          <div className="font-mono text-lg font-bold text-cyan-200">
            {mempoolTotal !== null ? <Odometer value={mempoolTotal} /> : '—'}
          </div>
        </div>
        <div className="rounded-lg border border-vault/25 bg-vault/5 px-3 py-2">
          <div className="text-[9px] font-mono uppercase tracking-wider text-vault/80">sealed this session</div>
          <div className="font-mono text-lg font-bold text-vault">
            <Odometer value={sealedTotal} />
          </div>
        </div>
      </div>

      <p className="mt-3 text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
        Envelopes drift in from the mempool. A block lands — they are pulled inside and encrypted
        under homomorphic Twisted ElGamal. Watch forever: you will never see an amount.
      </p>
    </div>
  )
}
