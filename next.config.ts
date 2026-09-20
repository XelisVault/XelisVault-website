import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
// Mirrored in vercel.json so statically-served assets (/_next/static, public/)
// are covered even outside the Next.js runtime.
//
// CSP LIMITATION (documented on purpose): script-src carries 'unsafe-inline'
// because the Next.js App Router ships inline bootstrap/hydration scripts and
// this deployment has no nonce-signing infrastructure (no middleware).
// Moving to nonce-based CSP requires edge middleware + Next's nonce support
// and is tracked as a follow-up hardening task. Styles also need
// 'unsafe-inline' (Tailwind + Next inject inline <style> tags).
const isDev = process.env.NODE_ENV === "development";

const CSP = [
  "default-src 'self'",
  // Next.js App Router requires inline scripts (hydration bootstrap).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Tailwind CSS v4 and Next.js inject inline <style> elements.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // The browser talks directly to: XELIS public nodes (mainnet + testnet,
  // HTTP and WS), the NERVA explorer API, and the user's local XSWD wallet
  // (Genesix / xelis_wallet on 127.0.0.1:44325). No other egress allowed.
  "connect-src 'self' https://node.xelis.io wss://node.xelis.io https://testnet-node.xelis.io wss://testnet-node.xelis.io https://api.nerva.one https://explorer.nerva.one ws://127.0.0.1:44325 ws://localhost:44325",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Build hygiene: TypeScript errors MUST fail the build.
  // (Previously silenced with `ignoreBuildErrors: true` — see audit finding S-1.)
  // Note: Next.js 16 removed ESLint from `next build` entirely (and removed
  // the `eslint.ignoreDuringBuilds` config key), so linting is enforced
  // separately via `npm run lint` in CI (.github/workflows/site-ci.yml).
  typescript: { ignoreBuildErrors: false },
  images: { unoptimized: true },
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
