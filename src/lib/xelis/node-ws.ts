// Live WebSocket client for the XELIS daemon (public testnet node).
//
// The daemon multiplexes JSON-RPC calls and event pushes on the same
// /json_rpc URL. Verified live (scripts/probe-node-ws.mjs):
//  - `subscribe {notify: "new_block"}` answers `{result: true}` and every
//    subsequent push REUSES the subscribe call id (daemon quirk).
//  - `new_block` pushes carry the FULL block object + an `event` field.
//  - `stable_height_changed` pushes `{new_stable_height, previous_stable_height}`.
//
// This client is transport-level only: it connects, keeps itself alive,
// dispatches events to handlers and exposes a small promise-based `call`.

export const PUBLIC_NODE_WS = 'wss://testnet-node.xelis.io/json_rpc'

export type SocketStatus = 'connecting' | 'live' | 'reconnecting' | 'closed'

export interface NodeEventPayload {
  event: string
  [k: string]: any
}

type EventHandler = (e: NodeEventPayload) => void
type StatusHandler = (s: SocketStatus) => void

const MAX_BACKOFF_MS = 30_000

export class NodeSocket {
  private ws: WebSocket | null = null
  private handlers = new Set<EventHandler>()
  private statusHandlers = new Set<StatusHandler>()
  private rpcId = 1
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()
  private retry = 0
  private closedByUs = false
  private status: SocketStatus = 'connecting'
  private url: string
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(url: string = PUBLIC_NODE_WS) {
    this.url = url
  }

  getStatus(): SocketStatus {
    return this.status
  }

  private setStatus(s: SocketStatus) {
    if (this.status === s) return
    this.status = s
    this.statusHandlers.forEach((h) => h(s))
  }

  connect() {
    if (typeof window === 'undefined') return // server-side: nothing to do
    this.closedByUs = false
    this.setStatus(this.retry === 0 ? 'connecting' : 'reconnecting')
    try {
      this.ws = new WebSocket(this.url)
    } catch {
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.retry = 0
      this.setStatus('live')
    }

    this.ws.onmessage = (ev) => {
      let msg: any
      try {
        msg = JSON.parse(ev.data as string)
      } catch {
        return
      }
      if (msg?.id !== undefined && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id)!
        this.pending.delete(msg.id)
        if (msg.error) p.reject(new Error(msg.error.message ?? 'rpc error over ws'))
        else p.resolve(msg.result)
        return
      }
      // Event push — the payload carries its own `event` discriminator.
      if (msg?.result && typeof msg.result === 'object' && msg.result.event) {
        this.handlers.forEach((h) => h(msg.result as NodeEventPayload))
      }
    }

    this.ws.onerror = () => {
      /* onclose follows; reconnect there */
    }

    this.ws.onclose = () => {
      this.pending.forEach((p) => p.reject(new Error('websocket closed')))
      this.pending.clear()
      if (!this.closedByUs) this.scheduleReconnect()
      else this.setStatus('closed')
    }
  }

  private scheduleReconnect() {
    if (this.closedByUs) return
    this.setStatus('reconnecting')
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * Math.pow(2, this.retry))
    this.retry++
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  /** Fire-and-forget subscription (pushes are handled by `on`). */
  subscribe(notify: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ jsonrpc: '2.0', id: this.rpcId++, method: 'subscribe', params: { notify } }))
    } else {
      // Queue until open
      const send = () =>
        this.ws?.send(JSON.stringify({ jsonrpc: '2.0', id: this.rpcId++, method: 'subscribe', params: { notify } }))
      if (this.ws) {
        const prev = this.ws.onopen
        this.ws.onopen = (ev) => {
          ;(prev as any)?.call(this.ws, ev)
          send()
        }
      }
    }
  }

  /** Promise-based RPC over the socket (used sparsely — HTTP has retries). */
  call<T = any>(method: string, params?: Record<string, any>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        reject(new Error('websocket not open'))
        return
      }
      const id = this.rpcId++
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, ...(params !== undefined ? { params } : {}) }))
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error('ws rpc timeout'))
        }
      }, 8000)
    })
  }

  on(handler: EventHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  close() {
    this.closedByUs = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.handlers.clear()
    this.statusHandlers.clear()
    this.ws?.close()
    this.ws = null
    this.setStatus('closed')
  }
}
