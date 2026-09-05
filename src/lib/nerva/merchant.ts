/**
 * POS merchant configuration — address, shop name, optional manual EUR
 * rate override and sound preference. Local only (localStorage), no
 * account.
 *
 * The EUR rate is normally LIVE (see lib/nerva/price.ts, CoinGecko/
 * CoinPaprika via /api/nerva/price); the manual `eurRate` here is an
 * override for merchants who price XNV themselves.
 */

import { isValidNervaAddress } from './nlink'

export interface MerchantConfig {
  /** receiving NV… address */
  address: string
  /** shop / brand name shown to the payer */
  name: string
  /** optional manual EUR per 1 XNV rate override, display-only (empty = live) */
  eurRate: string
  /** play a chime when a payment lands */
  sound: boolean
}

const CONFIG_KEY = 'nerva-caisse-config-v1'

const DEFAULT: MerchantConfig = { address: '', name: '', eurRate: '', sound: true }

export function loadMerchantConfig(): MerchantConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return { ...DEFAULT }
    const c = JSON.parse(raw)
    return {
      address: typeof c.address === 'string' ? c.address : '',
      name: typeof c.name === 'string' ? c.name.slice(0, 60) : '',
      eurRate: typeof c.eurRate === 'string' ? c.eurRate : '',
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

/** manual eur/xnv rate string → eur amount for an atomic XNV amount, or null (en-US format) */
export function xnvAtomicToEur(amountAtomic: string, eurRate: string): string | null {
  const rate = Number(eurRate.replace(',', '.'))
  if (!Number.isFinite(rate) || rate <= 0) return null
  try {
    const big = BigInt(amountAtomic)
    if (big < 0n) return null
    // integer math: rate scaled by 1e6 → micro-EUR → rounded cents
    const rateScaled = BigInt(Math.round(rate * 1e6))
    if (rateScaled <= 0n) return null
    const microEur = (big * rateScaled) / 10n ** 12n
    const cents = Math.round(Number(microEur) / 1e4)
    const eur = cents / 100
    if (!Number.isFinite(eur)) return null
    return eur.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  } catch {
    return null
  }
}
