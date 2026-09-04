import type { Metadata } from 'next'
import { NervaShell } from '@/components/nerva/shell'

export const metadata: Metadata = {
  title: {
    default: 'NERVA · Private CPU Money — the Nerva side of XelisVault',
    template: '%s · NERVA · XelisVault',
  },
  description:
    'NERVA (XNV) is private digital cash you can mine with your CPU. Live explorer, payment links and network telemetry — the Nerva side of XelisVault, powered by the public explorer API.',
  keywords: [
    'NERVA',
    'XNV',
    'private cryptocurrency',
    'CPU mining',
    'CryptoNight-Adaptive',
    'privacy coin',
    'Monero fork',
    'blockchain explorer',
    'payment links',
    'XelisVault',
  ],
  icons: {
    icon: [
      { url: '/images/nerva/nerva-favicon.ico', sizes: 'any' },
      { url: '/images/nerva/nerva-icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/nerva/nerva-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/nerva/nerva-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/images/nerva/nerva-apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'NERVA · Private CPU Money — the Nerva side of XelisVault',
    description:
      'Private digital cash, mined by CPUs alone. Live explorer, payment links and network telemetry for the NERVA network.',
    siteName: 'XelisVault · Nerva side',
    type: 'website',
  },
}

export default function NervaLayout({ children }: { children: React.ReactNode }) {
  return <NervaShell>{children}</NervaShell>
}
