// M10 QA: auth pages + account page + header chip — deterministic (API-driven)
import { chromium } from '@playwright/test'

const base = 'http://localhost:3000'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

// anonymous shots
await page.goto(base, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.screenshot({ path: 'shots/qa10-home-chip.png', clip: { x: 232, y: 0, width: 1208, height: 420 } })
console.log('chip ok')

await page.goto(`${base}/sign-up`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.screenshot({ path: 'shots/qa10-signup.png' })
console.log('signup ok')

// create an account via API, inject the session cookie
const stamp = Date.now()
const email = `qa10-${stamp}@example.test`
const password = `qa10-${stamp}-${Math.random().toString(36).slice(2, 8)}!A`
const codeRes = await fetch(`${base}/api/auth/send-code`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, purpose: 'signup' }),
}).then(r => r.json())

const regRes = await fetch(`${base}/api/auth/register`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, code: codeRes.devCode, password, fullName: 'QA Ten' }),
})
const rawCookie = regRes.headers.get('set-cookie') ?? ''
const sessionValue = /pps_user=([^;]+)/.exec(rawCookie)?.[1]
if (!sessionValue) throw new Error('register did not set a session cookie')
await ctx.addCookies([
  { name: 'pps_user', value: sessionValue, domain: 'localhost', path: '/' },
])
console.log('account ok')

// complete the profile via API so the account page has data
await fetch(`${base}/api/account/profile`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json', cookie: `pps_user=${sessionValue}` },
  body: JSON.stringify({ fullName: 'QA Ten', affiliation: 'QA Board', country: 'China' }),
})

// logged-in rail chip
await page.goto(base, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.screenshot({ path: 'shots/qa10-rail-logged.png', clip: { x: 0, y: 0, width: 264, height: 560 } })
console.log('rail ok')

// account page
await page.goto(`${base}/account`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: 'shots/qa10-account.png', fullPage: true })
console.log('account page ok')

await browser.close()
