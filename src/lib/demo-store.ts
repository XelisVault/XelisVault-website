// XELIS Vault — App UI store.
// The old mock-data engine was removed: every module now reads live testnet
// data through src/lib/xelis/*. This store only tracks app shell state.

import { create } from 'zustand'

export type ModuleId =
  | 'get-started'
  | 'dashboard'
  | 'vault'
  | 'swap'
  | 'psm'
  | 'savings'
  | 'mixer'
  | 'chat'
  | 'oracle'
  | 'governance'
  | 'miner'
  | 'airdrop'
  | 'contracts'

interface AppState {
  activeModule: ModuleId
  open: boolean
  openApp: (module?: ModuleId) => void
  closeApp: () => void
  setModule: (m: ModuleId) => void
}

export const useDemo = create<AppState>((set) => ({
  activeModule: 'get-started',
  open: false,
  openApp: (module) => set({ open: true, ...(module ? { activeModule: module } : {}) }),
  closeApp: () => set({ open: false }),
  setModule: (m) => set({ activeModule: m }),
}))
