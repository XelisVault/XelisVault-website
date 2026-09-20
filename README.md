# XelisVault Website

[![Site CI](https://github.com/XelisVault/XelisVault-website/actions/workflows/site-ci.yml/badge.svg)](https://github.com/XelisVault/XelisVault-website/actions/workflows/site-ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Source code of **https://www.xelisvault.xyz/** — a fully client-side gateway for
the XELIS and NERVA (XNV) privacy networks: live network telemetry, explorers,
a merchant toolkit, cold-storage tools, and the XelisVault protocol app.

The site never holds keys and never sees user funds. Everything — invoicing,
payment matching, PDF generation, wallet encryption, transaction signing —
runs in the visitor's browser. There are no accounts and no tracking.

- XELIS world: `/` (protocol app, vault simulator, mixer, explorer)
- NERVA world: `/nerva` (explorer, merchant toolkit, paper wallet, mining)

Protocol status (v13): the audited **PrivacyMixer V4** is the one
mainnet-ready contract; the 51-contract legacy core is consolidating in the
[protocol repository](https://github.com/XelisVault/xelis-vault) (see its
[SECURITY.md](https://github.com/XelisVault/xelis-vault/blob/main/docs/SECURITY.md)
and `legacy/` directory).

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, webpack build), React 19 |
| Language | TypeScript (strict, `ignoreBuildErrors: false` — errors fail the build) |
| Styling | Tailwind CSS v4, shadcn/ui (Radix primitives), Framer Motion |
| State | Zustand stores, React hooks |
| Crypto | @noble/hashes, @noble/curves (blake3, ed25519, XSWD signing flows) |
| Charts / 3D | Recharts, three.js (explorer visualization) |
| Deployment | Vercel (static-friendly; single dynamic route for the NERVA price aggregator) |

## Repository layout

```
src/
  app/                    Next.js App Router routes
    api/nerva/price/      live XNV/USD-EUR rate aggregator (CoinGecko → CoinPaprika)
    api/quest/verify/     quest answer verification (server-side only)
    nerva/                POS, price tags, checkout, paper wallet, mining, explorer
    <pages>/              about, docs, security, developers, compare, learn, …
  components/
    app/                  XELIS protocol app (dashboard, mixer, vault engine, …)
    explorer/             XELIS block explorer UI
    nerva/                NERVA world UI (POS, tickets, pay-page, explorer)
    pages/                static marketing pages
    quest/                community quest/puzzle layer
    sections/             landing page sections
    site/                 shared chrome, launch experience, feature tour
    ui/                   shadcn/ui primitives
  lib/
    xelis/                XELIS network client (RPC, WS, XSWD, contracts, tx)
    nerva/                CryptoNote key math, invoices, PDF writer, price
    wallet/               local encrypted wallet storage (PBKDF2 + AES-GCM)
scripts/                  dev & QA tooling (excluded from the app build)
public/                   static assets (images, audio, docs)
```

## Getting started

Requires Node.js >= 20 (CI uses 22). npm is the canonical package manager
(`package-lock.json` is committed; `bun.lock` also exists for the Bun-based
test scripts).

```bash
npm install          # install dependencies
npm run dev          # dev server on http://localhost:3000
npm run lint         # ESLint (must pass — enforced in CI)
npm run typecheck    # tsc --noEmit (must pass — enforced in CI)
npm run build        # production build; TypeScript errors fail the build
npm start            # serve the production build
```

## Environment variables

None are required. The site is 100% client-side and reads no secrets at
build or runtime. Optionally, `NEXT_TELEMETRY_DISABLED=1` disables Next.js
telemetry during local builds. All network endpoints (XELIS mainnet/testnet
nodes, NERVA explorer API, CoinGecko/CoinPaprika for the price route) are
public and hardcoded in `src/lib/`.

## Security model

- **No server-side custody.** The browser talks directly to public nodes;
  the only dynamic routes aggregate public price data and verify quest
  answers. No keys, no sessions, no database.
- **Local wallet encryption.** Optional in-browser wallets are encrypted
  with PBKDF2-SHA256 (600k iterations) + AES-256-GCM
  (`src/lib/wallet/secure-storage.ts`); the seed never leaves the browser.
- **XSWD signing.** Transactions are signed by the user's local wallet
  (Genesix) over `ws://127.0.0.1:44325` — the site cannot sign anything.
- **Security headers.** CSP, HSTS, X-Frame-Options: DENY, nosniff,
  Referrer-Policy and Permissions-Policy are set both in `next.config.ts`
  and `vercel.json`. Known limitation: `script-src 'unsafe-inline'` (Next.js
  App Router needs inline bootstrap scripts; no nonce infrastructure yet).
- **Paper wallet.** Cold-storage generation with zero post-load network
  requests, self-verifying sheets, and a static audit:
  `npm run audit:paper-wallet` (fails on any network/storage primitive).

## Tests & QA scripts

| Script | Purpose |
| --- | --- |
| `npm run test:crypto` | CryptoNote key math vs NERVA's C++ semantics (70 assertions) |
| `npm run test:pdf` | Receipt / price-tag / paper-wallet PDFs (run with Bun) |
| `npm run test:nlink` | Payment-link detection engine (mocked chain fixtures) |
| `npm run audit:paper-wallet` | Static security audit of the paper-wallet code path |
| `scripts/test-nerva-mnemonic-xcheck.ts` | Mnemonic encoding vs verbatim C++ port (48 vectors) |
| `scripts/qa-*.sh`, `scripts/probe-*.mjs` | Playwright-driven UI QA and live API probes |

## Deployment

Vercel, zero configuration (`vercel.json` included). Every push to `main`
deploys production; `site-ci.yml` gates pushes and pull requests with
lint + typecheck + build (10-minute budget, read-only token).

## Contributing

1. Fork the repository and create a feature branch.
2. `npm run lint && npm run typecheck && npm run build` must pass locally.
3. Keep everything client-side: no new server routes, no secrets, no
   third-party trackers. Additions to `connect-src` in the CSP
   (`next.config.ts` + `vercel.json`) must be justified in the PR.
4. Do not commit generated artifacts, QA screenshots or local databases
   (see `.gitignore`).
5. Open a pull request against `main`.

Security issues: follow the
[responsible disclosure policy](https://github.com/XelisVault/xelis-vault/security/policy)
— never open a public issue for a vulnerability.

## Related repositories

- **Protocol (Silex contracts, audits, CLI):** https://github.com/XelisVault/xelis-vault
- XELIS blockchain: https://github.com/xelis-project/xelis-blockchain
- Genesix wallet (XSWD): https://github.com/xelis-project/xelis-genesix-wallet

## License & credits

Code: MIT. Not affiliated with the Nerva or Xelis projects — grateful guests
of both. Network data comes from public explorer/node APIs queried
client-side.
