// XELIS Vault — Wallet store (Zustand)
//
// Connection methods:
//  - XSWD (primary): Genesix / xelis_wallet on ws://127.0.0.1:44325/xswd
//    → full balances + transaction signing
//  - view-only: paste any xet: address → public on-chain data only
//    (miner record, airdrop points, vaults). Balances are PRIVATE by design
//    on XELIS — only the wallet itself can decrypt them.
//
// The old local-RPC path (127.0.0.1:18082) was removed: XSWD now covers
// everything it did, with a proper permission flow.

import { create } from 'zustand'
import { getXSWDClient, type XSWDState } from './xelis/xswd'
import { XEL_ASSET, VLT_ASSET, XUSD_ASSET } from './xelis/contracts'
import { getOracleAggregate } from './xelis/reads'
import { fromAtomic } from './xelis/types'
import { clearRPCCache } from './xelis/rpc'

export type WalletConnectionType = 'xswd' | 'view-only' | null
export type WalletConnectionState = 'disconnected' | 'connecting' | 'awaiting-approval' | 'connected' | 'error'

interface WalletState {
  connectionType: WalletConnectionType
  connectionState: WalletConnectionState
  address: string | null
  error: string | null
  showConnectModal: boolean

  // Balances (human units, only meaningful with XSWD)
  xelBalance: number
  xusdBalance: number
  vltBalance: number
  xelPrice: number // XEL/USD from the StakedOracle aggregate
  lastRefresh: number

  // Actions
  setShowConnectModal: (show: boolean) => void
  connectXSWD: () => Promise<void>
  connectViewOnly: (address: string) => Promise<void>
  disconnect: () => void
  refreshBalances: () => Promise<void>
}

function xswdStateToConnState(s: XSWDState): WalletConnectionState {
  switch (s) {
    case 'connected': return 'connected'
    case 'connecting': return 'connecting'
    case 'awaiting-approval': return 'awaiting-approval'
    case 'error': return 'error'
    default: return 'disconnected'
  }
}

// Track a pending XSWD connect so the modal doesn't double-fire
let connecting = false

export const useWallet = create<WalletState>((set, get) => {
  const xswd = getXSWDClient()

  // Mirror XSWD state into the store
  xswd.onStateChange((s, msg) => {
    if (s === 'connected') return // handled in connectXSWD
    if (get().connectionType === 'xswd') {
      set({
        connectionState: xswdStateToConnState(s),
        ...(s === 'error' || s === 'disconnected'
          ? { address: null, xelBalance: 0, xusdBalance: 0, vltBalance: 0, error: msg ?? null }
          : {}),
      })
    }
  })

  return {
    connectionType: null,
    connectionState: 'disconnected',
    address: null,
    error: null,
    showConnectModal: false,

    xelBalance: 0,
    xusdBalance: 0,
    vltBalance: 0,
    xelPrice: 0,
    lastRefresh: 0,

    setShowConnectModal: (show) => set({ showConnectModal: show }),

    connectXSWD: async () => {
      if (connecting) return
      connecting = true
      set({ connectionType: 'xswd', connectionState: 'connecting', error: null })
      try {
        await xswd.connect()
        const address = await xswd.getAddress()
        // Track custom assets so the wallet can spend received VLT / xUSD
        await Promise.all([xswd.trackAsset(VLT_ASSET), xswd.trackAsset(XUSD_ASSET)])
        set({ connectionType: 'xswd', connectionState: 'connected', address, error: null })
        // Subscribe to balance updates (best-effort)
        xswd.subscribe('balance_changed').catch(() => {})
        xswd.onNotification(() => {
          // Any wallet notification (new block / balance change) → debounce refresh
          setTimeout(() => { get().refreshBalances() }, 800)
        })
        await get().refreshBalances()
      } catch (e: any) {
        set({
          connectionType: null,
          connectionState: 'error',
          error: String(e?.message || 'XSWD connection failed'),
        })
      } finally {
        connecting = false
      }
    },

    connectViewOnly: async (address) => {
      const clean = address.trim()
      if (!clean.startsWith('xet:') && !clean.startsWith('xel:')) {
        set({ error: 'Invalid address: expected xet:… (testnet) or xel:… (mainnet)' })
        return
      }
      set({
        connectionType: 'view-only',
        connectionState: 'connected',
        address: clean,
        error: null,
        // balances are private on XELIS — a view-only address cannot decrypt them
        xelBalance: 0,
        xusdBalance: 0,
        vltBalance: 0,
      })
      // still fetch the public XEL price for context
      try {
        const agg = await getOracleAggregate(0)
        if (agg) set({ xelPrice: agg.priceUsd })
      } catch { /* oracle unavailable */ }
    },

    disconnect: () => {
      if (get().connectionType === 'xswd') xswd.disconnect()
      set({
        connectionType: null,
        connectionState: 'disconnected',
        address: null,
        error: null,
        xelBalance: 0,
        xusdBalance: 0,
        vltBalance: 0,
      })
    },

    refreshBalances: async () => {
      const { connectionType, address } = get()
      // Oracle price for everyone
      getOracleAggregate(0)
        .then((agg) => { if (agg) set({ xelPrice: agg.priceUsd }) })
        .catch(() => {})

      if (connectionType !== 'xswd' || !address) return
      try {
        const [xel, vlt, xusd] = await Promise.all([
          xswd.getBalance(XEL_ASSET),
          xswd.getBalance(VLT_ASSET),
          xswd.getBalance(XUSD_ASSET),
        ])
        set({
          xelBalance: fromAtomic(xel),
          vltBalance: fromAtomic(vlt),
          xusdBalance: fromAtomic(xusd),
          lastRefresh: Date.now(),
        })
        clearRPCCache()
      } catch (e: any) {
        // silent: balances refresh on a timer; surface only hard failures
        if (String(e?.message).includes('not connected')) {
          set({ connectionState: 'error', error: 'Wallet connection lost' })
        }
      }
    },
  }
})

/** Whether the current connection can SIGN transactions (only XSWD). */
export function canSign(): boolean {
  const { connectionType, connectionState } = useWallet.getState()
  return connectionType === 'xswd' && connectionState === 'connected'
}
