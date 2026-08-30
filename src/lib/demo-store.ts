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

export const MODULE_IDS: ModuleId[] = [
  'get-started',
  'dashboard',
  'vault',
  'swap',
  'psm',
  'savings',
  'mixer',
  'chat',
  'oracle',
  'governance',
  'miner',
  'airdrop',
  'contracts',
]

const isModuleId = (v: unknown): v is ModuleId =>
  typeof v === 'string' && (MODULE_IDS as string[]).includes(v)

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
  // NOTE: the argument is guarded — a React event (or any garbage) passed
  // by mistake as `this`-less handler can never corrupt activeModule again.
  openApp: (module) =>
    set({ open: true, ...(isModuleId(module) ? { activeModule: module } : {}) }),
  closeApp: () => set({ open: false }),
  setModule: (m) => set(isModuleId(m) ? { activeModule: m } : {}),
}))
