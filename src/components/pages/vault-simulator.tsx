'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Calculator, AlertTriangle, ShieldCheck, TrendingDown, Info, RotateCcw } from 'lucide-react'
import { Nav } from '@/components/site/nav'
import { Footer } from '@/components/sections/roadmap-cta'
import { Reveal, SectionLabel } from '@/components/site/reveal'
import { CountdownTimer, useLaunchStatus } from '@/components/app/launch-gate'
import { useDemo } from '@/lib/demo-store'

// Protocol constants (real values from the v11.3 spec)
const MAX_LTV = 50 // 200% collateral ratio → 1/2 = 50% max LTV
const LIQUIDATION_RATIO = 200 // 200% min collateral ratio (DEFAULT_MIN_CR in VaultEngineV3.slx)
const STABILITY_FEE_APR = 2
const LIQUIDATION_PENALTY = 10
const DEFAULT_XEL_PRICE = 12.94

type HealthState = 'safe' | 'warning' | 'danger'

function getHealthState(healthFactor: number): HealthState {
  if (healthFactor >= 1.75) return 'safe'
  if (healthFactor >= 1.25) return 'warning'
  return 'danger'
}

const HEALTH_STYLES: Record<HealthState, { dot: string; text: string; bg: string; border: string; label: string }> = {
  safe: { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-500/5', border: 'border-emerald-500/30', label: 'Safe' },
  warning: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/40', label: 'Warning' },
  danger: { dot: 'bg-destructive', text: 'text-destructive', bg: 'bg-destructive/5', border: 'border-destructive/30', label: 'Danger' },
}

export function VaultSimulator() {
  const [collateral, setCollateral] = useState(100)
  const [borrow, setBorrow] = useState(500)
  const [xelPrice, setXelPrice] = useState(DEFAULT_XEL_PRICE)
  const { isLaunched } = useLaunchStatus()
  const openApp = useDemo((s) => s.openApp)

  const calc = useMemo(() => {
    const collateralValue = collateral * xelPrice
    const ltv = collateralValue > 0 ? (borrow / collateralValue) * 100 : 0
    const healthFactor = borrow > 0 ? collateralValue / borrow : Infinity
    const liquidationPrice = collateral > 0 ? (borrow * LIQUIDATION_RATIO / 100) / collateral : 0
    const maxBorrow = collateralValue * (MAX_LTV / 100)
    const stabilityFee = borrow * (STABILITY_FEE_APR / 100)
    const liquidationPenalty = borrow * (LIQUIDATION_PENALTY / 100)
    const priceDropToLiquidation = xelPrice > 0 ? ((xelPrice - liquidationPrice) / xelPrice) * 100 : 0
    const state = getHealthState(healthFactor)
    const isUnderLTV = ltv <= MAX_LTV
    const canOpenVault = isUnderLTV && healthFactor >= 1.5 && collateral > 0 && borrow > 0
    return {
      collateralValue, ltv, healthFactor, liquidationPrice, maxBorrow,
      stabilityFee, liquidationPenalty, priceDropToLiquidation, state, isUnderLTV, canOpenVault,
    }
  }, [collateral, borrow, xelPrice])

  const h = HEALTH_STYLES[calc.state]

  const reset = () => {
    setCollateral(100)
    setBorrow(500)
    setXelPrice(DEFAULT_XEL_PRICE)
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <Nav />

      <main className="flex-1 relative pt-32 md:pt-36">
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-vault/8 blur-[140px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-5 md:px-8 pb-20">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-vault transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </a>

          <div className="max-w-3xl mb-12">
            <Reveal><SectionLabel>Vault Simulator</SectionLabel></Reveal>
            <Reveal delay={0.1}>
              <h1 className="mt-6 font-display text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1]">
                Practice opening a vault
                <br />
                <span className="text-gradient-vault">before testnet launches.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                The Vault Engine lets you deposit XEL as collateral and borrow xUSD against it.
                This simulator uses the real protocol parameters (50% max LTV, 200% liquidation
                ratio, 2% stability fee, 10% liquidation penalty). Adjust the sliders and watch
                your health factor move in real time.
              </p>
            </Reveal>
          </div>

          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8">
            <Reveal delay={0.3}>
              <div className="rounded-2xl glass-panel p-6 md:p-8 space-y-8">
                <div className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider text-vault">
                  <Calculator className="w-4 h-4" />
                  Inputs
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <label className="text-sm font-medium">Deposit XEL</label>
                    <span className="text-xs font-mono text-muted-foreground">
                      ≈ ${calc.collateralValue.toFixed(2)} USD
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={collateral}
                      onChange={(e) => setCollateral(Math.max(0, Number(e.target.value)))}
                      min={0}
                      step={1}
                      className="flex-1 h-11 rounded-lg border border-border bg-card/40 px-3 text-sm font-mono focus:outline-none focus:border-vault/40 focus:bg-card/60 transition-all"
                    />
                    <span className="text-sm font-mono text-muted-foreground">XEL</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1000}
                    step={1}
                    value={Math.min(collateral, 1000)}
                    onChange={(e) => setCollateral(Number(e.target.value))}
                    className="w-full accent-vault"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground/60">
                    <span>0 XEL</span>
                    <span>1000 XEL</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <label className="text-sm font-medium">Borrow xUSD</label>
                    <span className="text-xs font-mono text-muted-foreground">
                      max ${calc.maxBorrow.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={borrow}
                      onChange={(e) => setBorrow(Math.max(0, Number(e.target.value)))}
                      min={0}
                      step={10}
                      className="flex-1 h-11 rounded-lg border border-border bg-card/40 px-3 text-sm font-mono focus:outline-none focus:border-vault/40 focus:bg-card/60 transition-all"
                    />
                    <span className="text-sm font-mono text-muted-foreground">xUSD</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(calc.maxBorrow, 100)}
                    step={10}
                    value={Math.min(borrow, Math.max(calc.maxBorrow, 100))}
                    onChange={(e) => setBorrow(Number(e.target.value))}
                    className="w-full accent-vault"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground/60">
                    <span>0 xUSD</span>
                    <span>{calc.maxBorrow.toFixed(0)} xUSD</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <label className="text-sm font-medium">XEL Price (USD)</label>
                    <span className="text-xs font-mono text-muted-foreground">simulate market</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-muted-foreground">$</span>
                    <input
                      type="number"
                      value={xelPrice}
                      onChange={(e) => setXelPrice(Math.max(0, Number(e.target.value)))}
                      min={0}
                      step={0.01}
                      className="flex-1 h-11 rounded-lg border border-border bg-card/40 px-3 text-sm font-mono focus:outline-none focus:border-vault/40 focus:bg-card/60 transition-all"
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={0.01}
                    value={Math.min(xelPrice, 100)}
                    onChange={(e) => setXelPrice(Number(e.target.value))}
                    className="w-full accent-vault"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground/60">
                    <span>$0</span>
                    <span>$100</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                    At testnet launch, this price will come live from the StakedOracle contract.
                    For now, you can drag it to see how market movements affect your vault.
                  </p>
                </div>

                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-vault transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to defaults
                </button>
              </div>
            </Reveal>

            <Reveal delay={0.4}>
              <div className="space-y-6">
                <div className={`rounded-2xl border ${h.border} ${h.bg} p-6`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider ${h.text}`}>
                        <span className={`w-2 h-2 rounded-full ${h.dot} ${calc.state !== 'safe' ? 'animate-pulse' : ''}`} />
                        Health Factor
                      </div>
                      <div className={`mt-2 font-display text-5xl font-semibold ${h.text} tabular-nums`}>
                        {isFinite(calc.healthFactor) ? calc.healthFactor.toFixed(2) : '∞'}
                      </div>
                      <div className={`mt-1 text-sm ${h.text}`}>
                        {h.label}
                        {calc.state === 'safe' && ' · comfortably above liquidation'}
                        {calc.state === 'warning' && ' · approaching liquidation threshold'}
                        {calc.state === 'danger' && ' · liquidation risk, add collateral or repay'}
                      </div>
                    </div>
                    <ShieldCheck className={`w-8 h-8 ${h.text} shrink-0`} />
                  </div>

                  <div className="mt-6 h-2 rounded-full bg-card/60 overflow-hidden">
                    <motion.div
                      className={`h-full ${h.dot}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (calc.healthFactor / 3) * 100)}%` }}
                      transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] font-mono text-muted-foreground/60">
                    <span>1.00 (liquidation)</span>
                    <span>1.25 (warning)</span>
                    <span>1.75 (safe)</span>
                    <span>3.00+</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <StatCard
                    label="Loan-to-Value"
                    value={`${calc.ltv.toFixed(2)}%`}
                    sub={`max ${MAX_LTV.toFixed(2)}%`}
                    danger={!calc.isUnderLTV}
                  />
                  <StatCard
                    label="Collateral Value"
                    value={`$${calc.collateralValue.toFixed(2)}`}
                    sub={`${collateral} XEL`}
                  />
                  <StatCard
                    label="Liquidation Price"
                    value={`$${calc.liquidationPrice.toFixed(2)}`}
                    sub={`${calc.priceDropToLiquidation >= 0 ? '−' : '+'}${Math.abs(calc.priceDropToLiquidation).toFixed(1)}% from current`}
                    danger={calc.priceDropToLiquidation < 25}
                    icon={<TrendingDown className="w-3.5 h-3.5" />}
                  />
                  <StatCard
                    label="Stability Fee"
                    value={`${calc.stabilityFee.toFixed(2)} xUSD`}
                    sub={`${STABILITY_FEE_APR}% APR per year`}
                  />
                </div>

                {calc.state !== 'safe' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3"
                  >
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      <strong className="text-destructive">If liquidated:</strong> you lose{' '}
                      <strong className="text-foreground">{calc.liquidationPenalty.toFixed(2)} xUSD</strong>{' '}
                      ({LIQUIDATION_PENALTY}% penalty) on top of the outstanding debt. The liquidator
                      pays your debt and claims your collateral at a discount. Always keep your health
                      factor above 1.75 to stay safe.
                    </div>
                  </motion.div>
                )}

                <div className="rounded-2xl glass-panel p-6">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                        {calc.canOpenVault ? 'Vault is openable' : 'Adjust inputs to open'}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground/70">
                        {calc.canOpenVault
                          ? 'When testnet launches Aug 30, this configuration will be a valid vault.'
                          : !calc.isUnderLTV
                          ? `LTV exceeds ${MAX_LTV}%, reduce borrow or add collateral.`
                          : 'Health factor must be ≥ 1.50.'}
                      </div>
                    </div>
                    <button
                      onClick={() => isLaunched && openApp()}
                      disabled={!isLaunched || !calc.canOpenVault}
                      className="inline-flex h-11 items-center gap-2 rounded-full bg-vault px-6 text-sm font-semibold text-white hover:bg-vault/85 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_24px_-4px_var(--vault)]"
                    >
                      {isLaunched ? 'Open this vault' : 'Launches Aug 30'}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card/30 p-4 flex items-start gap-3">
                  <Info className="w-4 h-4 text-vault shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Why these numbers?</strong> XELIS Vault
                    uses encrypted balances via Twisted ElGamal, so your position is private on-chain.
                    The health factor is computed by the VaultEngine contract using the StakedOracle
                    price feed. Liquidations are processed by a sealed-bid auction, no front-running,
                    no MEV extraction. Read more in the{' '}
                    <a href="https://github.com/XelisVault/xelis-vault" target="_blank" rel="noreferrer" className="text-vault hover:underline">
                      whitepaper ↗
                    </a>.
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="mt-20 rounded-2xl glass-panel p-8 md:p-12 text-center">
            <Reveal>
              <div className="text-xs font-mono uppercase tracking-[0.3em] text-vault mb-6">
                Real testnet launches in
              </div>
              <CountdownTimer />
              <p className="mt-8 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Connect your Xelis wallet on August 30 at 14:00 UTC to open a real vault with real
                testnet XEL. Every transaction is encrypted, your balance, your debt, and your
                liquidation price stay private.
              </p>
            </Reveal>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  danger,
  icon,
}: {
  label: string
  value: string
  sub?: string
  danger?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        danger ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card/30'
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={`mt-2 font-display text-2xl font-semibold tabular-nums ${
          danger ? 'text-destructive' : 'text-foreground'
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className={`mt-1 text-[11px] font-mono ${danger ? 'text-destructive/70' : 'text-muted-foreground/70'}`}>
          {sub}
        </div>
      )}
    </div>
  )
}
