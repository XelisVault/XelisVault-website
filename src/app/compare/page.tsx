import type { Metadata } from 'next'
import { ComparePage } from '@/components/pages/compare'

export const metadata: Metadata = {
  alternates: { canonical: '/compare' },

  title: 'Compare · XELIS Vault',
  description:
    'How XELIS Vault compares to Aztec, Railgun, and Secret Network across privacy, smart contracts, oracle systems, MEV protection, and tokenomics.',
}

export default function Page() {
  return <ComparePage />
}
