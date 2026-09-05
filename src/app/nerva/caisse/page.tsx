import type { Metadata } from 'next'
import { Caisse } from '@/components/nerva/caisse'

export const metadata: Metadata = {
  title: 'Caisse NERVA · Terminal point de vente',
  description:
    'Le terminal de caisse NERVA : tapez le montant, le client scanne le QR, la page surveille la chaîne jusqu’à 10 confirmations, imprimez le reçu PDF. Journal des ventes scellé SHA-256, 100 % local dans le navigateur.',
}

export default function NervaCaisseRoute() {
  return <Caisse />
}
