'use client'

import { useEffect } from 'react'
import { Nav } from '@/components/site/nav'
import { ScrollProgress } from '@/components/site/scroll-progress'
import { SectionNavigator } from '@/components/site/section-navigator'
import { Hero } from '@/components/sections/hero'
import { Problem } from '@/components/sections/problem'
import { Solution } from '@/components/sections/solution'
import { Architecture } from '@/components/sections/architecture'
import { Features } from '@/components/sections/features'
import { ProtocolVideo } from '@/components/sections/protocol-video'
import { Xusd } from '@/components/sections/xusd'
import { Vlt } from '@/components/sections/vlt'
import { Oracle } from '@/components/sections/oracle'
import { MiningDelegation } from '@/components/sections/mining-delegation'
import { Contracts } from '@/components/sections/contracts'
import { VaultChatSection } from '@/components/sections/vaultchat-section'
import { Roadmap, CTA, Footer } from '@/components/sections/roadmap-cta'
import { DemoApp } from '@/components/app/demo-app'
import { Quest } from '@/components/quest/quest'
import { useDemo } from '@/lib/demo-store'

export default function Home() {
  // Hidden console message for quest puzzle #1
  // ENIGMATIC — does NOT give the answer, just points toward the concept
  useEffect(() => {
    // Auto-open the app when arriving via /?openApp=1 (e.g. from the launch
    // celebration CTA on another page)
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.get('openApp') === '1') {
        url.searchParams.delete('openApp')
        window.history.replaceState({}, '', url.toString())
        useDemo.getState().openApp()
      }
    } catch {
      /* noop */
    }

    // The message is base64-encoded to prevent casual reading
    // Decoded: "Every chain begins with a block. Every block has a name. What is the name of the first?"
    const encoded = 'RXZlcnkgY2hhaW4gYmVnaW5zIHdpdGggYSBibG9jay4gRXZlcnkgYmxvY2sgaGFzIGEgbmFtZS4gV2hhdCBpcyB0aGUgbmFtZSBvZiB0aGUgZmlyc3Q/'
    console.log(
      '%c⚠️ %s',
      'color: #a855f7; font-size: 14px; font-weight: bold; font-family: monospace;',
      atob(encoded)
    )
    console.log(
      '%c— The vault keeps its secrets. The worthy seek #quest.',
      'color: #6b7280; font-size: 11px; font-style: italic; font-family: monospace;'
    )
  }, [])

  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <ScrollProgress />
      <SectionNavigator />
      <Nav />

      <main className="flex-1 relative">
        <Hero />
        <Problem />
        <Solution />
        <Architecture />
        <Features />
        <ProtocolVideo />
        <Xusd />
        <Vlt />
        <Oracle />
        <MiningDelegation />
        <Contracts />
        <VaultChatSection />
        <Roadmap />
        <CTA />
      </main>

      <Footer />

      {/* Demo App Overlay */}
      <DemoApp />

      {/* The Vault Quest */}
      <Quest />

      {/* Hidden quest entry hint for source-code explorers */}
      <span
        className="sr-only"
        aria-hidden="true"
        data-quest-hint="The vault keeps its secrets. The worthy seek #quest or click the footer logo 7 times."
      />

      {/* Hidden text for puzzle #4 — invisible (same color as background) */}
      <span
        style={{ color: 'oklch(0.04 0.02 280)', backgroundColor: 'oklch(0.04 0.02 280)' }}
        aria-hidden="true"
        className="fixed bottom-0 left-0 text-[8px] select-none pointer-events-none"
      >
        rhizome
      </span>

      {/* Hidden data attribute for puzzle #2 — does NOT contain the answer, just a cryptic clue */}
      <span
        data-xelis-secret="a stone that sparks fire, four letters, french for flint"
        aria-hidden="true"
        className="sr-only"
      />

      {/* Hidden text for puzzle #3 — invisible (same color as background) */}
      <span
        style={{ color: 'oklch(0.04 0.02 280)', backgroundColor: 'oklch(0.04 0.02 280)' }}
        aria-hidden="true"
        className="fixed bottom-0 left-0 text-[8px] select-none pointer-events-none"
      >
        rhizome
      </span>

      {/* Hidden data attribute for puzzle #19 — base64-encoded, NOT the answer directly */}
      <span
        data-quest-final="aW1wb3NzaWJsZQ=="
        aria-hidden="true"
        className="sr-only"
      />
    </div>
  )
}
