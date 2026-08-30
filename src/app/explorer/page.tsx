import type { Metadata } from 'next'
import { ExplorerPage } from '@/components/pages/explorer'

export const metadata: Metadata = {
  title: 'The Observatory — Live BlockDAG Explorer — XELIS Vault',
  description:
    'A live window into the XELIS BlockDAG: blocks, forks, miners, fees and burns streaming in real time — while every amount stays sealed under homomorphic encryption. Watch the machinery, never the money.',
}

export default function Page() {
  return <ExplorerPage />
}
