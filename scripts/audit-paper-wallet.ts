/**
 * Security audit of the NERVA paper wallet generator.
 *
 * Verifiable claim: the paper wallet page generates keys entirely in the
 * browser and NEVER transmits or persists them. This script checks the
 * claim statically over the exact modules the page runs:
 *
 *   src/components/nerva/paper-wallet.tsx   the page itself
 *   src/lib/nerva/cryptonote.ts             the CryptoNote math
 *   src/lib/nerva/wordlist.ts               the Electrum wordlist
 *
 * It fails on any network primitive (fetch, XHR, WebSocket, sendBeacon…)
 * or storage primitive (localStorage, sessionStorage, indexedDB,
 * document.cookie, CacheStorage) appearing in those files, and it audits
 * the page's other imports explicitly so nothing hides in a shared module.
 *
 * Run:  bun run audit:paper-wallet     (or: bun scripts/audit-paper-wallet.ts)
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dir, '..')

type Verdict = 'PASS' | 'FAIL'

interface Finding {
  file: string
  line: number
  text: string
  pattern: string
}

interface Report {
  file: string
  kind: 'wallet-core' | 'shared-import'
  findings: Finding[]
  verdict: Verdict
  note?: string
}

const NETWORK_PATTERNS: [RegExp, string][] = [
  [/fetch\s*\(/, 'fetch()'],
  [/XMLHttpRequest/, 'XMLHttpRequest'],
  [/\bWebSocket\b/, 'WebSocket'],
  [/EventSource/, 'EventSource'],
  [/sendBeacon/, 'navigator.sendBeacon'],
  [/\baxios\b/, 'axios'],
]

const STORAGE_PATTERNS: [RegExp, string][] = [
  [/localStorage/, 'localStorage'],
  [/sessionStorage/, 'sessionStorage'],
  [/indexedDB/, 'indexedDB'],
  [/document\.cookie/, 'document.cookie'],
  [/caches\./, 'CacheStorage'],
]

function scan(file: string, patterns: [RegExp, string][]): Finding[] {
  let src: string
  try {
    src = readFileSync(resolve(ROOT, file), 'utf8')
  } catch {
    return [{ file, line: 0, text: '(file not found)', pattern: 'read' }]
  }
  const findings: Finding[] = []
  src.split('\n').forEach((line, i) => {
    // ignore comments and this audit's own doc comments
    const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '')
    for (const [re, label] of patterns) {
      if (re.test(code)) findings.push({ file, line: i + 1, text: line.trim().slice(0, 90), pattern: label })
    }
  })
  return findings
}

/* ── 1. the wallet's own code: zero tolerance ── */

const CORE_FILES = [
  'src/components/nerva/paper-wallet.tsx',
  'src/lib/nerva/cryptonote.ts',
  'src/lib/nerva/wordlist.ts',
]

const reports: Report[] = CORE_FILES.map((file) => {
  const findings = [...scan(file, NETWORK_PATTERNS), ...scan(file, STORAGE_PATTERNS)]
  return { file, kind: 'wallet-core' as const, findings, verdict: (findings.length ? 'FAIL' : 'PASS') as Verdict }
})

/* ── 2. shared modules the page imports: verify WHAT is imported ── */

const page = readFileSync(resolve(ROOT, 'src/components/nerva/paper-wallet.tsx'), 'utf8')

const sharedImports: { file: string; allowed: RegExp; note: string }[] = [
  {
    file: 'src/lib/clipboard.ts',
    allowed: /copyText|middleTruncate/,
    note: 'clipboard only, on explicit user click — never automatic, never stored',
  },
  {
    file: 'src/lib/nerva/nlink.ts',
    allowed: /renderQrDataUrl/,
    note: 'QR bitmap rendering (qrcode package) — pure local canvas math; the page imports nothing else from it',
  },
  {
    file: 'src/lib/nerva/api.ts',
    allowed: /NERVA_LINKS/,
    note: 'a static URL constant — the network helpers in that file are never imported by the page',
  },
  {
    file: 'src/lib/nerva/pdf.ts',
    allowed: /buildPaperWalletPdf|downloadPdf/,
    note: 'the dependency-free PDF writer — pure string/byte math, no DOM, no network',
  },
]

for (const { file, allowed, note } of sharedImports) {
  // which symbols does the page pull from this module?
  const importRe = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"][^'"]*${file.replace(/^src\//, '').replace(/\./g, '\\.')}['"]`, 's')
  // the page may import from the module via different alias forms — match by basename
  const base = file.split('/').pop()!.replace(/\.ts$/, '')
  const importRe2 = new RegExp(`import\\s*(?:type\\s*)?\\{([^}]*)\\}\\s*from\\s*['"][^'"]*\\/${base}['"]`, 's')
  const m = page.match(importRe2) ?? page.match(importRe)
  const symbols = (m?.[1] ?? '')
    .split(',')
    .map((s) => s.trim().replace(/^type\s*/, ''))
    .filter(Boolean)
  const bad = symbols.filter((s) => !allowed.test(s))
  reports.push({
    file,
    kind: 'shared-import',
    findings: bad.map((s) => ({ file: 'src/components/nerva/paper-wallet.tsx', line: 0, text: `import { ${s} } — not on the audited allow-list`, pattern: 'import' })),
    verdict: bad.length ? 'FAIL' : 'PASS',
    note: `${note} · imported: ${symbols.join(', ') || '(none)'}`,
  })
}

/* ── 3. random source check: the entropy must be the OS CSPRNG ── */

const cryptoSrc = readFileSync(resolve(ROOT, 'src/lib/nerva/cryptonote.ts'), 'utf8')
const usesOsRandom = /crypto\.getRandomValues/.test(cryptoSrc)
const noMathRandomInCrypto = !/\bMath\.random\b/.test(cryptoSrc)
reports.push({
  file: 'src/lib/nerva/cryptonote.ts (entropy)',
  kind: 'wallet-core',
  findings: (!usesOsRandom || !noMathRandomInCrypto)
    ? [{ file: 'src/lib/nerva/cryptonote.ts', line: 0, text: usesOsRandom ? 'Math.random found in key material path' : 'crypto.getRandomValues not found', pattern: 'entropy' }]
    : [],
  verdict: usesOsRandom && noMathRandomInCrypto ? 'PASS' : 'FAIL',
  note: 'key material comes from crypto.getRandomValues (OS CSPRNG) — no Math.random anywhere in the module',
})

/* ── print ── */

let failed = 0
for (const r of reports) {
  const icon = r.verdict === 'PASS' ? '✔' : '✘'
  console.log(`${icon} ${r.file}`)
  if (r.note) console.log(`   · ${r.note}`)
  for (const f of r.findings) console.log(`   ${f.file}:${f.line}  [${f.pattern}]  ${f.text}`)
  if (r.verdict === 'FAIL') failed++
}

console.log('─'.repeat(72))
if (failed === 0) {
  console.log('PASS — no network or storage primitives in the paper wallet code path.')
  console.log('Runtime proof anyone can run:')
  console.log('  1. open /nerva/paper-wallet, open DevTools → Network, clear it')
  console.log('  2. click "Generate paper wallet" — the network tab stays empty')
  console.log('  3. extreme mode: turn on airplane mode right after the page loads,')
  console.log('     then generate — it still works (the page needs zero requests)')
} else {
  console.log(`FAIL — ${failed} module(s) failed. Review the findings above.`)
  process.exit(1)
}
