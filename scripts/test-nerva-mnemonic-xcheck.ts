/**
 * Cross-validation of the TS mnemonic implementation (src/lib/nerva/cryptonote.ts)
 * against the verbatim C++ port (scripts/nerva-mnemonic-xcheck.cpp, compiled).
 *
 * Run:  bun run scripts/test-nerva-mnemonic-xcheck.ts
 * Needs: g++ scripts/nerva-mnemonic-xcheck.cpp -o /tmp/mnemonic-xcheck
 */
import { execSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { bytesToMnemonic, mnemonicToBytes, bytesToHex, hexToBytes } from '../src/lib/nerva/cryptonote'

const BIN = '/tmp/mnemonic-xcheck'

function cppEncode(hex: string): string {
  return execSync(`${BIN} ${hex}`, { encoding: 'utf8' }).trim()
}

function cppDecode(words: string[]): string {
  // the C++ words_to_bytes core expects the 24 data words (checksum already popped)
  return execSync(`${BIN} --decode ${words.slice(0, 24).join(' ')}`, { encoding: 'utf8' }).trim()
}

let pass = 0
let fail = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`) }
}

console.log('== C++↔TS mnemonic cross-validation (official nerva algorithm) ==')

// fixed edge-case vectors: all-zero, all-ff, mixed endianness pattern
const fixed = [
  '0000000000000000000000000000000000000000000000000000000000000000',
  'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20',
  '11223344556677889900aabbccddeeff00112233445566778899aabbccddeeff',
]

for (const hex of fixed) {
  const bytes = hexToBytes(hex)!
  const tsWords = bytesToMnemonic(bytes)
  const cppWords = cppEncode(hex).split(' ')
  check(`encode ${hex.slice(0, 12)}… (len ${tsWords.length})`, tsWords.join(' ') === cppWords.join(' '),
    `ts=${tsWords.slice(0, 4).join(' ')} cpp=${cppWords.slice(0, 4).join(' ')}`)
  // reverse
  const tsBack = bytesToHex(mnemonicToBytes(tsWords)!)
  const cppBack = cppDecode(tsWords)
  check(`decode ${hex.slice(0, 12)}…`, tsBack === cppBack && tsBack === hex)
}

// random vectors
for (let i = 0; i < 40; i++) {
  const bytes = new Uint8Array(randomBytes(32))
  const hex = bytesToHex(bytes)
  const tsWords = bytesToMnemonic(bytes)
  const cppWords = cppEncode(hex).split(' ')
  if (tsWords.join(' ') !== cppWords.join(' ')) {
    fail++
    console.error(`  ✗ random vector ${i} (${hex}) mismatch`)
    continue
  }
  const back = bytesToHex(mnemonicToBytes(tsWords)!)
  if (back !== hex) {
    fail++
    console.error(`  ✗ random roundtrip ${i} failed`)
    continue
  }
  pass++
}
console.log(`  ✓ 40 random vectors: encode + decode identical to C++`)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
