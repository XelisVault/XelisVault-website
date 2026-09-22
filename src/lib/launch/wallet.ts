// VaultLaunch wallet store — demo wallet + XSWD (mainnet).
//
// VaultLaunch ships in two modes:
//   • DEMO — the simulated market engine with a 250,000 XEL playground wallet.
//     All trades are fictional; this is the showcase mode.
//   • XSWD — the real XELIS Secure Wallet Daemon (Genesix / xelis_wallet on
//     MAINNET). The contracts are not deployed yet, so the app shows live
//     wallet data (address, XEL balance) but trading stays in demo until
//     the mainnet launch.

'use client'

import { create } from 'zustand'
import { getLaunchXSWDClient, LAUNCH_APP_DATA } from './xswd'
import type { XSWDState } from '@/lib/xelis/xswd'

export type WalletMode = 'demo' | 'xswd'

interface LaunchWalletStore {
  mode: WalletMode
  xswdState: XSWDState
  xswdMessage: string | null
  xswdAddress: string | null
  xswdBalanceXel: number | null
  xswdNetwork: string | null
  connectDemo: () => void
  connectXswd: () => Promise<void>
  disconnectXswd: () => void
}

const XEL_ASSET_HEX = '0'.repeat(64)

export const useLaunchWallet = create<LaunchWalletStore>((set, get) => ({
  mode: 'demo',
  xswdState: 'disconnected',
  xswdMessage: null,
  xswdAddress: null,
  xswdBalanceXel: null,
  xswdNetwork: null,

  connectDemo: () => {
    get().disconnectXswd()
    set({ mode: 'demo' })
  },

  connectXswd: async () => {
    const client = getLaunchXSWDClient()
    try {
      set({ xswdState: 'connecting', xswdMessage: null })
      await client.connect(LAUNCH_APP_DATA)
      // One grouped permission popup instead of one per method
      client.prefetchPermissions().catch(() => {})
      const address = await client.getAddress()
      set({ mode: 'xswd', xswdState: 'connected', xswdAddress: address })
      // Balance + network info (best-effort)
      try {
        const bal = await client.getBalance(XEL_ASSET_HEX)
        set({ xswdBalanceXel: Number(BigInt(bal ?? 0)) / 1e8 })
      } catch { /* user may skip the balance prompt */ }
      try {
        const info = await client.getNodeInfo()
        const network = info?.network ?? info?.chain ?? 'mainnet'
        set({ xswdNetwork: String(network) })
      } catch { /* not critical */ }
      try {
        await client.subscribe('balance_changed')
        client.onNotification(async (n) => {
          if (n?.method === 'balance_changed' || n?.params?.asset !== undefined) {
            try {
              const bal = await client.getBalance(XEL_ASSET_HEX)
              set({ xswdBalanceXel: Number(BigInt(bal ?? 0)) / 1e8 })
            } catch { /* ignore */ }
          }
        })
      } catch { /* ignore */ }
    } catch (err) {
      set({
        xswdState: 'error',
        xswdMessage: err instanceof Error ? err.message : 'Connection failed',
      })
      throw err
    }
  },

  disconnectXswd: () => {
    const client = getLaunchXSWDClient()
    if (client.state !== 'disconnected') client.disconnect()
    set({
      mode: 'demo',
      xswdState: 'disconnected',
      xswdAddress: null,
      xswdBalanceXel: null,
      xswdNetwork: null,
      xswdMessage: null,
    })
  },
}))

// Keep xswdState in sync if the socket drops on its own
let syncInitialized = false
export function initLaunchWalletSync() {
  if (syncInitialized) return
  syncInitialized = true
  const client = getLaunchXSWDClient()
  client.onStateChange((s, msg) => {
    const w = useLaunchWallet.getState()
    if (w.mode === 'xswd' && (s === 'disconnected' || s === 'error')) {
      useLaunchWallet.setState({ mode: 'demo', xswdState: s, xswdMessage: msg ?? 'Wallet connection lost · demo mode restored' })
    } else {
      useLaunchWallet.setState({ xswdState: s, xswdMessage: msg ?? null })
    }
  })
}
