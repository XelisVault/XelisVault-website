// VaultLaunch page client — the app boots directly (public since the
// mainnet launch). Deep links reopen an exact page:
//   /launch?view=coin&focus=XVLT     → the official token's trade page
//   /launch?view=community&focus=1   → one community coin by cid
//   /launch?view=create | trading | dex | portfolio | guide
// The URL is kept (never stripped): it IS the share link.

'use client'

import { useEffect, useState } from 'react'
import { LaunchAppShell } from './app-shell'
import type { AppView } from './launchpad-view'

const VIEWS: AppView[] = ['launchpad', 'trading', 'dex', 'community', 'coin', 'create', 'coin-launch', 'portfolio', 'guide']

interface DeepLink {
  view?: AppView
  focus?: string
}

export function LaunchPageClient() {
  const [deep, setDeep] = useState<DeepLink | null>(null)

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const rawView = sp.get('view') as AppView | null
      const rawFocus = sp.get('focus')
      const view = rawView && VIEWS.includes(rawView) ? rawView : undefined
      if (view || rawFocus) setDeep({ view, focus: rawFocus ?? undefined })
      // the query stays in the address bar — copy/paste shares this page
    } catch { /* ignore */ }
  }, [])

  // The shell is SSR-safe; the deep link only picks the first tab.
  return <LaunchAppShell initialView={deep?.view} initialFocus={deep?.focus} />
}
