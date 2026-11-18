// Shared pixel fonts (next/font module-level instances are deduped —
// importing this from several components loads the CSS exactly once).
// Press Start 2P = headings/labels (the 8-bit voice), VT323 = body
// (a readable terminal face at larger sizes).
import { Press_Start_2P, VT323 } from 'next/font/google'

export const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pixel',
})

export const terminalFont = VT323({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-vt',
})

/** Tailwind arbitrary font-family helpers. */
export const FONT_PIXEL = 'font-[family-name:var(--font-pixel)]'
export const FONT_VT = 'font-[family-name:var(--font-vt)]'
