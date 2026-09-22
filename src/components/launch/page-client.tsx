// VaultLaunch page client — gate first, app after unlock.
//
// The gate renders on the server and on the first client paint (SSR-safe),
// then swaps to the application once access is confirmed client-side.

'use client'

import { useEffect, useState } from 'react'
import { LaunchGate, hasLaunchAccess } from './gate'
import { LaunchAppShell } from './app-shell'

export function LaunchPageClient() {
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    // URL key auto-unlock happens inside hasLaunchAccess (?key=…)
    if (hasLaunchAccess()) setUnlocked(true)
  }, [])

  return unlocked ? <LaunchAppShell /> : <LaunchGate onUnlock={() => setUnlocked(true)} />
}
