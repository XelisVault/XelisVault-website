'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Lock,
  Unlock,
  Key,
  Skull,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Copy,
  CheckCircle2,
  Crown,
  Loader2,
} from 'lucide-react'
import { CLIENT_PUZZLES } from './client-puzzles'

const BTC_ADDRESS = 'bc1qkq2er364jvzuau862eu5jjp62u8q3hdzd5uq0s'
const BTC_EXPLORER = 'https://mempool.space/address/bc1qkq2er364jvzuau862eu5jjp62u8q3hdzd5uq0s'

const CHAPTERS = [
  { id: 1, name: 'I · Genesis', color: 'vault' },
  { id: 2, name: 'II · The Cryptography', color: 'xusd' },
  { id: 3, name: 'III · The Topology', color: 'vlt' },
  { id: 4, name: 'IV · The Combination', color: 'vault' },
  { id: 5, name: 'V · The Vault Protocol', color: 'xusd' },
  { id: 6, name: 'VI · The Reputation', color: 'vlt' },
  { id: 7, name: 'VII · The Final Vault', color: 'vault' },
]

const COLOR_MAP: Record<string, { text: string; bg: string; border: string }> = {
  vault: { text: 'text-vault', bg: 'bg-vault/15', border: 'border-vault/40' },
  xusd: { text: 'text-xusd', bg: 'bg-xusd/15', border: 'border-xusd/40' },
  vlt: { text: 'text-vlt', bg: 'bg-vlt/15', border: 'border-vlt/40' },
}

export function QuestOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [currentPuzzle, setCurrentPuzzle] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [rewards, setRewards] = useState<Record<number, string>>({})
  const [solved, setSolved] = useState<Set<number>>(new Set())
  const [showHint, setShowHint] = useState<Record<number, boolean>>({})
  const [error, setError] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [questComplete, setQuestComplete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  // focus input when puzzle changes
  useEffect(() => {
    if (open && !questComplete) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open, currentPuzzle, questComplete])

  const puzzle = CLIENT_PUZZLES[currentPuzzle]
  const isLastPuzzle = currentPuzzle === CLIENT_PUZZLES.length - 1
  const progress = (solved.size / CLIENT_PUZZLES.length) * 100
  const currentChapter = CHAPTERS.find(c => c.name === puzzle.chapter) || CHAPTERS[0]
  const chapterColor = COLOR_MAP[currentChapter.color]

  const handleAnswerChange = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentPuzzle]: value }))
    if (error) setError(false)
  }

  const submit = async () => {
    const userAnswer = (answers[currentPuzzle] || '').trim()
    if (!userAnswer || verifying) return

    setVerifying(true)
    setError(false)

    try {
      const res = await fetch('/api/quest/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puzzleId: puzzle.id, answer: userAnswer }),
      })
      const data = await res.json()

      if (data.correct) {
        setSolved(prev => new Set(prev).add(currentPuzzle))
        if (data.reward) {
          setRewards(prev => ({ ...prev, [currentPuzzle]: data.reward }))
        }
        setTimeout(() => {
          if (isLastPuzzle) {
            setQuestComplete(true)
          } else {
            setCurrentPuzzle(c => Math.min(c + 1, CLIENT_PUZZLES.length - 1))
          }
        }, 1600)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setVerifying(false)
    }
  }

  const copyAddress = () => {
    navigator.clipboard?.writeText(BTC_ADDRESS)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const goToPuzzle = (i: number) => {
    // STRICT: can only go to solved puzzles or the current (first unsolved) one
    if (solved.has(i) || i === currentPuzzle) {
      setCurrentPuzzle(i)
      setShowHint({})
    }
  }

  const restart = () => {
    setQuestComplete(false)
    setCurrentPuzzle(0)
    setAnswers({})
    setRewards({})
    setSolved(new Set())
    setShowHint({})
    setError(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="app-dark fixed inset-0 z-[85] bg-background/95 backdrop-blur-xl overflow-y-auto"
        >
          {/* Ambient background */}
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-vault/8 blur-[140px]" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-vlt/8 blur-[120px]" />
            <div className="absolute inset-0 bg-grid opacity-20" />
          </div>

          {/* STICKY BTC REWARD BANNER, always visible */}
          <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-amber-500/20">
            <div className="max-w-4xl mx-auto px-4 md:px-6 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span className="text-[10px] md:text-xs font-mono uppercase tracking-wider text-amber-400 shrink-0">
                  Reward
                </span>
                <span className="text-sm md:text-base font-display font-semibold text-amber-200 shrink-0">
                  0.5 BTC
                </span>
                <code className="hidden sm:block text-[10px] md:text-xs font-mono text-muted-foreground truncate">
                  {BTC_ADDRESS}
                </code>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={copyAddress}
                  className="w-7 h-7 rounded-md border border-border bg-card/40 hover:bg-card/80 flex items-center justify-center transition-all"
                  aria-label="Copy address"
                >
                  {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
                <a
                  href={BTC_EXPLORER}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] md:text-xs text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
                >
                  Verify <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>

          <div className="relative min-h-screen flex flex-col">
            {/* Header */}
            <header className="shrink-0 border-b border-border">
              <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-vault/15 border border-vault/30 flex items-center justify-center text-vault">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-display font-semibold tracking-tight">The Vault Quest</div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                      {questComplete ? 'completed' : `${solved.size} / ${CLIENT_PUZZLES.length} locks opened`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close quest"
                  className="w-9 h-9 rounded-full border border-border bg-card/40 hover:bg-card/80 hover:border-red-500/30 flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Progress bar */}
              <div className="h-px bg-border">
                <motion.div
                  className="h-full bg-gradient-to-r from-vault via-xusd to-vlt"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </header>

            {/* Content */}
            <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-8 md:py-12">
              {questComplete ? (
                <CompletionScreen onRestart={restart} />
              ) : (
                <div className="space-y-6">
                  {/* Chapter indicator */}
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-[10px] font-mono uppercase tracking-[0.3em] ${chapterColor.text}`}>
                      {puzzle.chapter}
                    </span>
                  </div>

                  {/* Puzzle navigation, STRICT, only solved + current accessible */}
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {CLIENT_PUZZLES.map((p, i) => {
                      const isSolved = solved.has(i)
                      const isCurrent = i === currentPuzzle
                      const isAccessible = isSolved || i === currentPuzzle
                      return (
                        <button
                          key={p.id}
                          onClick={() => goToPuzzle(i)}
                          disabled={!isAccessible}
                          className={`relative w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-[10px] md:text-xs font-mono font-bold transition-all ${
                            isSolved
                              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                              : isCurrent
                              ? `bg-vault text-white`
                              : 'bg-card/40 border border-border text-muted-foreground/60 cursor-not-allowed'
                          }`}
                          title={isAccessible ? `Puzzle ${p.id}: ${p.title}` : 'Locked, solve previous puzzles first'}
                        >
                          {isSolved ? <CheckCircle2 className="w-3 md:w-3.5 h-3 md:h-3.5" /> : isAccessible ? p.id : <Lock className="w-2.5 h-2.5" />}
                        </button>
                      )
                    })}
                  </div>

                  {/* Puzzle card */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentPuzzle}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-2xl glass-panel p-6 md:p-8"
                    >
                      {/* Title */}
                      <div className="flex items-center gap-3 mb-5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isLastPuzzle ? 'bg-red-500/15 border border-red-500/30 text-red-400' : `${chapterColor.bg} ${chapterColor.border} border ${chapterColor.text}`
                        }`}>
                          {isLastPuzzle ? <Skull className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                            Lock {puzzle.id} of {CLIENT_PUZZLES.length}
                            {puzzle.requires && (
                              <span className="ml-2 text-amber-400">· needs {puzzle.requires.length} prior</span>
                            )}
                          </div>
                          <h2 className="font-display text-xl md:text-2xl font-semibold tracking-tight">
                            {puzzle.title}
                          </h2>
                        </div>
                      </div>

                      {/* Riddle */}
                      <div className="rounded-xl bg-background/60 border border-border p-4 md:p-5 mb-5">
                        <pre className="whitespace-pre-wrap font-mono text-xs md:text-sm leading-relaxed text-foreground/90">
                          {puzzle.riddle}
                        </pre>
                      </div>

                      {/* Dependency indicator */}
                      {puzzle.requires && puzzle.requires.length > 0 && (
                        <div className="mb-4 rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-amber-400">
                            <Sparkles className="w-3 h-3" />
                            <span>This lock requires answers from: {puzzle.requires.join(', ')}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-1.5">
                            {puzzle.requires.map(reqId => {
                              const reqPuzzle = CLIENT_PUZZLES.find(p => p.id === reqId)
                              const isReqSolved = reqPuzzle && solved.has(CLIENT_PUZZLES.indexOf(reqPuzzle))
                              return (
                                <span
                                  key={reqId}
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono ${
                                    isReqSolved
                                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                                      : 'bg-card/40 border border-border text-muted-foreground'
                                  }`}
                                >
                                  {isReqSolved ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                                  #{reqId}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* NO HINTS, this is an ARG, not a quiz */}

                      {/* Input */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            ref={inputRef}
                            type="text"
                            value={answers[currentPuzzle] || ''}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !verifying && submit()}
                            placeholder="Your answer..."
                            className={`flex-1 h-12 rounded-xl border bg-background/60 px-4 text-sm font-mono focus:outline-none transition-all ${
                              error
                                ? 'border-red-500/50 bg-red-500/5'
                                : solved.has(currentPuzzle)
                                ? 'border-emerald-500/50 bg-emerald-500/5'
                                : 'border-border focus:border-vault/40'
                            }`}
                            disabled={solved.has(currentPuzzle) || verifying}
                          />
                          <button
                            onClick={submit}
                            disabled={solved.has(currentPuzzle) || !answers[currentPuzzle] || verifying}
                            className="h-12 px-5 rounded-xl bg-vault text-white font-semibold text-sm hover:bg-vault/85 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {verifying ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : solved.has(currentPuzzle) ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                Solved
                              </>
                            ) : (
                              <>
                                Submit
                                <ChevronRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>

                        {/* Error feedback */}
                        <AnimatePresence>
                          {error && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="text-xs text-red-400 font-mono flex items-center gap-1.5"
                            >
                              <X className="w-3 h-3" />
                              The vault remains sealed.
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Success feedback */}
                        <AnimatePresence>
                          {solved.has(currentPuzzle) && rewards[currentPuzzle] && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-emerald-400 font-mono flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {rewards[currentPuzzle]}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Footer note */}
                  <div className="text-center text-[10px] font-mono text-muted-foreground/60">
                    The answers are out there. Read. Decode. Explore. Discover.
                  </div>
                </div>
              )}
            </main>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CompletionScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto text-center py-8"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 120, delay: 0.2 }}
        className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-vault/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-6"
      >
        <Crown className="w-10 h-10" />
      </motion.div>

      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400 mb-3">
        Quest Complete · 20 / 20
      </div>
      <h1 className="font-display text-3xl md:text-5xl font-semibold tracking-tight mb-4">
        The vault did not open.
      </h1>
      <p className="text-muted-foreground leading-relaxed mb-6 max-w-xl mx-auto">
        And that is exactly the point. You traversed twenty locks across seven chapters.
        Each tied to a verifiable fact about the Xelis protocol.
        The final lock was the lock that cannot be picked:
        the Twisted ElGamal encryption that protects every balance on Xelis.
      </p>

      <div className="rounded-2xl glass-panel p-6 md:p-8 text-left space-y-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {[
            { chapter: 'I · Genesis', solved: 4, total: 4 },
            { chapter: 'II · Cryptography', solved: 4, total: 4 },
            { chapter: 'III · Topology', solved: 3, total: 3 },
            { chapter: 'IV · Combination', solved: 2, total: 2 },
            { chapter: 'V · Vault Protocol', solved: 4, total: 4 },
            { chapter: 'VI · Reputation', solved: 2, total: 2 },
            { chapter: 'VII · Final Vault', solved: 1, total: 1 },
          ].map((c, i) => (
            <div key={i} className="rounded-lg bg-card/40 border border-border p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{c.chapter}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-xs font-mono">{c.solved}/{c.total}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3">
          <Unlock className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-sm">What you proved</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              You understand Xelis: its genesis, its rhythm, its cap, its decimals,
              its cryptography, its topology, its vault protocol, its reputation system, and its safety model.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-vault mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-sm">What remains locked</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              The 0.5 BTC at <code className="font-mono text-vault">{BTC_ADDRESS}</code> is
              protected by the same encryption as every Xelis balance.
              Breaking it would mean breaking Xelis itself.
              That is the guarantee. That is the privacy.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-sm">The real reward</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              You now know more about Xelis than most.
              Use that knowledge. Run a miner. Stake VLT. Build on the BlockDAG.
              The real treasure is the privacy you now understand.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={onRestart}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card/40 hover:bg-card/80 px-6 text-sm font-semibold transition-all"
      >
        <Key className="w-4 h-4" />
        Restart the quest
      </button>

      <div className="mt-8 text-[10px] font-mono text-muted-foreground/60">
        XELIS Vault, Privacy, proven. Mathematics, vindicated.
      </div>
    </motion.div>
  )
}
