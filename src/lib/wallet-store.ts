// XELIS Vault — Wallet store (Zustand)
//
// Connection method:
//  - XSWD: Genesix / xelis_wallet on ws://127.0.0.1:44325/xswd
//    → full balances + transaction signing
//
// There is deliberately NO view-only mode: XELIS balances are confidential
// by design — only the wallet itself can decrypt them, so watching a bare
// address adds nothing. Either connect a real wallet (XSWD) or use the CLI.
//
// The old local-RPC path (127.0.0.1:18082) was removed: XSWD now covers
// everything it did, with a proper permission flow.

import { create } from 'zustand'
import { getXSWDClient, type XSWDState } from './xelis/xswd'
import { XEL_ASSET, VLT_ASSET, XUSD_ASSET } from './xelis/contracts'
import { getOracleAggregate } from './xelis/reads'
import { fromAtomic } from './xelis/types'
import { clearRPCCache } from './xelis/rpc'

export type WalletConnectionType = 'xswd' | null
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
