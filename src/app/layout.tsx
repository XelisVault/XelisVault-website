import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { GlobalChrome } from "@/components/side/global-chrome";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

// Fraunces — editorial serif with optical sizing, the private-banking voice
// of the new skin (Julius Baer / Pictet style display typography).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const SITE_URL = "https://xelisvault.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "XELIS Vault · Confidential Finance, Institutional Grade",
  description:
    "The first confidential financial platform on XELIS BlockDAG. Deposit XEL, borrow xUSD, trade on VaultSwap, tokenize real-world assets, lend peer-to-peer, and govern privately, secured by native Twisted ElGamal homomorphic encryption. Built to a private-banking standard, open-source under MIT.",
  applicationName: "XELIS Vault",
  keywords: [
    "XELIS Vault",
    "Confidential DeFi",
    "xUSD",
    "VLT",
    "XELIS BlockDAG",
    "Privacy",
    "Stablecoin",
    "Homomorphic Encryption",
    "ZK",
    "Decentralized Finance",
    "Institutional DeFi",
  ],
  authors: [{ name: "Xelis Vault" }],
  creator: "Xelis Vault",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.ico?v=3", sizes: "any" },
      { url: "/icon.svg?v=3", type: "image/svg+xml" },
      { url: "/icon.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png?v=3", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=3", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png?v=3", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "XELIS Vault · Confidential Finance, Institutional Grade",
    description:
      "The first confidential financial platform on XELIS BlockDAG. Encrypted by default, governed by community, built to an institutional standard.",
    url: SITE_URL,
    siteName: "XELIS Vault",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og/xelisvault-og.png",
        width: 1200,
        height: 630,
        alt: "XELIS Vault — Confidential Finance, Institutional Grade",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "XELIS Vault · Confidential Finance, Institutional Grade",
    description:
      "The first confidential financial platform on XELIS BlockDAG. Encrypted by default, governed by community.",
    images: ["/og/xelisvault-og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /**
   * JSON-LD structured data — helps Google understand the entity behind
   * the site (organization + site + search action) and powers rich
   * results. Same-origin, no external calls.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "XELIS Vault",
        url: SITE_URL,
        logo: `${SITE_URL}/icon-512.png`,
        description:
          "The first confidential financial platform on the XELIS BlockDAG. Open-source under MIT, built to an institutional standard.",
        sameAs: [
          "https://github.com/XelisVault/xelis-vault",
          "https://discord.gg/UHpYAWbG",
          "https://x.com/xelisvault",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "XELIS Vault",
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en",
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrains.variable} ${fraunces.variable} antialiased bg-background text-foreground`}
      >
        {/* Pre-paint veil: on a fresh session this covers the very first
            paint (before React hydrates) so the Choose Your Side gate never
            reveals the page underneath. The xv-booting class is lifted by
            <BootVeil /> once the gate has painted. Keep the storage key and
            the /nerva/pay path check in sync with src/lib/side-store.ts —
            shared payment links skip the veil (and the gate) entirely.
            Crawlers and social preview bots skip it: they should see the
            page content immediately, not a theatrical veil. */}
        <script
          id="xv-boot-veil"
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var p=location.pathname.replace(/\\/+$/,'');if(p==='/nerva/pay'||p==='/antumbra')return;var ua=navigator.userAgent;var bot=/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|twitterbot|linkedinbot|discordbot|telegrambot|whatsapp|slackbot|google-inspectiontool|lighthouse|headlesschrome|puppeteer|playwright|chrome-lighthouse/i;if(bot.test(ua))return;if(!sessionStorage.getItem('xv-side-session-v1')){document.documentElement.classList.add('xv-booting');setTimeout(function(){document.documentElement.classList.remove('xv-booting')},4000)}}catch(e){}})();",
          }}
        />
        {children}
        <Toaster />
        <GlobalChrome />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
