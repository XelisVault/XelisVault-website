// Edge-case tests: skip behavior + cross-page launch handoff.
const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

  // ---- TEST 1: skip by clicking during the ceremony ----
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const overlaySel = '[aria-label="Skip vault animation"]'
  await page.locator('button', { hasText: 'Launch App' }).first().click()
  await page.waitForSelector(overlaySel, { timeout: 3000 })
  console.log('T1: ceremony started ✓')
  await page.waitForTimeout(1500) // mid-seal
  await page.mouse.click(800, 450) // click anywhere = skip
  const goneQuick = await page.waitForSelector(overlaySel, { state: 'detached', timeout: 2000 })
  console.log('T1: skipped via click ✓', !!goneQuick)
  const appVisible1 = await page.locator('.app-dark').isVisible()
  console.log('T1: app open after skip:', appVisible1)

  // ---- TEST 2: launch from another page (cross-page handoff) ----
  await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  // close the app state by fresh context? store resets on new page load.
  const navBtn = page.locator('header button, nav button', { hasText: /launch|open/i }).first()
  const hasNavBtn = await navBtn.count()
  console.log('T2: nav launch button on /about:', hasNavBtn > 0)
  if (hasNavBtn) {
    await navBtn.click()
    const overlay = await page.waitForSelector(overlaySel, { timeout: 3000 })
    console.log('T2: ceremony started on /about ✓', !!overlay)
    // wait for the handoff route (happens ~5s in)
    await page.waitForURL(/\/?\?openApp=1|^\//, { timeout: 9000 }).catch(() => {})
    await page.waitForTimeout(3500) // let it finish
    const appVisible2 = await page.locator('.app-dark').isVisible()
    const url = page.url()
    console.log('T2: url now:', url, '| app visible:', appVisible2)
  }

  console.log('page errors:', errors.length ? errors : 'none')
  await browser.close()
})().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
