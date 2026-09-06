import { chromium } from 'playwright'

const BASE = 'http://localhost:3100'

const browser = await chromium.launch()
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1.5,
  userAgent: UA,
})
const page = await ctx.newPage()

// 1. Fresh session on / -> the Choose Your Side gate with the ANTUMBRA medallion
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2600) // seam draws ~1s, medallion enters at ~1.05s
await page.screenshot({ path: '/home/z/my-project/scripts/gen-img-tmp/qa-gate-antumbra.png' })
console.log('shot: gate + medallion')

// click the medallion -> should navigate to /antumbra and close the gate
await page.click('button[aria-label^="Open the ANTUMBRA teaser"]')
await page.waitForTimeout(3200)
console.log('url after medallion click:', page.url())
await page.screenshot({ path: '/home/z/my-project/scripts/gen-img-tmp/qa-teaser-top.png' })
console.log('shot: teaser top')

// 2. Scroll captures
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.35))
await page.waitForTimeout(1600)
await page.screenshot({ path: '/home/z/my-project/scripts/gen-img-tmp/qa-teaser-mid.png' })
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.75))
await page.waitForTimeout(1600)
await page.screenshot({ path: '/home/z/my-project/scripts/gen-img-tmp/qa-teaser-roadmap.png' })
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(1800)
await page.screenshot({ path: '/home/z/my-project/scripts/gen-img-tmp/qa-teaser-cta.png' })
console.log('shot: teaser mid/roadmap/cta')

// 3. Direct landing on /antumbra in a FRESH context: no gate, straight teaser
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA })
const p2 = await ctx2.newPage()
await p2.goto(`${BASE}/antumbra`, { waitUntil: 'networkidle' })
await p2.waitForTimeout(2000)
const gateVisible = await p2.locator('[role="dialog"]').count()
console.log('direct landing: gate overlays =', gateVisible, '(0 attendu)')
await p2.screenshot({ path: '/home/z/my-project/scripts/gen-img-tmp/qa-direct-landing.png' })

// 4. Mobile view of the gate medallion (horizontal seam layout)
const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: UA })
const p3 = await ctx3.newPage()
await p3.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await p3.waitForTimeout(2600)
await p3.screenshot({ path: '/home/z/my-project/scripts/gen-img-tmp/qa-gate-mobile.png' })
console.log('shot: gate mobile')

await browser.close()
console.log('QA visuelle terminee')
