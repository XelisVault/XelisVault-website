import type { Metadata } from 'next'
import { Tickets } from '@/components/nerva/tickets'

export const metadata: Metadata = {
  title: 'Tickets prix NERVA · Étiquettes prix avec QR payant',
  description:
    'Générez des étiquettes de prix en XNV avec QR code payable : le client scanne, le wallet pré-remplit l’adresse, le montant exact et la référence. Planche A4 imprimable (10 tickets par page), 100 % généré dans le navigateur.',
}

export default function NervaTicketsRoute() {
  return <Tickets />
}
