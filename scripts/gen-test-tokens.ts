/** Generate test payment link tokens for the browser smoke test. */
import { encodeInvoice } from '../src/lib/nerva/nlink'
import { getBlockCount } from '../src/lib/nerva/api'

const ADDR = 'NVAjsQEK9kNHHGTzxStEeHC1scFhbB6gC4Q9Y8LkQ2yNmTX7ciTKR2DGiC1fv8b7BfmGCvRM9QJYVvgTBNAwkV3hLm7YEvWRcZ2EJBsHK7fhQ3mKTHrQaYq7cSgWcpF1CmVfY2'

async function main() {
  // real on-chain payment (found in test): tx af3bdb... at height 4384853
  const paid = encodeInvoice({
    v: 1, a: ADDR, amt: '0', d: 'Test revisit payment', n: 'XelisVault test',
    pid: '2dd6929712e4e6ddf8e4069b2c2c93540476f2dcd9d756c36ee9c7832f518187',
    h: 4384833, exp: Math.floor(Date.now() / 1000) + 3600,
  })
  // unpaid: random pid, created "recently"
  const tip = await getBlockCount()
  const unpaid = encodeInvoice({
    v: 1, a: ADDR, amt: '1234500000000000', d: 'Unpaid invoice', n: 'XelisVault test',
    pid: 'a1b2c3d4'.padEnd(64, '0').slice(0, 64),
    h: tip - 30, exp: Math.floor(Date.now() / 1000) + 3600,
  })
  console.log('PAID_TOKEN=' + paid)
  console.log('UNPAID_TOKEN=' + unpaid)
}

void main()
