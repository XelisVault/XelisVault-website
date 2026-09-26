// VaultLaunch — the connect-modal UI state, global on purpose.
//
// WHY a store: trade panels across the app (coin curve, pool swap,
// project curve, DEX, launch forms) all gate on the wallet. When the
// wallet is NOT connected, those buttons used to be dead ends saying
// "connect wallet to trade" while disabled — the user had to find the
// tiny topbar button. Now every one of them opens THE modal directly.
//
// Also the recovery path: if the XSWD socket dropped or the permission
// popup was dismissed (the wallet app can still show "connected" on
// its side while the site lost the session), the modal shows the real
// state and offers a one-click reconnect.

'use client'

import { create } from 'zustand'

interface ConnectModalStore {
  open: boolean
  show: () => void
  hide: () => void
}

export const useConnectModal = create<ConnectModalStore>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}))
