import type { MetadataRoute } from 'next'

/**
 * robots.txt via the Next.js metadata convention (overrides the static
 * public/robots.txt). Everything is crawlable; the sitemap is declared so
 * crawlers pick it up without waiting for Search Console pings.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // stateless checkout: one URL per shared invoice, no canonical content
        disallow: '/nerva/pay',
      },
    ],
    sitemap: 'https://xelisvault.network/sitemap.xml',
    host: 'https://xelisvault.network',
  }
}
