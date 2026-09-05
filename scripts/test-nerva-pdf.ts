/**
 * Validate the NervaLink PDF generator outside the browser (bun).
 * Builds a settled receipt, a 10-tag sheet and a paper wallet, then
 * qpdf/pdftotext + QR decoding (scripts/decode-qr-pdf.py) check them.
 */
import { buildReceiptPdf, buildTagsPdf, buildPaperWalletPdf } from '../src/lib/nerva/pdf'
import { encodeInvoice } from '../src/lib/nerva/nlink'
import { writeFileSync, mkdirSync } from 'node:fs'

const OUT = new URL('./gen-img-tmp/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

const inv = {
  v: 1 as const,
  a: 'NV1k9Y7Uya8KEgFrFAmmMkVVAMJjgGnDhFcWaWXqXgmVgVhPwKw5DQcMc7WZncw2JZDBEFx1Wy9Cxy4',
  amt: '12500000000000', // 12.5 XNV
  d: 'Order #1042 · coffee + croissant, table 4',
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
  verifyUrl: 'https://xelisvault.xyz/nerva/pay?d=dGVzdHRlc3R0ZXN0dGVzdHRlc3R0ZXN0dGVzdA==',
  eur: '0.97',
})
writeFileSync(OUT + 'receipt-test.pdf', receipt)
console.log('receipt bytes:', receipt.length)

const tags = Array.from({ length: 10 }, (_, i) => {
  // real NervaLink invoice → same URL shape the tickets page generates
  const token = encodeInvoice({
    v: 1,
    a: 'NV1k9Y7Uya8KEgFrFAmmMkVVAMJjgGnDhFcWaWXqXgmVgVhPwKw5DQcMc7WZncw2JZDBEFx1Wy9Cxy4',
    amt: String(BigInt(i + 1) * 10n ** 12n),
    d: `Organic espresso ${i + 1}`,
    pid: 'abcdefabcdef' + String(i).padStart(2, '0') + 'abcdefabcdefabcdefabcdefabcdef12',
    h: 630000,
    exp: 0,
  })
  return {
    name: `Organic espresso ${i + 1}`,
    amountAtomic: String(BigInt(i + 1) * 10n ** 12n),
    eur: '0.08',
    pid: 'abcdefabcdef' + String(i).padStart(2, '0') + 'abcdefabcdefabcdefabcdefabcdef12',
    address: 'NV1k9Y7Uya8KEgFrFAmmMkVVAMJjgGnDhFcWaWXqXgmVgVhPwKw5DQcMc7WZncw2JZDBEFx1Wy9Cxy4',
    merchantName: 'Café du Marché',
    link: `https://xelisvault.xyz/nerva/pay?d=${token}`,
  }
})
console.log('real tag link length:', tags[0].link.length, 'chars')
const sheet = await buildTagsPdf(tags)
writeFileSync(OUT + 'tags-test.pdf', sheet)
console.log('tags bytes:', sheet.length)

const wallet = await buildPaperWalletPdf({
  address: 'NV1k9Y7Uya8KEgFrFAmmMkVVAMJjgGnDhFcWaWXqXgmVgVhPwKw5DQcMc7WZncw2JZDBEFx1Wy9Cxy4',
  mnemonic: ['lucky', 'number', 'zero', 'oak', 'avenue', 'virus', 'sample', 'list', 'leech', 'gossip', 'tiny', 'bomb', 'ranch', 'hurry', 'cliff', 'fame', 'cigar', 'august', 'pony', 'rewind', 'uncle', 'silt', 'second', 'flying', 'zebra'],
  spendKeyHex: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
  viewKeyHex: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
  createdAt: Date.UTC(2026, 8, 5, 14, 3),
})
writeFileSync(OUT + 'paper-wallet-test.pdf', wallet)
console.log('paper wallet bytes:', wallet.length)

console.log('OK ->', OUT)
