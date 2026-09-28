// Screenshot flow pages (register/payment/credential/verify) at desktop + mobile
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const base = 'http://localhost:3000'
const order = readFileSync('C:/Users/87287/AppData/Local/Temp/pending-order.txt', 'utf8').trim()
const token = readFileSync('C:/Users/87287/AppData/Local/Temp/visual-token.txt', 'utf8').trim()

const shots = [
  { name: 'register', url: `${base}/register`, width: 1440, height: 900, full: false },
  { name: 'payment', url: `${base}/payment/${order}`, width: 1440, height: 900, full: false },
  { name: 'credential', url: `${base}/credential/${token}`, width: 1440, height: 900, full: false },
  { name: 'verify', url: `${base}/verify/${token}`, width: 1440, height: 900, full: false },
  { name: 'register-m', url: `${base}/register`, width: 390, height: 844, full: true },
  { name: 'payment-m', url: `${base}/payment/${order}`, width: 390, height: 844, full: false },
  { name: 'credential-m', url: `${base}/credential/${token}`, width: 390, height: 844, full: false },
]

const browser = await chromium.launch()
const errors = []
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.width, height: s.height } })
  page.on('pageerror', e => errors.push(`[${s.name}] ${String(e)}`))
  await page.goto(s.url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `shots/${s.name}.png`, fullPage: s.full })
  console.log(`${s.name} ok`)
  await page.close()
}
console.log('pageerrors:', errors.length ? errors.join('\n') : 'none')
await browser.close()
