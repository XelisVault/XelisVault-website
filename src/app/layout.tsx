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

export const metadata: Metadata = {
  metadataBase: new URL("https://xelisvault.network"),
  title: "XELIS Vault · Confidential Finance, Institutional Grade",
  description:
    "The first confidential financial platform on XELIS BlockDAG. Deposit XEL, borrow xUSD, trade on VaultSwap, tokenize real-world assets, lend peer-to-peer, and govern privately, secured by native Twisted ElGamal homomorphic encryption. Built to a private-banking standard, open-source under MIT.",
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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "XELIS Vault · Confidential Finance, Institutional Grade",
    description:
      "The first confidential financial platform on XELIS BlockDAG. Encrypted by default, governed by community, built to an institutional standard.",
    url: "https://github.com/XelisVault/xelis-vault",
    siteName: "XELIS Vault",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "XELIS Vault · Confidential Finance, Institutional Grade",
    description:
      "The first confidential financial platform on XELIS BlockDAG. Encrypted by default, governed by community.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrains.variable} ${fraunces.variable} antialiased bg-background text-foreground`}
      >
        {/* Pre-paint veil: on a fresh session this covers the very first
            paint (before React hydrates) so the Choose Your Side gate never
            reveals the page underneath. The xv-booting class is lifted by
            <BootVeil /> once the gate has painted. Keep the storage key in
            sync with src/lib/side-store.ts. */}
        <script
          id="xv-boot-veil"
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(!sessionStorage.getItem('xv-side-session-v1')){document.documentElement.classList.add('xv-booting');setTimeout(function(){document.documentElement.classList.remove('xv-booting')},4000)}}catch(e){}})();",
          }}
        />
        {children}
        <Toaster />
        <GlobalChrome />
      </body>
    </html>
  );
}
