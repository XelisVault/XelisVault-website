import type { Metadata } from 'next'
import { ExplorerPage } from '@/components/pages/explorer'

export const metadata: Metadata = {
  title: 'The Observatory — Live XELIS Mainnet BlockDAG Explorer — XELIS Vault',
  description:
    'A live window into the XELIS mainnet BlockDAG: blocks, forks, miners, fees and burns streaming in real time in 2D and 3D — while every amount stays sealed under homomorphic encryption. Watch the machinery, never the money.',
}

export default function Page() {
  return <ExplorerPage />
}
