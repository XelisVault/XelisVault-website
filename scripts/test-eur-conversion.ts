/**
 * Sanity checks for the EUR/XNV conversion math (bun).
 * Run: bun scripts/test-eur-conversion.ts
 */
import { xnvAtomicToEur } from '../src/lib/nerva/price'
import { xnvAtomicToEur as manualRate } from '../src/lib/nerva/merchant'

let failures = 0
function expect(actual: string | null, expected: string, label: string) {
  const ok = actual === expected
  if (!ok) failures++
  console.log(`${ok ? '✔' : '✘'} ${label}: ${actual} ${ok ? '==' : '!= ' + expected}`)
}

// 1 XNV at €0.085 → €0.09 (rounded to cents)
expect(xnvAtomicToEur(10n ** 12n, 0.085), '0.09', '1 XNV @ 0.085')
// 2665.089387850168 XNV at 0.077734 → 207.17 (exact: 207.168058…)
expect(xnvAtomicToEur('2665089387850168', 0.077734), '207.17', '2665.09 XNV @ 0.077734')
// 12.5 XNV at 0.085 → 1.06
expect(xnvAtomicToEur('12500000000000', 0.085), '1.06', '12.5 XNV @ 0.085')
// 25 XNV at 0.077734 → 1.94
expect(xnvAtomicToEur('25000000000000', 0.077734), '1.94', '25 XNV @ 0.077734')
// large: 1,000,000 XNV at 0.0777 → 77,700.00
expect(xnvAtomicToEur('1000000000000000000', 0.0777), '77,700.00', '1M XNV @ 0.0777')
// invalid rate → null
expect(xnvAtomicToEur('1000000000000', 0), null as unknown as string, 'rate 0 → null')
// manual string rate path
expect(manualRate('12500000000000', '0.085'), '1.06', 'manual 12.5 XNV @ 0.085')

console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
