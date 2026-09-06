import { chromium } from 'playwright'

const shots = [
  ['gen-antumbra-architecture.html', 'antumbra-architecture.png', 1000, 720],
  ['gen-antumbra-mandats.html', 'antumbra-mandats.png', 1000, 720],
]

const browser = await chromium.launch()
for (const [src, out, w, h] of shots) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
  await page.goto(`file:///home/z/my-project/scripts/${src}`)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `/home/z/my-project/scripts/gen-img-tmp/${out}` })
  await page.close()
  console.log('shot ok:', out)
}
await browser.close()
