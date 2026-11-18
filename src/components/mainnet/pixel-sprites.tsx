// Pixel sprites for the Mainnet HQ — hand-drawn bitmaps rendered as
// crisp SVG rect grids (shape-rendering: crispEdges keeps every pixel
// sharp at any scale; CSS `steps()` animations move them in authentic
// 8-bit fashion). One shared palette, one component.

'use client'

import { cn } from '@/lib/utils'

// ── Palette (brand-coherent CRT) ────────────────────────────────────
const P = {
  '.': 'transparent',
  k: '#0a0c14',     // void
  d: '#141827',     // dark panel
  b: '#232a44',     // panel border
  g: '#f0b35c',     // champagne gold
  G: '#c98a3d',     // gold shade
  t: '#5cc8d7',     // teal
  T: '#3a8494',     // teal shade
  e: '#6ee7a0',     // emerald
  E: '#3d9e6a',     // emerald shade
  r: '#d95763',     // bordeaux red
  R: '#8a3a43',     // red shade
  w: '#e8e4d8',     // paper white
  s: '#8a93b0',     // steel grey
  y: '#f5d76e',     // bright yellow
} as const

type Pal = keyof typeof P
type SpriteDef = { w: number; rows: string[] }

// ── Bitmaps ─────────────────────────────────────────────────────────
// 10×10 unless noted. Characters map to the palette above.

export const SPRITES = {
  rocket: {
    w: 14,
    rows: [
      '......ww......',
      '......ww......',
      '.....wwww.....',
      '.....gwwg.....',
      '.....gwwg.....',
      '....ggwwgg....',
      '....gwwwwg....',
      '...ggwwwwgg...',
      '..ggggwwggg...',
      '..gg.gwwg.gg..',
      '.ggg.gwwg.ggg.',
      '.gg..gyyg..gg.',
      '......yRy.....',
      '.....yR.Ry....',
      '......RR......',
    ],
  },
  vault: {
    w: 10,
    rows: [
      '.bbbbbbbb.',
      'bggggggggb',
      'bgddddddgb',
      'bgdwkkwdgb',
      'bgdkggkdgb',
      'bgdkgggkdg',
      'bgdkkkkdgb',
      'bgddddddgb',
      'bggggggggb',
      '.bbbbbbbb.',
    ],
  },
  gauge: {
    w: 10,
    rows: [
      '..bbbbbb..',
      '.bddddddb.',
      'bddggggddb',
      'bdg....gdb',
      'bdg....gdb',
      'bdg....gdb',
      'bddg..gdbb',
      '.bddggddb.',
      '..bddddb..',
      '...bwwb...',
    ],
  },
  swap: {
    w: 10,
    rows: [
      '..........',
      '..gg......',
      '.gggg.....',
      'gggggg..tt',
      '..gg...ttt',
      '.......ttt',
      'ttt...gg..',
      'ttt..ggggg',
      'tt......gg',
      '..........',
    ],
  },
  coins: {
    w: 10,
    rows: [
      '..........',
      '..gggg.gg.',
      '.gyyyyggg.',
      '.gyyyygg..',
      '.ggggg.gg.',
          '..gggg.gg.',
      '.gyyyyggg.',
      '.gyyyygg..',
      '.ggggg.gg.',
      '..........',
    ],
  },
  mixer: {
    w: 10,
    rows: [
      '....gg....',
      '...gwwg...',
      '..gwwwwg..',
      '.gwwwwwwg.',
      'gwwgggwwtg',
      'gwgg..ggtg',
      'gwg....gtg',
      'gg..gg..gg',
      'g...gg...g',
      '..........',
    ],
  },
  auction: {
    w: 10,
    rows: [
      '......ww..',
      '.....gwwg.',
      '....gwwwwg',
      '...b....b.',
      '..b.....b.',
      '.bbbbbbbbb',
      'bbbbbbbbbb',
      '.bbbbbbbb.',
      '..bbbbbb..',
      '..........',
    ],
  },
  bolt: {
    w: 10,
    rows: [
      '.....yyy..',
      '....yyy...',
      '...yyy....',
      '..yyyyyy..',
      '....yyy...',
      '...yyy....',
      '..yyy.....',
      '.yyy......',
      '.yy.......',
      '.y........',
    ],
  },
  shield: {
    w: 10,
    rows: [
      '.gggggggg.',
      'gtttttttg.',
      'gtewwwweg.',
      'gtweeeewg.',
      'gtweweewg.',
      'gtwweewwg.',
      '.gtwwewg..',
      '.gtwwwwg..',
      '..gtwwg...',
      '...gtg....',
    ],
  },
  eye: {
    w: 10,
    rows: [
      '..........',
      '..tttttt..',
      '.ttwwwwtt.',
      'ttwwggwwtt',
      'twwgkkgwwt',
      'ttwwggwwtt',
      '.ttwwwwtt.',
      '..tttttt..',
      '..........',
      '..........',
    ],
  },
  vote: {
    w: 10,
    rows: [
      '..bbbbbb..',
      '.bddddddb.',
      'bddwddddgb',
      'bddddwddgb',
      'bddddddggb',
      '.bddddddb.',
      '..bwwwwb..',
      '...bwwb...',
      '..........',
      '..........',
    ],
  },
  pickaxe: {
    w: 10,
    rows: [
      '...ssss...',
      '..s....ss.',
      '.s..ww...s',
      's..wwww..s',
      '...wwww..s',
      '....www.s.',
      '....ww.s..',
      '...ww.s...',
      '..ww.s....',
      '.w.s......',
    ],
  },
  bank: {
    w: 10,
    rows: [
      '....gg....',
      '...gwwg...',
      '..gwwwwg..',
      '.gggggggg.',
      'gwwwwwwwwg',
      'gw.wwww.wg',
      'gwwwwwwwwg',
      'gw.wwww.wg',
      'gwwwwwwwwg',
      'gggggggggg',
    ],
  },
  people: {
    w: 10,
    rows: [
      '..e....e..',
      '.eee..eee.',
      '..e....e..',
      '..........',
      '.eee..eee.',
      'eeeee.eeee',
      'e.e.e.e.e.',
      '..........',
      '..e....e..',
      '..e....e..',
    ],
  },
  chat: {
    w: 10,
    rows: [
      '.bbbbbbbb.',
      'bwwwwwwwwb',
      'bwgg..gwwb',
      'bwwwwwwwwb',
      'bw..gg..wb',
      'bwwwwwwwwb',
      '.bbbbbbbb.',
      '...bb.....',
      '..........',
      '..........',
    ],
  },
  wallet: {
    w: 10,
    rows: [
      '..........',
      '.gggggggg.',
      'gyyyyyyyyg',
      'gy......yg',
      'gy.dddd.yg',
      'gy.dggd.yg',
      'gy.dddd.yg',
      'gy......yg',
      'gyyyyyyyyg',
      '.gggggggg.',
    ],
  },
  code: {
    w: 10,
    rows: [
      '..........',
      '..t....t..',
      '.t.t..t.t.',
      't...tt...t',
      't...tt...t',
      't...tt...t',
      't...tt...t',
      't...tt...t',
      '.t.t..t.t.',
      '..t....t..',
    ],
  },
  gamepad: {
    w: 10,
    rows: [
      '..........',
      '.dddddddd.',
      'dddddddddd',
      'dw.ddddd.d',
      'dwdd.dd.dd',
      'dddddddddd',
      '.dddddddd.',
      '..d....d..',
      '..........',
      '..........',
    ],
  },
  flag: {
    w: 10,
    rows: [
      '.g........',
      '.gggggggg.',
      '.gyyyyyyg.',
      '.gygwwgyg.',
      '.gyyyyyyg.',
      '.gggggggg.',
      '.g........',
      '.g........',
      '.g........',
      'ggg.......',
    ],
  },
  scroll: {
    w: 10,
    rows: [
      '..gggggg..',
      '.g......g.',
      'g.wwwwww.g',
      'g.w....w.g',
      'g.w.gg.w.g',
      'g.w....w.g',
      'g.wwwwww.g',
      '.g......g.',
      '..gggggg..',
      '..........',
    ],
  },
  star: {
    w: 9,
    rows: [
      '....g....',
      '....g....',
      '...gyg...',
      'gggyyyggg',
      '..gyyyyg.',
      '...gyg...',
      '...g.g...',
      '..g...g..',
      '.g.....g.',
    ],
  },
} satisfies Record<string, SpriteDef>

export type SpriteName = keyof typeof SPRITES

// ── Renderer ────────────────────────────────────────────────────────

/**
 * A sprite: SVG made of 1×1 rects scaled to `px` (integer scales keep
 * the pixels crisp — never fractional). Animate with the `bob` /
 * `blink` helpers (CSS steps() keeps the motion 8-bit).
 */
export function PixelSprite({
  name,
  px = 4,
  className,
  style,
  title,
}: {
  name: SpriteName
  /** pixel size (integer recommended) */
  px?: number
  className?: string
  style?: React.CSSProperties
  title?: string
}) {
  const def = SPRITES[name]
  const h = def.rows.length
  const cells: React.ReactNode[] = []
  def.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x] as Pal
      const fill = P[c]
      if (!fill || fill === 'transparent') continue
      cells.push(
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />,
      )
    }
  })
  return (
    <svg
      viewBox={`0 0 ${def.w} ${h}`}
      width={def.w * px}
      height={h * px}
      shapeRendering="crispEdges"
      className={cn('shrink-0 select-none', className)}
      style={{ imageRendering: 'pixelated', ...style }}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
    >
      {cells}
    </svg>
  )
}
