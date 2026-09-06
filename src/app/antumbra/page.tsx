import type { Metadata } from 'next'
import { AntumbraTeaser } from '@/components/pages/antumbra-teaser'

export const metadata: Metadata = {
  alternates: { canonical: '/antumbra' },

  title: 'ANTUMBRA · The trust layer of the human-machine economy',
  description:
    'ANTUMBRA is a specification-first blockchain: private payments finalized in under six seconds, CPU-mined, with human identities without biometrics, accountable AI agents, a reputation money cannot buy, and a 16 180 339 golden-ratio cap. Whitepaper v1.1 available.',

  openGraph: {
    title: 'ANTUMBRA · The trust layer of the human-machine economy',
    description:
      'Private by default, provable on demand, finalized in seconds. The ANTUMBRA whitepaper v1.1: architecture, transaction lifecycle, Kleos reputation, golden eclipses, 18-month roadmap.',
    type: 'website',
    url: '/antumbra',
  },
}

export default function Page() {
  return <AntumbraTeaser />
}
