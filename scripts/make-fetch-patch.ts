/** Generate the in-page fetch patch for the e2e mock test. */
import { readFileSync, writeFileSync } from 'node:fs'

const D = new URL('./gen-img-tmp/', import.meta.url).pathname
const read = (f: string) => readFileSync(D + f, 'utf8').trim()

const count = read('mock-count.json')
const pool = read('mock-pool.json')
const headers = read('mock-headers.json')
const block = read('mock-block.json')
const txs = read('mock-txs.json')
const info = read('mock-info.json')

const patch = `(function () {
  if (window.__mockFetch) return 'already'
  window.__mockFetch = true
  window.__mockCalls = []
  const real = window.fetch.bind(window)
  const json = (s) => new Response(s, { status: 200, headers: { 'content-type': 'application/json' } })
  window.fetch = async (url, init) => {
    const u = String(url)
    window.__mockCalls.push(u.slice(0, 120))
    if (u.includes('endpoint=get_block_count')) return json('${count.replace(/'/g, "\\'")}')
    if (u.includes('endpoint=get_transaction_pool')) return json('${pool.replace(/'/g, "\\'")}')
    if (u.includes('endpoint=get_block_headers_range')) return json('${headers.replace(/'/g, "\\'")}')
    if (u.includes('endpoint=get_block&')) return json('${block.replace(/'/g, "\\'")}')
    if (u.includes('endpoint=get_transactions')) return json('${txs.replace(/'/g, "\\'")}')
    if (u.includes('endpoint=get_info')) return json('${info.replace(/'/g, "\\'")}')
    return real(url, init)
  }
  return 'patched'
})()`

writeFileSync(D + 'fetch-patch.js', patch)
console.log('patch bytes:', patch.length)
