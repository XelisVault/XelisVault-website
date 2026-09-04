// Record the ceremony as video, then frames are extracted with ffmpeg.
const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: { dir: '/home/z/my-project/frames/video', size: { width: 1600, height: 900 } },
  })
  const page = await ctx.newPage()
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  const overlaySel = '[aria-label="Skip vault animation"]'
  await page.locator('button', { hasText: 'Launch App' }).first().click()
  await page.waitForSelector(overlaySel, { timeout: 4000 })
  console.log('ceremony anchored — recording 9s')
  await page.waitForTimeout(9500) // full ceremony + settle

  await ctx.close() // flushes the video
  await browser.close()
  console.log('done')
})().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
