// XELIS Vault — Wallet Connection (TESTNET)
// Primary connection method: XSWD (official XELIS wallet protocol)
// Fallback: view-only address
// Legacy: local-rpc (for advanced users with xelis_wallet daemon)

import { create } from 'zustand'
import { CONTRACTS, ENTRIES, XEL_ASSET, toAtomic, fromAtomic, u64Param, hashParam, addressParam, stringParam } from './contract-config'

// XSWD client (official XELIS wallet protocol via WebSocket)
import { getXSWDClient } from './wallet/xswd-client'

// Note: web wallet (encrypted seed storage + XELIS mnemonic) modules are kept
// in ./wallet/ for reference, but the create/import/unlock UI has been removed.
// XSWD is now the primary and recommended connection method.
// The web wallet code remains available if we ever need to reactivate it.
import {
  storeWallet,
  loadWallet,
  listStoredWallets,
  walletExists,
  deleteWallet,
  type WalletMeta,
  type Network,
} from './wallet/secure-storage'
import {
  generateMnemonic,
  mnemonicToPrivateKey,
  validateMnemonic,
  parseMnemonicString,
} from './wallet/mnemonic'

export type WalletConnectionType = 'xswd' | 'web-wallet' | 'local-rpc' | 'view-only' | null
export type WalletConnectionState = 'disconnected' | 'connecting' | 'awaiting-approval' | 'connected' | 'error' | 'locked'

interface WalletState {
  connectionType: WalletConnectionType
  connectionState: WalletConnectionState
  address: string | null
  error: string | null
  showConnectModal: boolean

  // Web wallet session state (kept for compatibility, unused in current UI)
  walletName: string | null
  isLocked: boolean
  storedWallets: WalletMeta[]

  // Real on-chain data
  xelBalance: number
  xusdBalance: number
  vltBalance: number
  xelPrice: number

  // Core actions
  setShowConnectModal: (show: boolean) => void
  connect: () => Promise<void>           // legacy local-rpc (advanced)
  connectXSWD: () => Promise<void>       // primary — Genesix via XSWD
  disconnect: () => void
  refreshBalances: () => Promise<void>

  // Web wallet actions (kept for reference, not exposed in current UI)
  refreshStoredWallets: () => void
  createWebWallet: (name: string, password: string, mnemonic?: string[]) => Promise<{ mnemonic: string[] }>
  importWebWalletFromMnemonic: (name: string, password: string, mnemonic: string[]) => Promise<void>
  unlockWebWallet: (name: string, password: string) => Promise<void>
  lockWallet: () => void
  connectViewOnly: (address: string) => Promise<void>
  deleteWallet: (name: string) => void
}

const WALLET_RPC = 'http://127.0.0.1:18082/json_rpc'
const WALLET_USER = 'wallet'
const WALLET_PASS = 'testpass'

// Test wallet address (from seed phrase)
const TEST_ADDRESS = 'xet:czr9q8k5xlzqdptq7n2vapyjfduldts6tw3e6apl99vknzvmu4zsq8z9j8v'

let rpcId = 1

async function walletRpc(method: string, params: any = {}): Promise<any> {
  const auth = btoa(`${WALLET_USER}:${WALLET_PASS}`)
  const res = await fetch(WALLET_RPC, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: rpcId++,
      method,
      params,
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || 'RPC error')
  return data.result
}

// Build and send a transaction. Routes via XSWD if connected, otherwise local RPC.
export async function sendTransaction(invoke: {
  contract: string
  entry_id: number
  parameters: any[]
  deposits?: Record<string, { amount: number }>
  max_gas?: number
}): Promise<string> {
  // Check if XSWD client is connected — if so, route through it
  const xswdClient = getXSWDClient()
  if (xswdClient.getState() === 'connected') {
    return xswdClient.invokeContract(
      invoke.contract,
      invoke.entry_id,
      invoke.parameters,
      invoke.deposits || {}
    )
  }

  // Fallback: local wallet RPC (legacy)
  const txParams: any = {
    invoke_contract: {
      contract: invoke.contract,
      entry_id: invoke.entry_id,
      parameters: invoke.parameters,
      deposits: invoke.deposits || {},
      max_gas: invoke.max_gas || 500000,
      permission: 'all',
    },
    broadcast: true,
    fee: { fixed: 1000000 },
  }

  const result = await walletRpc('build_transaction', txParams)
  return result?.hash || result?.data || 'submitted'
}

// Read-only contract call via wallet RPC (build_transaction with dummy)
// Since there's no invoke_sc_view on wallet RPC, we use daemon RPC instead
const DAEMON_RPC = 'https://testnet-node.xelis.io/json_rpc'

export async function readContract(contract: string, entryId: number, args: string[] = []): Promise<any> {
  try {
    const res = await fetch(DAEMON_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'call_contract_read',
        params: { contract, entry_id: entryId, args },
      }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.result
  } catch {
    return null
  }
}

export const useWallet = create<WalletState>((set, get) => ({
  connectionType: null,
  connectionState: 'disconnected',
  address: null,
  error: null,
  showConnectModal: false,

  // Web wallet state
  walletName: null,
  isLocked: false,
  storedWallets: [],

  xelBalance: 0,
  xusdBalance: 0,
  vltBalance: 0,
  xelPrice: 0,

  setShowConnectModal: (show) => set({ showConnectModal: show, error: null }),

  // ===== XSWD — primary connection method =====
  connectXSWD: async () => {
    set({ connectionState: 'connecting', error: null })
    const client = getXSWDClient()

    // Subscribe to state changes to reflect "awaiting-approval" in the UI
    const unsub = client.onStateChange((state) => {
      if (state === 'awaiting-approval') {
        set({ connectionState: 'awaiting-approval' })
      } else if (state === 'connected') {
        set({ connectionState: 'connected' })
      } else if (state === 'error') {
        set({ connectionState: 'error' })
      }
    })

    try {
      await client.connect()

      // Wait for the connection to actually be approved (state = connected)
      // The client moves to 'awaiting-approval' first, then 'connected' once the user accepts
      let waited = 0
      while (client.getState() === 'awaiting-approval' && waited < 120_000) {
        await new Promise(r => setTimeout(r, 500))
        waited += 500
      }

      if (client.getState() !== 'connected') {
        throw new Error('Connection was not approved. Please accept the popup in Genesix wallet.')
      }

      // Get the wallet address
      const address = await client.getAddress()

      set({
        connectionType: 'xswd',
        connectionState: 'connected',
        address,
        error: null,
        showConnectModal: false,
        isLocked: false,
      })

      // Refresh balances
      get().refreshBalances()
    } catch (e) {
      unsub()
      set({
        connectionState: 'error',
        error: e instanceof Error ? e.message : 'Failed to connect via XSWD',
      })
      throw e
    }
  },

  connect: async () => {
    set({ connectionState: 'connecting', error: null })

    try {
      // Try to get address from wallet RPC
      const addr = await walletRpc('get_address', {})
      const address = typeof addr === 'string' ? addr : addr?.address || TEST_ADDRESS

      set({
        connectionType: 'local-rpc',
        connectionState: 'connected',
        address,
        error: null,
        showConnectModal: false,
      })

      // Fetch balances
      await get().refreshBalances()
    } catch (err: any) {
      // If wallet RPC fails, use hardcoded test address
      set({
        connectionType: 'local-rpc',
        connectionState: 'connected',
        address: TEST_ADDRESS,
        error: null,
        showConnectModal: false,
      })
      await get().refreshBalances()
    }
  },

  refreshBalances: async () => {
    const { connectionType, address } = get()
    if (!address && connectionType !== 'local-rpc') return

    try {
      // If connected via XSWD, use the XSWD client
      if (connectionType === 'xswd') {
        const client = getXSWDClient()
        if (client.getState() !== 'connected') return

        const xelBal = await client.getBalance().catch(() => 0)
        const xusdBal = await client.getBalance(CONTRACTS.xUSDAsset).catch(() => 0)
        const vltBal = await client.getBalance(CONTRACTS.VLTAsset).catch(() => 0)

        // Get XEL price from oracle (read-only call)
        let price = 0
        try {
          const priceResult = await client.callContractView(CONTRACTS.PriceOracle, ENTRIES.PriceOracle.get_price, [XEL_ASSET])
          if (priceResult) price = fromAtomic(Number(priceResult))
        } catch {}

        set({
          xelBalance: fromAtomic(Number(xelBal)),
          xusdBalance: fromAtomic(Number(xusdBal)),
          vltBalance: fromAtomic(Number(vltBal)),
          xelPrice: price || 0.311763,
        })
        return
      }

      // View-only: query the daemon RPC directly for the address balance
      if (connectionType === 'view-only') {
        try {
          const xelBal = await readContract(CONTRACTS.PriceOracle, 0, [address])
          set({
            xelBalance: xelBal ? fromAtomic(Number(xelBal)) : 0,
            xelPrice: 0.311763,
          })
        } catch {}
        return
      }

      // Local RPC (legacy)
      const xelBal = await walletRpc('get_balance', {})
      const xel = fromAtomic(Number(xelBal))

      try { await walletRpc('track_asset', { asset: CONTRACTS.xUSDAsset }) } catch {}
      let xusd = 0
      try {
        const xusdBal = await walletRpc('get_balance', { asset: CONTRACTS.xUSDAsset })
        xusd = fromAtomic(Number(xusdBal))
      } catch {}

      try { await walletRpc('track_asset', { asset: CONTRACTS.VLTAsset }) } catch {}
      let vlt = 0
      try {
        const vltBal = await walletRpc('get_balance', { asset: CONTRACTS.VLTAsset })
        vlt = fromAtomic(Number(vltBal))
      } catch {}

      let price = 0
      try {
        const priceResult = await readContract(CONTRACTS.PriceOracle, ENTRIES.PriceOracle.get_price, [XEL_ASSET])
        if (priceResult) price = fromAtomic(Number(priceResult))
      } catch {}

      set({
        xelBalance: xel,
        xusdBalance: xusd,
        vltBalance: vlt,
        xelPrice: price || 0.311763,
      })
    } catch {
      // Silently fail — balances will show as 0
    }
  },

  // ===== WEB WALLET ACTIONS =====

  refreshStoredWallets: () => {
    if (typeof window === 'undefined') return
    set({ storedWallets: listStoredWallets() })
  },

  createWebWallet: async (name, password, mnemonic) => {
    set({ error: null })
    try {
      if (walletExists(name)) {
        throw new Error(`A wallet named "${name}" already exists. Choose a different name.`)
      }
      const words = mnemonic || generateMnemonic()
      const seed = mnemonicToPrivateKey(words)
      await storeWallet(name, password, seed, 'testnet')
      set({
        storedWallets: listStoredWallets(),
        walletName: name,
        isLocked: false,
      })
      return { mnemonic: words }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to create wallet' })
      throw e
    }
  },

  importWebWalletFromMnemonic: async (name, password, mnemonic) => {
    set({ error: null })
    try {
      const validation = validateMnemonic(mnemonic)
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid mnemonic')
      }
      if (walletExists(name)) {
        throw new Error(`A wallet named "${name}" already exists. Choose a different name.`)
      }
      const seed = mnemonicToPrivateKey(mnemonic)
      await storeWallet(name, password, seed, 'testnet')
      set({
        storedWallets: listStoredWallets(),
        walletName: name,
        isLocked: false,
      })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to import wallet' })
      throw e
    }
  },

  unlockWebWallet: async (name, password) => {
    set({ connectionState: 'connecting', error: null, isLocked: false })
    try {
      const seed = await loadWallet(name, password)
      // Phase 1: address derivation requires the local daemon (Ristretto255 crypto).
      // If daemon is not running, the user gets a clear error and can still use view-only mode.
      let address: string | null = null
      try {
        // Use the daemon to derive the address from the seed
        const seedHex = Array.from(seed).map(b => b.toString(16).padStart(2, '0')).join('')
        const tempPath = `/tmp/xelis-vault-web-${Date.now()}`
        await walletRpc('create_wallet', {
          path: tempPath,
          password: 'temp-' + Date.now(),
          seed: seedHex,
          network: 'testnet',
        })
        const openResult = await walletRpc('open_wallet', {
          path: tempPath,
          password: 'temp-' + Date.now(),
        })
        address = typeof openResult === 'string' ? openResult : (openResult?.address || null)
        try { await walletRpc('close_wallet', {}) } catch {}
      } catch (e) {
        // Daemon not available — user can still unlock but won't see address/balances
        console.warn('[wallet] Daemon not available for address derivation:', e)
      }
      set({
        connectionType: 'web-wallet',
        connectionState: 'connected',
        walletName: name,
        address,
        isLocked: false,
        showConnectModal: false,
      })
      if (address) {
        get().refreshBalances()
      }
    } catch (e) {
      set({
        connectionState: 'error',
        error: e instanceof Error ? e.message : 'Failed to unlock wallet',
      })
      throw e
    }
  },

  lockWallet: () => {
    set({
      isLocked: true,
      connectionState: 'locked',
      address: null,
      xelBalance: 0,
      xusdBalance: 0,
      vltBalance: 0,
    })
  },

  connectViewOnly: async (address) => {
    set({ connectionState: 'connecting', error: null })
    if (!address.startsWith('xet:') && !address.startsWith('xel:')) {
      set({
        connectionState: 'error',
        error: 'Invalid XELIS address. Must start with "xet:" (testnet) or "xel:" (mainnet).',
      })
      return
    }
    set({
      connectionType: 'view-only',
      connectionState: 'connected',
      address,
      showConnectModal: false,
      isLocked: false,
    })
    get().refreshBalances()
  },

  deleteWallet: (name) => {
    deleteWallet(name)
    set({ storedWallets: listStoredWallets() })
  },

  disconnect: () => {
    // Close XSWD connection if active
    try {
      const client = getXSWDClient()
      if (client.getState() !== 'disconnected') {
        client.disconnect()
      }
    } catch {}

    set({
      connectionType: null,
      connectionState: 'disconnected',
      address: null,
      error: null,
      showConnectModal: false,
      walletName: null,
      isLocked: false,
      xelBalance: 0,
      xusdBalance: 0,
      vltBalance: 0,
      xelPrice: 0,
    })
  },
}))

// Re-export web wallet utilities for the UI
export {
  generateMnemonic,
  mnemonicToPrivateKey,
  validateMnemonic,
  parseMnemonicString,
  listStoredWallets,
  walletExists,
  type WalletMeta,
  type Network,
}

// ===== HIGH-LEVEL CONTRACT FUNCTIONS =====
// These use the wallet RPC directly (no XSWD needed)

export async function depositCollateral(amountXel: number): Promise<string> {
  return sendTransaction({
    contract: CONTRACTS.VaultEngine,
    entry_id: ENTRIES.VaultEngine.deposit,
    parameters: [hashParam(XEL_ASSET), u64Param(toAtomic(amountXel))],
    deposits: { [XEL_ASSET]: { amount: Number(toAtomic(amountXel)) } },
  })
}

export async function borrowXusd(vaultId: number, amountXusd: number): Promise<string> {
  return sendTransaction({
    contract: CONTRACTS.VaultEngine,
    entry_id: ENTRIES.VaultEngine.borrow,
    parameters: [u64Param(BigInt(vaultId)), u64Param(toAtomic(amountXusd))],
  })
}

export async function repayXusd(vaultId: number, amountXusd: number): Promise<string> {
  return sendTransaction({
    contract: CONTRACTS.VaultEngine,
    entry_id: ENTRIES.VaultEngine.repay,
    parameters: [u64Param(BigInt(vaultId)), u64Param(toAtomic(amountXusd))],
    deposits: { [CONTRACTS.xUSDAsset]: { amount: Number(toAtomic(amountXusd)) } },
  })
}

export async function withdrawCollateral(vaultId: number, amountXel: number): Promise<string> {
  return sendTransaction({
    contract: CONTRACTS.VaultEngine,
    entry_id: ENTRIES.VaultEngine.withdraw,
    parameters: [u64Param(BigInt(vaultId)), u64Param(toAtomic(amountXel))],
  })
}

export async function psmMint(amountXel: number): Promise<string> {
  return sendTransaction({
    contract: CONTRACTS.PSM,
    entry_id: ENTRIES.PSM.mint,
    parameters: [u64Param(toAtomic(amountXel)), u64Param(0)],
    deposits: { [XEL_ASSET]: { amount: Number(toAtomic(amountXel)) } },
  })
}

export async function psmRedeem(amountXusd: number): Promise<string> {
  return sendTransaction({
    contract: CONTRACTS.PSM,
    entry_id: ENTRIES.PSM.redeem,
    parameters: [u64Param(toAtomic(amountXusd)), u64Param(0)],
    deposits: { [CONTRACTS.xUSDAsset]: { amount: Number(toAtomic(amountXusd)) } },
  })
}

export async function swapTokens(assetIn: string, assetOut: string, amountIn: number): Promise<string> {
  return sendTransaction({
    contract: CONTRACTS.VaultSwapV2,
    entry_id: ENTRIES.VaultSwapV2.swap,
    parameters: [hashParam(assetIn), hashParam(assetOut), u64Param(toAtomic(amountIn)), u64Param(0)],
    deposits: { [assetIn]: { amount: Number(toAtomic(amountIn)) } },
  })
}

export async function registerMiner(endpoint: string, pubkey: string, servicesMask: number): Promise<string> {
  return sendTransaction({
    contract: CONTRACTS.XelisVaultMiner,
    entry_id: ENTRIES.XelisVaultMiner.register_miner,
    parameters: [stringParam(endpoint), hashParam(pubkey), { type: 'primitive', value: { type: 'u8', value: servicesMask } }],
    deposits: { [CONTRACTS.VLTAsset]: { amount: Number(toAtomic(100)) } },
  })
}

export async function submitHeartbeat(): Promise<string> {
  return sendTransaction({
    contract: CONTRACTS.XelisVaultMiner,
    entry_id: ENTRIES.XelisVaultMiner.submit_heartbeat,
    parameters: [],
  })
}

export async function stakeVlt(amount: number, lockDays: number): Promise<string> {
  return sendTransaction({
    contract: CONTRACTS.GovernanceVault,
    entry_id: ENTRIES.GovernanceVault.stake,
    parameters: [u64Param(toAtomic(amount)), u64Param(BigInt(lockDays))],
    deposits: { [CONTRACTS.VLTAsset]: { amount: Number(toAtomic(amount)) } },
  })
}

// App data for xswd-connect (kept for reference)
export const APP_DATA = {
  id: Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join(''),
  name: 'XELIS Vault',
  description: 'Confidential DeFi platform on XELIS BlockDAG',
  url: typeof window !== 'undefined' ? window.location.origin : '',
  permissions: ['wallet.get_address', 'wallet.get_balance', 'wallet.transfer', 'wallet.invoke_sc'],
}
