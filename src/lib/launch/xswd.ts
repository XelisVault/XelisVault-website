// VaultLaunch XSWD — a dedicated XSWD client for the launchpad app.
//
// The VaultLaunch application registers with the wallet as its OWN dApp
// (name "VaultLaunch"), separate from the XELIS Vault testnet app. XSWD has
// no network selector: it follows whatever network the wallet's daemon is
// on. VaultLaunch targets MAINNET, so the wallet (Genesix / xelis_wallet)
// must run against a mainnet daemon.
//
// The protocol layer is the battle-tested client from lib/xelis/xswd.ts
// (same handshake, same permissions); only the application identity and
// the error copy differ.

import { XSWDClient, type XSWDAppData } from '@/lib/xelis/xswd'

export const LAUNCH_APP_DATA: Partial<XSWDAppData> = {
  name: 'VaultLaunch',
  description: 'The XELIS community launchpad: bonding curves, community validation, permanent-liquidity DEX.',
}

let client: XSWDClient | null = null

/** Singleton VaultLaunch XSWD client (never shared with the testnet app). */
export function getLaunchXSWDClient(): XSWDClient {
  if (!client) client = new XSWDClient()
  return client
}

/** Mainnet-flavoured connection error (shown in the connect modal). */
export function mainnetConnectError(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Connection failed'
  if (raw.includes('127.0.0.1:44325') || raw.toLowerCase().includes('reach the wallet')) {
    return 'Cannot reach the wallet on ws://127.0.0.1:44325. Is Genesix (or xelis_wallet) running on MAINNET with XSWD enabled?'
  }
  return raw
}
