import type { Metadata } from 'next'
import { WatchWallet } from '@/components/nerva/watch-wallet'

export const metadata: Metadata = {
  title: 'NERVA Watch-Only Tracker',
  description:
    'Track incoming NERVA (XNV) payments with just an address and its view key: the one-time-key math of the chain is replayed in your browser. Watch-only — amounts stay sealed, the spend key never leaves the official wallet.',
  alternates: { canonical: '/nerva/watch' },
  openGraph: {
    title: 'NERVA Watch-Only Tracker · XelisVault',
    description:
      'See payments arrive on a NERVA address without the spend key — client-side, watch-only, honest.',
  },
}

export default function NervaWatchPage() {
  return <WatchWallet />
}
