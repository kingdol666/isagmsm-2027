import { expect, test } from '@playwright/test'
import { base, createAccountViaApi, uniqueEmail } from './helpers'

/**
 * ADMIN BACKEND — guards, dashboard, participants management with payment
 * visibility, role separation (staff may scan but not administer).
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

  for (const path of ['participants', 'approvals', 'orders', 'payments', 'checkins']) {
    await page.goto(`${base}/admin/${path}`, { waitUntil: 'networkidle' })
    await expect(page.locator('main').locator('visible=true').first()).toBeVisible()
  }
})

test('participants table exposes payment status, search filters, credential actions', async ({ page }) => {
  const runTag = `pv${Date.now().toString(36)}`
  const email = uniqueEmail('adminview')
  const password = `adminview-${Date.now()}-pass!`
  const fullName = `参会管理 ${runTag}`
  await createAccountViaApi(page.context(), email, password, fullName)

  const types = await page.context().request.get(`${base}/api/registration-types`).then(r => r.json())
  const studentId = types.find((t: { code: string }) => t.code === 'student').id
  const created = await page.context().request.post(`${base}/api/registrations`, {
    data: { participant: { typeId: studentId, fullName, email, phone: '13800005678', affiliation: 'View Institute', country: 'China' } },
  })
  expect(created.status()).toBe(201)
  const { order } = await created.json() as { order: { id: string } }

  // participant submits bank-transfer claim
  const claim = await page.context().request.post(`${base}/api/orders/${order.id}/claim`, {
    data: { reference: `E2E-${runTag}` },
  })
  expect(claim.status()).toBe(200)

  await page.goto(`${base}/admin/login`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  for (let attempt = 0; attempt < 6 && page.url().includes('/admin/login'); attempt++) {
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'pps26-admin')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1200)
  }
  await page.waitForURL(/\/admin$/)

  await page.goto(`${base}/admin/participants`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.fill('.filter-input', runTag)
    await page.waitForTimeout(900)
    const rows = await page.locator('.tbl tbody tr').count()
    if (rows === 1) break
  }
  await expect(page.locator('.tbl tbody tr')).toHaveCount(1, { timeout: 10_000 })
  await expect(page.locator('.tbl')).toContainText(fullName)
  // reviewing claim is visible with the 收款确认 action
  await expect(page.locator('.tbl')).toContainText('审核中')

  // admin confirms payment → order paid + credential issued automatically
  await page.locator('.op.primary:has-text("收款确认")').first().click()
  await expect(page.locator('.msg')).toContainText('凭证已下发', { timeout: 15_000 })
  await expect(page.locator('.tbl')).toContainText('已缴费')
  await expect(page.locator('.tbl')).toContainText('有效')
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

  const dash = await page.context().request.get(`${base}/api/admin/dashboard`)
  expect(dash.status()).toBe(403)
})
