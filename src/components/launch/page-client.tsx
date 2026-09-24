// VaultLaunch page client — the app boots directly (public since the
// mainnet launch). The optional ?view= parameter deep-links to a tab:
// /launch?view=create | trading | dex | portfolio | guide.

'use client'

import { useEffect, useState } from 'react'
import { LaunchAppShell } from './app-shell'
import type { AppView } from './launchpad-view'

const VIEWS: AppView[] = ['launchpad', 'trading', 'dex', 'create', 'portfolio', 'guide']

export function LaunchPageClient() {
  const [initialView, setInitialView] = useState<AppView | null>(null)

  useEffect(() => {
    try {
      const v = new URLSearchParams(window.location.search).get('view') as AppView | null
      if (v && VIEWS.includes(v)) {
        setInitialView(v)
        window.history.replaceState({}, '', '/launch')
      }
    } catch { /* ignore */ }
  }, [])

  // The shell is SSR-safe; the deep link only picks the first tab.
  return <LaunchAppShell initialView={initialView ?? undefined} />
}
