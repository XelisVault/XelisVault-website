/**
 * POS merchant configuration — address, shop name, optional secret view key
 * for automatic payment matching, manual rate override and sound preference.
 * Local only (localStorage), no account.
 *
 * The view key is OPTIONAL: with it, the caisse detects integrated-address
 * payments in real time (D = 8·viewKey·txPub, decrypt, match pid8 — the
 * same math an official wallet runs). It is a VIEW key: it can see incoming
 * payments but can never spend. It never leaves the merchant's browser.
 *
 * The rate is normally LIVE (see lib/nerva/price.ts, CoinGecko/CoinPaprika
 * via /api/nerva/price, USD reference + EUR); the manual override here is
 * for merchants who price XNV themselves.
 */

import { isValidNervaAddress, viewKeyMatchesAddress } from './nlink'
import { parseSecretKeyHex } from './cryptonote'

export interface MerchantConfig {
  /** receiving NV… address */
  address: string
  /** shop / brand name shown to the payer */
  name: string
  /**
   * optional hex secret view key of the receiving address — unlocks
   * automatic integrated-pid payment detection (empty = manual mode)
   */
  viewKey: string
  /** optional manual USD per 1 XNV rate override, display-only (empty = live) */
  usdRate: string
  /** play a chime when a payment lands */
  sound: boolean
}

const CONFIG_KEY = 'nerva-caisse-config-v1'
/** legacy key (v0 configs without viewKey/usdRate) is read and upgraded */

const DEFAULT: MerchantConfig = { address: '', name: '', viewKey: '', usdRate: '', sound: true }

export function loadMerchantConfig(): MerchantConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return { ...DEFAULT }
    const c = JSON.parse(raw)
    return {
      address: typeof c.address === 'string' ? c.address : '',
      name: typeof c.name === 'string' ? c.name.slice(0, 60) : '',
      viewKey: typeof c.viewKey === 'string' ? c.viewKey.trim().toLowerCase() : '',
      // legacy eurRate migrated to usdRate (USD is now the reference)
      usdRate: typeof c.usdRate === 'string' ? c.usdRate : '',
      sound: c.sound !== false,
    }
  } catch {
    return { ...DEFAULT }
  }
}

export function saveMerchantConfig(c: MerchantConfig) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(c))
  } catch { /* ignore */ }
}

export function configReady(c: MerchantConfig): boolean {
  return isValidNervaAddress(c.address).ok
}

/** validate the optional view key against the configured address */
export function validateViewKey(c: MerchantConfig): { ok: boolean; reason?: string } {
  if (!c.viewKey) return { ok: true } // optional
  if (!configReady(c)) return { ok: false, reason: 'Set the receiving address first' }
  return viewKeyMatchesAddress(c.viewKey, c.address)
}

/** parsed view key bytes for detection, or null when absent/invalid */
export function parsedViewKey(c: MerchantConfig): Uint8Array | null {
  if (!c.viewKey || !configReady(c)) return null
  const sec = parseSecretKeyHex(c.viewKey)
  if (!sec) return null
  const check = viewKeyMatchesAddress(c.viewKey, c.address)
  return check.ok ? sec : null
}

/** manual fiat/xnv rate string → fiat amount for an atomic XNV amount, or null (en-US format) */
export function xnvAtomicToFiatManual(amountAtomic: string, rateStr: string): string | null {
  const rate = Number(rateStr.replace(',', '.'))
  if (!Number.isFinite(rate) || rate <= 0) return null
  try {
    const big = BigInt(amountAtomic)
    if (big < 0n) return null
    // integer math: rate scaled by 1e6 → micro-fiat → rounded cents
    const rateScaled = BigInt(Math.round(rate * 1e6))
    if (rateScaled <= 0n) return null
    const micro = (big * rateScaled) / 10n ** 12n
    const cents = Math.round(Number(micro) / 1e4)
    const fiat = cents / 100
    if (!Number.isFinite(fiat)) return null
    return fiat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  } catch {
    return null
  }
}
