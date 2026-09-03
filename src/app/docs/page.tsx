import type { Metadata } from 'next'
import { DocsPage } from '@/components/pages/docs'

export const metadata: Metadata = {
  title: 'Documentation · XELIS Vault',
  description: 'Guides, specifications and reference for the XELIS Vault protocol: CLI, mining, tokenomics, contracts and deployments.',
}

export default function Docs() {
  return <DocsPage />
}
