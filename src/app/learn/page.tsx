import type { Metadata } from 'next'
import { LearnPage } from '@/components/pages/learn'

export const metadata: Metadata = {
  alternates: { canonical: '/learn' },

  title: 'Learn · XELIS Vault',
  description:
    'Master the concepts behind confidential DeFi: homomorphic encryption, ElGamal, zero-knowledge proofs, CDPs, liquidations, oracle manipulation, MEV protection, and governance.',
}

export default function Page() {
  return <LearnPage />
}
