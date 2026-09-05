import type { Metadata } from 'next'
import { Tickets } from '@/components/nerva/tickets'

export const metadata: Metadata = {
  title: 'NERVA Price Tags · Shelf labels with a payable QR',
  description:
    'Generate XNV price tags with a payable QR code: customers scan with any phone camera — the checkout page opens with the product, the exact amount and a unique reference. Printable A4 sheet (10 tags per page), live EUR equivalents, 100% generated in your browser.',
}

export default function NervaTicketsRoute() {
  return <Tickets />
}
