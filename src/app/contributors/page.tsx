import type { Metadata } from 'next'
import { ContributorsPage } from '@/components/pages/contributors'

export const metadata: Metadata = {
  alternates: { canonical: '/contributors' },

  title: 'Hall of Fame · XELIS Vault',
  description:
    'The people who make XELIS Vault possible. Security researchers, community builders, supporters, and contributors.',
}

export default function Page() {
  return <ContributorsPage />
}
