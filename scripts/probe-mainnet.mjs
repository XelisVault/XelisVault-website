// Probe XELIS mainnet nodes: verify RPC endpoints + response shapes.
const CANDIDATES = [
  'https://node.xelis.io/json_rpc',
  'https://mainnet-node.xelis.io/json_rpc',
  'https://rpc.xelis.io/json_rpc',
]

const CALLS = [
  { method: 'get_info', params: undefined },
  { method: 'get_topoheight', params: undefined },
  { method: 'get_difficulty', params: undefined },
  { method: 'get_estimated_fee_rates', params: undefined },
  { method: 'get_peers', params: undefined },
  { method: 'count_transactions', params: undefined },
  { method: 'count_accounts', params: undefined },
  { method: 'count_assets', params: undefined },
]

async function probe(url) {
  console.log(`\n${'='.repeat(70)}\nPROBING ${url}`)
  for (const { method, params } of CALLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, ...(params !== undefined ? { params } : {}) }),
        signal: AbortSignal.timeout(8000),
      })
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('json')) {
        console.log(`  ${method}: HTTP ${res.status} NON-JSON (${ct})`)
        continue
      }
      const data = await res.json()
      if (data.error) {
        console.log(`  ${method}: RPC ERROR ${data.error.message?.slice(0, 80)}`)
      } else {
        const s = JSON.stringify(data.result)
        console.log(`  ${method}: OK ${s.length > 300 ? s.slice(0, 300) + '…' : s}`)
      }
    } catch (e) {
      console.log(`  ${method}: FETCH FAIL ${e.message}`)
    }
  }
}

for (const url of CANDIDATES) {
  await probe(url)
}
