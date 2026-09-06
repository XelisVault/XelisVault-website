/**
 * Side store — which protocol world the visitor is exploring.
 *
 * XelisVault now operates on two protocols:
 *   - XELIS  : the confidential BlockDAG financial platform (the original site)
 *   - NERVA  : private CPU-mined digital cash (the /nerva world)
 *
 * The choice is session-scoped: every new browser session gets the
 * "Choose Your Side" gate again, exactly like launching the site fresh.
 *
 * EXCEPTION: shared payment links (/nerva/pay?d=…) are meant to be opened
 * by complete strangers. They must land straight on the checkout, no
 * ritual, no gate: hydrate() silently adopts the NERVA side for them.
 * Keep the path check in sync with the boot-veil script in app/layout.tsx.
 */

import { create } from 'zustand'

export type Side = 'xelis' | 'nerva'

const SIDE_KEY = 'xv-side-session-v1'

interface SideState {
  side: Side | null
  gateOpen: boolean
  /** true once hydrate() has run (lets the boot veil know the gate decision) */
  hydrated: boolean
  /** called once from the client after mount */
  hydrate: () => void
  choose: (side: Side) => void
  openGate: () => void
  closeGate: () => void
}

function readSessionSide(): Side | null {
  try {
    const v = sessionStorage.getItem(SIDE_KEY)
    return v === 'xelis' || v === 'nerva' ? v : null
  } catch {
    return null
  }
}

function writeSessionSide(side: Side | null) {
  try {
    if (side) sessionStorage.setItem(SIDE_KEY, side)
    else sessionStorage.removeItem(SIDE_KEY)
  } catch {
    /* private mode */
  }
}

/** Does this tab already remember a chosen side? (safe everywhere) */
export function hasSessionSide(): boolean {
  return readSessionSide() !== null
}

/**
 * Is the current URL a shared NervaLink checkout? Those are opened by
 * payers who have never seen the site: they must skip the gate entirely.
 * Pure-path check, safe in any environment (returns false server-side).
 */
export function isPaymentLinkPath(): boolean {
  try {
    return typeof window !== 'undefined'
      && window.location.pathname.replace(/\/+$/, '') === '/nerva/pay'
  } catch {
    return false
  }
}

/**
 * Is the current URL the ANTUMBRA teaser? Shared hype links must land
 * straight on the eclipse, no ritual: the teaser is protocol-neutral.
 * Pure-path check, safe in any environment. Keep in sync with the
 * boot-veil script in app/layout.tsx.
 */
export function isAntumbraTeaserPath(): boolean {
  try {
    return typeof window !== 'undefined'
      && window.location.pathname.replace(/\/+$/, '') === '/antumbra'
  } catch {
    return false
  }
}

/**
 * Crawlers and social preview bots never see the entry ritual: their job is
 * to read the page content, so the gate stays closed for them. The page
 * itself is fully server-rendered underneath either way — this just keeps
 * the rendered screenshot clean. Keep in sync with the bot regex in the
 * boot-veil script in app/layout.tsx.
 */
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|twitterbot|linkedinbot|discordbot|telegrambot|whatsapp|slackbot|google-inspectiontool|lighthouse|headlesschrome|puppeteer|playwright|chrome-lighthouse/i

function isAutomatedVisitor(): boolean {
  try {
    return typeof navigator !== 'undefined' && BOT_RE.test(navigator.userAgent)
  } catch {
    return false
  }
}

export const useSide = create<SideState>((set) => ({
  side: null,
  gateOpen: false,
  hydrated: false,

  hydrate: () => {
    const side = readSessionSide()
    if (side) {
      set({ side, gateOpen: false, hydrated: true })
      return
    }
    // A payer following a shared NervaLink lands straight on the checkout:
    // adopt the NERVA side silently, never show the Choose Your Side gate.
    if (isPaymentLinkPath()) {
      writeSessionSide('nerva')
      set({ side: 'nerva', gateOpen: false, hydrated: true })
      return
    }
    // A visitor following a shared ANTUMBRA teaser link lands straight on
    // the eclipse page: adopt the XELIS side silently (the teaser is
    // protocol-neutral and links back to the vault by itself).
    if (isAntumbraTeaserPath()) {
      writeSessionSide('xelis')
      set({ side: 'xelis', gateOpen: false, hydrated: true })
      return
    }
    // Search crawlers and link-preview bots: content, not theatre.
    if (isAutomatedVisitor()) {
      set({ side: 'xelis', gateOpen: false, hydrated: true })
      return
    }
    // No choice yet this session → open the gate (the site entry ritual).
    set({ side: null, gateOpen: true, hydrated: true })
  },

  choose: (side) => {
    writeSessionSide(side)
    set({ side, gateOpen: false })
  },

  openGate: () => set({ gateOpen: true }),

  closeGate: () => {
    // Closing without an explicit choice keeps the current side if any.
    set((s) => ({ gateOpen: false, side: s.side }))
  },
}))
