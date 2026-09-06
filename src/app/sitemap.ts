import type { MetadataRoute } from 'next'

const SITE = 'https://xelisvault.xyz'

/**
 * Sitemap for both worlds of XelisVault.
 * /nerva/pay is deliberately absent: it is a stateless checkout page whose
 * meaning lives entirely in its ?d= token — one URL per invoice, infinite
 * invoices, nothing indexable at the bare path.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const xelis: MetadataRoute.Sitemap = [
    { path: '', priority: 1, freq: 'weekly' }, // home
    { path: '/vault-simulator', priority: 0.9, freq: 'monthly' },
    { path: '/antumbra', priority: 0.9, freq: 'weekly' },
    { path: '/explorer', priority: 0.9, freq: 'daily' },
    { path: '/docs', priority: 0.8, freq: 'weekly' },
    { path: '/developers', priority: 0.8, freq: 'weekly' },
    { path: '/learn', priority: 0.8, freq: 'monthly' },
    { path: '/compare', priority: 0.7, freq: 'monthly' },
    { path: '/security', priority: 0.7, freq: 'monthly' },
    { path: '/community', priority: 0.6, freq: 'monthly' },
    { path: '/about', priority: 0.6, freq: 'monthly' },
    { path: '/contributors', priority: 0.4, freq: 'monthly' },
  ].map(({ path, priority, freq }) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: freq as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority,
  }))

  const nerva: MetadataRoute.Sitemap = [
    { path: '/nerva', priority: 0.9, freq: 'daily' },
    { path: '/nerva/explorer', priority: 0.8, freq: 'daily' },
    { path: '/nerva/caisse', priority: 0.9, freq: 'monthly' },
    { path: '/nerva/tickets', priority: 0.8, freq: 'monthly' },
    { path: '/nerva/link', priority: 0.8, freq: 'monthly' },
    { path: '/nerva/paper-wallet', priority: 0.7, freq: 'monthly' },
    { path: '/nerva/mining', priority: 0.7, freq: 'daily' },
    { path: '/nerva/watch', priority: 0.7, freq: 'monthly' },
  ].map(({ path, priority, freq }) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: freq as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority,
  }))

  return [...xelis, ...nerva]
}
