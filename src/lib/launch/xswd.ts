// VaultLaunch XSWD — a dedicated XSWD client for the launchpad app.
//
// The VaultLaunch application registers with the wallet as its OWN dApp
// (name "VaultLaunch"), separate from the XELIS Vault testnet app. XSWD has
// no network selector: it follows whatever network the wallet's daemon is
// on. VaultLaunch targets MAINNET (live since 23/09/2026), so the wallet
// (Genesix / xelis_wallet) must run against a mainnet daemon.
//
// TWO connection paths, one client:
//   • LOCAL  — Genesix desktop / xelis_wallet, ws://127.0.0.1:44325/xswd
//   • RELAY  — Genesix WEB (wallet.xelis.io) or mobile: the official
//     XSWD relay (relay.xelis.io) + a QR the wallet scans; the frames
//     are AES-256-GCM encrypted end-to-end — the relay only ever sees
//     ciphertext. The XSWD handshake itself runs unchanged on the
//     tunnel, so the session, permissions and every transaction
//     wrapper behave exactly like the local path.

import { XSWDClient, XSWD_PERMISSIONS, type XSWDAppData, type XSWDSocket } from '@/lib/xelis/xswd'
import {
  createRelayedConnection, type RelayerQRData, type RelayedConnection,
} from '@/lib/xelis/xswd-relay'

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

// ── The RELAY path (Genesix web / mobile) ────────────────────────────

function randomHexId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** The FULL app identity embedded in the relay QR (and reused by the
 *  XSWD handshake, so the wallet sees one coherent application). */
function relayAppData(): XSWDAppData {
  return {
    id: randomHexId(),
    name: 'VaultLaunch',
    description: 'The XELIS community launchpad: bonding curves, community validation, permanent-liquidity DEX.',
    url: typeof window !== 'undefined' ? window.location.origin : null,
    permissions: XSWD_PERMISSIONS,
  }
}

export interface LaunchRelaySession {
  connection: RelayedConnection
  /** the app identity the XSWD handshake must reuse */
  appData: XSWDAppData
}

/**
 * Open a relay channel for a WEB/MOBILE wallet.
 * Resolves as soon as the QR payload is ready — the wallet joining is
 * awaited by the caller (the tunnel socket is handed to
 * XSWDClient.connect once `connection` resolves, which happens when
 * the wallet's first frame arrives).
 */
export function startLaunchRelaySession(handlers: {
  onQRReady?: (qr: RelayerQRData) => void
  onWalletJoined?: () => void
  onError?: (error: Error) => void
  onClose?: (event: CloseEvent) => void
}): Promise<LaunchRelaySession> {
  const appData = relayAppData()
  return createRelayedConnection({
    appData: {
      id: appData.id,
      name: appData.name,
      description: appData.description,
      url: appData.url ?? undefined,
      permissions: appData.permissions,
    },
    onQRReady: handlers.onQRReady,
    onConnected: handlers.onWalletJoined,
    onError: handlers.onError,
    onClose: handlers.onClose,
  }).then((connection) => ({ connection, appData }))
}

/** Type re-export for the wallet store. */
export type { XSWDSocket }
