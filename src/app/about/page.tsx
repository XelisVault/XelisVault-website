import type { Metadata } from 'next'
import { AboutPage } from '@/components/pages/about'

export const metadata: Metadata = {
  alternates: { canonical: '/about' },

  title: 'About · XELIS Vault',
  description:
    'Mission, team, principles, and contact for XELIS Vault. Open source forever, on-chain governance, public development, no VC funding, no presale.',
}

export default function Page() {
  return <AboutPage />
}
