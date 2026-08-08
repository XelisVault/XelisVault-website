// XELIS Vault — Contract Configuration (TESTNET v5.1)
// Source: Official GitHub + direct testing
// Updated: 2026-07-29

export type Network = 'testnet' | 'mainnet'

// ===== DEPLOYED CONTRACT ADDRESSES (TESTNET v5.1) =====
// These are the CANONICAL addresses — legacy versions are NOT used.

export const CONTRACTS = {
  // Oracle
  PriceOracle: '764ad585c2f484e54ea9dd06a7fb8b81397ba2487d37298f27edce3747d836dd',
  StakedOracle: '57a343969a7144546218b8f9d436f086b32e9d4175f9a5af55c5707c3d1e350a',

  // Tokens
  xUSD: '909576c1fcd889ec443b63a4ce014bf756fcb8afd74c8c0ee902cac03384e3fc',
  xUSDAsset: 'd8bd79a2aa33ad4a6fa0ac2b2440515124445ecce0468e070a8a09bb5ea9442f',
  VLTToken: '7275c55d711789b1b746cd4695b04c0e393a0db74ecf72360c5544b73368cfab',
  VLTAsset: '2de72ed3ea2d8ff30e6df57ba3a4d993dedfa8636d207d43d09e33615bfde2c6',

  // DeFi
  VaultEngine: '667b165c8c9cd6cc3464378799e38b172e0f2e912f4b5c6202d37a8da3939bcc',
  PSM: '9f2667447b9a850ba4b260c19cd2c3786bc4a3c5559a08332a9e13bfa47191ae',
  VaultSwapV2: '1b6699398e2acecbdd1fd372952696cfc37b99eb1dcac45a7216661f96c60422',

  // Mining
  XelisVaultMiner: '21ed1297c7ed4001a4a7c9a4bb89b10da0b0f3ad0312545a5af4a761200af207',

  // Governance
  GovernanceVault: '830ddfd85eb8ccd44678719cd32633806eba44aa4b455b3785ba04fb3a0b4aa9',
  Timelock: 'bf6c0004993d50d0edc31eb38cebad38aa95e522040c9ea1d48cdea2eb2df597',
  Governor: 'f8a5880d02616085b26fa4d2a5888bf3328d8ab679af1ed0c90d693bff09a119',
  GuardianMultisig: '4c5783d36173e309fa47c746c37f865accf08c1a4dfee92ba84cc08392326e4a',
  OracleGovernance: '1f5ffe2ab5086202e104cde2517a76738a13391a9e0fd4e3090a65cb7679dbcd',

  // Infrastructure
  ContractRegistry: '32abb6db396e1c341868a97fcbc8cfd4a9219af6311d1a3c2e12fe7474ddc06e',
} as const

// XEL is the native asset — its hash is all zeros
export const XEL_ASSET = '0000000000000000000000000000000000000000000000000000000000000000'

// ===== NETWORK ENDPOINTS =====
export const NETWORK = {
  testnet: {
    daemonRpc: 'https://testnet-node.xelis.io/json_rpc',
    explorer: 'https://testnet-explorer.xelis.io',
  },
  mainnet: {
    daemonRpc: 'https://node.xelis.io/json_rpc',
    explorer: 'https://explorer.xelis.io',
  },
}

// XSWD local wallet endpoint
export const XSWD_URL = 'ws://localhost:44325/'

// Wallet RPC (local, for price bot / admin)
export const WALLET_RPC = 'http://127.0.0.1:18082/json_rpc'

// ===== ENTRY IDS (v5.1 — from actual deployed contracts) =====
// IMPORTANT: entry_id = direct chunk index in compiled bytecode
// fn and hook functions occupy positions and shift IDs

export const ENTRIES = {
  // PriceOracle v2.1 (764ad585...)
  PriceOracle: {
    propose_price: 2,     // (price: u64) — admin only
    execute_price: 3,     // () — triggers distribute_reward on miner
    get_price: 4,         // (asset: Hash) → u64 — cross-contract readable
    get_pending_price: 5, // ()
    cancel_pending: 6,    // () — admin only
  },

  // xUSD (909576c1...)
  xUSD: {
    mint_tokens: 3,       // (to: Address, amount: u64) — cross-contract only
    mint_split: 4,        // (to: Address, amount: u64, treasury: Address, fee: u64)
    burn_tokens: 5,       // (amount: u64) — cross-contract only
    get_balance: 14,      // (addr: Address) → u64
  },

  // VLTToken v5.1 (7275c55d...)
  VLTToken: {
    mint_to: 4,           // pub fn — cross-contract only
    burn_own: 5,          // (amount: u64)
    mint_to_entry: 27,    // entry wrapper — but requires whitelisted minter!
    get_asset_hash: 15,   // () → Hash
    get_max_supply: 16,   // () → u64
  },

  // VaultEngine (667b165c...)
  VaultEngine: {
    deposit: 10,          // (collateral_asset: Hash, amount: u64)
    borrow: 11,           // (vault_id: u64, amount: u64)
    repay: 12,            // (vault_id: u64, amount: u64)
    withdraw: 13,         // (vault_id: u64, amount: u64)
    redeem: 14,           // (amount: u64)
    liquidate: 15,        // (vault_id: u64)
    get_queue: 16,        // ()
    get_vault: 27,        // (id: u64)
    get_health: 28,       // (id: u64)
    is_liquidatable: 29,  // (id: u64)
    is_paused: 36,        // () → bool
  },

  // PSM v5.1 (9f266744...)
  PSM: {
    mint: 8,              // (xel_amount: u64, min_xusd_out: u64) — deposit XEL
    redeem: 9,            // (xusd_amount: u64, min_xel_out: u64) — deposit xUSD
    get_reserves: 10,     // ()
    get_mint_fee: 11,     // () → u64 (bps)
    get_redeem_fee: 12,   // () → u64 (bps)
    get_daily_usage: 13,  // ()
  },

  // VaultSwapV2 (1b669939...)
  VaultSwapV2: {
    create_pool: 16,      // (asset_a: Hash, asset_b: Hash, is_psm: bool)
    add_liquidity: 17,    // (asset_a: Hash, asset_b: Hash, amount_a: u64, amount_b: u64)
    swap: 18,             // (asset_in: Hash, asset_out: Hash, amount_in: u64, min_out: u64)
    psm_mint: 19,         // (xel_amount: u64, min_xusd_out: u64)
    psm_redeem: 20,       // (xusd_amount: u64, min_xel_out: u64)
    get_pool: 21,         // (asset_a: Hash, asset_b: Hash)
    get_amount_out: 22,   // (asset_in: Hash, asset_out: Hash, amount_in: u64)
    get_twap: 23,         // (asset_a: Hash, asset_b: Hash)
    get_volatility_bps: 24, // (asset_a: Hash, asset_b: Hash)
    get_pools_count: 25,  // ()
    get_pool_by_index: 26, // (index: u64)
    get_fees: 27,         // ()
  },

  // XelisVaultMiner v2.1 (21ed1297...)
  XelisVaultMiner: {
    register_miner: 10,           // (endpoint: string, pubkey: Hash, services: u8) — deposit 100 VLT
    enable_service: 11,           // (service_id: u8)
    increase_stake: 13,           // (amount: u64)
    decrease_stake: 14,           // (amount: u64)
    deregister_miner: 15,         // ()
    submit_heartbeat: 16,         // () — every 100 blocks
    slash_miner: 17,              // (addr: Address, severity: u8, reporter: Address)
    distribute_reward: 18,        // pub fn — called by service contracts
    is_miner_active: 19,          // (addr: Address, svc: u8)
    get_miner_stake: 20,          // (addr: Address) → u64
    get_miner_reputation: 21,     // (addr: Address) → u64
    get_active_miners_for_service: 22, // (svc: u8)
    get_miner_count: 23,          // ()
    get_miner: 24,                // (index: u64)
  },

  // StakedOracle v5.0 (57a34396...)
  StakedOracle: {
    add_feed: 8,          // (name: string, asset: Hash, decimals: u8, min_price: u64, max_price: u64)
    submit_price: 15,     // (feed_id: u64, price: u64) — miners only
    get_price: 30,        // (feed_name: string) → u64
    get_feed_id: 32,      // (feed_name: string) → u64
    get_version: 49,      // () → string
  },

  // GovernanceVault v5 (830ddfd8...)
  GovernanceVault: {
    stake: 0,             // (amount: u64, lock_days: u64)
    unstake: 1,           // (stake_id: u64)
    claim_rewards: 2,     // ()
    get_voting_power: 3,  // (addr: Address) → u64
    get_total_voting_power: 4, // ()
    get_total_staked: 5,  // ()
  },

  // ContractRegistry v5.0 (32abb6db...)
  ContractRegistry: {
    get_entry: 0,         // (name: string) → Hash
  },
} as const

// ===== TOKENOMICS CONSTANTS =====
export const TOKENOMICS = {
  VLT_MAX_SUPPLY: 10_000_000,   // 10M VLT
  VLT_DECIMALS: 8,
  XEL_DECIMALS: 8,
  xUSD_DECIMALS: 8,
  MIN_MINER_STAKE: 100,         // 100 VLT
  HEARTBEAT_INTERVAL: 100,      // blocks
  BLOCK_TIME: 5,                // seconds
  PSM_MINT_FEE_BPS: 50,        // 0.5%
  PSM_REDEEM_FEE_BPS: 10,      // 0.1%
  SWAP_FEE_BPS: 30,            // 0.3%
  SWAP_TREASURY_FEE_BPS: 5,    // 0.05%
} as const

// ===== HELPERS =====

// Convert human-readable to atomic units (8 decimals)
export function toAtomic(amount: number, decimals = 8): bigint {
  return BigInt(Math.round(amount * Math.pow(10, decimals)))
}

// Convert atomic to human-readable
export function fromAtomic(amount: number | bigint | string, decimals = 8): number {
  const n = typeof amount === 'bigint' ? Number(amount) : typeof amount === 'string' ? Number(amount) : amount
  return n / Math.pow(10, decimals)
}

// ===== PARAMETER FORMATTERS (for XSWD/Wallet RPC) =====
// IMPORTANT: u64 values MUST be strings, per wallet API v1.21.3

export function u64Param(value: number | bigint) {
  return { type: 'primitive', value: { type: 'u64', value: String(value) } }
}

export function u8Param(value: number) {
  return { type: 'primitive', value: { type: 'u8', value: value } }
}

export function boolParam(b: boolean) {
  return { type: 'primitive', value: { type: 'bool', value: b } }
}

// Hash and Address use "string" type per wallet API
export function hashParam(hash: string) {
  return { type: 'primitive', value: { type: 'string', value: hash } }
}

export function addressParam(addr: string) {
  return { type: 'primitive', value: { type: 'string', value: addr } }
}

export function stringParam(s: string) {
  return { type: 'primitive', value: { type: 'string', value: s } }
}

// ===== BUILD TRANSACTION FORMAT (Wallet RPC v1.21.3) =====
// Uses "parameters" NOT "params"
// u64 values MUST be strings
// permission: "none" for simple calls, "all" for cross-contract calls
// deposits: { "asset_hash": { "amount": NUMBER } } (amount is NOT string)

export interface InvokeParams {
  contract: string
  entry_id: number
  parameters: any[]
  deposits?: Record<string, { amount: number }>
  max_gas?: number
  permission?: 'none' | 'all'
}

export function buildInvokeTx(invoke: InvokeParams) {
  return {
    invoke_contract: {
      contract: invoke.contract,
      entry_id: invoke.entry_id,
      parameters: invoke.parameters,
      deposits: invoke.deposits || {},
      max_gas: invoke.max_gas || 500000,
      permission: invoke.permission || 'all', // "all" for cross-contract calls
    },
    broadcast: true,
    fee: { fixed: 1000000 }, // 0.01 XEL
  }
}

// ===== XSWD / WALLET RPC COMMUNICATION =====

let requestId = 1

export async function sendXswdRequest(
  socket: WebSocket,
  method: string,
  params: any
): Promise<any> {
  const id = requestId++
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.removeEventListener('message', handler)
      reject(new Error('Request timeout (30s)'))
    }, 30000)

    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data.id === id) {
          clearTimeout(timeout)
          socket.removeEventListener('message', handler)
          if (data.error) {
            reject(new Error(data.error.message || 'XSWD error'))
          } else {
            resolve(data.result)
          }
        }
      } catch {}
    }

    socket.addEventListener('message', handler)
    socket.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
  })
}

// Send a transaction via XSWD — wallet will ask user to confirm
export async function invokeContract(
  socket: WebSocket,
  invoke: InvokeParams
): Promise<string> {
  const txParams = buildInvokeTx(invoke)
  const result = await sendXswdRequest(socket, 'build_transaction', txParams)
  return result?.hash || result?.data || 'submitted'
}

// ===== READ-ONLY CONTRACT CALLS =====
// Note: daemon's call_contract_read may not be available on all nodes
// For wallet-connected users, use XSWD invoke_sc_view instead

export async function callViewViaXswd(
  socket: WebSocket,
  contract: string,
  entryId: number,
  args: any[] = []
): Promise<any> {
  return sendXswdRequest(socket, 'invoke_sc_view', {
    contract,
    entry_id: entryId,
    parameters: args,
  })
}

// ===== HIGH-LEVEL CONTRACT FUNCTIONS =====

// Get the current XEL/USD price from PriceOracle
export async function getXelPrice(socket: WebSocket | null): Promise<number> {
  try {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const result = await callViewViaXswd(socket, CONTRACTS.PriceOracle, ENTRIES.PriceOracle.get_price, [hashParam(XEL_ASSET)])
      return fromAtomic(Number(result))
    }
  } catch {}
  // Fallback: return known testnet price
  return 0.311763
}

// Get the user's XEL balance via XSWD
export async function getXelBalance(socket: WebSocket): Promise<number> {
  const result = await sendXswdRequest(socket, 'get_balance', {})
  return fromAtomic(Number(result))
}

// Get the user's xUSD balance via XSWD
export async function getXusdBalance(socket: WebSocket): Promise<number> {
  const result = await sendXswdRequest(socket, 'get_balance', { asset: CONTRACTS.xUSDAsset })
  return fromAtomic(Number(result))
}

// Get the user's VLT balance via XSWD
export async function getVltBalance(socket: WebSocket): Promise<number> {
  const result = await sendXswdRequest(socket, 'get_balance', { asset: CONTRACTS.VLTAsset })
  return fromAtomic(Number(result))
}

// Track a custom asset (required before get_balance works)
export async function trackAsset(socket: WebSocket, assetHash: string): Promise<void> {
  try {
    await sendXswdRequest(socket, 'track_asset', { asset: assetHash })
  } catch {
    // Already tracked — ignore
  }
}

// Get the user's wallet address
export async function getAddress(socket: WebSocket): Promise<string> {
  return sendXswdRequest(socket, 'get_address', {})
}

// ===== VAULT ENGINE OPERATIONS =====

// Deposit XEL collateral into VaultEngine
export async function depositCollateral(socket: WebSocket, amountXel: number): Promise<string> {
  return invokeContract(socket, {
    contract: CONTRACTS.VaultEngine,
    entry_id: ENTRIES.VaultEngine.deposit,
    parameters: [hashParam(XEL_ASSET), u64Param(toAtomic(amountXel))],
    deposits: { [XEL_ASSET]: { amount: Number(toAtomic(amountXel)) } },
    permission: 'all',
  })
}

// Borrow xUSD against collateral
export async function borrowXusd(socket: WebSocket, vaultId: number, amountXusd: number): Promise<string> {
  return invokeContract(socket, {
    contract: CONTRACTS.VaultEngine,
    entry_id: ENTRIES.VaultEngine.borrow,
    parameters: [u64Param(BigInt(vaultId)), u64Param(toAtomic(amountXusd))],
    permission: 'all',
  })
}

// Repay xUSD debt
export async function repayXusd(socket: WebSocket, vaultId: number, amountXusd: number): Promise<string> {
  return invokeContract(socket, {
    contract: CONTRACTS.VaultEngine,
    entry_id: ENTRIES.VaultEngine.repay,
    parameters: [u64Param(BigInt(vaultId)), u64Param(toAtomic(amountXusd))],
    deposits: { [CONTRACTS.xUSDAsset]: { amount: Number(toAtomic(amountXusd)) } },
    permission: 'all',
  })
}

// Withdraw XEL collateral
export async function withdrawCollateral(socket: WebSocket, vaultId: number, amountXel: number): Promise<string> {
  return invokeContract(socket, {
    contract: CONTRACTS.VaultEngine,
    entry_id: ENTRIES.VaultEngine.withdraw,
    parameters: [u64Param(BigInt(vaultId)), u64Param(toAtomic(amountXel))],
    permission: 'all',
  })
}

// ===== PSM OPERATIONS =====

// Mint xUSD via PSM (send XEL, receive xUSD at oracle price)
export async function psmMint(socket: WebSocket, amountXel: number): Promise<string> {
  return invokeContract(socket, {
    contract: CONTRACTS.PSM,
    entry_id: ENTRIES.PSM.mint,
    parameters: [u64Param(toAtomic(amountXel)), u64Param(0)], // min_out = 0 for now
    deposits: { [XEL_ASSET]: { amount: Number(toAtomic(amountXel)) } },
    permission: 'all',
  })
}

// Redeem xUSD for XEL via PSM
export async function psmRedeem(socket: WebSocket, amountXusd: number): Promise<string> {
  return invokeContract(socket, {
    contract: CONTRACTS.PSM,
    entry_id: ENTRIES.PSM.redeem,
    parameters: [u64Param(toAtomic(amountXusd)), u64Param(0)],
    deposits: { [CONTRACTS.xUSDAsset]: { amount: Number(toAtomic(amountXusd)) } },
    permission: 'all',
  })
}

// ===== VAULTSWAP OPERATIONS =====

// Swap on VaultSwapV2
export async function swapTokens(
  socket: WebSocket,
  assetIn: string,
  assetOut: string,
  amountIn: number
): Promise<string> {
  return invokeContract(socket, {
    contract: CONTRACTS.VaultSwapV2,
    entry_id: ENTRIES.VaultSwapV2.swap,
    parameters: [hashParam(assetIn), hashParam(assetOut), u64Param(toAtomic(amountIn)), u64Param(0)],
    deposits: { [assetIn]: { amount: Number(toAtomic(amountIn)) } },
    permission: 'all',
  })
}

// PSM mint via VaultSwapV2 (entry 19)
export async function vaultSwapPsmMint(socket: WebSocket, amountXel: number): Promise<string> {
  return invokeContract(socket, {
    contract: CONTRACTS.VaultSwapV2,
    entry_id: ENTRIES.VaultSwapV2.psm_mint,
    parameters: [u64Param(toAtomic(amountXel)), u64Param(0)],
    deposits: { [XEL_ASSET]: { amount: Number(toAtomic(amountXel)) } },
    permission: 'all',
  })
}

// PSM redeem via VaultSwapV2 (entry 20)
export async function vaultSwapPsmRedeem(socket: WebSocket, amountXusd: number): Promise<string> {
  return invokeContract(socket, {
    contract: CONTRACTS.VaultSwapV2,
    entry_id: ENTRIES.VaultSwapV2.psm_redeem,
    parameters: [u64Param(toAtomic(amountXusd)), u64Param(0)],
    deposits: { [CONTRACTS.xUSDAsset]: { amount: Number(toAtomic(amountXusd)) } },
    permission: 'all',
  })
}

// Add liquidity to a pool
export async function addLiquidity(
  socket: WebSocket,
  assetA: string,
  assetB: string,
  amountA: number,
  amountB: number
): Promise<string> {
  return invokeContract(socket, {
    contract: CONTRACTS.VaultSwapV2,
    entry_id: ENTRIES.VaultSwapV2.add_liquidity,
    parameters: [hashParam(assetA), hashParam(assetB), u64Param(toAtomic(amountA)), u64Param(toAtomic(amountB))],
    deposits: {
      [assetA]: { amount: Number(toAtomic(amountA)) },
      [assetB]: { amount: Number(toAtomic(amountB)) },
    },
    permission: 'all',
  })
}

// ===== MINER OPERATIONS =====

// Register as a miner (requires 100 VLT stake)
export async function registerMiner(
  socket: WebSocket,
  endpoint: string,
  pubkey: string,
  servicesMask: number
): Promise<string> {
  return invokeContract(socket, {
    contract: CONTRACTS.XelisVaultMiner,
    entry_id: ENTRIES.XelisVaultMiner.register_miner,
    parameters: [stringParam(endpoint), hashParam(pubkey), u8Param(servicesMask)],
    deposits: { [CONTRACTS.VLTAsset]: { amount: Number(toAtomic(TOKENOMICS.MIN_MINER_STAKE)) } },
    permission: 'all',
  })
}

// Submit a heartbeat
export async function submitHeartbeat(socket: WebSocket): Promise<string> {
  return invokeContract(socket, {
    contract: CONTRACTS.XelisVaultMiner,
    entry_id: ENTRIES.XelisVaultMiner.submit_heartbeat,
    parameters: [],
    permission: 'none',
  })
}

// ===== GOVERNANCE OPERATIONS =====

// Stake VLT for voting power
export async function stakeVlt(socket: WebSocket, amount: number, lockDays: number): Promise<string> {
  return invokeContract(socket, {
    contract: CONTRACTS.GovernanceVault,
    entry_id: ENTRIES.GovernanceVault.stake,
    parameters: [u64Param(toAtomic(amount)), u64Param(BigInt(lockDays))],
    deposits: { [CONTRACTS.VLTAsset]: { amount: Number(toAtomic(amount)) } },
    permission: 'all',
  })
}

// Unstake VLT
export async function unstakeVlt(socket: WebSocket, stakeId: number): Promise<string> {
  return invokeContract(socket, {
    contract: CONTRACTS.GovernanceVault,
    entry_id: ENTRIES.GovernanceVault.unstake,
    parameters: [u64Param(BigInt(stakeId))],
    permission: 'all',
  })
}

// Claim staking rewards
export async function claimStakingRewards(socket: WebSocket): Promise<string> {
  return invokeContract(socket, {
    contract: CONTRACTS.GovernanceVault,
    entry_id: ENTRIES.GovernanceVault.claim_rewards,
    parameters: [],
    permission: 'none',
  })
}
