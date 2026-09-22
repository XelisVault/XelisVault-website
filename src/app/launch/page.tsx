// /launch — the VaultLaunch private preview application.
//
// PRIVACY MODEL (static site, no server):
//   • noindex meta on this page (below)
//   • disallowed in robots.txt
//   • excluded from the sitemap
//   • not linked from any public page
//   • client-side access gate (sessionStorage + ?key= link)
// For real access control, add password protection at the hosting layer.

import type { Metadata } from 'next'
import { LaunchPageClient } from '@/components/launch/page-client'

export const metadata: Metadata = {
  title: 'VaultLaunch · Private Preview',
  description: 'Private preview.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

export default function LaunchPage() {
  return <LaunchPageClient />
}
