import type { Metadata } from 'next'
import { DevelopersPage } from '@/components/pages/developers'

export const metadata: Metadata = {
  title: 'Developers · XELIS Vault',
  description:
    'SDKs, code examples, integration guides, hackathons, and open bounties for building on XELIS Vault. Everything you need to ship a confidential DeFi app.',
}

export default function Page() {
  return <DevelopersPage />
}
