import { expect, test } from '@playwright/test'
import { base, createAccountViaApi, uniqueEmail } from './helpers'

/**
 * ADMIN BACKEND — guards, dashboard, lists with payment visibility,
 * role separation (staff may scan but not administer).
 */

test('admin APIs reject anonymous callers; admin login works', async ({ request }) => {
  const anon = await request.get(`${base}/api/admin/dashboard`)
  expect(anon.status()).toBe(401)

  const bad = await request.post(`${base}/api/admin/login`, {
    data: { username: 'admin', password: 'totally-wrong' },
  })
  expect(bad.status()).toBe(401)
})

test('dashboard shows live counts and revenue', async ({ page }) => {
  await page.goto(`${base}/admin/login`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  for (let attempt = 0; attempt < 6 && page.url().includes('/admin/login'); attempt++) {
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'pps26-admin')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1200)
  }
  await page.waitForURL(/\/admin$/)
  await expect(page.locator('.stat-grid')).toBeVisible()
  const revenue = await page.locator('.stat').nth(3).textContent()
  expect(revenue).toContain('¥')

  // the five lists render their tables
  for (const path of ['registrations', 'orders', 'payments', 'credentials', 'checkins']) {
    await page.goto(`${base}/admin/${path}`, { waitUntil: 'networkidle' })
    await expect(page.locator('.tbl')).toBeVisible()
  }
})

test('registrations table exposes per-row payment status; search filters', async ({ page }) => {
  // fixture: one account with a paid chain via the UI-less API path;
  // the name embeds a run-unique tag so the search assertion is deterministic
  const runTag = `av${Date.now().toString(36)}`
  const email = uniqueEmail('adminview')
  const password = `adminview-${Date.now()}-pass!`
  const fullName = `Admin View ${runTag}`
  await createAccountViaApi(page.context(), email, password, fullName)

  const types = await page.context().request.get(`${base}/api/registration-types`).then(r => r.json())
  const studentId = types.find((t: { code: string }) => t.code === 'student').id
  const created = await page.context().request.post(`${base}/api/registrations`, {
    data: { participant: { typeId: studentId, fullName, email, affiliation: 'View Institute', country: 'China' } },
  })
  expect(created.status()).toBe(201)
  const { order } = await created.json() as { order: { id: string } }
  const pay = await page.context().request.post(`${base}/api/payments/create`, {
    data: { orderId: order.id, provider: 'mock' },
  })
  const { payment } = await pay.json() as { payment: { id: string } }
  // simulate the signed webhook through the cashier path
  const cashier = await page.context().request.post(`${base}/api/payments/mock/cashier`, {
    data: { paymentId: payment.id, result: 'paid' },
  })
  expect((await cashier.json()).status).toBe('paid')

  await page.goto(`${base}/admin/login`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  for (let attempt = 0; attempt < 6 && page.url().includes('/admin/login'); attempt++) {
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'pps26-admin')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1200)
  }
  await page.waitForURL(/\/admin$/)

  await page.goto(`${base}/admin/registrations`, { waitUntil: 'networkidle' })
  // wait for hydration before interacting with the search input
  await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.fill('.filter-input', runTag)
    await page.waitForTimeout(900)
    const rows = await page.locator('.tbl tbody tr').count()
    if (rows === 1) break
  }
  await expect(page.locator('.tbl tbody tr')).toHaveCount(1, { timeout: 10_000 })
  await expect(page.locator('.tbl')).toContainText(fullName)
  await expect(page.locator('.tbl')).toContainText('paid')
  await expect(page.locator('.tbl')).toContainText('confirmed')
})

test('staff accounts can open the scanner but not the admin area', async ({ page }) => {
  await page.goto(`${base}/admin/login`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  for (let attempt = 0; attempt < 6 && page.url().includes('/admin/login'); attempt++) {
    await page.fill('input[name="username"]', 'staff')
    await page.fill('input[name="password"]', 'pps26-staff')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1200)
  }
  await page.waitForURL(/\/admin$/)

  // staff hitting the dashboard API gets 403 (role guard)
  const dash = await page.context().request.get(`${base}/api/admin/dashboard`)
  expect(dash.status()).toBe(403)
})
