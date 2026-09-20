/** Build a fake invoice token + mock API payloads for the browser e2e test. */
import { writeFileSync, mkdirSync } from 'node:fs'

const OUT = new URL('./gen-img-tmp/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

const pid = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const addr = 'NV1k9Y7Uya8KEgFrFAmmMkVVAMJjgGnDhFcWaWXqXgmVgVhPwKw5DQcMc7WZncw2JZDBEFx1Wy9Cxy4'
const inv = {
  v: 1 as const,
  a: addr,
  amt: '12500000000000',
  d: 'Commande #1042 · table 4',
  n: 'Café du Marché',
  pid,
  h: 630040,
  exp: Math.floor(Date.now() / 1000) + 3600,
}

// base64url JSON, same as encodeInvoice
const b64 = Buffer.from(JSON.stringify(inv), 'utf8').toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
writeFileSync(OUT + 'pay-token.txt', b64)

// pid bytes (32)
const pidBytes: number[] = []
for (let i = 0; i < pid.length; i += 2) pidBytes.push(parseInt(pid.slice(i, i + 2), 16))
const pub: number[] = Array(32).fill(7)
// tx_extra: tag 0x01 + 32B pubkey, tag 0x02 + varint(33) + sub 0x00 + 32B pid
const extra = [0x01, ...pub, 0x02, 33, 0x00, ...pidBytes]

const TIP_RAW = 630051 // getBlockCount() → 630050
const txHash = 'f1e2d3c4b5a69788695847362514023f4e5d6c7b8a99018273645566778899aa'
const blockHash = '9a8b7c6d5e4f0011223344556677889900aabbccddeeff11223344556677889a'

writeFileSync(OUT + 'mock-info.json', JSON.stringify({ status: 'OK', height: TIP_RAW, difficulty: 123456789, tx_count: 1 }))

writeFileSync(OUT + 'mock-count.json', JSON.stringify({ status: 'OK', count: TIP_RAW }))

writeFileSync(OUT + 'mock-pool.json', JSON.stringify({ status: 'OK', transactions: [] }))

// one tx-bearing block at 630040 (genesis of the window) → 11 confirmations → settled
writeFileSync(OUT + 'mock-headers.json', JSON.stringify({
  status: 'OK',
  headers: [
    { hash: blockHash, height: 630040, timestamp: Math.floor(Date.now() / 1000) - 660, block_size: 220, num_txes: 1, difficulty: 123456789 },
  ],
}))

writeFileSync(OUT + 'mock-block.json', JSON.stringify({
  status: 'OK',
  block_header: { hash: blockHash, height: 630040, timestamp: Math.floor(Date.now() / 1000) - 660, block_size: 220, num_txes: 1, difficulty: 123456789 },
  json: { tx_hashes: [txHash] },
}))

writeFileSync(OUT + 'mock-txs.json', JSON.stringify([
  {
    tx_hash: txHash,
    block_height: 630040,
    block_timestamp: Math.floor(Date.now() / 1000) - 660,
    in_pool: false,
    double_spend_seen: false,
    output_indices: [1],
    json: { extra, rct_signatures: { type: 0 } },
  },
]))

console.log('token:', b64)
console.log('pid bytes:', pidBytes.length, 'extra len:', extra.length)
