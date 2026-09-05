'use client'

/**
 * FaviconSync — keeps the browser tab icon in sync with the active world.
 *
 * Browsers do not always re-read <link rel="icon"> on client-side (SPA)
 * navigation, so crossing worlds with router.push() can leave the previous
 * side's favicon stuck in the tab — an XelisVault tab wearing the NERVA
 * mark (or the reverse). Appending fresh icon links is the documented
 * trigger for a favicon refresh in Chromium and Firefox.
 *
 * IMPORTANT — never touch React-owned nodes: the icon <link> tags rendered
 * by the Next.js metadata system are managed by React reconciliation.
 * Removing them by hand breaks commitDeletion (removeChild on null) and
 * crashes the whole route transition. This component only appends its own
 * link elements and removes exactly those on cleanup. Duplicates with the
 * metadata-rendered links are harmless (browsers dedupe by URL, and the
 * later element wins when several candidates match).
 *
 * Icon URLs carry a ?v= cache-buster: favicons are cached far longer than
 * regular assets and stale copies from older deployments must not stick.
 */

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const ICON_V = 3

interface IconSpec {
  rel: string
  href: string
  sizes?: string
  type?: string
}

const XELIS_ICONS: IconSpec[] = [
  { rel: 'icon', href: `/favicon.ico?v=${ICON_V}`, sizes: 'any' },
  { rel: 'icon', href: `/icon.svg?v=${ICON_V}`, type: 'image/svg+xml' },
  { rel: 'icon', href: `/icon-192.png?v=${ICON_V}`, sizes: '192x192', type: 'image/png' },
  { rel: 'icon', href: `/icon-512.png?v=${ICON_V}`, sizes: '512x512', type: 'image/png' },
  { rel: 'apple-touch-icon', href: `/apple-icon.png?v=${ICON_V}`, sizes: '180x180', type: 'image/png' },
]

const NERVA_ICONS: IconSpec[] = [
  { rel: 'icon', href: `/images/nerva/nerva-favicon.ico?v=${ICON_V}`, sizes: 'any' },
  { rel: 'icon', href: `/images/nerva/nerva-icon-192.png?v=${ICON_V}`, sizes: '192x192', type: 'image/png' },
  { rel: 'icon', href: `/images/nerva/nerva-icon-512.png?v=${ICON_V}`, sizes: '512x512', type: 'image/png' },
  { rel: 'apple-touch-icon', href: `/images/nerva/nerva-apple-icon.png?v=${ICON_V}`, sizes: '180x180', type: 'image/png' },
]

/** attribute marker: only elements carrying it are ours to remove */
const OWNED_ATTR = 'data-xv-favicon'

export function FaviconSync() {
  const pathname = usePathname() ?? '/'
  const inNerva = pathname.startsWith('/nerva')

  useEffect(() => {
    // safety net: clear strays from an older hot-reload/page state
    document.head.querySelectorAll(`link[${OWNED_ATTR}]`).forEach((el) => el.remove())

    const created: HTMLLinkElement[] = []
    for (const spec of inNerva ? NERVA_ICONS : XELIS_ICONS) {
      const link = document.createElement('link')
      link.rel = spec.rel
      link.href = spec.href
      link.setAttribute(OWNED_ATTR, '1')
      if (spec.sizes) link.setAttribute('sizes', spec.sizes)
      if (spec.type) link.setAttribute('type', spec.type)
      document.head.appendChild(link)
      created.push(link)
    }
    return () => {
      created.forEach((el) => el.remove())
    }
  }, [inNerva])

  return null
}
