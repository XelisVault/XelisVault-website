/**
 * Validate the NervaLink PDF generator outside the browser (bun).
 * Builds a settled receipt + a 10-tag sheet, then qpdf/pdftotext check
 * them in the shell.
 */
import { buildReceiptPdf, buildTagsPdf } from '../src/lib/nerva/pdf'
import { writeFileSync, mkdirSync } from 'node:fs'

const OUT = new URL('./gen-img-tmp/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

const inv = {
  v: 1 as const,
  a: 'NV1k9Y7Uya8KEgFrFAmmMkVVAMJjgGnDhFcWaWXqXgmVgVhPwKw5DQcMc7WZncw2JZDBEFx1Wy9Cxy4',
  amt: '12500000000000', // 12.5 XNV
  d: 'Commande #1042 · café + croissant, table 4',
  n: 'Café du Marché',
  pid: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
  h: 630000,
  exp: Math.floor(Date.now() / 1000) + 3600,
}

const settled = {
  status: 'settled' as const,
  txHash: '9f8e7d6c5b4a3928170f6e5d4c3b2a190f1e2d3c4b5a69788796a5b4c3d2e1f0',
  blockHeight: 630012,
  txTimestamp: Math.floor(Date.now() / 1000) - 120,
  inPool: false,
  confirmations: 10,
  checkedTxs: 42,
  scannedBlocks: 18,
  networkHeight: 630022,
}

const receipt = await buildReceiptPdf(inv, settled, {
  verifyUrl: 'https://xelisvault.network/nerva/pay?d=dGVzdHRlc3R0ZXN0dGVzdHRlc3R0ZXN0dGVzdA==',
})
writeFileSync(OUT + 'receipt-test.pdf', receipt)
console.log('receipt bytes:', receipt.length)

const tags = Array.from({ length: 10 }, (_, i) => ({
  name: `Café expresso bio ${i + 1}`,
  amountAtomic: String(BigInt(i + 1) * 10n ** 12n),
  eur: '1.20',
  pid: 'abcdefabcdef' + String(i).padStart(2, '0') + 'abcdefabcdefabcdefabcdefabcdef12',
  address: inv.a,
  merchantName: 'Café du Marché',
}))
const sheet = await buildTagsPdf(tags)
writeFileSync(OUT + 'tags-test.pdf', sheet)
console.log('tags bytes:', sheet.length)
console.log('OK ->', OUT)
