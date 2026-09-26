// /launch — the VaultLaunch application: LIVE on the XELIS mainnet
// since 23/09/2026.
//
// PUBLIC page (the private-preview gate is gone): indexable, in the
// sitemap, linked from the home section and the nav. Deep links:
//   /launch?view=coin&focus=XVLT (the official token) · create ·
//   trading · dex · portfolio · guide
//
// The OG/Twitter cards below are what X, Discord & co. show when a
// trade-page link is shared — branded on the official token.

import type { Metadata } from 'next'
import { LaunchPageClient } from '@/components/launch/page-client'

export const metadata: Metadata = {
  title: 'VaultLaunch · XVLT — the official XelisVault Token',
  description:
    'Trade XVLT, the official token of XelisVault: fixed supply forever, launched on the community track with 500 XEL of team-funded liquidity, graduation into a permanent-liquidity pool with a protocol-locked seed. Live on the XELIS mainnet since 23.09.2026.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: { canonical: '/launch' },
  openGraph: {
    title: 'XVLT · The Official XelisVault Token',
    description:
      'Fixed supply forever. Launched on the community track with 500 XEL of team-funded liquidity, graduation into a permanent-liquidity pool with a protocol-locked seed. Trade it on VaultLaunch — XELIS mainnet.',
    url: '/launch',
    siteName: 'XELIS Vault',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/og/launch-og.png',
        width: 1200,
        height: 630,
        alt: 'XVLT — the official XelisVault token, live on VaultLaunch',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XVLT · The Official XelisVault Token — VaultLaunch',
    description:
      'Fixed supply. Locked seed. Trade the official XelisVault token on the XELIS mainnet.',
    images: ['/og/launch-og.png'],
  },
}

export default function LaunchPage() {
  return <LaunchPageClient />
}
