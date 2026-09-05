import type { Metadata } from 'next'
import { NervaShell } from '@/components/nerva/shell'

export const metadata: Metadata = {
  title: {
    default: 'NERVA · Private CPU Money · the Nerva side of XelisVault',
    template: '%s · NERVA · XelisVault',
  },
  description:
    'NERVA (XNV) is private digital cash you can mine with your CPU. Live explorer, payment links and network telemetry, the Nerva side of XelisVault, powered by the public explorer API.',
  applicationName: 'NERVA · XelisVault',
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
  alternates: { canonical: '/nerva' },
  icons: {
    icon: [
      { url: '/images/nerva/nerva-favicon.ico?v=3', sizes: 'any' },
      { url: '/images/nerva/nerva-icon-32.png?v=3', sizes: '32x32', type: 'image/png' },
      { url: '/images/nerva/nerva-icon-192.png?v=3', sizes: '192x192', type: 'image/png' },
      { url: '/images/nerva/nerva-icon-512.png?v=3', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/images/nerva/nerva-apple-icon.png?v=3', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'NERVA · Private CPU Money · the Nerva side of XelisVault',
    description:
      'Private digital cash, mined by CPUs alone. Live explorer, payment links and network telemetry for the NERVA network.',
    siteName: 'XelisVault · Nerva side',
    type: 'website',
    images: [
      {
        url: '/og/nerva-og.png',
        width: 1200,
        height: 630,
        alt: 'NERVA · Private CPU Money — the Nerva side of XelisVault',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NERVA · Private CPU Money · the Nerva side of XelisVault',
    description:
      'Private digital cash, mined by CPUs alone. Live explorer, payment links and network telemetry for the NERVA network.',
    images: ['/og/nerva-og.png'],
  },
}

export default function NervaLayout({ children }: { children: React.ReactNode }) {
  // JSON-LD: the Nerva toolset as a WebApplication (rich results)
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": "https://xelisvault.network/nerva/#app",
        name: "NervaLink & Explorer · the Nerva side of XelisVault",
        url: "https://xelisvault.network/nerva",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Any (browser)",
        browserRequirements: "Requires JavaScript",
        description:
          "Stateless XNV payment links, a live block explorer and network telemetry for the NERVA blockchain, running entirely client-side against the public explorer API.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [
          "Stateless NERVA payment links with on-chain detection",
          "Caisse: a merchant point-of-sale terminal with printable PDF receipts and a SHA-256 chained sales journal",
          "Printable XNV price tags with wallet-native payment QR",
          "Live block explorer and mempool telemetry",
          "QR checkout pages shareable as a single URL",
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://xelisvault.network/nerva/#website",
        url: "https://xelisvault.network/nerva",
        name: "NERVA · XelisVault",
        inLanguage: "en",
        isPartOf: { "@id": "https://xelisvault.network/#website" },
      },
    ],
  }

  return (
    <NervaShell>
      {children}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </NervaShell>
  )
}
