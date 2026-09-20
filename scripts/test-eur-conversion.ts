/**
 * Sanity checks for the fiat/XNV conversion math (bun).
 * USD is the reference currency, EUR the secondary.
 * Run: bun scripts/test-eur-conversion.ts
 */
import { xnvAtomicToUsd, xnvAtomicToEur } from '../src/lib/nerva/price'
import { xnvAtomicToFiatManual as manualRate } from '../src/lib/nerva/merchant'

let failures = 0
function expect(actual: string | null, expected: string, label: string) {
  const ok = actual === expected
  if (!ok) failures++
  console.log(`${ok ? '✔' : '✘'} ${label}: ${actual} ${ok ? '==' : '!= ' + expected}`)
}

// 1 XNV at $0.085 → $0.09 (rounded to cents)
expect(xnvAtomicToUsd(10n ** 12n, 0.085), '0.09', '1 XNV @ usd 0.085')
// 2665.089387850168 XNV at 0.077734 → 207.17 (exact: 207.168058…)
expect(xnvAtomicToUsd('2665089387850168', 0.077734), '207.17', '2665.09 XNV @ usd 0.077734')
// 12.5 XNV at 0.085 → 1.06
expect(xnvAtomicToUsd('12500000000000', 0.085), '1.06', '12.5 XNV @ usd 0.085')
// 25 XNV at 0.077734 → 1.94
expect(xnvAtomicToUsd('25000000000000', 0.077734), '1.94', '25 XNV @ usd 0.077734')
// large: 1,000,000 XNV at 0.0777 → 77,700.00
expect(xnvAtomicToUsd('1000000000000000000', 0.0777), '77,700.00', '1M XNV @ usd 0.0777')
// invalid rate → null
expect(xnvAtomicToUsd('1000000000000', 0), null as unknown as string, 'usd rate 0 → null')
// EUR secondary path
expect(xnvAtomicToEur('25000000000000', 0.077734), '1.94', '25 XNV @ eur 0.077734')
// manual string rate path
expect(manualRate('12500000000000', '0.085'), '1.06', 'manual 12.5 XNV @ 0.085')

console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`)
