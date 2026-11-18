// The MAINNET LOADING band — the announcement cartridge inside the
// Maison page. A deliberate break in the ivory editorial skin: a dark
// CRT strip with pixel typography that says "something is coming",
// links into /mainnet (the retro world-by-world explainer) and keeps
// the already-live launchpad one click away. Same facts as /mainnet:
// the window, the audit gate, the live floor.

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PixelSprite } from '@/components/mainnet/pixel-sprites'
import { MAINNET_WINDOW_MS } from '@/components/mainnet/pixel-data'
import { FONT_PIXEL, FONT_VT } from '@/lib/pixel-fonts'

const C = {
  void: '#0a0c14',
  panel: '#10131f',
  line: '#232a44',
  gold: '#f0b35c',
  teal: '#5cc8d7',
  emerald: '#6ee7a0',
  paper: '#e8e4d8',
  steel: '#8a93b0',
  dim: '#5a6480',
}

function useDaysLeft(target: number): number | null {
  const [n, setN] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setN(Math.max(0, Math.ceil((target - Date.now()) / 86_400_000)))
    tick()
    const t = setInterval(tick, 60_000)
    return () => clearInterval(t)
  }, [target])
  return n
}

export function MainnetBand() {
  const days = useDaysLeft(MAINNET_WINDOW_MS)

  return (
    <section
      id="mainnet"
      aria-labelledby="mainnet-band-title"
      className="relative overflow-hidden border-y-2 py-14 sm:py-16"
      style={{
        borderColor: '#1a1426',
        background: `linear-gradient(180deg, #0a0c14 0%, #0d1020 55%, #0a0c14 100%)`,
      }}
    >
      {/* pixel star dust + scanlines (static — the motion lives on /mainnet) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(1.5px 1.5px at 12% 30%, #39436b 50%, transparent 51%),' +
            'radial-gradient(1.5px 1.5px at 32% 72%, #2c3454 50%, transparent 51%),' +
            'radial-gradient(1.5px 1.5px at 55% 22%, #39436b 50%, transparent 51%),' +
            'radial-gradient(1.5px 1.5px at 76% 64%, #2c3454 50%, transparent 51%),' +
            'radial-gradient(1.5px 1.5px at 91% 38%, #39436b 50%, transparent 51%),' +
            'radial-gradient(1.5px 1.5px at 68% 12%, #2c3454 50%, transparent 51%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(5,7,12,0.14) 0px, rgba(5,7,12,0.14) 1px, transparent 1px, transparent 3px)',
        }}
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-7 px-6 text-center">
        {/* cartridge label */}
        <div
          className={cn('inline-flex items-center gap-2.5 px-3 py-2', FONT_PIXEL)}
          style={{
            border: `2px solid ${C.gold}`,
            background: 'rgba(240,179,92,0.08)',
            fontSize: 9,
            color: C.gold,
            letterSpacing: '0.14em',
            boxShadow: '4px 4px 0 rgba(0,0,0,0.5)',
          }}
        >
          <span className="inline-block h-[6px] w-[6px]" style={{ background: C.gold, animation: 'xv-band-blink 1.2s steps(2) infinite' }} />
          CARTRIDGE FOUND · JUNE 2027
        </div>

        <div className="flex items-center gap-5 sm:gap-8">
          <PixelSprite name="vault" px={4} title="the vault" className="hidden sm:block" style={{ animation: 'xv-band-bob 2.4s steps(2) infinite' }} />
          <h2
            id="mainnet-band-title"
            className={cn('text-balance leading-[1.45]', FONT_PIXEL)}
            style={{ fontSize: 'clamp(14px, 2.6vw, 26px)', color: C.paper }}
          >
            THE FULL PROTOCOL
            <br />
            <span style={{ color: C.gold }}>IS LOADING FOR MAINNET</span>
          </h2>
          <PixelSprite name="rocket" px={4} title="the mainnet rocket" className="hidden sm:block" style={{ animation: 'xv-band-bob 1.9s steps(2) infinite' }} />
        </div>

        <p className={cn('max-w-2xl leading-snug', FONT_VT)} style={{ fontSize: 21, color: C.steel }}>
          Confidential lending, the private xUSD dollar, the audited PrivacyMixer and the
          StakedOracle land together in one drop. Explore every world, every level —
          explained plainly, no jargon walls.
        </p>

        {/* mini countdown + progress */}
        <div
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 px-6 py-4"
          style={{ border: `2px solid ${C.line}`, background: C.panel, boxShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}
        >
          <span className={cn(FONT_PIXEL)} style={{ fontSize: 8, color: C.steel, letterSpacing: '0.16em' }}>
            WINDOW OPENS IN
          </span>
          <span className={cn('tabular-nums', FONT_VT)} style={{ fontSize: 30, color: C.paper, lineHeight: 1 }}>
            {days == null ? '···' : `${days}`} <span style={{ fontSize: 17, color: C.gold }}>DAYS</span>
          </span>
          <span aria-hidden className="hidden h-6 w-[2px] sm:block" style={{ background: C.line }} />
          <span className={cn(FONT_PIXEL)} style={{ fontSize: 8, color: C.emerald, letterSpacing: '0.16em' }}>
            5/7 MILESTONES CLEARED
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/mainnet"
            className={cn('inline-flex items-center gap-2 px-6 py-3.5 select-none', FONT_PIXEL)}
            style={{
              border: `2px solid ${C.gold}`,
              background: C.gold,
              color: C.void,
              fontSize: 10,
              boxShadow: '4px 4px 0 rgba(0,0,0,0.55)',
              transition: 'transform 70ms steps(2), box-shadow 70ms steps(2)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '6px 6px 0 rgba(0,0,0,0.6)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0 rgba(0,0,0,0.55)' }}
          >
            &gt;&gt; ENTER MAINNET HQ
          </Link>
          <Link
            href="/launch"
            className={cn('inline-flex items-center gap-2 px-6 py-3.5 select-none', FONT_PIXEL)}
            style={{
              border: `2px solid ${C.emerald}`,
              background: 'transparent',
              color: C.emerald,
              fontSize: 10,
              boxShadow: '4px 4px 0 rgba(0,0,0,0.45)',
              transition: 'transform 70ms steps(2), box-shadow 70ms steps(2)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '6px 6px 0 rgba(0,0,0,0.5)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0 rgba(0,0,0,0.45)' }}
          >
            &gt;&gt; THE FLOOR IS LIVE NOW
          </Link>
        </div>

        <p className={cn(FONT_VT)} style={{ fontSize: 16, color: C.dim }}>
          VaultLaunch + LaunchDEX already trade on mainnet since 23.09.2026 — the rest ships in the June 2027 window
        </p>
      </div>

      <style>{`
        @keyframes xv-band-blink { 0%,54% { opacity: 1; } 55%,100% { opacity: 0.3; } }
        @keyframes xv-band-bob { 0% { transform: translateY(0); } 50% { transform: translateY(-3px); } 100% { transform: translateY(0); } }
      `}</style>
    </section>
  )
}
