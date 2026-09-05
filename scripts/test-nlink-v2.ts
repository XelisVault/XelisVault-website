/**
 * NervaLink v2 detection crypto test — sender↔receiver symmetry.
 *
 * Simulates exactly what construct_tx_with_tx_key does (cryptonote_tx_utils.cpp):
 *   txPub = r·G, D_sender = 8·r·recipientViewPub, enc = pid8 ⊕ keccak(D‖0x8d)[0..8]
 * then what the merchant caisse does:
 *   D_receiver = 8·viewSecret·txPub → decrypt → must recover pid8.
 * Also validates integrated-address encoding + v2 URI construction.
 */
import {
  generateWallet, secretKeyToPublicKey, generateKeyDerivation, cryptShortPaymentId,
  encodeAddress, decodeAddress, bytesToHex, hexToBytes,
  NERVA_ADDRESS_PREFIX, NERVA_INTEGRATED_PREFIX, randomScalar,
} from '../src/lib/nerva/cryptonote'
import {
  buildIntegratedAddress, buildNervaUri, decodeInvoice, encodeInvoice,
  generatePaymentId8, invoiceCacheKey, NervaInvoice,
} from '../src/lib/nerva/nlink'

let pass = 0
let fail = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`) }
}

console.log('── NervaLink v2 detection crypto ──')

const merchant = generateWallet()

// 1. payment id generation
const pid8 = generatePaymentId8()
check('pid8 is 16 lowercase hex', /^[0-9a-f]{16}$/.test(pid8), pid8)

// 2. integrated address round-trip
const inv: NervaInvoice = {
  v: 2, a: merchant.address, amt: '1234567890000', pid8,
  d: 'Test sale', n: 'Test Shop', h: 4_386_000, exp: Math.floor(Date.now() / 1000) + 3600,
}
const integrated = buildIntegratedAddress(inv)
check('integrated address built', !!integrated, integrated ?? 'null')
const decInt = integrated ? decodeAddress(integrated) : null
check(
  'integrated decodes with tag 0x7081 + same keys + embedded pid',
  !!decInt &&
    decInt.tag === NERVA_INTEGRATED_PREFIX &&
    bytesToHex(decInt.spendPub) === bytesToHex(merchant.spendPub) &&
    bytesToHex(decInt.viewPub) === bytesToHex(merchant.viewPub) &&
    decInt.paymentId !== null &&
    bytesToHex(decInt.paymentId) === pid8,
)

// 3. the payer's wallet: r secret, txPub = r·G, encrypt pid with 8·r·viewPub
for (let round = 0; round < 25; round++) {
  const r = randomScalar()
  const txPub = secretKeyToPublicKey(r)
  const D_sender = generateKeyDerivation(merchant.viewPub, r) // 8·r·viewPub
  const pid = hexToBytes(generatePaymentId8())!
  const encrypted = D_sender ? cryptShortPaymentId(pid, D_sender!) : null

  // the merchant: D_receiver = 8·viewSecret·txPub → decrypt
  const D_receiver = generateKeyDerivation(txPub, merchant.view)
  const recovered = encrypted && D_receiver ? cryptShortPaymentId(encrypted, D_receiver!) : null

  if (!recovered || bytesToHex(recovered) !== bytesToHex(pid)) {
    check(`DH symmetry round ${round}`, false, `recovered=${recovered ? bytesToHex(recovered) : 'null'}`)
    break
  }
  if (round === 24) check('DH symmetry (25 rounds): sender-encrypted pid decrypts with view key', true)
}

// 4. dummy pid case: pid8 = 0 (cryptonote_tx_utils adds these) must not false-positive
const zeroPid = new Uint8Array(8)
const Dp = generateKeyDerivation(merchant.viewPub, randomScalar())
const encZero = Dp ? cryptShortPaymentId(zeroPid, Dp!) : null
const invOther: NervaInvoice = { ...inv, pid8: generatePaymentId8() }
{
  const Dr = generateKeyDerivation(secretKeyToPublicKey(randomScalar()), merchant.view)
  const dec = encZero && Dr ? cryptShortPaymentId(encZero, Dr!) : null
  check('dummy (zero) pid does not match a random invoice', !dec || bytesToHex(dec) !== invOther.pid8)
}

// 5. invoice token round-trip
const token = encodeInvoice(inv)
const decoded = decodeInvoice(token)
check('v2 token round-trip', !!decoded && decoded.v === 2 && decoded.pid8 === pid8 && decoded.a === merchant.address)

// 6. v2 URI uses the integrated address and carries NO tx_payment_id
const uri = buildNervaUri(inv)
check('v2 URI starts with nerva: + integrated address', uri.startsWith(`nerva:${integrated}`), uri.slice(0, 40))
check('v2 URI has no tx_payment_id (wallet refuses it with integrated)', !uri.includes('tx_payment_id'))
check('v2 URI carries tx_amount', uri.includes('tx_amount=1.23456789'))

// 7. v1 legacy links still decode
const inv1: NervaInvoice = {
  v: 1, a: merchant.address, amt: '0',
  pid: bytesToHex(randomScalar()).padEnd(64, '0').slice(0, 64),
  h: 1, exp: 0,
}
const dec1 = decodeInvoice(encodeInvoice(inv1))
check('v1 legacy token round-trip', !!dec1 && dec1.v === 1 && dec1.pid === inv1.pid)
check('v1 URI carries tx_payment_id', buildNervaUri(inv1).includes('tx_payment_id'))

// 8. cache key separation
check('cache keys differ between v1/v2 and invoices', invoiceCacheKey(inv) !== invoiceCacheKey(invOther) && invoiceCacheKey(inv1) !== invoiceCacheKey(inv))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
