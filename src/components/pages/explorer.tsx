'use client'

// The Observatory — XELIS Vault's live explorer, on MAINNET.
// "Watch the machinery. Never the money."

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Volume2, VolumeX, Eye, Radio, ArrowUpRight, Rocket } from 'lucide-react'
import { Nav } from '@/components/site/nav'
import { Footer } from '@/components/sections/roadmap-cta'
import { Reveal, SectionLabel } from '@/components/site/reveal'
import { useDemo } from '@/lib/demo-store'
import { XelisBlock, fmtXEL, fmtDuration, getBlockAtTopo } from '@/lib/xelis/explorer'
import { NetworkId, networkConfig } from '@/lib/xelis/networks'
import { setActiveNetwork } from '@/lib/xelis/networks'
import { useExplorerLive } from '@/components/explorer/use-explorer-live'
import { Lattice } from '@/components/explorer/lattice'
import { BlockFeed } from '@/components/explorer/block-feed'
import { NetworkPulse } from '@/components/explorer/network-pulse'
import { MempoolRadar, PeersPanel, SealedByDesign } from '@/components/explorer/radar-peers'
import { SearchBar, SearchTarget } from '@/components/explorer/search-bar'
import { DetailDrawer } from '@/components/explorer/detail-drawer'
import { MinerArena } from '@/components/explorer/miner-arena'
import { DifficultyChart, CadenceChart } from '@/components/explorer/charts'
import { SealingChamber } from '@/components/explorer/sealing-chamber'
import { Achievements } from '@/components/explorer/achievements'
import { AssetRegistry } from '@/components/explorer/asset-registry'
import { MarketPulse } from '@/components/explorer/market-pill'
import { NetworkSwitch } from '@/components/explorer/network-switch'
import { playBlockPing, playMempoolBlip, playSealSound, Odometer } from '@/components/explorer/fx'

const SOUND_KEY = 'observatory-sound'
const NETWORK_KEY = 'observatory-network'

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
  const [network, setNetwork] = useState<NetworkId>('mainnet')
  const [drawerTarget, setDrawerTarget] = useState<SearchTarget | null>(null)
  const [, tick] = useState(0)

  // restore preferences (declared BEFORE deep links so the network is set first)
  useEffect(() => {
    try {
      const v = localStorage.getItem(SOUND_KEY) === 'on'
      setSoundOn(v)
      soundRef.current = v
      const savedNet = localStorage.getItem(NETWORK_KEY)
      if (savedNet === 'mainnet' || savedNet === 'testnet') {
        setNetwork(savedNet)
        setActiveNetwork(savedNet)
      } else {
        setActiveNetwork('mainnet')
      }
    } catch {
      setActiveNetwork('mainnet')
    }
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // inbound deep links: /explorer?block=<hash|topo> · ?tx=<hash> · ?account=<xet:...>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const block = params.get('block')
    const tx = params.get('tx')
    const account = params.get('account')
    if (block) {
      if (/^\d+$/.test(block)) {
        getBlockAtTopo(parseInt(block, 10), false)
          .then((b) => setDrawerTarget({ kind: 'block', block: b }))
          .catch(() => {})
      } else {
        setDrawerTarget({ kind: 'blockhash', hash: block })
      }
    } else if (tx) {
      setDrawerTarget({ kind: 'tx', hash: tx })
    } else if (account) {
      setDrawerTarget({ kind: 'account', address: account })
    }
  }, [])

  // "/" focuses the search bar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      if (e.key === '/' && !typing) {
        e.preventDefault()
        document.getElementById('obs-search')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const changeNetwork = useCallback((n: NetworkId) => {
    setNetwork(n)
    setActiveNetwork(n)
    setDrawerTarget(null)
    try { localStorage.setItem(NETWORK_KEY, n) } catch { /* noop */ }
  }, [])

  const onNewBlock = useCallback((b: XelisBlock) => {
    if (!soundRef.current) return
    const txs = b.txs_hashes?.length ?? 0
    playBlockPing(txs, b.block_type)
    if (txs > 0) playSealSound(txs)
  }, [])
  const onMempoolTx = useCallback(() => {
    if (soundRef.current) playMempoolBlip()
  }, [])

  const live = useExplorerLive({ network, onNewBlock, onMempoolTx })

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
  const openAccount = useCallback((address: string) => {
    setDrawerTarget({ kind: 'account', address })
  }, [])

  const rank = observerRank(live.session.blocksWitnessed)
  const uptime = fmtDuration(Date.now() - live.session.startedAt)
  const cfg = networkConfig(network)

  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <Nav />

      <main className="flex-1 relative pt-32 md:pt-36 pb-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[420px] rounded-full bg-vault/8 blur-[140px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8">
          {/* ---- Header ---- */}
          <Reveal>
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <SectionLabel>The Observatory</SectionLabel>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-emerald-700">
                <Radio className="w-3 h-3 animate-pulse" />
                live · {network}
              </span>
              <span className="hidden sm:inline-flex">
                <MarketPulse />
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[0.98] max-w-4xl">
                <span className="text-gradient-mono">Watch the machinery.</span>
                <br />
                <span className="text-gradient-vault">Never the money.</span>
              </h1>
              <NetworkSwitch network={network} onChange={changeNetwork} />
            </div>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-5 max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
              {network === 'mainnet' ? (
                <>
                  A live window into the XELIS <span className="text-foreground/90">mainnet</span> BlockDAG. Real blocks,
                  real miners, real burns, streaming over websocket, while every amount stays sealed under
                  homomorphic Twisted ElGamal. This is what privacy looks like from the outside.
                </>
              ) : (
                <>
                  The proving ground: the XELIS <span className="text-foreground/90">testnet</span> BlockDAG, live.
                  Blocks, forks, miners, fees and burns stream in real time over websocket, while every amount
                  stays sealed. Where the Vault&apos;s contracts rehearse before mainnet.
                </>
              )}
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
                title="Sonar ping per block, seal thunk per tx batch"
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

          {/* ---- Miner Arena + Sealing Chamber ---- */}
          <Reveal delay={0.44}>
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              <MinerArena blocks={live.blocks} onSelectAccount={openAccount} />
              <SealingChamber
                blocks={live.blocks}
                mempoolBlips={live.mempoolBlips}
                sealedTotal={live.session.txsSealed}
                mempoolTotal={live.mempool?.total ?? null}
              />
            </div>
          </Reveal>

          {/* ---- Live charts ---- */}
          <Reveal delay={0.48}>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              <DifficultyChart blocks={live.blocks} />
              <CadenceChart blocks={live.blocks} />
            </div>
          </Reveal>

          {/* ---- Radar / Peers / Sealed ---- */}
          <Reveal delay={0.52}>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              <MempoolRadar total={live.mempool?.total ?? null} feeRates={live.feeRates} blips={live.mempoolBlips} />
              <PeersPanel peers={live.peers} nodeVersion={live.info?.version ?? null} />
              <SealedByDesign />
            </div>
          </Reveal>

          {/* ---- Achievements ---- */}
          <Reveal delay={0.56}>
            <div className="mt-8">
              <Achievements session={live.session} blocks={live.blocks} soundOn={soundOn} />
            </div>
          </Reveal>

          {/* ---- Asset registry ---- */}
          <Reveal delay={0.6}>
            <div className="mt-8">
              <AssetRegistry assets={live.assets} />
            </div>
          </Reveal>

          {/* ---- CTA ---- */}
          <Reveal delay={0.64}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <button
                onClick={() => openApp()}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-vault hover:bg-vault/85 text-white px-6 text-sm font-semibold transition-all hover:shadow-[0_0_28px_-6px_var(--vault)]"
              >
                <Rocket className="w-4 h-4" />
                Open the Vault
              </button>
              <motion.a
                key={network}
                href={cfg.explorer}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card/40 hover:bg-card/80 hover:border-vault/40 px-6 text-sm font-semibold transition-all"
              >
                <Eye className="w-4 h-4" />
                Official {network} explorer
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
              </motion.a>
              <span className="text-[11px] font-mono text-muted-foreground/60">
                data: public {network} node · {cfg.http.replace('https://', '')} · no api key, no backend
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
