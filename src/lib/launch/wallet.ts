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
import { getLaunchXSWDClient, LAUNCH_APP_DATA, mainnetConnectError } from './xswd'
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

  connect: () => Promise<void>
  disconnect: () => void
  refreshBalances: () => Promise<void>
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

export const useLaunchWallet = create<LaunchWalletStore>((set, get) => ({
  state: 'disconnected',
  message: null,
  address: null,
  network: null,
  isMainnet: null,
  xelBalance: null,
  assetBalances: {},
  tracked: new Set<string>(),

  connect: async () => {
    const client = getLaunchXSWDClient()
    try {
      set({ state: 'connecting', message: null })
      await client.connect(LAUNCH_APP_DATA)
      // ONE grouped permission popup instead of one per method
      client.prefetchPermissions().catch(() => {})
      const address = await client.getAddress()
      set({ state: 'connected', address })

      // network check — VaultLaunch is MAINNET only
      try {
        const info = await client.getNodeInfo()
        const network = String(info?.network ?? info?.chain ?? '')
        set({ network: network || null, isMainnet: network === 'mainnet' })
      } catch {
        set({ network: null, isMainnet: null })
      }

      // balances + live updates
      try {
        await client.subscribe('balance_changed')
      } catch { /* older wallets */ }
      client.onNotification(() => {
        void get().refreshBalances()
      })

      await get().refreshBalances()
      // the store reads this wallet's on-chain votes
      void useMainnet.getState().refreshUserVotes(address)
    } catch (err) {
      set({
        state: 'error',
        message: mainnetConnectError(err),
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
    }
  })
}
