// 管理台视觉截图：登录页 / 参会管理 / 稿件审稿（登录态）
import { chromium } from '@playwright/test'

const base = 'http://localhost:3001'
const outDir = process.env.SHOT_DIR ?? '.tmp/shots'
const runTag = Date.now()

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })

// API 登录注入 pps_console cookie
const res = await fetch(`${base}/api/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'pps26-admin' }),
})
if (!res.ok) throw new Error(`console login failed ${res.status}`)
const session = res.headers.get('set-cookie')?.match(/pps_console=([^;]+)/)?.[1]
if (!session) throw new Error('no pps_console cookie')
await ctx.addCookies([{ name: 'pps_console', value: session, domain: 'localhost', path: '/' }])

// 登录页（无 cookie 的独立 context）
const anon = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const loginPage = await anon.newPage()
await loginPage.goto(`${base}/login`, { waitUntil: 'networkidle' })
await loginPage.waitForTimeout(1500)
await loginPage.screenshot({ path: `${outDir}/console-login-1440.png`, animations: 'disabled' })
console.log('shot console-login-1440')
await anon.close()

// 参会管理（有数据）
const page = await ctx.newPage()
await page.goto(`${base}/participants`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: `${outDir}/console-participants-1440.png`, fullPage: true, animations: 'disabled' })
console.log('shot console-participants-1440')

// 稿件审稿
await page.goto(`${base}/abstracts`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: `${outDir}/console-abstracts-1440.png`, fullPage: true, animations: 'disabled' })
console.log('shot console-abstracts-1440')

// 仪表盘
await page.goto(`${base}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.screenshot({ path: `${outDir}/console-dashboard-1440.png`, animations: 'disabled' })
console.log('shot console-dashboard-1440')

await browser.close()
