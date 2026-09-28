// Screenshot admin + scan pages using cookie auth
import { chromium } from '@playwright/test'

const base = 'http://localhost:3000'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

await page.goto(`${base}/admin/login`, { waitUntil: 'networkidle' })
await page.fill('input[name="username"]', 'admin')
await page.fill('input[name="password"]', 'pps26-admin')
await page.click('button[type="submit"]')
await page.waitForURL('**/admin', { timeout: 15000 })
await page.waitForTimeout(600)
await page.screenshot({ path: 'shots/admin-dashboard.png' })

for (const [name, path] of [
  ['admin-registrations', '/admin/registrations'],
  ['admin-orders', '/admin/orders'],
  ['admin-checkins', '/admin/checkins'],
]) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.screenshot({ path: `shots/${name}.png`, fullPage: true })
}

// scan page (mobile viewport)
const mob = await browser.newContext({ viewport: { width: 390, height: 844 } })
const mpage = await mob.newPage()
await mpage.goto(`${base}/scan`, { waitUntil: 'networkidle' })
await mpage.waitForTimeout(800)
await mpage.screenshot({ path: 'shots/scan-anon.png' })

console.log('admin shots done')
await browser.close()
