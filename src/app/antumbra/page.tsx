import type { Metadata } from 'next'
import { AntumbraTeaser } from '@/components/pages/antumbra-teaser'

export const metadata: Metadata = {
  alternates: { canonical: '/antumbra' },

  title: 'ANTUMBRA · The trust layer of the human-machine economy',
  description:
    'ANTUMBRA is a specification-first blockchain: private payments finalized in under six seconds, CPU-mined, with human identities without biometrics, accountable AI agents, a reputation money cannot buy, AI governance under human veto, and a 16 180 339 golden-ratio cap. Whitepaper v1.2 available.',

  openGraph: {
    title: 'ANTUMBRA · The trust layer of the human-machine economy',
    description:
      'Private by default, provable on demand, finalized in seconds. The ANTUMBRA whitepaper v1.2: architecture, transaction lifecycle, Kleos reputation, golden eclipses, the Corona, criteria-driven roadmap.',
    type: 'website',
    url: '/antumbra',
  },
}

export default function Page() {
  return <AntumbraTeaser />
}
