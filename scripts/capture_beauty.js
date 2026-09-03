// Final beauty capture: screenshots timed from the overlay's appearance.
const { chromium } = require('playwright')

const SHOTS = [
  { t: 600, name: 'b1-boot' },
  { t: 1300, name: 'b2-seal' },
  { t: 2500, name: 'b3-metal' },
  { t: 4000, name: 'b4-combo' },
  { t: 5200, name: 'b5-unlock' },
  { t: 5750, name: 'b6-breach' },
  { t: 6100, name: 'b7-godrays' },
  { t: 6800, name: 'b8-welcome' },
]

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.locator('button', { hasText: 'Launch App' }).first().click()

  // anchor: the moment the overlay mounts = ceremony t=0
  await page.waitForSelector('[aria-label="Skip vault animation"]', { timeout: 4000 })
  const t0 = Date.now()
  console.log('ceremony anchored at', t0)

  const jobs = SHOTS.map((s) =>
    page
      .waitForTimeout(Math.max(0, s.t - (Date.now() - t0)))
      .then(() => page.screenshot({ path: `/home/z/my-project/frames/${s.name}.png` }))
      .then(() => console.log('shot', s.name, `@+${Date.now() - t0}ms`)),
  )
  await Promise.all(jobs)
  await browser.close()
})().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
