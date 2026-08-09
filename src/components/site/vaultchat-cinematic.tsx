'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Key, Server, Anchor, Zap, Send, Check, ArrowRight } from 'lucide-react'

/**
 * VaultChat Cinematic Animation
 *
 * Tells the story of an encrypted message from Alice to Bob in 5 acts:
 *  1. Alice types her message (typewriter effect)
 *  2. Message gets encrypted with ChaCha20-Poly1305 (ciphertext scramble)
 *  3. Encrypted message travels to the relayer network
 *  4. Relayer validates signature + stores off-chain + prepares Merkle root
 *  5. Bob receives, decrypts, reads — Merkle root anchored on-chain
 *
 * Loops continuously. Pure SVG + Framer Motion. No external assets.
 */

const ALICE_MESSAGE = 'meet me at block 148000'

const CIPHER_CHARS = '∆∇ΣΦΨαβγδλμπσ0123456789ABCDEF≈≠≡⊕⊗'.split('')

// ===== Phase definitions =====
type Phase = 'typing' | 'encrypting' | 'relaying' | 'anchoring' | 'delivered' | 'decrypting' | 'reading'

const PHASE_SEQUENCE: { phase: Phase; duration: number; label: string }[] = [
  { phase: 'typing', duration: 2200, label: '1 · Alice types' },
  { phase: 'encrypting', duration: 1800, label: '2 · ChaCha20-Poly1305' },
  { phase: 'relaying', duration: 2000, label: '3 · Relayer stores' },
  { phase: 'anchoring', duration: 1800, label: '4 · Merkle anchored' },
  { phase: 'delivered', duration: 1500, label: '5 · Routed to Bob' },
  { phase: 'decrypting', duration: 1500, label: '6 · X25519 decrypt' },
  { phase: 'reading', duration: 2000, label: '7 · Bob reads' },
]

const TOTAL_DURATION = PHASE_SEQUENCE.reduce((acc, p) => acc + p.duration, 0)

// ===== Typewriter hook =====
function useTypewriter(text: string, active: boolean, speed: number = 80) {
  const [output, setOutput] = useState('')
  useEffect(() => {
    if (!active) {
      setOutput('')
      return
    }
    let i = 0
    const interval = setInterval(() => {
      if (i <= text.length) {
        setOutput(text.slice(0, i))
        i++
      } else {
        clearInterval(interval)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, active, speed])
  return output
}

// ===== Scramble hook =====
function useScrambler(target: string, active: boolean, duration: number = 1500) {
  const [output, setOutput] = useState('')
  useEffect(() => {
    if (!active) {
      setOutput('')
      return
    }
    let frame = 0
    const totalFrames = duration / 16
    const interval = setInterval(() => {
      frame++
      const progress = frame / totalFrames
      const result = target
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' '
          const charProgress = Math.max(0, Math.min(1, progress * target.length - i))
          if (Math.random() < charProgress * 0.8) return char
          return CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)]
        })
        .join('')
      setOutput(result)
      if (frame >= totalFrames) {
        setOutput(target.split('').map(c => c === ' ' ? ' ' : CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)]).join(''))
        clearInterval(interval)
      }
    }, 16)
    return () => clearInterval(interval)
  }, [target, active, duration])
  return output
}

// ===== Node component (Alice, Relayer, Bob) =====
function Node({
  label,
  icon: Icon,
  x,
  y,
  active,
  color,
}: {
  label: string
  icon: any
  x: number
  y: number
  active: boolean
  color: string
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Glow when active */}
      <motion.circle
        cx={0}
        cy={0}
        r={32}
        fill={color}
        animate={{
          opacity: active ? [0.1, 0.3, 0.1] : 0.05,
          r: active ? [30, 36, 30] : 30,
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      {/* Outer ring */}
      <circle
        cx={0}
        cy={0}
        r={26}
        fill="oklch(0.07 0.02 280)"
        stroke={active ? color : 'oklch(1 0 0 / 0.15)'}
        strokeWidth={active ? 2 : 1}
      />
      {/* Icon */}
      <foreignObject x={-12} y={-12} width={24} height={24}>
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={active ? color : 'oklch(0.65 0.02 280)'} />
        </div>
      </foreignObject>
      {/* Label */}
      <text
        x={0}
        y={48}
        textAnchor="middle"
        fontSize={11}
        fontFamily="var(--font-jetbrains)"
        fill={active ? color : 'oklch(0.65 0.02 280)'}
        fontWeight={active ? 600 : 400}
      >
        {label}
      </text>
    </g>
  )
}

// ===== Particle traveling along a path =====
function TravelingParticle({ active, from, to, color }: { active: boolean; from: { x: number; y: number }; to: { x: number; y: number }; color: string }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.circle
          r={4}
          fill={color}
          initial={{ cx: from.x, cy: from.y, opacity: 0 }}
          animate={{
            cx: [from.x, to.x],
            cy: [from.y, to.y],
            opacity: [0, 1, 1, 0],
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 1.5,
            times: [0, 0.1, 0.9, 1],
            repeat: Infinity,
          }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      )}
    </AnimatePresence>
  )
}

// ===== Connection line =====
function ConnectionLine({ from, to, active, color }: { from: { x: number; y: number }; to: { x: number; y: number }; active: boolean; color: string }) {
  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2 - 20
  return (
    <>
      <path
        d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
        fill="none"
        stroke={active ? color : 'oklch(1 0 0 / 0.08)'}
        strokeWidth={active ? 1.5 : 1}
        strokeDasharray={active ? '4 4' : 'none'}
        strokeLinecap="round"
      />
      {active && (
        <motion.path
          d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray="6 6"
          strokeLinecap="round"
          animate={{ strokeDashoffset: [0, -24] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      )}
    </>
  )
}

// ===== Main component =====
export function VaultChatCinematic() {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => {
      const total = Date.now() - start
      setElapsed(total)
      // Find current phase
      let acc = 0
      for (let i = 0; i < PHASE_SEQUENCE.length; i++) {
        acc += PHASE_SEQUENCE[i].duration
        if (total % TOTAL_DURATION < acc) {
          setPhaseIndex(i)
          break
        }
      }
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const currentPhase = PHASE_SEQUENCE[phaseIndex].phase
  const currentLabel = PHASE_SEQUENCE[phaseIndex].label

  const typedText = useTypewriter(ALICE_MESSAGE, currentPhase === 'typing')
  const encryptedText = useScrambler(ALICE_MESSAGE, ['encrypting', 'relaying', 'anchoring', 'delivered'].includes(currentPhase), 2000)
  const decryptedText = useScrambler(ALICE_MESSAGE, currentPhase === 'decrypting', 1200)
  const bobReadText = useTypewriter(ALICE_MESSAGE, currentPhase === 'reading', 100)

  // Node positions
  const alice = { x: -180, y: 30 }
  const relayer = { x: 0, y: -50 }
  const bob = { x: 180, y: 30 }

  const isAliceActive = ['typing', 'encrypting'].includes(currentPhase)
  const isRelayerActive = ['encrypting', 'relaying', 'anchoring', 'delivered'].includes(currentPhase)
  const isBobActive = ['delivered', 'decrypting', 'reading'].includes(currentPhase)

  const ALICE_COLOR = 'oklch(0.78 0.16 195)' // xusd cyan
  const RELAYER_COLOR = 'oklch(0.62 0.22 295)' // vault purple
  const BOB_COLOR = 'oklch(0.7 0.2 320)' // vlt pink

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Phase indicator */}
      <div className="mb-6 flex items-center justify-center gap-2 flex-wrap">
        {PHASE_SEQUENCE.map((p, i) => (
          <div
            key={p.phase}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all ${
              i === phaseIndex
                ? 'bg-vault/15 text-vault border border-vault/40'
                : i < phaseIndex
                ? 'text-emerald-400/60'
                : 'text-muted-foreground/40'
            }`}
          >
            {i < phaseIndex && <Check size={10} />}
            {i === phaseIndex && (
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-1 h-1 rounded-full bg-vault"
              />
            )}
            {p.label}
          </div>
        ))}
      </div>

      {/* Main animation canvas */}
      <div className="relative rounded-2xl glass-panel p-6 md:p-8 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] rounded-full bg-vault/8 blur-[80px] pointer-events-none" />

        <svg viewBox="-260 -130 520 260" className="w-full h-auto relative">
          {/* Connections */}
          <ConnectionLine from={alice} to={relayer} active={isAliceActive || isRelayerActive} color={RELAYER_COLOR} />
          <ConnectionLine from={relayer} to={bob} active={isRelayerActive || isBobActive} color={RELAYER_COLOR} />

          {/* Traveling particles (encrypted message) */}
          <TravelingParticle
            active={['relaying', 'anchoring'].includes(currentPhase)}
            from={alice}
            to={relayer}
            color={ALICE_COLOR}
          />
          <TravelingParticle
            active={['delivered'].includes(currentPhase)}
            from={relayer}
            to={bob}
            color={BOB_COLOR}
          />

          {/* Nodes */}
          <Node label="Alice" icon={Key} x={alice.x} y={alice.y} active={isAliceActive} color={ALICE_COLOR} />
          <Node label="Relayer" icon={Server} x={relayer.x} y={relayer.y} active={isRelayerActive} color={RELAYER_COLOR} />
          <Node label="Bob" icon={Lock} x={bob.x} y={bob.y} active={isBobActive} color={BOB_COLOR} />

          {/* Alice's chat bubble */}
          {['typing', 'encrypting'].includes(currentPhase) && (
            <foreignObject x={-250} y={-110} width={140} height={70}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-xusd/30 bg-xusd/5 p-2.5"
              >
                <div className="text-[9px] font-mono text-xusd mb-1 uppercase tracking-wider">Alice · typing</div>
                <div className="font-mono text-[11px] text-foreground min-h-[28px]">
                  {currentPhase === 'typing' ? (
                    <>
                      {typedText}
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block w-1.5 h-3 bg-xusd ml-0.5 align-middle"
                      />
                    </>
                  ) : (
                    <span className="text-xusd/80 break-all">{encryptedText.slice(0, 20)}...</span>
                  )}
                </div>
              </motion.div>
            </foreignObject>
          )}

          {/* Encryption layer (between Alice and Relayer) */}
          {currentPhase === 'encrypting' && (
            <g>
              <motion.circle
                cx={(alice.x + relayer.x) / 2}
                cy={(alice.y + relayer.y) / 2 - 30}
                r={20}
                fill="none"
                stroke={RELAYER_COLOR}
                strokeWidth={1.5}
                animate={{ r: [18, 24, 18], opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <text
                x={(alice.x + relayer.x) / 2}
                y={(alice.y + relayer.y) / 2 - 26}
                textAnchor="middle"
                fontSize={10}
                fontFamily="var(--font-jetbrains)"
                fill={RELAYER_COLOR}
              >
                🔒
              </text>
            </g>
          )}

          {/* Relayer storage indicator */}
          {['relaying', 'anchoring'].includes(currentPhase) && (
            <foreignObject x={-60} y={-110} width={120} height={60}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-vault/30 bg-vault/5 p-2.5"
              >
                <div className="text-[9px] font-mono text-vault mb-1 uppercase tracking-wider">
                  {currentPhase === 'anchoring' ? 'Merkle root' : 'Storing off-chain'}
                </div>
                <div className="font-mono text-[10px] text-foreground/80 break-all">
                  {currentPhase === 'anchoring' ? '0x4f7a...2e9c' : 'sig ✓ · storing'}
                </div>
              </motion.div>
            </foreignObject>
          )}

          {/* Bob's chat bubble */}
          {['delivered', 'decrypting', 'reading'].includes(currentPhase) && (
            <foreignObject x={110} y={-110} width={140} height={70}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-vlt/30 bg-vlt/5 p-2.5"
              >
                <div className="text-[9px] font-mono text-vlt mb-1 uppercase tracking-wider">Bob · received</div>
                <div className="font-mono text-[11px] text-foreground min-h-[28px]">
                  {currentPhase === 'delivered' && (
                    <span className="text-vlt/80 break-all">{encryptedText.slice(0, 20)}...</span>
                  )}
                  {currentPhase === 'decrypting' && (
                    <span className="text-vlt/60 break-all">{decryptedText.slice(0, 20)}...</span>
                  )}
                  {currentPhase === 'reading' && (
                    <span className="text-foreground">{bobReadText || '...'}</span>
                  )}
                </div>
              </motion.div>
            </foreignObject>
          )}

          {/* On-chain anchor indicator (when anchoring) */}
          {currentPhase === 'anchoring' && (
            <g>
              <motion.rect
                x={-50}
                y={80}
                width={100}
                height={30}
                rx={6}
                fill="oklch(0.07 0.02 280)"
                stroke={RELAYER_COLOR}
                strokeWidth={1}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <text
                x={0}
                y={99}
                textAnchor="middle"
                fontSize={9}
                fontFamily="var(--font-jetbrains)"
                fill={RELAYER_COLOR}
              >
                ⛓ ON-CHAIN · 1 tx/h
              </text>
            </g>
          )}
        </svg>

        {/* Bottom: current phase description */}
        <motion.div
          key={currentPhase}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <div className="text-xs font-mono uppercase tracking-wider text-vault mb-1">
            {PHASE_SEQUENCE[phaseIndex].label}
          </div>
          <div className="text-sm text-muted-foreground">
            {currentPhase === 'typing' && 'Alice writes her message. The message is signed locally — 0 gas, 0 on-chain footprint.'}
            {currentPhase === 'encrypting' && 'ChaCha20-Poly1305 encrypts the payload with a key derived via X25519 Diffie-Hellman. Only Alice and Bob can read it.'}
            {currentPhase === 'relaying' && 'A relayer verifies Alice\'s signature, stores the encrypted message off-chain, and forwards it toward Bob.'}
            {currentPhase === 'anchoring' && 'Every hour, a relayer anchors a Merkle root of all stored messages on-chain. 1 transaction per hour for the entire protocol.'}
            {currentPhase === 'delivered' && 'The relayer routes the encrypted message to Bob. The relayer cannot read it — they only see ciphertext.'}
            {currentPhase === 'decrypting' && 'Bob uses his X25519 private key to decrypt the message. The decryption happens locally in his wallet.'}
            {currentPhase === 'reading' && 'Bob reads the plaintext. The message is now in his off-chain inbox, verifiable against the Merkle root on-chain.'}
          </div>
        </motion.div>
      </div>

      {/* Stats below */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl glass-panel p-3 text-center">
          <div className="font-display text-lg font-semibold text-gradient-vault">0</div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">gas per message</div>
        </div>
        <div className="rounded-xl glass-panel p-3 text-center">
          <div className="font-display text-lg font-semibold text-gradient-vault">1 tx/h</div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">on-chain anchor</div>
        </div>
        <div className="rounded-xl glass-panel p-3 text-center">
          <div className="font-display text-lg font-semibold text-gradient-vault">E2E</div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">encrypted always</div>
        </div>
      </div>
    </div>
  )
}
