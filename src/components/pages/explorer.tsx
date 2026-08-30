'use client'

// The Observatory — XELIS Vault's live explorer.
// "Watch the machinery. Never the money."

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Volume2, VolumeX, Eye, Radio, Blocks, ArrowUpRight, Rocket } from 'lucide-react'
import { Nav } from '@/components/site/nav'
import { Footer } from '@/components/sections/roadmap-cta'
import { Reveal, SectionLabel } from '@/components/site/reveal'
import { useDemo } from '@/lib/demo-store'
import { XelisBlock, fmtXEL, fmtDuration } from '@/lib/xelis/explorer'
import { useExplorerLive } from '@/components/explorer/use-explorer-live'
import { Lattice } from '@/components/explorer/lattice'
import { BlockFeed } from '@/components/explorer/block-feed'
import { NetworkPulse } from '@/components/explorer/network-pulse'
import { MempoolRadar, PeersPanel, SealedByDesign } from '@/components/explorer/radar-peers'
import { SearchBar, SearchTarget } from '@/components/explorer/search-bar'
import { DetailDrawer } from '@/components/explorer/detail-drawer'
import { playBlockPing, playMempoolBlip, Odometer } from '@/components/explorer/fx'

const SOUND_KEY = 'observatory-sound'

function observerRank(witnessed: number): { title: string; next: number | null } {
  if (witnessed >= 100) return { title: 'Lattice Archivist', next: null }
  if (witnessed >= 25) return { title: 'DAG Whisperer', next: 100 }
  if (witnessed >= 5) return { title: 'Vault Sentry', next: 25 }
  return { title: 'Cadet Observer', next: 5 }
}

export function ExplorerPage() {
  const openApp = useDemo((s) => s.openApp)
  const [soundOn, setSoundOn] = useState(false)
  const soundRef = useRef(false)
  const [drawerTarget, setDrawerTarget] = useState<SearchTarget | null>(null)
  const [, tick] = useState(0)

  // restore sound preference
  useEffect(() => {
    try {
      const v = localStorage.getItem(SOUND_KEY) === 'on'
      setSoundOn(v)
      soundRef.current = v
    } catch { /* noop */ }
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const onNewBlock = useCallback((b: XelisBlock) => {
    if (soundRef.current) playBlockPing(b.txs_hashes?.length ?? 0, b.block_type)
  }, [])
  const onMempoolTx = useCallback(() => {
    if (soundRef.current) playMempoolBlip()
  }, [])

  const live = useExplorerLive({ onNewBlock, onMempoolTx })

  const toggleSound = () => {
    const v = !soundOn
    setSoundOn(v)
    soundRef.current = v
    try { localStorage.setItem(SOUND_KEY, v ? 'on' : 'off') } catch { /* noop */ }
    if (v) playBlockPing(0, 'Normal') // confirmation blip
  }

  const selectBlock = useCallback((b: XelisBlock) => {
    setDrawerTarget({ kind: 'block', block: b })
  }, [])

  const rank = observerRank(live.session.blocksWitnessed)
  const uptime = fmtDuration(Date.now() - live.session.startedAt)

  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <Nav />

      <main className="flex-1 relative pt-24 md:pt-28 pb-24">
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[420px] rounded-full bg-vault/8 blur-[140px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 md:px-8">
          {/* ---- Header ---- */}
          <Reveal>
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <SectionLabel>The Observatory</SectionLabel>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-emerald-300">
                <Radio className="w-3 h-3 animate-pulse" />
                live · testnet
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[0.98] max-w-4xl">
              <span className="text-gradient-mono">Watch the machinery.</span>
              <br />
              <span className="text-gradient-vault">Never the money.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-5 max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
              A live window into the XELIS BlockDAG. Blocks, forks, miners, fees and burns stream in
              real time over websocket — while every amount stays sealed under homomorphic Twisted
              ElGamal. This is what privacy looks like from the outside.
            </p>
          </Reveal>

          {/* ---- Witness session + sound ---- */}
          <Reveal delay={0.22}>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-4 rounded-2xl glass-panel px-4 py-3">
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground">your observation</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono text-2xl font-bold text-vault">
                      <Odometer value={live.session.blocksWitnessed} />
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">blocks witnessed · {uptime}</span>
                  </div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground">rank</div>
                  <div className="text-sm font-semibold">{rank.title}</div>
                  <div className="text-[9px] font-mono text-muted-foreground/70">
                    {rank.next ? `${rank.next - live.session.blocksWitnessed} to next rank` : 'max rank reached'}
                  </div>
                </div>
                <div className="h-8 w-px bg-border hidden sm:block" />
                <div className="hidden sm:block">
                  <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground">sealed while here</div>
                  <div className="text-sm font-mono font-semibold text-orange-300">
                    {live.session.txsSealed} txs · {fmtXEL(live.session.xelBurned)} XET burned
                  </div>
                  <div className="text-[9px] font-mono text-muted-foreground/70">
                    {live.session.sideBlocks} side blocks · busiest #{live.session.biggestTopo ?? '—'}
                  </div>
                </div>
              </div>

              <button
                onClick={toggleSound}
                className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-[12px] font-mono uppercase tracking-wider transition-colors ${
                  soundOn
                    ? 'border-vault/50 bg-vault/15 text-vault'
                    : 'border-border bg-card/40 text-muted-foreground hover:text-foreground'
                }`}
                title="Sonar ping on each new block"
              >
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                sonar {soundOn ? 'on' : 'off'}
              </button>
            </div>
          </Reveal>

          {/* ---- Search ---- */}
          <Reveal delay={0.28}>
            <div className="mt-6 max-w-2xl">
              <SearchBar onResolve={setDrawerTarget} />
            </div>
          </Reveal>

          {/* ---- Lattice + Feed ---- */}
          <Reveal delay={0.34}>
            <div className="mt-8 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 items-stretch">
              <Lattice
                blocks={live.blocks}
                stableHeight={live.info?.stableheight ?? null}
                status={live.socketStatus}
                onSelect={selectBlock}
              />
              <div className="min-h-[420px]">
                <BlockFeed blocks={live.blocks} onSelect={selectBlock} witnessed={live.session.blocksWitnessed} />
              </div>
            </div>
          </Reveal>

          {/* ---- Network pulse ---- */}
          <Reveal delay={0.4}>
            <div className="mt-8">
              <NetworkPulse
                info={live.info}
                hashrateFormatted={live.difficulty?.hashrate_formatted ?? null}
                peerCount={live.peers?.total_peers ?? null}
                mempoolTotal={live.mempool?.total ?? null}
                txCount={live.txCount}
                accountCount={live.accountCount}
                assetCount={live.assets.length}
              />
            </div>
          </Reveal>

          {/* ---- Radar / Peers / Sealed ---- */}
          <Reveal delay={0.46}>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              <MempoolRadar total={live.mempool?.total ?? null} feeRates={live.feeRates} blips={live.mempoolBlips} />
              <PeersPanel peers={live.peers} nodeVersion={live.info?.version ?? null} />
              <SealedByDesign />
            </div>
          </Reveal>

          {/* ---- Assets strip ---- */}
          {live.assets.length > 0 && (
            <Reveal delay={0.5}>
              <div className="mt-8 rounded-2xl glass-panel px-4 md:px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Blocks className="w-3.5 h-3.5 text-vault/80" />
                  <span className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">Assets on testnet</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {live.assets.slice(0, 12).map((a) => (
                    <motion.a
                      key={a.asset}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      href={`https://testnet-explorer.xelis.io/asset/${a.asset}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/40 hover:border-vault/40 px-3 py-1.5 text-[11px] font-mono transition-colors"
                      title={`${a.name} — open in official explorer`}
                    >
                      <span className="text-vault font-semibold">{a.ticker}</span>
                      <span className="text-muted-foreground">{shortHashSafe(a.asset)}</span>
                    </motion.a>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          {/* ---- CTA ---- */}
          <Reveal delay={0.54}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <button
                onClick={() => openApp()}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-vault hover:bg-vault/85 text-white px-6 text-sm font-semibold transition-all hover:shadow-[0_0_28px_-6px_var(--vault)]"
              >
                <Rocket className="w-4 h-4" />
                Open the Vault
              </button>
              <a
                href="https://testnet-explorer.xelis.io"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card/40 hover:bg-card/80 hover:border-vault/40 px-6 text-sm font-semibold transition-all"
              >
                <Eye className="w-4 h-4" />
                Official explorer
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
              </a>
              <span className="text-[11px] font-mono text-muted-foreground/60">
                data: public testnet node · wss + json_rpc · no api key, no backend
              </span>
            </div>
          </Reveal>
        </div>
      </main>

      <Footer />

      {/* Inspector drawer */}
      <DetailDrawer
        target={drawerTarget}
        onClose={() => setDrawerTarget(null)}
        onOpenBlock={(b) => setDrawerTarget({ kind: 'blockhash', hash: b.hash })}
        onOpenTx={(hash) => setDrawerTarget({ kind: 'tx', hash })}
        onOpenAccount={(address) => setDrawerTarget({ kind: 'account', address })}
      />
    </div>
  )
}

function shortHashSafe(h: string): string {
  return h.length > 16 ? `${h.slice(0, 6)}…${h.slice(-4)}` : h
}
