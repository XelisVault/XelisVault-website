'use client'

// Network switch — Mainnet by default, Testnet one click away.
// Sliding indicator + node endpoint readout; switching re-bootstraps the
// entire Observatory (blocks, stats, peers, assets) from the other network.

import { motion } from 'framer-motion'
import { NetworkId, NETWORKS } from '@/lib/xelis/networks'

export function NetworkSwitch({
  network,
  onChange,
}: {
  network: NetworkId
  onChange: (n: NetworkId) => void
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">network</span>
      <div className="relative flex items-center rounded-full border border-border bg-card/60 p-0.5">
        {(['mainnet', 'testnet'] as const).map((n) => {
          const active = network === n
          const cfg = NETWORKS[n]
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`relative z-10 inline-flex h-7 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-mono uppercase tracking-wider transition-colors ${
                active ? 'text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
              title={`${cfg.http}, click to ${active ? 'reload' : `switch to ${cfg.label}`}`}
            >
              {active && (
                <motion.span
                  layoutId="network-pill"
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: n === 'mainnet' ? 'linear-gradient(90deg, #7c3aed, #a78bfa)' : 'linear-gradient(90deg, #0891b2, #67e8f9)',
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span
                className={`relative w-1.5 h-1.5 rounded-full ${active ? 'bg-white animate-pulse' : 'bg-muted-foreground/40'}`}
              />
              <span className="relative">{cfg.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
