import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 720 }, deviceScaleFactor: 2 })
await page.goto('file:///home/z/my-project/scripts/gen-antumbra-architecture.html')
await page.waitForTimeout(400)
await page.screenshot({ path: '/home/z/my-project/scripts/gen-img-tmp/antumbra-architecture.png' })
await browser.close()
console.log('shot ok')
