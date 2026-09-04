/**
 * Side store — which protocol world the visitor is exploring.
 *
 * XelisVault now operates on two protocols:
 *   - XELIS  : the confidential BlockDAG financial platform (the original site)
 *   - NERVA  : private CPU-mined digital cash (the /nerva world)
 *
 * The choice is session-scoped: every new browser session gets the
 * "Choose Your Side" gate again, exactly like launching the site fresh.
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

export const useSide = create<SideState>((set) => ({
  side: null,
  gateOpen: false,
  hydrated: false,

  hydrate: () => {
    const side = readSessionSide()
    // No choice yet this session → open the gate (the site entry ritual).
    set(side ? { side, gateOpen: false, hydrated: true } : { side: null, gateOpen: true, hydrated: true })
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
