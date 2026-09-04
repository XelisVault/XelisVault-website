'use client'

/**
 * GlobalChrome — client shell mounted once in the root layout.
 *
 *  1. Hydrates the side store → opens the "Choose Your Side" gate
 *     on every fresh browser session (BootVeil lifts the pre-paint
 *     veil once the gate is opaque, so nothing ever flashes).
 *  2. On the XELIS side: keeps the full XelisVault launch experience
 *     (escalation, countdown ceremony, easter eggs, vault-door transition).
 *  3. Inside the /nerva world: suspends all Xelis-specific overlays so the
 *     Nerva interface stands alone as its own world.
 */

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSide } from '@/lib/side-store'
import { BootVeil, SideGate } from '@/components/side/side-gate'
import { LaunchExperience } from '@/components/site/launch-experience'
import { VaultDoorTransition } from '@/components/site/vault-door-transition'

export function GlobalChrome() {
  const pathname = usePathname() ?? '/'
  const hydrate = useSide((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const inNervaWorld = pathname.startsWith('/nerva')

  return (
    <>
      {/* lifts the pre-paint veil (html.xv-booting) once the gate is up */}
      <BootVeil />

      {/* The entry ritual — every fresh session, whichever page you land on */}
      <SideGate />

      {/* XelisVault launch theatre — XELIS side only */}
      {!inNervaWorld && (
        <>
          <LaunchExperience />
          <VaultDoorTransition />
        </>
      )}
    </>
  )
}
