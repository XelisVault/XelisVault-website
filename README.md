# XelisVault

Two protocols, one standard: privacy. XelisVault is a fully client-side
gateway for the **XELIS** and **NERVA (XNV)** privacy networks — live
network telemetry, explorers, a merchant toolkit, and cold-storage tools.
No accounts, no tracking, no keys held by anyone but you.

- Site: https://xelisvault.xyz
- XELIS world: `/` (vault simulator, mixer, oracle, contracts explorer)
- NERVA world: `/nerva` (explorer, merchant toolkit, paper wallet, mining)

## The NERVA merchant toolkit

| Tool | Route | What it does |
| --- | --- | --- |
| **POS terminal** | `/nerva/caisse` | Type an amount (XNV or USD at the live rate), the customer scans an integrated-address QR, the terminal matches the payment (auto with your optional view key, or customer-declared) to 10 confirmations, then prints a PDF receipt. Every sale is sealed into a SHA-256 chained local journal. |
| **Price tags** | `/nerva/tickets` | Printable A4 shelf labels (10 per sheet). Each tag QR encodes a checkout link — any phone camera opens the payment page with the product, the exact amount and the live USD equivalent. |
| **Payment links** | `/nerva/link` | Stripe-style checkout with zero infrastructure: the whole invoice lives inside its URL (base64url JSON). |
| **Paper wallet** | `/nerva/paper-wallet` | Cold-storage key generation in your browser — see the security section below. |
| **Watch-only** | `/nerva/watch` | Address + view key: watch payments arrive without exposing a spend key. |
| **Mining center** | `/nerva/mining` | Live hashrate/difficulty and an honest solo-mining odds calculator. |

### Live XNV/USD rate (reference) + EUR secondary

All fiat equivalents (POS keypad, price tags, checkout pages, journals) are
**live by default**, quoted in **USD — the market's reference currency —
with EUR shown alongside**. They are fetched through our own aggregator
route `GET /api/nerva/price`:

1. **CoinGecko** — direct USD/EUR/BTC quotes for `nerva`
2. **CoinPaprika** — USD quote, EUR via the ECB reference rate
   (frankfurter.dev) if CoinGecko is unreachable

The route caches for 60 s server-side and serves a stale quote (flagged
`stale: true`) for up to 30 min during a full outage, so a terminal keeps
working through exchange downtime. Merchants can set a manual USD rate
override in the POS settings — the override always wins.

## Security model — how to verify it

The site's core promise: **your keys and your money never touch our
servers, because nothing is ever sent to one.** Everything (invoices,
detection, PDFs, journals) runs in your browser.

### Paper wallet (the sensitive one)

**How it is built:**

- The spend key comes from `crypto.getRandomValues` — the operating
  system's CSPRNG. No `Math.random` anywhere in the key path
  (`src/lib/nerva/cryptonote.ts`, a byte-exact TypeScript port of NERVA's
  C++ `account.cpp` / `crypto.cpp` / `base58.cpp` / `electrum-words.cpp`).
- The view key is `sc_reduce32(keccak(spend))`, the address is base58
  with a keccak checksum — the exact account math the official NERVA
  wallet uses. `scripts/test-nerva-crypto.ts` runs 70 assertions,
  including full round-trips (mnemonic → keys → address → decode).
- **Mnemonic encoding is cross-checked against the C++ itself**:
  `scripts/nerva-mnemonic-xcheck.cpp` is a verbatim copy of NERVA's
  `electrum-words.cpp` loops (little-endian 4-byte groups, base-1626
  carry encoding, CRC-32 checksum word); compile it and run
  `scripts/test-nerva-mnemonic-xcheck.ts` — 48 vectors must match the
  TypeScript output bit-for-bit. This is what guarantees that a seed
  printed here restores the **same address** in `nerva-wallet-cli`.
- The page performs **zero network requests after load** and **writes
  nothing to any storage**. Load it, go offline, generate — it works.
- The on-screen sheet self-verifies in front of you: the address is
  decoded back and compared byte-for-byte to the generated keys, plus a
  mnemonic restore round-trip. Red mark = do not fund.
- Print via the browser, or download a vector A5 PDF (fold line hides
  the secrets) built by the same dependency-free PDF writer as the
  receipts.

**How anyone can audit it:**

```bash
bun run audit:paper-wallet   # static audit: fails on any network/storage
bun run test:crypto          # 70 CryptoNote round-trip assertions
g++ -O2 -o /tmp/mnemonic-xcheck scripts/nerva-mnemonic-xcheck.cpp
bun run scripts/test-nerva-mnemonic-xcheck.ts   # 48 vectors vs C++ verbatim
```

The audit script scans the exact modules the page executes and fails on
any network primitive (`fetch`, `XMLHttpRequest`, `WebSocket`,
`sendBeacon`, …) or storage primitive (`localStorage`, `indexedDB`,
`document.cookie`, …), and verifies the entropy source. Runtime proof:
open DevTools → Network, clear it, click *Generate paper wallet* — the
tab stays empty. Stronger: airplane mode, then generate.

### Payment matching (honest disclosure)

NervaLink invoices are **v2**: the QR pays an **integrated address** — the
merchant address with a random 8-byte payment id embedded (prefix 0x7081).
Every default NERVA wallet then encrypts and attaches that reference
automatically (tx_extra tag 0x02 → 0x01). We do not use the legacy
unencrypted 64-hex payment id: nerva-wallet refuses it by default
(`--long-payment-id-support` = false), which is why first-generation links
could miss real payments.

Because references travel **encrypted** (that's NERVA's privacy doing its
job), matching works on three honest levels:

1. **Merchant auto-detection** — with the optional secret view key in the
   POS settings, the terminal decrypts every integrated reference with
   `D = 8·viewKey·txPub`, exactly what an official wallet does. The key
   stays in the merchant's browser; it can see incoming funds, never
   spend them.
2. **Payer declaration** — the checkout page lets the payer paste the
   transaction hash for an instant receipt; with the transaction secret
   key (`get_tx_key`) the page verifies the reference cryptographically:
   `pid = enc ⊕ keccak(D‖0x8d)[0..8]`, `D = 8·txKey·viewPub`.
3. **Legacy links (v1)** still resolve through the clear long-id scan.

RingCT encrypts amounts on-chain; the receiving wallet always has the
final word on the exact sum. Everything is queried directly from your
browser, results cached only in your `localStorage`.

## Repository layout

```
src/
  app/                    Next.js App Router routes
    api/nerva/price/      live XNV rate aggregator (CoinGecko → CoinPaprika)
    nerva/                POS, price tags, checkout, paper wallet, mining, …
  components/
    nerva/                NERVA world UI (POS, tickets, pay-page, explorer…)
    sections/             XELIS landing sections
    site/                 shared site chrome, ceremony, quest
  lib/
    nerva/                nlink (stateless invoices), pdf (zero-dep PDF
                          writer), cryptonote (key math), receipt-chain
                          (SHA-256 journal), price (live rate), api (RPC)
    xelis/                XELIS network client (RPC, WS, XSWD, contracts)
scripts/                  dev & QA tooling (see table below)
scripts/archive/          one-off build artifacts kept for history
download/                 generated deliverables (blockchain proposal, …)
```

### Development

```bash
bun install          # dependencies
bun run dev          # dev server on :3000
bun run lint         # ESLint
bun run build        # production build (webpack)
```

### Tests & QA scripts

| Script | Purpose |
| --- | --- |
| `bun run test:crypto` | CryptoNote key math vs NERVA's C++ semantics (70 assertions) |
| `bun run scripts/test-nerva-mnemonic-xcheck.ts` | Mnemonic encoding vs verbatim C++ port (48 vectors) |
| `bun run scripts/test-nlink-v2.ts` | Integrated addresses, encrypted-pid matching, v2 URIs |
| `bun run test:pdf` | Receipt / price-tag / paper-wallet PDFs, then `qpdf --check` |
| `python3 scripts/decode-qr-pdf.py <png…>` | zbar + OpenCV decode of every QR in rendered pages |
| `bun run test:nlink` | Payment-link detection engine (mocked chain fixtures) |
| `bun run audit:paper-wallet` | Static security audit of the paper-wallet code path |
| `scripts/qa-explorer*.sh`, `qa-overflow.sh`, `qa-privacy.sh` | Playwright-driven UI QA passes |
| `scripts/probe-*.mjs` | one-shot live probes of the public APIs |

PDF/QR pipeline check end-to-end:

```bash
bun run test:pdf
cd scripts/gen-img-tmp && pdftoppm -r 150 -png tags-test.pdf tag
cd ../.. && python3 scripts/decode-qr-pdf.py scripts/gen-img-tmp/tag-1.png
```

## Deployment

Static-friendly Next.js (App Router) — deploys on Vercel with zero
configuration (`vercel.json` included). The single dynamic endpoint is
`/api/nerva/price` (server-side aggregation, 60 s cache). No database is
required at runtime; the Prisma/SQLite dev schema is used only by the
local quest feature and is git-ignored.

## License & credits

Code: MIT. Not affiliated with the Nerva or Xelis projects — grateful
guests of both. Network data: public explorer APIs queried client-side.
XNV unit: 10¹² atomic units · ring size 5 · 60 s blocks · one CPU, one
vote.
