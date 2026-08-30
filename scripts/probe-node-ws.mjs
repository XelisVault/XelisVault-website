// Probe the XELIS testnet node WebSocket: structure of new_block / mempool events
const WS_URL = 'wss://testnet-node.xelis.io/json_rpc'

const ws = new WebSocket(WS_URL)
let id = 1
const pending = new Map()

function call(method, params) {
  const mid = id++
  return new Promise((resolve, reject) => {
    pending.set(mid, { resolve, reject })
    ws.send(JSON.stringify({ jsonrpc: '2.0', id: mid, method, ...(params !== undefined ? { params } : {}) }))
  })
}

ws.onopen = async () => {
  console.log('[open] connected to', WS_URL)
  try {
    const topo = await call('get_topoheight')
    console.log('[rpc] topoheight =', JSON.stringify(topo))
    const b = await call('get_block_at_topoheight', { topoheight: topo - 1, include_txs: false })
    console.log('[rpc] block sample keys =', Object.keys(b).join(', '))
    // subscribe to events — note: each subscription reuses its id on push
    ws.send(JSON.stringify({ jsonrpc: '2.0', id: 900, method: 'subscribe', params: { notify: 'new_block' } }))
    ws.send(JSON.stringify({ jsonrpc: '2.0', id: 901, method: 'subscribe', params: { notify: 'transaction_added_in_mempool' } }))
    ws.send(JSON.stringify({ jsonrpc: '2.0', id: 902, method: 'subscribe', params: { notify: 'stable_height_changed' } }))
    ws.send(JSON.stringify({ jsonrpc: '2.0', id: 903, method: 'subscribe', params: { notify: 'peer_connected' } }))
    console.log('[sub] subscribed to 4 events, waiting for pushes...')
  } catch (e) {
    console.log('[rpc error]', e.message)
  }
}

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id !== undefined && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) reject(new Error(msg.error.message))
    else resolve(msg.result)
    return
  }
  // event push
  console.log('[PUSH id=' + msg.id + ']', JSON.stringify(msg).slice(0, 900))
}

ws.onerror = (e) => console.log('[error]', e.message || 'ws error')
ws.onclose = (e) => console.log('[close]', e.code, e.reason)

setTimeout(() => { console.log('[done]'); process.exit(0) }, 20000)
