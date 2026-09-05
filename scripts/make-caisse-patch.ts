/** Combined in-page patch for the caisse e2e: deterministic pid + mocked explorer API. */
import { readFileSync, writeFileSync } from 'node:fs'

const D = new URL('./gen-img-tmp/', import.meta.url).pathname
const read = (f: string) => readFileSync(D + f, 'utf8').trim()

const count = read('mock-count.json')
const pool = read('mock-pool.json')
const headers = read('mock-headers.json')
const block = read('mock-block.json')
const txs = read('mock-txs.json')

const patch = `(function () {
  if (window.__caisseMock) return 'already'
  window.__caisseMock = true
  // deterministic payment id: repeating 0x01,0x23,...,0xef → "0123456789abcdef"×4
  const origRand = crypto.getRandomValues.bind(crypto)
  const pattern = [1, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]
  crypto.getRandomValues = (arr) => {
    for (let i = 0; i < arr.length; i++) arr[i] = pattern[i % 8]
    return arr
  }
  const real = window.fetch.bind(window)
  const json = (s) => new Response(s, { status: 200, headers: { 'content-type': 'application/json' } })
  window.fetch = async (url, init) => {
    const u = String(url)
    if (u.includes('endpoint=get_block_count')) return json('${count.replace(/'/g, "\\'")}')
    if (u.includes('endpoint=get_transaction_pool')) return json('${pool.replace(/'/g, "\\'")}')
    if (u.includes('endpoint=get_block_headers_range')) return json('${headers.replace(/'/g, "\\'")}')
    if (u.includes('endpoint=get_block&')) return json('${block.replace(/'/g, "\\'")}')
    if (u.includes('endpoint=get_transactions')) return json('${txs.replace(/'/g, "\\'")}')
    return real(url, init)
  }
  return 'caisse mock armed'
})()`

writeFileSync(D + 'caisse-patch.js', patch)
console.log('patch bytes:', patch.length)
