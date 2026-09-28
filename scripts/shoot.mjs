// Screenshot helper for visual verification: node scripts/shoot.mjs <url> <outPrefix>
import { chromium } from '@playwright/test'

const url = process.argv[2] ?? 'http://localhost:3000/'
const prefix = process.argv[3] ?? 'shot'
const views = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1024', width: 1024, height: 768 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-375', width: 375, height: 812 },
]

const browser = await chromium.launch()
const errors = []
for (const v of views) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height } })
  page.on('console', m => { if (m.type() === 'error') errors.push(`[${v.name}] ${m.text()}`) })
  page.on('pageerror', e => errors.push(`[${v.name}] ${String(e)}`))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  await page.screenshot({ path: `shots/${prefix}-${v.name}.png`, fullPage: true })
  console.log(`${v.name}: overflow=${overflow}px`)
  await page.close()
}
console.log('console/page errors:', errors.length ? '\n' + errors.join('\n') : 'none')
await browser.close()
