/**
 * Caisse merchant configuration — address, shop name, optional EUR rate
 * and sound preference. Local only (localStorage), no account.
 */

import { isValidNervaAddress } from './nlink'

export interface MerchantConfig {
  /** receiving NV… address */
  address: string
  /** shop / brand name shown to the payer */
  name: string
  /** optional EUR per 1 XNV rate, manual, display-only */
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

/** eur/xnv rate → eur amount for an atomic XNV amount, or null */
export function xnvAtomicToEur(amountAtomic: string, eurRate: string): string | null {
  const rate = Number(eurRate.replace(',', '.'))
  if (!Number.isFinite(rate) || rate <= 0) return null
  try {
    const big = BigInt(amountAtomic)
    // eur = atomic / 1e12 * rate  → keep 2 decimals, integer cents math
    const cents = Number((big * BigInt(Math.round(rate * 100)) ) / (10n ** 10n)) / 100
    return cents.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  } catch {
    return null
  }
}
