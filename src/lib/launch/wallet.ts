// VaultLaunch wallet — XSWD on MAINNET (Genesix / xelis_wallet).
//
// The demo playground wallet is gone: every action in the app is a real
// mainnet transaction signed by the user's own wallet. This store keeps
// the connection state, the XEL balance, the balances of every launched
// asset the wallet tracks (XELIS balances are confidential — the wallet
// is the ONLY source), and warns loudly if the wallet is not on
// mainnet.

'use client'

import { create } from 'zustand'
import {
  getLaunchXSWDClient, LAUNCH_APP_DATA, mainnetConnectError,
  startLaunchRelaySession, type LaunchRelaySession,
} from './xswd'
import { useMainnet } from './mainnet-store'
import { useCommunity } from './community-store'
import type { XSWDState } from '@/lib/xelis/xswd'

const XEL_ASSET_HEX = '0'.repeat(64)

interface LaunchWalletStore {
  state: XSWDState
  message: string | null
  address: string | null
  network: string | null
  /** true when the wallet's daemon is on the XELIS mainnet */
  isMainnet: boolean | null
  /** human XEL balance */
  xelBalance: number | null
  /** human balance per launched asset hash (tokens held in the wallet) */
  assetBalances: Record<string, number>
  /** assets the wallet was asked to track */
  tracked: Set<string>
  /** the relay session (QR / web-mobile path), when connected that way */
  relayActive: boolean

  connect: () => Promise<void>
  /** Connect a WEB/MOBILE wallet (Genesix web at wallet.xelis.io or the
   *  mobile app) through the official XSWD relay: the site shows a QR,
   * the wallet scans it, frames are AES-256-GCM encrypted end-to-end.
   *  `onQR` receives the QR payload (JSON string) the moment the
   *  channel is open — show it immediately, the wallet joining is
   *  awaited inside. */
  connectRelay: (onQR: (qr: string | null, info?: { timeoutSeconds?: number }) => void) => Promise<void>
  disconnect: () => void
  refreshBalances: () => Promise<void>
  /** best-effort address fetch + background retries when the wallet is
   *  connected but the address isn't known yet (permission popup not
   *  answered). Trading NEVER needs the address — signing goes through
   *  the wallet — so its absence must never block the trade panels. */
  ensureAddress: () => Promise<void>
  /** make sure the wallet tracks a launched asset, then read its balance */
  ensureAsset: (asset: string) => Promise<void>
}

function toXel(v: any): number | null {
  try {
    if (v == null) return null
    return Number(BigInt(v)) / 1e8
  } catch {
    return null
  }
}

type SetFn = (partial: Partial<LaunchWalletStore>) => void
type GetFn = () => LaunchWalletStore

/** Shared post-approval flow (local & relay paths identical from here). */
async function afterConnect(client: ReturnType<typeof getLaunchXSWDClient>, set: SetFn, get: GetFn): Promise<void> {
  // The application is APPROVED — the session is live. From this
  // point NOTHING below may flip the state back: a dismissed
  // address/balance popup is not a disconnection, and trading
  // (signing) works through the wallet regardless of the address.
  set({ state: 'connected', message: null })

  // ONE grouped permission popup instead of one per method
  client.prefetchPermissions().catch(() => {})

  // best-effort enrichment — each step self-heals in the background
  void get().ensureAddress()
  try {
    const info = await client.getNodeInfo()
    const network = String(info?.network ?? info?.chain ?? '')
    set({ network: network || null, isMainnet: network === 'mainnet' })
  } catch {
    set({ network: null, isMainnet: null })
  }

  // balances + live updates — non-blocking: the balance prompts may
  // still be on screen, the chip fills in when they're answered
  try {
    await client.subscribe('balance_changed')
  } catch { /* older wallets */ }
  client.onNotification(() => {
    void get().refreshBalances()
  })

  void get().refreshBalances()
}

export const useLaunchWallet = create<LaunchWalletStore>((set, get) => ({
  state: 'disconnected',
  message: null,
  address: null,
  network: null,
  isMainnet: null,
  xelBalance: null,
  assetBalances: {},
  tracked: new Set<string>(),
  relayActive: false,

  connect: async () => {
    const client = getLaunchXSWDClient()
    try {
      set({ state: 'connecting', message: null })
      await client.connect(LAUNCH_APP_DATA)
      await afterConnect(client, set, get)
    } catch (err) {
      set({
        state: 'error',
        message: mainnetConnectError(err),
        relayActive: false,
      })
      throw err
    }
  },

  connectRelay: async (onQR) => {
    const client = getLaunchXSWDClient()
    let session: LaunchRelaySession | null = null
    try {
      set({ state: 'connecting', message: 'Waiting for the wallet to scan the code…' })
      session = await startLaunchRelaySession({
        onQRReady: (qr) => onQR(JSON.stringify(qr)),
        onError: () => onQR(null),
      })
      // the wallet joined the channel — run the standard XSWD handshake
      // on the tunnel (approval popup in the wallet), then the usual flow
      onQR(null) // hide the QR — the next step is the approval
      set({ state: 'connecting', message: 'Approve the connection in your wallet…' })
      await client.connect(session.appData, session.connection.socket)
      set({ relayActive: true })
      await afterConnect(client, set, get)
    } catch (err) {
      try { session?.connection.close() } catch { /* already closed */ }
      set({
        state: 'error',
        message: mainnetConnectError(err),
        relayActive: false,
      })
      throw err
    }
  },

  disconnect: () => {
    const client = getLaunchXSWDClient()
    if (client.state !== 'disconnected') client.disconnect()
    set({
      state: 'disconnected',
      message: null,
      address: null,
      network: null,
      isMainnet: null,
      xelBalance: null,
      assetBalances: {},
      tracked: new Set<string>(),
      relayActive: false,
    })
    void useMainnet.getState().refreshUserVotes(null)
  },

  refreshBalances: async () => {
    const client = getLaunchXSWDClient()
    if (client.state !== 'connected') return
    const { address, tracked } = get()
    try {
      const bal = await client.getBalance(XEL_ASSET_HEX)
      set({ xelBalance: toXel(bal) })
    } catch { /* user may skip the balance prompt */ }
    // launched assets the wallet tracks (or that exist in the stores)
    const assets = new Set(tracked)
    for (const p of useMainnet.getState().projects) {
      if (p.asset) assets.add(p.asset)
    }
    for (const c of useCommunity.getState().coins) {
      if (c.asset) assets.add(c.asset)
    }
    const updates: Record<string, number> = { ...get().assetBalances }
    await Promise.all(
      [...assets].map(async (asset) => {
        try {
          const b = await client.getBalance(asset)
          updates[asset] = toXel(b) ?? 0
        } catch {
          // asset not tracked by the wallet — leave as-is
        }
      }),
    )
    set({ assetBalances: updates })
    if (address) void useMainnet.getState().refreshUserVotes(address)
  },

  /** Best-effort address fetch with retries — the wallet may need the
   *  user to answer a permission popup, or the popup can be dismissed
   *  the first time. Retrying in the background keeps the UI honest
   *  without ever blocking a trade. */
  ensureAddress: async () => {
    const client = getLaunchXSWDClient()
    for (let attempt = 0; attempt < 4; attempt++) {
      if (client.state !== 'connected') return
      if (get().address) {
        const address = get().address!
        void useMainnet.getState().refreshUserVotes(address)
        return
      }
      try {
        const address = await client.getAddress()
        if (address) {
          set({ address })
          void useMainnet.getState().refreshUserVotes(address)
          void get().refreshBalances()
          return
        }
      } catch {
        // wait and retry (the popup may still be on screen)
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)))
      }
    }
  },

  ensureAsset: async (asset) => {
    const client = getLaunchXSWDClient()
    if (client.state !== 'connected' || !asset) return
    const tracked = new Set(get().tracked)
    if (!tracked.has(asset)) {
      tracked.add(asset)
      set({ tracked })
      await client.trackAsset(asset)
    }
    await get().refreshBalances()
  },
}))

// Keep the state in sync if the socket drops on its own
let syncInitialized = false
export function initLaunchWalletSync() {
  if (syncInitialized) return
  syncInitialized = true
  const client = getLaunchXSWDClient()
  client.onStateChange((s, msg) => {
    if (s === 'disconnected' || s === 'error') {
      useLaunchWallet.setState({
        state: s,
        message: msg ?? 'Wallet connection lost',
        address: null,
        xelBalance: null,
        assetBalances: {},
      })
      void useMainnet.getState().refreshUserVotes(null)
    } else {
      useLaunchWallet.setState({ state: s, message: msg ?? null })
      // self-heal: the socket says connected but the address isn't
      // known yet (the store may have been re-created, or the state
      // fired before connect() reached getAddress) — fetch it now.
      if (s === 'connected' && !useLaunchWallet.getState().address) {
        void useLaunchWallet.getState().ensureAddress()
      }
    }
  })
}
