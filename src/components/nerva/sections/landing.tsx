'use client'

/**
 * The NERVA landing: the other world of XelisVault.
 *
 * Design language: editorial, flat, photography-led. The NERVA brand
 * palette (steel blue, mauve) on deep navy. Real duotone photography,
 * sharp 6px corners, honest copy. Everything live where it can be:
 * network height, difficulty, hashrate and the block ticker come from
 * the public NERVA explorer API, queried directly from the browser.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Radar, Link2, Cpu, Shield, EyeOff, Users, Lock, Fingerprint,
  ArrowUpRight, ArrowRight, BookOpen, Globe, Github, MessageSquare,
  Map as MapIcon, Radio, Layers, Server, Zap, KeyRound, Eye,
} from 'lucide-react'
import { Reveal, RevealStagger, RevealItem, SectionLabel } from '@/components/site/reveal'
import { useLiveInfo } from '@/components/nerva/live-info'
import { useSide } from '@/lib/side-store'
import {
  formatXnv, formatHashrate, difficultyToHashrate, estimateSupply,
  timeAgo, shortenHash, NERVA_LINKS, NERVA_CONSTANTS,
  getBlockHeadersRange, type NervaBlockHeader,
} from '@/lib/nerva/api'

/* Shared button styles: solid steel, sharp corners, no gradients. */
const BTN_PRIMARY =
  'inline-flex h-11 items-center justify-center gap-2 rounded-md px-6 text-[14px] font-semibold bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] hover:bg-[oklch(0.7_0.08_236)] transition-colors'
const BTN_SECONDARY =
  'inline-flex h-11 items-center justify-center gap-2 rounded-md px-6 text-[14px] font-medium border border-[oklch(0.92_0.008_250/0.2)] text-white/85 hover:border-[oklch(0.78_0.06_237/0.55)] hover:bg-white/[0.04] transition-colors'

/* A captioned photograph: the anti-AI signal. Real hardware, real grain. */
function Figure({ src, alt, caption, ratio = 'aspect-[4/3]', className = '' }: {
  src: string; alt: string; caption: string; ratio?: string; className?: string
}) {
  return (
    <figure className={`border border-[oklch(0.92_0.008_250/0.12)] rounded-md overflow-hidden bg-[oklch(0.17_0.02_252)] ${className}`}>
      <img src={src} alt={alt} className={`w-full ${ratio} object-cover`} loading="lazy" draggable={false} />
      <figcaption className="px-3.5 py-2.5 border-t border-[oklch(0.92_0.008_250/0.1)] font-mono text-[9.5px] uppercase tracking-[0.14em] text-[oklch(0.57_0.012_250)]">
        {caption}
      </figcaption>
    </figure>
  )
}

/* ═══════════════════ HERO ═══════════════════ */

function LiveCell({ label, value, accent = false, sub }: { label: string; value: string; accent?: boolean; sub?: string }) {
  return (
    <div className="px-4 py-3.5 min-w-0">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[oklch(0.57_0.012_250)] truncate">{label}</div>
      <div className={`mt-1 font-mono font-semibold tabular-nums text-[15px] ${accent ? 'text-[oklch(0.78_0.06_237)]' : 'text-white/90'}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 font-mono text-[9px] text-[oklch(0.52_0.01_250)] truncate">{sub}</div>}
    </div>
  )
}

function Hero() {
  const { info } = useLiveInfo()
  const reduce = useReducedMotion()
  const height = info?.height
  const hashrate = info ? difficultyToHashrate(info.difficulty) : null

  return (
    <section className="relative min-h-[92vh] flex flex-col justify-end overflow-hidden">
      {/* real photography: PCB macro, duotone navy/steel */}
      <motion.img
        src="/images/nerva/photo-pcb.jpg"
        alt=""
        aria-hidden="true"
        initial={reduce ? { scale: 1 } : { scale: 1.05 }}
        animate={reduce ? { scale: 1 } : { scale: 1 }}
        transition={{ duration: 2.2, ease: 'easeOut' }}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      {/* legibility washes, flat */}
      <div className="absolute inset-0 bg-[oklch(0.14_0.018_255/0.72)]" />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, oklch(0.14 0.018 255 / 0.55) 0%, transparent 30%, oklch(0.14 0.018 255 / 0.88) 100%)' }}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 md:px-8 pt-32 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="flex flex-wrap items-center gap-3"
        >
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[oklch(0.78_0.06_237)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[oklch(0.72_0.12_160)] opacity-70 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.12_160)]" />
            </span>
            XelisVault · Nerva world
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40 tabular-nums">
            live · block {typeof height === 'number' ? height.toLocaleString() : 'syncing'}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          className="mt-6 text-4xl sm:text-5xl lg:text-[56px] font-bold leading-[1.05] tracking-[-0.015em] text-white max-w-3xl"
        >
          Private cash, mined on{' '}
          <span className="text-[oklch(0.78_0.06_237)]">ordinary computers</span>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-6 text-[15px] sm:text-[16.5px] leading-relaxed text-[oklch(0.78_0.012_250)] max-w-2xl"
        >
          NERVA is digital cash forked from Monero in 2018, engineered so that only CPUs
          can mine it: no GPUs, no ASICs, no pools. Ring signatures hide the sender,
          RingCT hides the amount, one-time addresses hide the receiver. This world is
          your window onto the network, with a live explorer, telemetry and payment links.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52, duration: 0.8 }}
          className="mt-9 flex flex-col sm:flex-row gap-3"
        >
          <Link href="/nerva/explorer" className={BTN_PRIMARY}>
            <Radar className="w-[17px] h-[17px]" />
            Open the block explorer
            <ArrowRight className="w-4 h-4 opacity-60" />
          </Link>
          <Link href="/nerva/link" className={BTN_SECONDARY}>
            <Link2 className="w-[17px] h-[17px] text-[oklch(0.78_0.06_237)]" />
            Create a payment link
          </Link>
        </motion.div>

        {/* live network bar: one flat strip, divided cells */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.66, duration: 0.8 }}
          className="mt-12 border border-[oklch(0.92_0.008_250/0.14)] rounded-md overflow-hidden bg-[oklch(0.16_0.02_252/0.85)] backdrop-blur-sm max-w-4xl"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <LiveCell label="Height" value={typeof height === 'number' ? height.toLocaleString() : '…'} accent />
            <LiveCell label="Hashrate" value={hashrate ? formatHashrate(hashrate) : '…'} sub="difficulty ÷ 60s" />
            <LiveCell label="Difficulty" value={info ? info.difficulty.toLocaleString() : '…'} />
            <LiveCell label="Transactions" value={info ? info.tx_count.toLocaleString() : '…'} sub="all time" />
            <LiveCell label="Reward" value={`${NERVA_CONSTANTS.tailReward} XNV`} sub="per block, forever" />
            <LiveCell
              label="Supply"
              value={typeof height === 'number' ? `${(estimateSupply(height) / 1e6).toFixed(2)}M` : '…'}
              sub="XNV, tail emission"
            />
          </div>
          <div className="border-t border-[oklch(0.92_0.008_250/0.1)] px-4 py-2 font-mono text-[8.5px] uppercase tracking-[0.2em] text-[oklch(0.5_0.01_250)]">
            Live from the public explorer API · refreshed every ~12s · no server in between
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
    <div className="relative border-y border-[oklch(0.92_0.008_250/0.1)] bg-[oklch(0.12_0.018_255)] overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-r from-[oklch(0.12_0.018_255)] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-l from-[oklch(0.12_0.018_255)] to-transparent pointer-events-none" />
      <div className="flex items-center gap-0 py-2.5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="shrink-0 pr-5 mr-4 border-r border-[oklch(0.92_0.008_250/0.12)] flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-[oklch(0.72_0.12_160)]" />
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[oklch(0.6_0.012_250)]">Chain</span>
        </div>
        {blocks.length === 0 && (
          <span className="font-mono text-[10px] text-[oklch(0.5_0.01_250)]">syncing blocks…</span>
        )}
        {blocks.map((b) => (
          <a
            key={b.hash}
            href={`/nerva/explorer?block=${b.hash}`}
            className="shrink-0 px-3.5 py-1.5 mr-2 rounded-sm border border-[oklch(0.92_0.008_250/0.1)] bg-white/[0.02] hover:border-[oklch(0.78_0.06_237/0.5)] hover:bg-white/[0.05] transition-colors group"
          >
            <span className="font-mono text-[11px] tabular-nums text-white/85 group-hover:text-[oklch(0.83_0.055_237)]">
              #{b.height.toLocaleString()}
            </span>
            <span className="font-mono text-[9px] text-[oklch(0.5_0.01_250)] ml-2.5">{shortenHash(b.hash, 4, 4)}</span>
            <span className="font-mono text-[9px] text-[oklch(0.55_0.03_160)] ml-2.5">{timeAgo(b.timestamp)}</span>
            {(b.num_txes ?? 0) > 0 && (
              <span className="ml-2 font-mono text-[9px] text-[oklch(0.78_0.06_237)]">+{b.num_txes} tx</span>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════ STORY ═══════════════════ */

function Story() {
  const facts = [
    ['Launched', '1 May 2018'],
    ['Forked from', 'Monero (CryptoNote)'],
    ['Algorithm', 'CryptoNight-Adaptive v6'],
    ['Supply', '~18.44M XNV mined by early 2021'],
    ['Emission', '0.3 XNV per block, forever'],
    ['Premine', '1% (180,000 XNV)'],
  ]
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <Reveal>
          <SectionLabel>01 · The idea</SectionLabel>
        </Reveal>
        <div className="mt-8 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-start">
          <div>
            <Reveal delay={0.05}>
              <h2 className="text-3xl sm:text-4xl font-bold leading-[1.1] text-white tracking-[-0.01em]">
                Proof-of-work is essentially{' '}
                <span className="text-[oklch(0.78_0.06_237)]">one-CPU-one-vote</span>
              </h2>
              <div className="mt-4 pl-4 border-l-2 border-[oklch(0.78_0.06_237/0.5)]">
                <p className="font-mono text-[11px] tracking-[0.16em] text-[oklch(0.55_0.012_250)] uppercase">
                  Satoshi Nakamoto · Bitcoin whitepaper
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-[oklch(0.75_0.012_250)]">
                <p>
                  NERVA launched on 1 May 2018 as a fork of Monero built on a single
                  conviction: when mining can be industrialised, money becomes
                  centralised. GPUs, ASICs and mining pools quietly turn
                  one-CPU-one-vote into one-datacenter-one-vote. NERVA simply refuses
                  that future.
                </p>
                <p>
                  Its CryptoNight-Adaptive algorithm is re-tuned whenever hardware
                  starts drifting toward dominance. The v6 revision, activated in hard
                  fork v13, widens the memory-latency gap that keeps GPUs and ASICs
                  unprofitable. Miners work solo through their own full node, so there
                  is no pool operator to trust and no hashrate rental market to fear.
                </p>
                <p>
                  Privacy is inherited from the CryptoNote lineage. Ring signatures,
                  RingCT and one-time addresses mean an observer sees neither who sent,
                  nor who received, nor how much. The chain is a crowd, not a ledger
                  of names.
                </p>
              </div>
            </Reveal>
          </div>

          <div className="space-y-6">
            <Reveal delay={0.1}>
              <Figure
                src="/images/nerva/photo-datacenter.jpg"
                alt="Rows of industrial server racks in a datacenter corridor"
                caption="Industrial racks: the centralisation NERVA is built against"
              />
            </Reveal>
            <Reveal delay={0.18}>
              <dl className="border border-[oklch(0.92_0.008_250/0.12)] rounded-md overflow-hidden bg-[oklch(0.17_0.02_252)]">
                {facts.map(([k, v], i) => (
                  <div
                    key={k}
                    className={`flex items-baseline justify-between gap-4 px-4 py-2.5 ${i > 0 ? 'border-t border-[oklch(0.92_0.008_250/0.08)]' : ''}`}
                  >
                    <dt className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[oklch(0.57_0.012_250)] shrink-0">{k}</dt>
                    <dd className="font-mono text-[12px] text-white/85 text-right tabular-nums">{v}</dd>
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
        <circle cx="50" cy="50" r="38" fill="none" stroke="oklch(0.78 0.06 237 / 0.3)" strokeWidth="0.6" />
        <circle cx="50" cy="50" r="26" fill="none" stroke="oklch(0.62 0.08 306 / 0.22)" strokeWidth="0.5" strokeDasharray="2 2" />
        {nodes.map((n) => (
          <g key={n.i}>
            <circle
              cx={n.x} cy={n.y} r={n.i === 3 ? 3.2 : 2.1}
              fill={n.i === 3 ? 'oklch(0.78 0.06 237)' : 'oklch(0.55 0.015 250 / 0.5)'}
              stroke={n.i === 3 ? 'oklch(0.85 0.05 237)' : 'none'}
              strokeWidth={n.i === 3 ? 0.8 : 0}
            >
              {!reduce && (
                <animate attributeName="opacity" values="0.4;1;0.4" dur={`${2.4 + (n.i % 5) * 0.4}s`} repeatCount="indefinite" />
              )}
            </circle>
          </g>
        ))}
        {/* the true signer is unknowable: all five candidates sign identically */}
        {nodes.filter((n) => [2, 3, 4, 5, 6].includes(n.i)).map((n) => (
          <line key={`l-${n.i}`} x1="50" y1="50" x2={n.x} y2={n.y}
            stroke="oklch(0.78 0.06 237 / 0.25)" strokeWidth="0.45" strokeDasharray="1.4 1.4">
            {!reduce && (
              <animate attributeName="stroke-dashoffset" from="0" to="-5.6" dur="1.6s" repeatCount="indefinite" />
            )}
          </line>
        ))}
        <text x="50" y="50" textAnchor="middle" dy="0.35" fontSize="4.6" fill="oklch(0.75 0.012 250)" fontFamily="monospace" letterSpacing="0.5">
          ring
        </text>
      </svg>
      <div className="absolute -bottom-2 left-0 right-0 text-center font-mono text-[9px] uppercase tracking-[0.24em] text-[oklch(0.5_0.01_250)]">
        5 possible signers · 1 real · 0 observers
      </div>
    </div>
  )
}

function PrivacySection() {
  const items = [
    {
      icon: Users,
      title: 'Ring signatures',
      body: 'Every transaction is signed by a ring of five possible spenders. The real signer is computationally indistinguishable from the decoys the wallet picks automatically from the chain.',
    },
    {
      icon: Lock,
      title: 'RingCT amounts',
      body: 'Amounts are sealed with Pedersen commitments. The network proves no coins were created out of thin air without ever seeing a balance.',
    },
    {
      icon: Fingerprint,
      title: 'One-time addresses',
      body: 'Each transfer derives a unique stealth address on the receiver side. Addresses cannot be reused, so nothing links two payments to the same person.',
    },
  ]
  return (
    <section className="relative py-20 sm:py-28 border-t border-[oklch(0.92_0.008_250/0.08)]">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <Reveal>
          <SectionLabel>02 · Privacy by default</SectionLabel>
        </Reveal>
        <div className="mt-8 grid lg:grid-cols-[1.25fr_0.75fr] gap-12 items-center">
          <div>
            <Reveal delay={0.05}>
              <h2 className="text-3xl sm:text-4xl font-bold leading-[1.1] text-white max-w-xl">
                The chain is a <span className="text-[oklch(0.78_0.06_237)]">crowd</span>,
                not a ledger of names
              </h2>
            </Reveal>
            <RevealStagger className="mt-10 grid sm:grid-cols-3 gap-x-8 gap-y-8">
              {items.map((c) => (
                <RevealItem key={c.title}>
                  <div className="border-t-2 border-[oklch(0.78_0.06_237/0.35)] pt-5">
                    <c.icon className="w-[18px] h-[18px] text-[oklch(0.78_0.06_237)]" />
                    <div className="mt-3 font-semibold text-[14.5px] text-white/90">{c.title}</div>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-[oklch(0.68_0.012_250)]">{c.body}</p>
                  </div>
                </RevealItem>
              ))}
            </RevealStagger>
            <Reveal delay={0.15}>
              <p className="mt-8 text-[12.5px] text-[oklch(0.62_0.012_250)] flex items-start gap-2">
                <EyeOff className="w-4 h-4 mt-0.5 text-[oklch(0.62_0.08_306)] shrink-0" />
                There is no transparent mode to opt out of. Every transaction is private,
                for everyone, by default.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.18} className="lg:pl-6">
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
    { label: 'Difficulty', value: 'LWMA, smooth retarget' },
    { label: 'Block time', value: '60 seconds' },
    { label: 'Coinbase maturity', value: 'spendable after 20 blocks' },
    { label: 'Transfers', value: 'spendable after 10 blocks' },
    { label: 'Premine', value: '1% (180,000 XNV)' },
    { label: 'Pools', value: 'deliberately pointless' },
  ]
  return (
    <section className="relative py-20 sm:py-28 border-t border-[oklch(0.92_0.008_250/0.08)]">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <Reveal>
          <SectionLabel>03 · Mining</SectionLabel>
        </Reveal>
        <div className="mt-8 grid lg:grid-cols-2 gap-12 items-start">
          <Reveal delay={0.05}>
            <div className="relative">
              <Figure
                src="/images/nerva/photo-cpu.jpg"
                alt="Macro photograph of the underside of a CPU, golden pins and capacitors"
                caption="A commodity CPU: the only mining rig NERVA needs"
                ratio="aspect-[4/3]"
              />
              <div className="absolute top-3 right-3 font-mono text-[9px] uppercase tracking-[0.16em] px-2.5 py-1 rounded-sm bg-[oklch(0.66_0.083_233)] text-[oklch(0.13_0.02_255)] font-semibold">
                GPU and ASIC resistant
              </div>
            </div>
          </Reveal>
          <div>
            <Reveal delay={0.1}>
              <h2 className="text-3xl sm:text-4xl font-bold leading-[1.1] text-white">
                Secured by <span className="text-[oklch(0.78_0.06_237)]">ordinary computers</span>
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-[oklch(0.75_0.012_250)]">
                CryptoNight-Adaptive v6 is tuned for the CPU in the device you are
                reading this on. LWMA difficulty retargets smoothly every block, and
                solo mining requires running a full node, tying security directly to
                decentralisation. No pool operator stands between you and the network,
                and the hardware you already own is competitive.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-0">
                {facts.map((f) => (
                  <div key={f.label} className="border-b border-[oklch(0.92_0.008_250/0.1)] py-3">
                    <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-[oklch(0.55_0.012_250)]">{f.label}</dt>
                    <dd className="mt-1 font-mono text-[12.5px] text-white/85 tabular-nums">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 text-[12.5px] text-[oklch(0.62_0.012_250)] flex items-start gap-2">
                <Cpu className="w-4 h-4 mt-0.5 text-[oklch(0.78_0.06_237)] shrink-0" />
                Mining runs through the official CLI or NervaOne; this interface itself
                only reads the chain.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/nerva/mining" className={BTN_PRIMARY}>
                  <Radar className="w-4 h-4" /> Open the mining center
                </Link>
                <a
                  href="https://docs.nerva.one/overview/mining/"
                  target="_blank" rel="noreferrer"
                  className={BTN_SECONDARY}
                >
                  Official mining guide <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
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
      num: '01',
      title: 'Read-only, key-free',
      body: 'This interface talks straight to the public NERVA explorer API (api.nerva.one) from your browser. It never holds a seed, a spend key or a view key. There is nothing here to steal.',
    },
    {
      icon: Zap,
      num: '02',
      title: 'Live, not cached theatre',
      body: 'Height, difficulty, blocks and the mempool are polled every few seconds, the same public feed the official explorer uses. The block ticker at the top of this page is the actual chain.',
    },
    {
      icon: Link2,
      num: '03',
      title: 'Stateless payment links',
      body: 'NervaLink invoices live entirely inside their URL. The pay page watches the chain for your invoice reference and follows it from the mempool to 10 confirmations, with no account, no database and no server.',
    },
  ]
  return (
    <section className="relative py-20 sm:py-28 border-t border-[oklch(0.92_0.008_250/0.08)]">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <Reveal>
          <SectionLabel>04 · How this world works</SectionLabel>
        </Reveal>
        <div className="mt-8 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-start">
          <div>
            <Reveal delay={0.05}>
              <h2 className="text-3xl sm:text-4xl font-bold leading-[1.1] text-white max-w-xl">
                Everything runs client-side:{' '}
                <span className="text-[oklch(0.78_0.06_237)]">nothing to hack, nothing to custody</span>
              </h2>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[oklch(0.75_0.012_250)]">
                The Nerva side of XelisVault is an independent window onto the network,
                built in the spirit of the protocol itself: no accounts, no tracking,
                no keys, no third-party scripts. Here is exactly what happens under
                the hood.
              </p>
            </Reveal>
            <RevealStagger className="mt-10 space-y-0">
              {steps.map((s) => (
                <RevealItem key={s.title}>
                  <div className="flex gap-6 border-t border-[oklch(0.92_0.008_250/0.1)] py-7">
                    <div className="shrink-0 w-14">
                      <div className="font-mono text-[22px] font-bold text-[oklch(0.78_0.06_237/0.85)] tabular-nums leading-none">{s.num}</div>
                      <s.icon className="mt-3.5 w-4 h-4 text-[oklch(0.55_0.012_250)]" />
                    </div>
                    <div>
                      <div className="font-semibold text-[15px] text-white/90">{s.title}</div>
                      <p className="mt-2 text-[13.5px] leading-relaxed text-[oklch(0.68_0.012_250)] max-w-lg">{s.body}</p>
                    </div>
                  </div>
                </RevealItem>
              ))}
            </RevealStagger>
            <Reveal delay={0.2}>
              <div className="mt-2 border border-[oklch(0.92_0.008_250/0.12)] border-l-2 border-l-[oklch(0.78_0.06_237)] rounded-r-md bg-[oklch(0.17_0.02_252)] p-5">
                <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[oklch(0.78_0.06_237)]">
                  Honest limitations · read this
                </div>
                <p className="mt-2.5 text-[12.5px] leading-relaxed text-[oklch(0.72_0.012_250)]">
                  RingCT amounts are encrypted. Payment detection confirms that your
                  invoice reference appeared on-chain with enough confirmations; it
                  cannot read the exact amount paid. Your wallet (NervaOne or the CLI)
                  shows the amount paired with the reference for final reconciliation.
                  Recent wallet versions may require enabling long payment ids for URI
                  payments, so the pay page always offers the plain address as a
                  fallback.
                </p>
              </div>
            </Reveal>
          </div>
          <div className="space-y-6 lg:sticky lg:top-28">
            <Reveal delay={0.12}>
              <Figure
                src="/images/nerva/photo-racks.jpg"
                alt="Server racks with network equipment and status lights"
                caption="Your browser is the client. There is no server in the middle"
              />
            </Reveal>
            <Reveal delay={0.2}>
              <div className="border border-[oklch(0.92_0.008_250/0.12)] rounded-md bg-[oklch(0.17_0.02_252)] p-5">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-[oklch(0.78_0.06_237)]" />
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[oklch(0.57_0.012_250)]">
                    Under the hood
                  </span>
                </div>
                <dl className="mt-3.5 space-y-2.5 font-mono text-[11.5px]">
                  {[
                    ['data source', 'api.nerva.one (public, CORS-open)'],
                    ['polling', '~10s feed, ~120s chart'],
                    ['wallet exposure', 'none: read-only'],
                    ['analytics', 'none: zero trackers'],
                    ['build', 'static, deploys on Vercel'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt className="text-[oklch(0.55_0.012_250)] uppercase tracking-[0.1em] text-[9.5px] pt-0.5">{k}</dt>
                      <dd className="text-white/80 text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          </div>
        </div>

        {/* in-house tools */}
        <RevealStagger className="mt-14 grid sm:grid-cols-3 gap-4">
          {[
            {
              href: '/nerva/paper-wallet',
              icon: KeyRound,
              title: 'Paper wallet generator',
              desc: 'Fresh keys, address and 25-word mnemonic minted by your browser — printable, offline-capable.',
            },
            {
              href: '/nerva/watch',
              icon: Eye,
              title: 'Watch-only tracker',
              desc: 'Address + view key: see payments arrive in real time, without ever exposing a spend key.',
            },
            {
              href: '/nerva/mining',
              icon: Radar,
              title: 'Mining center',
              desc: 'Live hashrate, difficulty and an honest solo-mining calculator — the real odds of your CPU.',
            },
          ].map((t) => (
            <RevealItem key={t.href}>
              <Link
                href={t.href}
                className="group block h-full border border-[oklch(0.92_0.008_250/0.12)] rounded-md bg-[oklch(0.17_0.02_252)] p-5 hover:border-[oklch(0.78_0.06_237/0.45)] transition-colors"
              >
                <t.icon className="w-4.5 h-4.5 text-[oklch(0.78_0.06_237)]" />
                <div className="mt-3 font-semibold text-[14.5px] text-white/90 group-hover:text-white transition-colors">{t.title}</div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[oklch(0.68_0.012_250)]">{t.desc}</p>
                <span className="mt-3.5 inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[oklch(0.78_0.06_237/0.85)] group-hover:text-[oklch(0.78_0.06_237)] transition-colors">
                  Open tool <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  )
}

/* ═══════════════════ ECOSYSTEM ═══════════════════ */

function Ecosystem() {
  const items = [
    { domain: 'nerva.one', title: 'Official site', desc: 'Downloads, exchanges, paper wallet', href: NERVA_LINKS.site, icon: Globe },
    { domain: 'docs.nerva.one', title: 'Documentation', desc: 'Guides for the CLI, mining, Tor, daemon and wallet RPC', href: NERVA_LINKS.docs, icon: BookOpen },
    { domain: 'explorer.nerva.one', title: 'Official explorer', desc: 'The reference block and transaction explorer', href: NERVA_LINKS.explorer, icon: Radar },
    { domain: 'map.nerva.one', title: 'Node map', desc: 'Live geographic map of reachable nodes', href: NERVA_LINKS.nodeMap, icon: MapIcon },
    { domain: 'github.com/nerva-project', title: 'GitHub', desc: 'The C++ source of the chain', href: NERVA_LINKS.github, icon: Github },
    { domain: 'discord', title: 'Discord', desc: 'The community: help, ideas, test funds', href: NERVA_LINKS.discord, icon: MessageSquare },
  ]
  return (
    <section className="relative py-20 sm:py-28 border-t border-[oklch(0.92_0.008_250/0.08)]">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <Reveal>
          <SectionLabel>05 · Ecosystem</SectionLabel>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-8 text-3xl sm:text-4xl font-bold leading-[1.1] text-white">
            The wider <span className="text-[oklch(0.78_0.06_237)]">NERVA</span> world
          </h2>
        </Reveal>
        <RevealStagger className="mt-10 grid sm:grid-cols-2 gap-x-12">
          {items.map((it) => (
            <RevealItem key={it.title}>
              <a
                href={it.href}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-4 border-t border-[oklch(0.92_0.008_250/0.1)] py-5 hover:bg-white/[0.02] transition-colors -mx-3 px-3 rounded-sm"
              >
                <it.icon className="w-[18px] h-[18px] text-[oklch(0.78_0.06_237)] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-3">
                    <span className="font-semibold text-[14.5px] text-white/90 group-hover:text-white transition-colors">{it.title}</span>
                    <span className="font-mono text-[10.5px] text-[oklch(0.78_0.06_237/0.8)] truncate">{it.domain}</span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-[oklch(0.62_0.012_250)]">{it.desc}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-white/25 group-hover:text-[oklch(0.78_0.06_237)] transition-colors shrink-0" />
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
    <section className="relative py-20 sm:py-28 border-t border-[oklch(0.92_0.008_250/0.08)] overflow-hidden">
      <div className="absolute inset-0">
        <img src="/images/nerva/photo-pcb.jpg" alt="" aria-hidden="true" className="w-full h-full object-cover opacity-30" draggable={false} />
        <div className="absolute inset-0 bg-[oklch(0.14_0.018_255/0.85)]" />
      </div>
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <Reveal>
          <Shield className="w-9 h-9 mx-auto text-[oklch(0.78_0.06_237)]" />
          <h2 className="mt-6 text-3xl sm:text-4xl font-bold leading-[1.12] text-white">
            Two protocols. One standard:{' '}
            <span className="text-[oklch(0.78_0.06_237)]">privacy</span>
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[oklch(0.75_0.012_250)]">
            You are standing in the Nerva world of XelisVault. The Xelis world holds
            the confidential BlockDAG platform: xUSD, VLT, VaultSwap and the vault app
            itself. Cross back any time; the gate remembers nothing.
          </p>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/nerva/explorer" className={BTN_PRIMARY}>
              <Radar className="w-[17px] h-[17px]" /> Live explorer
            </Link>
            <button onClick={openGate} className={BTN_SECONDARY}>
              <Layers className="w-[17px] h-[17px] text-[oklch(0.74_0.07_306)]" /> Choose your side
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
