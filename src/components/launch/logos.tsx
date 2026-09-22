// VaultLaunch project logos — hand-drawn SVG emblems, one per demo asset.
//
// Design language: each asset gets a real mark (not a letter): a vault dial
// for VLT, rail arrows for XPAY, a nova burst for NOVA, a cipher seal for
// CYPH, a merit medal for KLEOS, a cut gem for OBS, the prohibition sign
// for the rejected MEMEX, and the orbital mark for native XEL.
// All emblems share the same grammar: 32x32 viewBox, hairline strokes,
// round caps, small filled accents — so the set reads as one family.
// Hue values mirror src/lib/launch/data.ts (keep in sync).

'use client'

import { cn } from '@/lib/utils'

export const LOGO_HUES: Record<string, number> = {
  VLT: 38,
  XPAY: 195,
  NOVA: 150,
  CYPH: 95,
  KLEOS: 45,
  OBS: 268,
  MEMEX: 15,
  XEL: 44,
}

// ─── the emblem glyphs (32x32, stroke = currentColor) ────────────

function emblemFor(ticker: string): React.ReactNode {
  switch (ticker) {
    // XelisVault — a vault dial: ring, combination ticks, keyhole
    case 'VLT':
      return (
        <>
          <circle cx="16" cy="16" r="11.2" />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * Math.PI) / 4
            const x1 = 16 + Math.cos(a) * 8.6
            const y1 = 16 + Math.sin(a) * 8.6
            const x2 = 16 + Math.cos(a) * 11.2
            const y2 = 16 + Math.sin(a) * 11.2
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
          })}
          <circle cx="16" cy="14.4" r="3" />
          <path d="M14.8 17 L14.8 20.4 L17.2 20.4 L17.2 17" />
        </>
      )
    // XPay — payment rails: two arrows passing each other
    case 'XPAY':
      return (
        <>
          <path d="M6.5 12.4 H21.2" />
          <path d="M18.2 9.2 L21.8 12.4 L18.2 15.6" />
          <path d="M25.5 19.6 H10.8" />
          <path d="M13.8 16.4 L10.2 19.6 L13.8 22.8" />
          <path d="M23.6 12.4 V15.2" opacity="0.55" />
          <path d="M8.4 19.6 V16.8" opacity="0.55" />
        </>
      )
    // NovaPrivacy — a nova: four-point burst with diagonal rays
    case 'NOVA':
      return (
        <>
          <path d="M16 3.5 Q17.6 14.4 28.5 16 Q17.6 17.6 16 28.5 Q14.4 17.6 3.5 16 Q14.4 14.4 16 3.5 Z" />
          <path d="M23.4 5.8 L25.2 7.6" opacity="0.7" />
          <path d="M26.4 23.4 L24.6 25.2" opacity="0.7" />
          <path d="M8.6 5.8 L6.8 7.6" opacity="0.7" />
          <path d="M5.6 23.4 L7.4 25.2" opacity="0.7" />
          <circle cx="16" cy="16" r="1.3" fill="currentColor" stroke="none" />
        </>
      )
    // CypherDAO — a cipher seal: hexagon, inner diamond, core dot
    case 'CYPH':
      return (
        <>
          <path d="M16 3.4 L26.6 9.5 V22.5 L16 28.6 L5.4 22.5 V9.5 Z" />
          <path d="M16 10.4 L21.6 16 L16 21.6 L10.4 16 Z" />
          <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
        </>
      )
    // Kleos — a merit medal: ring, sparkle, ribbon tails
    case 'KLEOS':
      return (
        <>
          <circle cx="16" cy="13.2" r="7" />
          <path d="M16 8.6 Q16.7 12.4 20.4 13.2 Q16.7 14 16 17.8 Q15.3 14 11.6 13.2 Q15.3 12.4 16 8.6 Z" />
          <path d="M13 19.4 L11.2 26.6" />
          <path d="M19 19.4 L20.8 26.6" />
          <path d="M16 20.6 L16 23.8" opacity="0.7" />
        </>
      )
    // Obsidian — a cut gem: crown, girdle, pavilion
    case 'OBS':
      return (
        <>
          <path d="M9.4 12.2 L12.9 7.4 H19.1 L22.6 12.2 L16 25.6 Z" />
          <path d="M9.4 12.2 H22.6" />
          <path d="M12.9 7.4 L14.7 12.2 L16 25.6" />
          <path d="M19.1 7.4 L17.3 12.2 L16 25.6" />
          <path d="M16 7.4 L14.7 12.2 M16 7.4 L17.3 12.2" opacity="0.65" />
        </>
      )
    // MemeX — rejected: the prohibition sign
    case 'MEMEX':
      return (
        <>
          <circle cx="16" cy="16" r="10.6" />
          <path d="M8.5 8.5 L23.5 23.5" />
          <path d="M12.2 12.6 L14 12.6 M18 12.6 L19.8 12.6" opacity="0.6" />
          <path d="M13 19.4 Q16 21.4 19 19.4" opacity="0.6" />
        </>
      )
    // Native XEL — the orbital mark: core, tilted orbit, satellite
    case 'XEL':
      return (
        <>
          <circle cx="16" cy="16" r="4.6" />
          <ellipse cx="16" cy="16" rx="12.2" ry="7.4" transform="rotate(-24 16 16)" />
          <circle cx="27" cy="14.6" r="1.5" fill="currentColor" stroke="none" />
        </>
      )
    default:
      return (
        <>
          <circle cx="16" cy="16" r="9.5" />
          <path d="M11 16 H21 M16 11 V21" opacity="0.65" />
        </>
      )
  }
}

// ─── ProjectLogo — the framed emblem tile ────────────────────────

const TILE_SIZES = {
  xs: 'h-7 w-7',
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
} as const

export function ProjectLogo({
  ticker,
  size = 'md',
  frame = true,
  className,
  title,
}: {
  ticker: string
  size?: keyof typeof TILE_SIZES
  /** frame=false renders the bare emblem (no tile) — for inline badges */
  frame?: boolean
  className?: string
  title?: string
}) {
  const hue = LOGO_HUES[ticker] ?? 44
  const emblem = (
    <svg
      viewBox="0 0 32 32"
      className={cn('h-full w-full', !frame && 'shrink-0')}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={!title}
      role={title ? 'img' : undefined}
      {...(title ? { 'aria-label': title } : {})}
    >
      {emblemFor(ticker)}
    </svg>
  )

  if (!frame) return emblem

  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center border', TILE_SIZES[size], className)}
      style={{
        borderColor: `hsl(${hue} 62% 62% / 0.55)`,
        backgroundColor: `hsl(${hue} 62% 50% / 0.13)`,
        color: `hsl(${hue} 72% 76%)`,
        boxShadow: `inset 0 0 0 1px hsl(${hue} 62% 60% / 0.08)`,
      }}
    >
      <span className="flex h-[76%] w-[76%] items-center justify-center">{emblem}</span>
    </span>
  )
}

// ─── PairLogo — a pool pair (XEL underneath, the asset on top) ───

export function PairLogo({ ticker, size = 'sm', className }: { ticker: string; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span className={cn('relative inline-flex shrink-0 items-center', className)}>
      <span className="rotate-[-8deg] opacity-95" style={{ marginRight: '-8px' }}>
        <ProjectLogo ticker="XEL" size={size} />
      </span>
      <span className="relative z-[1] rotate-[8deg]">
        <ProjectLogo ticker={ticker} size={size} />
      </span>
    </span>
  )
}
