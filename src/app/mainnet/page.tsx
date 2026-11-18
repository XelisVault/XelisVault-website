// /mainnet — the retro "Mainnet HQ": the full-protocol mainnet
// announcement, playable. Pixel-art CRT worlds explain every upcoming
// feature, the quest log is the real roadmap, the countdown runs to
// the published June 2027 window.

import type { Metadata } from 'next'
import { MainnetHQ } from '@/components/mainnet/mainnet-hq'
import { pixelFont, terminalFont } from '@/lib/pixel-fonts'

export const metadata: Metadata = {
  title: 'Mainnet HQ — The Full Protocol is Loading · XelisVault',
  description:
    'The complete XelisVault protocol lands on the XELIS mainnet in June 2027: confidential lending, the private xUSD dollar, the audited PrivacyMixer V4, the StakedOracle and more. Explore every level of what is coming — the launchpad floor is already live.',
  openGraph: {
    title: 'Mainnet HQ — The Full Protocol is Loading · XelisVault',
    description:
      'Confidential lending, the private dollar, the audited mixer — every engine of XelisVault lands on XELIS mainnet in June 2027. Explore the worlds.',
    type: 'website',
  },
}

export default function MainnetPage() {
  return (
    <div className={`${pixelFont.variable} ${terminalFont.variable}`}>
      <MainnetHQ />
    </div>
  )
}
