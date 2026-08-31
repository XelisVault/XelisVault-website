// XELIS Vault — Wallet store (Zustand)
//
// Connection method:
//  - XSWD: Genesix / xelis_wallet on ws://127.0.0.1:44325/xswd
//    → full balances + transaction signing
//
// Connection sequence (mirrors the wallet's XSWD server expectations):
//  1. connect()            — popup #1: approve the XELIS Vault application
//  2. prefetchPermissions()— popup #2: approve ALL permissions in one grouped
//                            popup (falls back to per-method prompts on older
//                            wallets, or silently if dismissed)
//  3. getAddress() / trackAsset / balances — no more popups after step 2
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
export type WalletConnectionState =
  | 'disconnected'
  | 'connecting'            // opening the WebSocket to the wallet
  | 'awaiting-approval'     // popup #1: application approval
  | 'authorizing'           // popup #2: grouped permissions approval
  | 'connected'
  | 'error'

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
    if (get().connectionType === 'xswd' && get().connectionState !== 'authorizing') {
      set({
        connectionState: xswdStateToConnState(s),
        ...(s === 'error' || s === 'disconnected'
          ? { address: null, xelBalance: 0, xusdBalance: 0, vltBalance: 0, error: msg ?? null }
          : {}),
      })
    }
  })

  // Wallet notifications (new block / balance change) → debounced refresh.
  // Registered ONCE here — never inside connectXSWD (listener leak).
  let refreshDebounce: ReturnType<typeof setTimeout> | null = null
  xswd.onNotification(() => {
    if (get().connectionType !== 'xswd') return
    if (refreshDebounce) clearTimeout(refreshDebounce)
    refreshDebounce = setTimeout(() => { get().refreshBalances() }, 800)
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
        // Popup #1 — approve the application in the wallet
        await xswd.connect()

        // Popup #2 — grouped permissions approval (single popup for all
        // methods). Best-effort: older wallets just prompt per method.
        set({ connectionState: 'authorizing' })
        await xswd.prefetchPermissions()

        // The application IS connected at this point. Everything below is
        // best-effort setup — a failure here must NOT flip the UI back to
        // "not connected" (that was the old, confusing behaviour).
        let address: string | null = null
        let softError: string | null = null
        try {
          address = await xswd.getAddress()
        } catch (e: any) {
          softError = String(e?.message || 'Could not read the wallet address')
        }

        // Track custom assets so the wallet can spend received VLT / xUSD
        await Promise.all([xswd.trackAsset(VLT_ASSET), xswd.trackAsset(XUSD_ASSET)])

        set({ connectionType: 'xswd', connectionState: 'connected', address, error: softError })

        // Subscribe to balance updates (needs the 'subscribe' permission,
        // granted by the grouped popup above)
        xswd.subscribe('balance_changed').catch(() => {})
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
