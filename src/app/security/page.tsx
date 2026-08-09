import type { Metadata } from 'next'
import { SecurityPage } from '@/components/pages/security'

export const metadata: Metadata = {
  title: 'Security — XELIS Vault',
  description:
    'Security model, audit history, and bug bounty program for XELIS Vault. 2-step emergency withdraw, reentrancy guards, guardian multisig, circuit breakers, and a 50,000 VLT bounty for critical vulnerabilities.',
}

export default function Page() {
  return <SecurityPage />
}
