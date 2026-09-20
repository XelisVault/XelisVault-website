import type { Metadata } from 'next'
import { PaperWallet } from '@/components/nerva/paper-wallet'

export const metadata: Metadata = {
  title: 'NERVA Paper Wallet Generator',
  description:
    'Generate a NERVA (XNV) paper wallet in your browser: fresh spend and view keys, 97-char NV address and a 25-word Electrum mnemonic. 100% client-side, offline-capable, restorable with the official nerva-wallet-cli.',
  alternates: { canonical: '/nerva/paper-wallet' },
  openGraph: {
    title: 'NERVA Paper Wallet Generator · XelisVault',
    description:
      'Cold-storage NERVA paper wallets minted by your own browser — no server, no logs, offline-capable.',
  },
}

export default function NervaPaperWalletPage() {
  return <PaperWallet />
}
