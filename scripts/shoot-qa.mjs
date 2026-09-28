// Final QA capture — key pages at representative widths
import { chromium } from '@playwright/test'

const base = 'http://localhost:3000'
const browser = await chromium.launch()

async function shoot(name, path, width, height, fullPage = true, prepare) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.goto(base + path, { waitUntil: 'networkidle' })
  if (prepare) await prepare(page)
  await page.waitForTimeout(500)
  await page.screenshot({ path: `shots/qa-${name}.png`, fullPage })
  await page.close()
  console.log(`qa-${name} ok`)
}

// register a fresh order for a live payment page
const types = await fetch(`${base}/api/registration-types`).then(r => r.json())
const studentId = types.find(t => t.code === 'student').id
const reg = await fetch(`${base}/api/registrations`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ participant: { typeId: studentId, fullName: 'QA Visual', email: `qa-${Date.now()}@example.test`, affiliation: 'QA Board', country: 'China' } }),
}).then(r => r.json())
await fetch(`${base}/api/payments/create`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ orderId: reg.order.id, provider: 'mock' }),
}).then(r => r.json())

await shoot('home-desktop', '/', 1440, 900, true)
await shoot('home-mobile', '/', 390, 844, true)
await shoot('register-desktop', '/register', 1440, 900, true)
await shoot('payment-desktop', `/payment/${reg.order.id}`, 1440, 900, false)

// login context for admin + credential pages
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
await page.goto(`${base}/admin/login`, { waitUntil: 'networkidle' })
await page.waitForLoadState('networkidle')
for (let i = 0; i < 6 && page.url().includes('/admin/login'); i++) {
  await page.fill('input[name="username"]', 'admin')
  await page.fill('input[name="password"]', 'pps26-admin')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(1200)
}
await page.waitForURL(/\/admin$/)
await page.waitForTimeout(500)
await page.screenshot({ path: 'shots/qa-admin.png' })
console.log('qa-admin ok')

// find a credential token from admin API
const creds = await page.evaluate(async () => {
  const res = await fetch('/api/admin/credentials')
  return res.json()
})
const token = creds.rows[0]?.token
await page.goto(`${base}/credential/${token}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await page.screenshot({ path: 'shots/qa-credential.png' })
console.log('qa-credential ok')
await ctx.close()

// scan page mobile (anon login state)
await shoot('scan-mobile', '/scan', 390, 844, false)

await browser.close()
