// XELIS network registry — the explorer runs on MAINNET by default,
// with a live switch to the public testnet.
//
// Verified live (scripts/probe-mainnet.mjs / probe-mainnet-ws.mjs):
//  - mainnet node: https://node.xelis.io/json_rpc  (CORS: access-control-allow-origin: *)
//  - mainnet WS:   wss://node.xelis.io/json_rpc    (same multiplexed JSON-RPC + events protocol)
//  - daemon v1.25.0 · block shapes identical to testnet

export type NetworkId = 'mainnet' | 'testnet'

export interface NetworkConfig {
  id: NetworkId
  label: string
  short: string
  http: string
  ws: string
  explorer: string
  faucet?: string
  accent: string // tailwind-ish hex for UI badges
}

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  mainnet: {
    id: 'mainnet',
    label: 'Mainnet',
    short: 'main',
    http: 'https://node.xelis.io/json_rpc',
    ws: 'wss://node.xelis.io/json_rpc',
    explorer: 'https://explorer.xelis.io',
    accent: '#a78bfa',
  },
  testnet: {
    id: 'testnet',
    label: 'Testnet',
    short: 'test',
    http: 'https://testnet-node.xelis.io/json_rpc',
    ws: 'wss://testnet-node.xelis.io/json_rpc',
    explorer: 'https://testnet-explorer.xelis.io',
    faucet: 'https://faucet.xelis.io',
    accent: '#67e8f9',
  },
}

// The explorer's active network (module state — read dynamically by every
// fetcher in explorer.ts). Defaults to MAINNET. Switching clears the RPC cache.
let activeNetwork: NetworkId = 'mainnet'
const listeners = new Set<(n: NetworkId) => void>()

export function getActiveNetwork(): NetworkId {
  return activeNetwork
}

export function setActiveNetwork(net: NetworkId) {
  if (activeNetwork === net) return
  activeNetwork = net
  listeners.forEach((l) => l(net))
}

export function onNetworkChange(listener: (n: NetworkId) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function networkConfig(net: NetworkId = activeNetwork): NetworkConfig {
  return NETWORKS[net]
}
