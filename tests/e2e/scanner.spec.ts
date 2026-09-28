import { expect, test } from '@playwright/test'
import { base, uniqueEmail } from './helpers'

/**
 * STANDALONE SCANNER (/scan) — the on-site check-in tool:
 * staff gate, valid credential → confirm, duplicate blocked,
 * unknown codes rejected. Uses manual entry (works everywhere).
 */

async function staffLogin(page: import('@playwright/test').Page) {
  await page.context().clearCookies() // deterministic anonymous start → gate shows
  await page.goto(`${base}/scan`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  await expect(page.locator('input[name="username"]')).toBeVisible({ timeout: 20_000 })
  await page.fill('input[name="username"]', 'staff')
  await page.fill('input[name="password"]', 'pps26-staff')
  await page.click('button:has-text("Sign in")')
  await expect(page.locator('#manual-token')).toBeVisible({ timeout: 30_000 })
}

/** Pays a fresh registration end-to-end via API and returns its credential token. */
async function paidCredentialToken(context: import('@playwright/test').APIRequestContext) {
  const email = uniqueEmail('scan')
  const password = `scan-${Date.now()}-pass!`

  const codeRes = await context.post(`${base}/api/auth/send-code`, {
    data: { email, purpose: 'signup' },
  }).then(r => r.json())
  expect(codeRes.devCode).toMatch(/^\d{6}$/)

  const reg = await context.post(`${base}/api/auth/register`, {
    data: { email, code: codeRes.devCode, password, fullName: 'Scan Tester' },
  })
  expect(reg.status()).toBe(201)

  const login = await context.post(`${base}/api/auth/login`, {
    data: { email, password },
  })
  expect(login.status()).toBe(200)

  const types = await context.get(`${base}/api/registration-types`).then(r => r.json())
  const academic = types.find((t: { code: string }) => t.code === 'academic').id

  const created = await context.post(`${base}/api/registrations`, {
    data: { participant: { typeId: academic, fullName: 'Scan Tester', email, affiliation: 'Scan Institute', country: 'China' } },
  })
  expect(created.status()).toBe(201)
  const { order } = await created.json() as { order: { id: string, totalFen: number, orderNo: string } }

  const pay = await context.post(`${base}/api/payments/create`, {
    data: { orderId: order.id, provider: 'mock' },
  })
  const { payment } = await pay.json() as { payment: { id: string, providerPaymentNo: string } }

  const { createHmac } = await import('node:crypto')
  const secret = 'dev-only-mock-secret'
  const body = JSON.stringify({
    eventId: `e2e-scan-${payment.id}`,
    providerPaymentNo: payment.providerPaymentNo,
    orderNo: order.orderNo,
    result: 'paid',
    amountFen: order.totalFen,
  })
  const webhook = await context.post(`${base}/api/payments/webhook/mock`, {
    headers: { 'content-type': 'text/plain', 'x-mock-signature': createHmac('sha256', secret).update(body).digest('hex') },
    data: body,
  })
  if (webhook.status() !== 200) {
    console.error('WEBHOOK_FAIL', webhook.status(), await webhook.text())
  }
  expect(webhook.status()).toBe(200)

  const orderView = await context.get(`${base}/api/orders/${order.id}`).then(r => r.json())
  return orderView.credentialToken as string
}

test('scanner requires staff sign-in and shows the login gate otherwise', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto(`${base}/scan`, { waitUntil: 'networkidle' })
  await expect(page.locator('input[name="username"]')).toBeVisible({ timeout: 20_000 })
})

test('unknown manual codes are rejected with NOT RECOGNISED', async ({ page }) => {
  await staffLogin(page)
  await page.fill('#manual-token', `totally-unknown-token-${Date.now()}-${'x'.repeat(40)}`)
  await page.click('.manual button[type="submit"]')
  await expect(page.locator('.kicker.bad')).toContainText('NOT RECOGNISED')
})

test('valid credential: verify → confirm check-in → duplicate blocked', async ({ page }) => {
  const token = await paidCredentialToken(page.context().request)
  await staffLogin(page)

  await page.fill('#manual-token', token)
  await page.click('.manual button[type="submit"]')
  await expect(page.locator('.kicker.good')).toContainText('VALID CREDENTIAL')
  await expect(page.locator('.p-name')).toContainText('Scan Tester')

  await page.click('button:has-text("Confirm check-in")')
  await expect(page.locator('.log-row').first()).toContainText('checked in')

  // scanning the same credential again reports ALREADY CHECKED IN
  await page.click('button:has-text("Scan next")')
  await page.fill('#manual-token', token)
  await page.click('.manual button[type="submit"]')
  await expect(page.locator('.kicker.bad')).toContainText('ALREADY CHECKED IN')
})

test('confirming on the scanner is reflected in the admin check-ins list', async ({ page }) => {
  const token = await paidCredentialToken(page.context().request)
  await staffLogin(page)
  await page.fill('#manual-token', token)
  await page.click('.manual button[type="submit"]')
  await expect(page.locator('.kicker.good')).toBeVisible()
  await page.click('button:has-text("Confirm check-in")')
  await expect(page.locator('.log-row').first()).toContainText('checked in')

  // admin-level verification: the check-in lands in the admin check-ins list
  // (staff logging in as admin replaces the shared pps_admin session cookie)
  const adminLogin = await page.context().request.post(`${base}/api/admin/login`, {
    data: { username: 'admin', password: 'pps26-admin' },
  })
  expect(adminLogin.status()).toBe(200)
  const list = await page.context().request.get(`${base}/api/admin/checkins`)
  expect(list.status()).toBe(200)
  const rows = await list.json() as { rows: Array<{ fullName: string }> }
  expect(rows.rows.some(row => row.fullName === 'Scan Tester')).toBe(true)
})
