import type { Metadata } from 'next'
import { VaultSimulator } from '@/components/pages/vault-simulator'

export const metadata: Metadata = {
  title: 'Vault Simulator — XELIS Vault',
  description:
    'Interactive calculator for the XELIS Vault Engine. Deposit XEL collateral, borrow xUSD, and see your LTV, health factor, and liquidation price in real time — before the testnet even launches.',
}

export default function VaultSimulatorPage() {
  return <VaultSimulator />
}
