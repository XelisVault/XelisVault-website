import type { Metadata } from 'next'
import { Caisse } from '@/components/nerva/caisse'

export const metadata: Metadata = {
  title: 'NERVA POS · Point-of-sale terminal',
  description:
    'The NERVA point-of-sale terminal: type the amount, the customer scans the QR, the page watches the chain up to 10 confirmations, then print the PDF receipt. Live XNV/EUR rate, SHA-256 chained sales journal, 100% local in your browser.',
}

export default function NervaCaisseRoute() {
  return <Caisse />
}
