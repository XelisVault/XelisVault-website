// /launch — the VaultLaunch application: LIVE on the XELIS mainnet
// since 23/09/2026.
//
// PUBLIC page (the private-preview gate is gone): indexable, in the
// sitemap, linked from the home section and the nav. Deep links:
//   /launch?view=create | trading | dex | portfolio | guide

import type { Metadata } from 'next'
import { LaunchPageClient } from '@/components/launch/page-client'

export const metadata: Metadata = {
  title: 'VaultLaunch · Community Launchpad — LIVE on XELIS Mainnet',
  description:
    'Launch a coin on XELIS: community validation, bonding curves, permanent-liquidity DEX. Real confidential assets, locked seeds, 50% of fees to liquidity providers. Live on mainnet since 23.09.2026.',
  robots: {
    index: true,
    follow: true,
  },
}

export default function LaunchPage() {
  return <LaunchPageClient />
}
