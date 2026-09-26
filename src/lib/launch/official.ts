// The official-coin registry — the platform's OWN tokens.
//
// These were launched through the CommunityLaunch factory (the cheap,
// permissionless track) but they are NOT community coins: they are the
// platform's official assets. The registry upgrades them everywhere:
//   • official logo + official name/description/links (overriding the
//     on-chain metadata, which may be sparse)
//   • OFFICIAL · TRUSTED presentation instead of "community · no
//     validation"
//   • removed from the community boards/rail/badge — they surface as
//     flagship tokens on the project side (the Launchpad)
//
// Also the launch-error blacklist: tickers hidden at the STORE level,
// so the coin never renders anywhere — no board, no rail, no badge,
// no deep link, no trade path.

export interface OfficialCoinInfo {
  /** Display name (overrides the on-chain name). */
  name: string
  /** Official description (overrides the on-chain description). */
  description: string
  website: string
  twitter: string
  discord?: string
  github?: string
}

export const OFFICIAL_COINS: Record<string, OfficialCoinInfo> = {
  XVLT: {
    name: 'XelisVault',
    description:
      'XVLT is the official token of XelisVault — the confidential finance platform built on XELIS. Fixed supply forever, no founder liquidity to pull: born on a virtual-reserve bonding curve, graduating into a permanent-liquidity LaunchDEX pool with a protocol-locked seed. Launched by the XelisVault team, verifiable on the XELIS mainnet.',
    website: 'https://xelisvault.xyz',
    twitter: 'https://x.com/xelisvault',
    discord: 'https://discord.gg/UHpYAWbG',
    github: 'https://github.com/XelisVault/xelis-vault',
  },
}

/** Tickers that must NEVER show anywhere — launch errors. Filtered at
 *  the store scan level, so no view, badge, rail or URL can reach them
 *  and they cannot be traded from the UI. */
export const HIDDEN_COIN_TICKERS: readonly string[] = ['VLT']

export function isHiddenTicker(ticker: string): boolean {
  return HIDDEN_COIN_TICKERS.includes(ticker.toUpperCase())
}

export function officialInfoOf(ticker: string): OfficialCoinInfo | null {
  return OFFICIAL_COINS[ticker.toUpperCase()] ?? null
}

/** The share URL of a coin's trade page (stable, readable for the
 *  official ones — the ticker in the link, not the numeric cid). */
export function coinSharePath(ticker: string, id: string, official: boolean): string {
  const focus = encodeURIComponent(official ? ticker : id)
  return `/launch?view=${official ? 'coin' : 'community'}&focus=${focus}`
}
