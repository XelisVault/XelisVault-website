import { chromium } from 'playwright'

const BASE = 'http://localhost:3100'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 400)))

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)

const state = await page.evaluate(() => ({
  dialog: document.querySelectorAll('[role="dialog"]').length,
  antumbraBtn: document.querySelectorAll('button[aria-label^="Open the ANTUMBRA"]').length,
  anyAntumbraText: document.body.innerText.includes('ANTUMBRA'),
  gateTitle: document.body.innerText.includes('CHOOSE YOUR SIDE') || document.body.innerText.includes('CHOOSE'),
  bodySnippet: document.body.innerText.slice(0, 200),
}))
console.log(JSON.stringify(state, null, 2))
console.log('console errors:', errors.length ? errors.slice(0, 5) : 'aucune')
await page.screenshot({ path: '/home/z/my-project/scripts/gen-img-tmp/qa-diag.png' })
await browser.close()
