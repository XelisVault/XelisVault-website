// Probe mainnet WS + block shapes + assets + mempool.
const WebSocket = globalThis.WebSocket

const HTTP = 'https://node.xelis.io/json_rpc'
const WS = 'wss://node.xelis.io/json_rpc'

async function rpc(method, params) {
  const res = await fetch(HTTP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, ...(params !== undefined ? { params } : {}) }),
    signal: AbortSignal.timeout(10000),
  })
  const data = await res.json()
  if (data.error) throw new Error(`${method}: ${data.error.message}`)
  return data.result
}

// Full get_info
const info = await rpc('get_info')
console.log('get_info FULL:', JSON.stringify(info, null, 1).slice(0, 2200))

// Block at topo
const topo = info.topoheight
const block = await rpc('get_block_at_topoheight', { topoheight: topo, include_txs: false })
console.log('\nTOP BLOCK:', JSON.stringify(block, null, 1).slice(0, 1600))

// Blocks at height (fork view)
const atHeight = await rpc('get_blocks_at_height', { height: info.height, include_txs: false })
console.log(`\nblocks at height ${info.height}: ${atHeight.length} block(s)`, JSON.stringify(atHeight.map(b => ({ topo: b.topoheight, type: b.block_type, hash: b.hash.slice(0, 10) }))))

// Mempool
const mem = await rpc('get_mempool_summary')
console.log('\nmempool total:', mem.total, 'txs in snapshot:', mem.transactions?.length ?? 0)

// Assets sample
const assets = await rpc('get_assets')
console.log('\nassets count:', assets.length)
console.log('assets sample:', JSON.stringify(assets.slice(0, 3)))

// stable height check
console.log('\nstable_topoheight:', info.stable_topoheight, 'topoheight:', info.topoheight)

// ---- WS probe ----
console.log('\n--- WEBSOCKET PROBE', WS, '---')
await new Promise((resolve) => {
  const ws = new WebSocket(WS)
  let id = 1
  const pending = new Map()
  let done = false
  const finish = () => { if (!done) { done = true; try { ws.close() } catch {} setTimeout(resolve, 300) } }
  const timer = setTimeout(finish, 30000)

  ws.onopen = () => {
    console.log('WS OPEN')
    const send = (method, params) => {
      const cid = id++
      pending.set(cid, method)
      ws.send(JSON.stringify({ jsonrpc: '2.0', id: cid, method, ...(params ? { params } : {}) }))
    }
    send('subscribe', { notify: 'new_block' })
    send('subscribe', { notify: 'transaction_added_in_mempool' })
    send('subscribe', { notify: 'stable_height_changed' })
    setTimeout(() => send('get_topoheight'), 1000)
  }
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id !== undefined && pending.has(msg.id)) {
      const m = pending.get(msg.id)
      pending.delete(msg.id)
      const s = JSON.stringify(msg.result ?? msg.error)
      console.log(`REPLY ${m}:`, s.length > 400 ? s.slice(0, 400) + '…' : s)
      return
    }
    if (msg?.result?.event) {
      const e = msg.result
      console.log(`EVENT ${e.event}:`, Object.keys(e).join(','), '| topo:', e.topoheight ?? e.new_stable_height ?? '?', '| type:', e.block_type ?? '')
    }
  }
  ws.onerror = () => { console.log('WS ERROR'); clearTimeout(timer); finish() }
  ws.onclose = () => { console.log('WS CLOSED'); clearTimeout(timer); finish() }
})
