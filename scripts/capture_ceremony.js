// Precise-timing capture of the vault door ceremony.
const { chromium } = require('playwright')

const SHOTS = [
  { t: 900, name: 'p1-seal' },
  { t: 2300, name: 'p2-assembly' },
  { t: 3800, name: 'p3-combo' },
  { t: 4900, name: 'p4-accepted' },
  { t: 5300, name: 'p5-unlock' },
  { t: 5650, name: 'p6-breach' },
  { t: 6100, name: 'p7-light' },
  { t: 6700, name: 'p8-welcome' },
  { t: 7600, name: 'p9-app' },
]

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('[console error]', m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)))

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  // click the hero Launch App button
  const btn = page.locator('button', { hasText: 'Launch App' }).first()
  await btn.scrollIntoViewIfNeeded()
  const box = await btn.boundingBox()
  console.log('button box:', JSON.stringify(box))

  const t0 = Date.now()
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  }

  // schedule screenshots at precise offsets
  const jobs = SHOTS.map((s) =>
    page
      .waitForTimeout(Math.max(0, s.t - (Date.now() - t0)))
      .then(() => page.screenshot({ path: `/home/z/my-project/frames/${s.name}.png` }))
      .then(() => console.log('shot', s.name, `@${Date.now() - t0}ms`)),
  )
  await Promise.all(jobs)

  // also verify the overlay lifecycle
  const alive = await page.evaluate(
    () => !!document.querySelector('[aria-label="Skip vault animation"]'),
  )
  console.log('overlay alive after ceremony:', alive)
  await browser.close()
})().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
