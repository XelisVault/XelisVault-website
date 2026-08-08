import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "XELIS Vault — Confidential Finance for the Privacy Era",
  description:
    "The first confidential financial platform on XELIS BlockDAG. Deposit XEL, borrow xUSD, trade on VaultSwap, tokenize real-world assets, lend peer-to-peer, and govern privately — secured by native Twisted ElGamal homomorphic encryption.",
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
  ],
  authors: [{ name: "Xelis Vault" }],
  openGraph: {
    title: "XELIS Vault — Confidential Finance for the Privacy Era",
    description:
      "The first confidential financial platform on XELIS BlockDAG. Encrypted by default, governed by community.",
    url: "https://github.com/XelisVault/xelis-vault",
    siteName: "XELIS Vault",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "XELIS Vault — Confidential Finance for the Privacy Era",
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
        className={`${inter.variable} ${jetbrains.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
