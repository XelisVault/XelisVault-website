'use client'

/**
 * The NERVA landing — the other world of XelisVault.
 *
 * Everything on this page is LIVE where it can be: network height,
 * difficulty, hashrate and the block ticker come from the public
 * NERVA explorer API, queried directly from the browser (CORS-open,
 * verified live). Everything else is the honest story of the protocol.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Radar, Link2, Cpu, Shield, EyeOff, Layers, Coins, Zap, Users,
  ArrowUpRight, ArrowRight, BookOpen, Globe, Github, MessageSquare, Map as MapIcon,
  Radio, Fingerprint, Lock, Server,
} from 'lucide-react'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'
import { useLiveInfo } from '@/components/nerva/live-info'
import { useSide } from '@/lib/side-store'
import {
  formatXnv, formatHashrate, difficultyToHashrate, estimateSupply,
  timeAgo, shortenHash, NERVA_LINKS, NERVA_CONSTANTS,
  getBlockHeadersRange, type NervaBlockHeader,
} from '@/lib/nerva/api'

/* ═══════════════════ HERO ═══════════════════ */

function LiveStat({ label, value, accent = false, sub }: { label: string; value: string; accent?: boolean; sub?: string }) {
  return (
    <div className="panel-nerva rounded-xl px-4 py-3.5 min-w-[128px] flex-1">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[oklch(0.6_0.025_250)]">{label}</div>
      <div className={`mt-1.5 font-mono font-bold tabular-nums text-[15px] sm:text-[17px] ${accent ? 'text-[oklch(0.82_0.115_215)]' : 'text-white/90'}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 font-mono text-[9.5px] text-[oklch(0.55_0.025_250)]">{sub}</div>}
    </div>
  )
}

function Hero() {
  const { info } = useLiveInfo()
  const reduce = useReducedMotion()
  const height = info?.height
  const hashrate = info ? difficultyToHashrate(info.difficulty) : null

  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden pt-28 pb-16">
      {/* atmosphere */}
      <div className="absolute inset-0 circuit-bg" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 55% at 50% -5%, oklch(0.3 0.09 265 / 0.55), transparent 70%), radial-gradient(ellipse 60% 40% at 85% 100%, oklch(0.24 0.08 290 / 0.4), transparent 70%)',
        }}
      />
      {/* orbiting signal rings around the logo */}
      {!reduce && (
        <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
          {[340, 470, 610].map((size, i) => (
            <motion.div
              key={size}
              className="absolute left-1/2 top-1/2 rounded-full border"
              style={{
                width: size, height: size,
                marginLeft: -size / 2, marginTop: -size / 2,
                borderColor: `oklch(0.82 0.115 215 / ${0.16 - i * 0.04})`,
                borderStyle: i === 1 ? 'dashed' : 'solid',
              }}
              animate={{ rotate: i % 2 ? -360 : 360 }}
              transition={{ duration: 60 + i * 30, repeat: Infinity, ease: 'linear' }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center text-center px-5 max-w-4xl mx-auto">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
          className="relative mb-8"
        >
          <div
            className="absolute -inset-10 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, oklch(0.82 0.115 215 / 0.35), oklch(0.72 0.15 290 / 0.25) 60%, transparent 75%)' }}
          />
          <img
            src="/images/nerva/nerva-mark.png"
            alt="NERVA — the CPU chip"
            className="relative w-28 h-28 sm:w-32 sm:h-32 drop-shadow-[0_0_38px_oklch(0.82_0.115_215_/_0.55)]"
            draggable={false}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.8 }}
          className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.42em] text-[oklch(0.72_0.1_240)]"
        >
          The Nerva side of XelisVault
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
          className="mt-5 text-4xl sm:text-5xl lg:text-[64px] font-bold leading-[1.04] tracking-[-0.01em] text-white max-w-3xl"
        >
          Money that cannot
          <br />
          be <span className="text-gradient-nerva">watched</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.9 }}
          className="mt-6 text-[15px] sm:text-[17px] leading-relaxed text-[oklch(0.7_0.025_250)] max-w-2xl"
        >
          NERVA is private digital cash, forked from Monero in 2018 and engineered so
          that <span className="text-white/90 font-medium">only CPUs can mine it</span> —
          no GPUs, no ASICs, no pools. Ring signatures hide the sender, RingCT hides the
          amount, one-time addresses hide the receiver. This world gives you the network
          as it happens: a live explorer, telemetry, and payment links.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.62, duration: 0.9 }}
          className="mt-9 flex flex-col sm:flex-row gap-3.5"
        >
          <Link
            href="/nerva/explorer"
            className="group inline-flex h-12 items-center justify-center gap-2.5 rounded-xl px-7 text-[14.5px] font-semibold bg-gradient-to-br from-[oklch(0.8_0.11_215)] to-[oklch(0.66_0.15_290)] text-[oklch(0.13_0.03_262)] hover:brightness-110 transition-all shadow-[0_10px_36px_-12px_oklch(0.82_0.115_215_/_0.7)]"
          >
            <Radar className="w-[18px] h-[18px]" />
            Open the live explorer
            <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/nerva/link"
            className="inline-flex h-12 items-center justify-center gap-2.5 rounded-xl px-7 text-[14.5px] font-semibold border border-white/14 bg-white/4 hover:bg-white/8 hover:border-[oklch(0.82_0.115_215)]/50 text-white/90 transition-all"
          >
            <Link2 className="w-[18px] h-[18px] text-[oklch(0.82_0.115_215)]" />
            Create a payment link
          </Link>
        </motion.div>

        {/* live stats */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.78, duration: 0.9 }}
          className="mt-12 w-full max-w-3xl"
        >
          <div className="flex flex-wrap gap-2.5 justify-center">
            <LiveStat label="Height" value={typeof height === 'number' ? height.toLocaleString() : 'syncing…'} accent />
            <LiveStat label="Network hashrate" value={hashrate ? formatHashrate(hashrate) : '…'} sub="difficulty ÷ 60s target" />
            <LiveStat label="Difficulty" value={info ? info.difficulty.toLocaleString() : '…'} />
            <LiveStat label="Transactions" value={info ? info.tx_count.toLocaleString() : '…'} />
            <LiveStat label="Block reward" value={`${NERVA_CONSTANTS.tailReward} XNV`} sub="tail emission, forever" />
            <LiveStat label="Supply ≈" value={typeof height === 'number' ? `${(estimateSupply(height) / 1e6).toFixed(2)}M XNV` : '…'} sub="18.44M + 0.3/block since 2021" />
          </div>
          <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-[oklch(0.5_0.02_255)]">
            Live from the public explorer API · refreshed every ~12s
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════ BLOCK TICKER ═══════════════════ */

function BlockTicker() {
  const [blocks, setBlocks] = useState<NervaBlockHeader[]>([])

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const tip = await import('@/lib/nerva/api').then((m) => m.getLastBlockHeader())
        if (!alive) return
        const headers = await getBlockHeadersRange(Math.max(0, tip.height - 11), tip.height)
        if (alive) setBlocks(headers.slice().reverse())
      } catch { /* offline */ }
    }
    void load()
    const id = setInterval(load, 15_000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  return (
    <div className="relative border-y border-white/8 bg-[oklch(0.11_0.025_262)] overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 z-10 w-20 bg-gradient-to-r from-[oklch(0.11_0.025_262)] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 z-10 w-20 bg-gradient-to-l from-[oklch(0.11_0.025_262)] to-transparent pointer-events-none" />
      <div className="flex items-center gap-0 py-3 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="shrink-0 pr-5 mr-4 border-r border-white/10 flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-[oklch(0.75_0.14_160)] animate-pulse" />
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[oklch(0.66_0.03_250)]">
            Chain
          </span>
        </div>
        {blocks.length === 0 && (
          <span className="font-mono text-[10px] text-[oklch(0.5_0.02_255)]">syncing blocks…</span>
        )}
        {blocks.map((b) => (
          <a
            key={b.hash}
            href={`/nerva/explorer?block=${b.hash}`}
            className="shrink-0 px-4 py-1.5 mr-2 rounded-lg border border-white/8 bg-white/[0.03] hover:border-[oklch(0.82_0.115_215)]/45 hover:bg-[oklch(0.82_0.115_215)]/8 transition-all group"
          >
            <span className="font-mono text-[11px] tabular-nums text-white/85 group-hover:text-[oklch(0.85_0.1_225)]">
              #{b.height.toLocaleString()}
            </span>
            <span className="font-mono text-[9px] text-[oklch(0.5_0.02_255)] ml-2.5">
              {shortenHash(b.hash, 4, 4)}
            </span>
            <span className="font-mono text-[9px] text-[oklch(0.55_0.04_160)] ml-2.5">
              {timeAgo(b.timestamp)}
            </span>
            {(b.num_txes ?? 0) > 0 && (
              <span className="ml-2 font-mono text-[9px] text-[oklch(0.82_0.115_215)]">
                +{b.num_txes} tx
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════ STORY ═══════════════════ */

function Story() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <Reveal>
          <SectionLabel>01 · The idea</SectionLabel>
        </Reveal>
        <div className="mt-8 grid lg:grid-cols-2 gap-14 lg:gap-20 items-start">
          <div>
            <Reveal delay={0.05}>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-bold leading-[1.08] text-white tracking-[-0.01em]">
                Proof-of-work is
                <br />
                essentially <span className="text-gradient-nerva">one-CPU-one-vote</span>
              </h2>
              <p className="mt-4 font-mono text-[11px] tracking-[0.18em] text-[oklch(0.55_0.025_250)] uppercase">
                — Satoshi Nakamoto, Bitcoin whitepaper
              </p>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-[oklch(0.72_0.025_250)]">
                <p>
                  NERVA launched on 1 May 2018 as a fork of Monero with one conviction:
                  if mining can be industrialised, money becomes centralised. GPUs, ASICs
                  and mining pools turn &ldquo;one-CPU-one-vote&rdquo; into one-datacenter-one-vote.
                  NERVA simply refuses that future.
                </p>
                <p>
                  Its CryptoNight-Adaptive v6 algorithm (hardened again in hard fork v13,
                  July 2026) is tuned to make GPUs and ASICs uncompetitive, and the
                  protocol&rsquo;s solo-mining design — every miner runs a full node —
                  makes pools unnecessary. The result is a network secured by thousands of
                  ordinary computers, naturally resistant to 51% attacks.
                </p>
                <p>
                  Privacy is inherited from the CryptoNote lineage: ring signatures, RingCT
                  and one-time addresses. An observer sees neither who sent, nor who
                  received, nor how much. The chain is a crowd, not a ledger of names.
                </p>
              </div>
            </Reveal>
          </div>

          <RevealStagger className="grid gap-4">
            <RevealItem>
              <div className="panel-nerva rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[oklch(0.82_0.115_215)]/12 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-[oklch(0.82_0.115_215)]" />
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.025_250)]">
                    The machine
                  </div>
                </div>
                <p className="mt-4 text-[13.5px] leading-relaxed text-[oklch(0.72_0.025_250)]">
                  Mine competitively with the CPU in the device you are reading this on.
                  CryptoNight-Adaptive v6, LWMA difficulty, 60-second blocks — and mining
                  requires a full local node, tying security to decentralisation.
                </p>
              </div>
            </RevealItem>
            <RevealItem>
              <div className="panel-nerva rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[oklch(0.72_0.15_290)]/14 flex items-center justify-center">
                    <EyeOff className="w-5 h-5 text-[oklch(0.78_0.13_290)]" />
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.025_250)]">
                    The privacy
                  </div>
                </div>
                <p className="mt-4 text-[13.5px] leading-relaxed text-[oklch(0.72_0.025_250)]">
                  Ring size fixed at 5, amounts encrypted with RingCT, one-time stealth
                  addresses per transaction. NERVA is private by default — there is no
                  transparent mode to opt out of.
                </p>
              </div>
            </RevealItem>
            <RevealItem>
              <div className="panel-nerva rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[oklch(0.75_0.12_160)]/12 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-[oklch(0.78_0.11_160)]" />
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.6_0.025_250)]">
                    The money
                  </div>
                </div>
                <p className="mt-4 text-[13.5px] leading-relaxed text-[oklch(0.72_0.025_250)]">
                  All ~18.44M XNV were mined by early 2021 — one of the first Monero
                  lineage coins to reach tail emission. Every block now pays 0.3 XNV
                  forever: ~432 XNV/day, ≈0.82% annual inflation, slowly shrinking.
                </p>
              </div>
            </RevealItem>
          </RevealStagger>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════ PRIVACY SECTION ═══════════════════ */

function RingVisual() {
  const reduce = useReducedMotion()
  const nodes = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2
    return { x: 50 + 38 * Math.cos(angle), y: 50 + 38 * Math.sin(angle), i }
  })
  return (
    <div className="relative w-full max-w-[300px] mx-auto aspect-square">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="38" fill="none" stroke="oklch(0.82 0.115 215 / 0.25)" strokeWidth="0.6" />
        <circle cx="50" cy="50" r="26" fill="none" stroke="oklch(0.72 0.15 290 / 0.18)" strokeWidth="0.5" strokeDasharray="2 2" />
        {nodes.map((n) => (
          <g key={n.i}>
            <circle
              cx={n.x} cy={n.y} r={n.i === 3 ? 3.2 : 2.1}
              fill={n.i === 3 ? 'oklch(0.82 0.115 215)' : 'oklch(0.6 0.03 250 / 0.5)'}
              stroke={n.i === 3 ? 'oklch(0.9 0.08 215)' : 'none'}
              strokeWidth={n.i === 3 ? 0.8 : 0}
            >
              {!reduce && (
                <animate attributeName="opacity" values="0.4;1;0.4" dur={`${2.4 + (n.i % 5) * 0.4}s`} repeatCount="indefinite" />
              )}
            </circle>
          </g>
        ))}
        {/* the true signer is unknowable — all five candidates sign identically */}
        {nodes.filter((n) => [2, 3, 4, 5, 6].includes(n.i)).map((n) => (
          <line key={`l-${n.i}`} x1="50" y1="50" x2={n.x} y2={n.y}
            stroke="oklch(0.82 0.115 215 / 0.22)" strokeWidth="0.45" strokeDasharray="1.4 1.4">
            {!reduce && (
              <animate attributeName="stroke-dashoffset" from="0" to="-5.6" dur="1.6s" repeatCount="indefinite" />
            )}
          </line>
        ))}
        <text x="50" y="50" textAnchor="middle" dy="0.35" fontSize="4.6" fill="oklch(0.85 0.03 250)" fontFamily="monospace" letterSpacing="0.5">
          ring
        </text>
      </svg>
      <div className="absolute -bottom-2 left-0 right-0 text-center font-mono text-[9px] uppercase tracking-[0.24em] text-[oklch(0.55_0.02_255)]">
        5 signers · 1 real · 0 knowledge
      </div>
    </div>
  )
}

function PrivacySection() {
  const cards = [
    {
      icon: Users,
      title: 'Ring signatures',
      body: 'Every transaction is signed by a ring of 5 possible spenders. The real signer is computationally indistinguishable from the decoys chosen automatically from the chain.',
      accent: 'oklch(0.82 0.115 215)',
    },
    {
      icon: Lock,
      title: 'RingCT amounts',
      body: 'Amounts are encrypted with Pedersen commitments. The network verifies no inflation without ever seeing a balance — sums prove out, values stay sealed.',
      accent: 'oklch(0.78_0.13_290)',
    },
    {
      icon: Fingerprint,
      title: 'One-time addresses',
      body: 'Each transfer derives a unique stealth address on the receiver side. Reuse is impossible, linkage is impossible, address books are not a thing.',
      accent: 'oklch(0.78_0.11_160)',
    },
  ]
  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-0 circuit-bg opacity-40" />
      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <Reveal>
          <SectionLabel>02 · Privacy</SectionLabel>
        </Reveal>
        <div className="mt-8 grid lg:grid-cols-[1fr_auto] gap-14 items-center">
          <div>
            <Reveal delay={0.05}>
              <h2 className="text-3xl sm:text-4xl font-bold leading-[1.1] text-white max-w-xl">
                The chain is a <span className="text-gradient-nerva">crowd</span>,
                not a ledger of names
              </h2>
            </Reveal>
            <RevealStagger className="mt-9 grid sm:grid-cols-3 gap-4">
              {cards.map((c) => (
                <RevealItem key={c.title}>
                  <div className="panel-nerva rounded-xl p-5 h-full hover:border-[oklch(0.82_0.115_215)]/30 transition-colors">
                    <c.icon className="w-5 h-5" style={{ color: c.accent }} />
                    <div className="mt-3.5 font-semibold text-[14.5px] text-white/90">{c.title}</div>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-[oklch(0.66_0.025_250)]">{c.body}</p>
                  </div>
                </RevealItem>
              ))}
            </RevealStagger>
          </div>
          <Reveal delay={0.15} className="lg:pl-6">
            <RingVisual />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════ MINING SECTION ═══════════════════ */

function MiningSection() {
  const facts = [
    { label: 'Algorithm', value: 'CryptoNight-Adaptive v6' },
    { label: 'Hard fork', value: 'v13 · July 2026 · block 4,320,000' },
    { label: 'Difficulty', value: 'LWMA — smooth retarget' },
    { label: 'Block time', value: '60 seconds' },
    { label: 'Maturity', value: 'coinbase spendable after 20 blocks' },
    { label: 'Transfers', value: 'spendable after 10 blocks' },
    { label: 'Premine', value: '1% (180,000 XNV)' },
    { label: 'Pools', value: 'deliberately pointless' },
  ]
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <Reveal>
          <SectionLabel>03 · Mining</SectionLabel>
        </Reveal>
        <div className="mt-8 grid lg:grid-cols-2 gap-14 items-center">
          <Reveal delay={0.05}>
            <div className="relative">
              {/* stylized CPU chip */}
              <div className="panel-nerva rounded-2xl p-10 sm:p-14 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 circuit-bg opacity-70" />
                <div className="absolute inset-0 scanline-nerva" />
                <div className="relative">
                  <img src="/images/nerva/nerva-mark.png" alt="" className="w-28 h-28 drop-shadow-[0_0_30px_oklch(0.82_0.115_215_/_0.6)]" />
                  {/* chip pins */}
                  <div className="absolute -left-7 top-1/2 -translate-y-1/2 flex flex-col gap-2.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="block w-4 h-0.5 rounded-full bg-[oklch(0.82_0.115_215_/_0.5)]" />
                    ))}
                  </div>
                  <div className="absolute -right-7 top-1/2 -translate-y-1/2 flex flex-col gap-2.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="block w-4 h-0.5 rounded-full bg-[oklch(0.82_0.115_215_/_0.5)]" />
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -top-3 -right-3 font-mono text-[9px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-md bg-[oklch(0.82_0.115_215)] text-[oklch(0.13_0.03_262)] font-bold">
                GPU / ASIC resistant
              </div>
            </div>
          </Reveal>
          <div>
            <Reveal delay={0.1}>
              <h2 className="text-3xl sm:text-4xl font-bold leading-[1.1] text-white">
                Secured by <span className="text-gradient-nerva">ordinary computers</span>
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-[oklch(0.72_0.025_250)]">
                CryptoNight-Adaptive is repeatedly re-tuned to whatever hardware is
                drifting towards dominance — the v6 revision in July 2026 widened the
                memory-latency gap that kills GPUs and ASICs. NERVA miners mine solo,
                through their own full node: no pool operator to trust, no hashrate
                rental market to attack you with.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4">
                {facts.map((f) => (
                  <div key={f.label} className="border-b border-white/8 pb-3">
                    <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-[oklch(0.55_0.025_250)]">{f.label}</dt>
                    <dd className="mt-1 font-mono text-[12.5px] text-white/85 tabular-nums">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════ HOW THIS WORLD WORKS ═══════════════════ */

function HowItWorks() {
  const steps = [
    {
      icon: Server,
      title: 'Read-only, key-free',
      body: 'This interface talks straight to the public NERVA explorer API (api.nerva.one) from your browser. It never holds a seed, a spend key, or a view key. There is nothing here to steal.',
    },
    {
      icon: Zap,
      title: 'Live, not cached theatre',
      body: 'Height, difficulty, blocks and the mempool are polled every few seconds — the same public feed the official explorer uses. The block ticker you saw above is the actual chain.',
    },
    {
      icon: Link2,
      title: 'Stateless payment links',
      body: 'NervaLink invoices live entirely inside their URL. The pay page watches the chain for your invoice reference (a payment id) and follows it from mempool to 10 confirmations — no account, no database, no server.',
    },
  ]
  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 0%, oklch(0.16 0.04 268 / 0.8), transparent 70%)' }} />
      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <Reveal>
          <SectionLabel>04 · How this world works</SectionLabel>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-8 text-3xl sm:text-4xl font-bold leading-[1.1] text-white max-w-2xl">
            Everything runs <span className="text-gradient-nerva">client-side</span> — nothing to hack, nothing to custody
          </h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[oklch(0.72_0.025_250)]">
            XelisVault&rsquo;s Nerva side is an independent window onto the network —
            built in the spirit of the protocol itself: no accounts, no tracking, no
            keys, no third-party scripts. Here is exactly what happens under the hood:
          </p>
        </Reveal>
        <RevealStagger className="mt-10 grid md:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <RevealItem key={s.title}>
              <div className="panel-nerva rounded-xl p-6 h-full relative overflow-hidden">
                <div className="absolute top-4 right-5 font-mono text-[34px] font-bold text-white/6 tabular-nums">
                  0{i + 1}
                </div>
                <s.icon className="w-5 h-5 text-[oklch(0.82_0.115_215)]" />
                <div className="mt-3.5 font-semibold text-[14.5px] text-white/90">{s.title}</div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[oklch(0.66_0.025_250)]">{s.body}</p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>
        <Reveal delay={0.2}>
          <div className="mt-6 panel-nerva rounded-xl p-5 border-l-2 border-l-[oklch(0.82_0.115_215)]/60">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.82_0.115_215)]">
              Honest limitations — read this
            </div>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-[oklch(0.7_0.025_250)]">
              RingCT amounts are encrypted: payment detection confirms that your
              invoice reference appeared on-chain with enough confirmations — it cannot
              read the exact amount paid. Your wallet (NervaOne or the CLI) shows the
              amount paired with the reference for final reconciliation. Recent wallet
              versions may require enabling long payment ids for URI payments — the pay
              page always offers the plain address as a fallback.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ═══════════════════ ECOSYSTEM ═══════════════════ */

function Ecosystem() {
  const items = [
    { icon: Globe, title: 'nerva.one', desc: 'Official site — downloads, exchanges, paper wallet', href: NERVA_LINKS.site },
    { icon: BookOpen, title: 'Documentation', desc: 'Guides: CLI, mining, Tor, daemon & wallet RPC', href: NERVA_LINKS.docs },
    { icon: Radar, title: 'Official explorer', desc: 'The reference block & transaction explorer', href: NERVA_LINKS.explorer },
    { icon: MapIcon, title: 'Node map', desc: 'Live geographic map of reachable nodes', href: NERVA_LINKS.nodeMap },
    { icon: Github, title: 'GitHub', desc: 'nerva-project — the C++ source of the chain', href: NERVA_LINKS.github },
    { icon: MessageSquare, title: 'Discord', desc: 'The community — help, ideas, test funds', href: NERVA_LINKS.discord },
  ]
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <Reveal>
          <SectionLabel>05 · Ecosystem</SectionLabel>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-8 text-3xl sm:text-4xl font-bold leading-[1.1] text-white">
            The wider <span className="text-gradient-nerva">NERVA</span> world
          </h2>
        </Reveal>
        <RevealStagger className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <RevealItem key={it.title}>
              <a
                href={it.href}
                target="_blank"
                rel="noreferrer"
                className="panel-nerva rounded-xl p-6 h-full block hover:border-[oklch(0.82_0.115_215)]/40 hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <it.icon className="w-5 h-5 text-[oklch(0.82_0.115_215)]" />
                  <ArrowUpRight className="w-4 h-4 text-white/25 group-hover:text-[oklch(0.82_0.115_215)] transition-colors" />
                </div>
                <div className="mt-4 font-semibold text-[14.5px] text-white/90">{it.title}</div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[oklch(0.62_0.025_250)]">{it.desc}</p>
              </a>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  )
}

/* ═══════════════════ FINAL CTA ═══════════════════ */

function FinalCTA() {
  const openGate = useSide((s) => s.openGate)
  return (
    <section className="relative py-24 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 circuit-bg opacity-50" />
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 70% at 50% 100%, oklch(0.24 0.08 285 / 0.45), transparent 70%)' }} />
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <Reveal>
          <Shield className="w-10 h-10 mx-auto text-[oklch(0.82_0.115_215)]" />
          <h2 className="mt-6 text-3xl sm:text-4xl font-bold leading-[1.12] text-white">
            Two protocols. One standard: <span className="text-gradient-nerva">privacy</span>
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[oklch(0.7_0.025_250)]">
            You are standing in the Nerva world of XelisVault. The Xelis world holds the
            confidential BlockDAG platform — xUSD, VLT, VaultSwap, the vault app itself.
            Cross back any time; the gate remembers nothing.
          </p>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="mt-9 flex flex-col sm:flex-row gap-3.5 justify-center">
            <Link
              href="/nerva/explorer"
              className="inline-flex h-12 items-center justify-center gap-2.5 rounded-xl px-7 text-[14.5px] font-semibold bg-gradient-to-br from-[oklch(0.8_0.11_215)] to-[oklch(0.66_0.15_290)] text-[oklch(0.13_0.03_262)] hover:brightness-110 transition-all"
            >
              <Radar className="w-[18px] h-[18px]" /> Live explorer
            </Link>
            <button
              onClick={openGate}
              className="inline-flex h-12 items-center justify-center gap-2.5 rounded-xl px-7 text-[14.5px] font-semibold border border-white/14 bg-white/4 hover:bg-white/8 text-white/90 transition-all"
            >
              <Layers className="w-[18px] h-[18px] text-[oklch(0.78_0.13_290)]" /> Choose your side
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ═══════════════════ PAGE ═══════════════════ */

export function Landing() {
  return (
    <>
      <Hero />
      <BlockTicker />
      <Story />
      <PrivacySection />
      <MiningSection />
      <HowItWorks />
      <Ecosystem />
      <FinalCTA />
    </>
  )
}
