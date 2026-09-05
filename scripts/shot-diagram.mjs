import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 340 }, deviceScaleFactor: 2 })
await page.goto('file:///home/z/my-project/scripts/gen-anchor-diagram.html')
await page.waitForTimeout(400)
await page.screenshot({ path: '/home/z/my-project/scripts/gen-img-tmp/anchor-flow.png' })
await browser.close()
console.log('shot ok')
