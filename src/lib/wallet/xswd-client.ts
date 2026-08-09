/**
 * XSWD Client — XELIS Secure WebSocket DApp
 *
 * Connects to a running XELIS wallet (Genesix or xelis_wallet) via WebSocket
 * on ws://127.0.0.1:44325/xswd.
 *
 * Protocol (from xelis_wallet/src/api/server/xswd_server.rs):
 *  1. Open WebSocket to ws://127.0.0.1:44325/xswd
 *  2. Send ApplicationData as the FIRST message (plain JSON, no JSON-RPC wrapper):
 *     { id, name, description, url, permissions: [...] }
 *  3. Wallet shows a popup to the user asking to accept the connection
 *  4. Once accepted, subsequent messages are JSON-RPC 2.0:
 *     { jsonrpc: "2.0", id: N, method: "...", params: {...} }
 *  5. Responses come back as: { jsonrpc: "2.0", id: N, result: ... | error: {...} }
 *
 * Permissions (from xelis_common::api::wallet):
 *  - get_address, get_balance, get_transfers, get_assets, get_network_status
 *  - build_transaction, transfer
 *  - invoke_sc, call_sc_view
 *  - get_transaction_history, get_pending_transactions
 *  - sign_data, verify_signatures
 *
 * The wallet may prompt the user per-method (depending on permission policy).
 * We request "accept_always" upfront so the user only approves once per method.
 *
 * Source: https://docs.xelis.io/features/wallet/xswd
 *         xelis-blockchain/xelis_wallet/src/api/server/xswd_server.rs
 *         xelis-blockchain/xelis_wallet/src/api/xswd/types.rs
 */

export type XSWDConnectionState = 'disconnected' | 'connecting' | 'awaiting-approval' | 'connected' | 'error'

export interface ApplicationData {
  id: string
  name: string
  description: string
  url: string | null
  permissions: string[]
}

export interface XSWDEvent {
  type: 'connection' | 'permission_request' | 'event' | 'error'
  data?: any
  message?: string
}

type PendingRequest = {
  resolve: (value: any) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

const XSWD_URL = 'ws://127.0.0.1:44325/xswd'
const REQUEST_TIMEOUT_MS = 60_000 // 60s — wallet may wait for user approval

// All permissions we need for the XELIS Vault dApp
const REQUIRED_PERMISSIONS = [
  'get_address',
  'get_balance',
  'get_assets',
  'get_network_status',
  'get_transaction_history',
  'get_pending_transactions',
  'get_transfers',
  'build_transaction',
  'transfer',
  'invoke_sc',
  'call_sc_view',
  'sign_data',
]

// Generate a stable app ID per browser (so the wallet remembers approval)
function getAppId(): string {
  const STORAGE_KEY = 'xelis-vault-xswd-app-id'
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    id = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}

export class XSWDClient {
  private ws: WebSocket | null = null
  private requestId = 0
  private pending = new Map<number, PendingRequest>()
  private state: XSWDConnectionState = 'disconnected'
  private listeners = new Set<(state: XSWDConnectionState, event?: XSWDEvent) => void>()
  private reconnectAttempts = 0
  private shouldReconnect = false

  onStateChange(listener: (state: XSWDConnectionState, event?: XSWDEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private setState(state: XSWDConnectionState, event?: XSWDEvent) {
    this.state = state
    this.listeners.forEach(l => l(state, event))
  }

  getState(): XSWDConnectionState {
    return this.state
  }

  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting' || this.state === 'awaiting-approval') {
      return
    }
    this.shouldReconnect = true
    this.setState('connecting')

    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(XSWD_URL)
        this.ws = ws

        const connectionTimeout = setTimeout(() => {
          if (this.state === 'connecting') {
            ws.close()
            this.setState('error', {
              type: 'error',
              message: 'Connection timeout. Make sure Genesix wallet is running and XSWD is enabled in settings.',
            })
            reject(new Error('Connection timeout — Genesix wallet not detected on port 44325'))
          }
        }, 10_000)

        ws.onopen = () => {
          clearTimeout(connectionTimeout)
          console.log('[xswd] WebSocket connected, sending ApplicationData')
          this.setState('awaiting-approval')
          // Send ApplicationData as the first message — this triggers the wallet's approval popup
          const appData: ApplicationData = {
            id: getAppId(),
            name: 'XELIS Vault',
            description: 'Confidential DeFi platform on XELIS BlockDAG',
            url: typeof window !== 'undefined' ? window.location.origin : null,
            permissions: REQUIRED_PERMISSIONS,
          }
          ws.send(JSON.stringify(appData))
          resolve()
        }

        ws.onmessage = (event) => this.handleMessage(event.data)

        ws.onerror = () => {
          clearTimeout(connectionTimeout)
          if (this.state === 'connecting') {
            this.setState('error', {
              type: 'error',
              message: 'Cannot reach Genesix wallet on ws://127.0.0.1:44325. Make sure the wallet is running with XSWD enabled.',
            })
            reject(new Error('Cannot reach Genesix wallet'))
          }
        }

        ws.onclose = () => {
          clearTimeout(connectionTimeout)
          console.log('[xswd] WebSocket closed')
          this.ws = null
          // Reject all pending requests
          for (const [id, req] of this.pending) {
            clearTimeout(req.timeout)
            req.reject(new Error('Connection closed'))
            this.pending.delete(id)
          }
          if (this.shouldReconnect && this.reconnectAttempts < 3) {
            this.reconnectAttempts++
            console.log(`[xswd] Reconnect attempt ${this.reconnectAttempts}/3 in 2s`)
            setTimeout(() => this.connect().catch(() => {}), 2000)
          } else {
            this.setState('disconnected')
          }
        }
      } catch (e) {
        this.setState('error', {
          type: 'error',
          message: e instanceof Error ? e.message : 'Failed to connect',
        })
        reject(e)
      }
    })
  }

  private handleMessage(data: any) {
    let msg: any
    try {
      msg = typeof data === 'string' ? JSON.parse(data) : data
    } catch {
      console.warn('[xswd] Received non-JSON message:', data)
      return
    }

    // JSON-RPC response (has id + result or error)
    if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
      const pending = this.pending.get(msg.id)
      if (!pending) {
        console.warn(`[xswd] Received response for unknown request id: ${msg.id}`)
        return
      }
      clearTimeout(pending.timeout)
      this.pending.delete(msg.id)

      if (msg.error) {
        pending.reject(new Error(msg.error.message || JSON.stringify(msg.error)))
      } else {
        pending.resolve(msg.result)
      }
      return
    }

    // Connection approval response (after ApplicationData handshake)
    // The wallet sends back the accepted application info
    if (msg.id && msg.name && msg.permissions) {
      console.log('[xswd] Application approved:', msg.name)
      this.setState('connected', { type: 'connection', data: msg })
      this.reconnectAttempts = 0
      return
    }

    // Event notifications (new block, new transaction, etc.)
    if (msg.event || msg.notification) {
      this.listeners.forEach(l => l(this.state, { type: 'event', data: msg }))
      return
    }

    // Permission request (wallet asks user to approve a method call)
    if (msg.type === 'permission_request' || msg.permission_request) {
      this.listeners.forEach(l => l(this.state, { type: 'permission_request', data: msg }))
      return
    }

    console.log('[xswd] Unhandled message:', msg)
  }

  /**
   * Send a JSON-RPC 2.0 request and wait for the response.
   * The wallet may prompt the user for permission (handled by the wallet UI).
   */
  async request<T = any>(method: string, params: any = {}): Promise<T> {
    if (this.state !== 'connected') {
      throw new Error(`XSWD not connected (state: ${this.state}). Call connect() first.`)
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }

    const id = ++this.requestId
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    }

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Request "${method}" timed out after ${REQUEST_TIMEOUT_MS / 1000}s. The wallet may be waiting for your approval.`))
      }, REQUEST_TIMEOUT_MS)

      this.pending.set(id, { resolve, reject, timeout })
      this.ws!.send(JSON.stringify(request))
    })
  }

  /** Convenience: get the wallet address */
  async getAddress(): Promise<string> {
    const result = await this.request('get_address')
    return typeof result === 'string' ? result : result?.address || result?.result
  }

  /** Convenience: get balance for an asset (or all assets if none specified) */
  async getBalance(asset?: string): Promise<number> {
    const params = asset ? { asset } : {}
    const result = await this.request('get_balance', params)
    return typeof result === 'number' ? result : result?.balance || 0
  }

  /** Convenience: build and broadcast a transaction */
  async buildTransaction(txParams: any): Promise<string> {
    const result = await this.request('build_transaction', txParams)
    return result?.hash || result?.data || (typeof result === 'string' ? result : 'submitted')
  }

  /** Convenience: invoke a smart contract */
  async invokeContract(contract: string, entryId: number, params: any[], deposits: any = {}) {
    return this.buildTransaction({
      invoke_contract: {
        contract,
        entry_id: entryId,
        parameters: params,
        deposits,
        max_gas: 500000,
        permission: 'all',
      },
      broadcast: true,
      fee: { fixed: 1000000 },
    })
  }

  /** Convenience: read-only contract call */
  async callContractView(contract: string, entryId: number, args: string[] = []) {
    return this.request('call_sc_view', { contract, entry_id: entryId, args })
  }

  disconnect() {
    this.shouldReconnect = false
    this.reconnectAttempts = 0
    if (this.ws) {
      try { this.ws.close() } catch {}
      this.ws = null
    }
    for (const [id, req] of this.pending) {
      clearTimeout(req.timeout)
      req.reject(new Error('Disconnected'))
      this.pending.delete(id)
    }
    this.setState('disconnected')
  }
}

// Singleton instance
let xswdClient: XSWDClient | null = null

export function getXSWDClient(): XSWDClient {
  if (!xswdClient) {
    xswdClient = new XSWDClient()
  }
  return xswdClient
}
