import type { Metadata } from 'next'
import { MiningCenter } from '@/components/nerva/mining-center'

export const metadata: Metadata = {
  title: 'NERVA Mining Center — Live Stats & Solo Calculator',
  description:
    'Live NERVA network telemetry — hashrate, difficulty, rewards, block times — plus an honest solo mining calculator: expected XNV per day, probability of finding a block, median wait. CPU-only, no pools, by design.',
  alternates: { canonical: '/nerva/mining' },
  openGraph: {
    title: 'NERVA Mining Center · XelisVault',
    description:
      'Live network stats and a truthful solo-mining calculator for the CPU-only privacy coin NERVA (XNV).',
  },
}

export default function NervaMiningPage() {
  return <MiningCenter />
}
