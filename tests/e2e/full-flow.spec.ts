import { expect, test } from '@playwright/test'

/**
 * THE critical smoke test (PLAN §33):
 * homepage → register (Academic) → order → mock payment → payment success →
 * credential → QR verification → admin login → scanner check-in →
 * dashboard reflects the check-in.
 */
test('full registration → payment → credential → check-in chain', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.test`
  const fullName = `E2E Runner ${Date.now() % 10000}`

  /* 1. homepage */
  await page.goto('/')
  await expect(page.locator('.hero-title')).toBeVisible()
  await expect(page.locator('#registration')).toBeVisible()

  /* 2. register */
  await page.click('.hero-cta >> text=Register Now')
  await expect(page.locator('h1')).toContainText('Registration')

  // step 1 — choose Academic (click until the selection registers: guards
  // against clicking before Nuxt hydration is complete)
  await page.waitForLoadState('networkidle')
  for (let attempt = 0; attempt < 10; attempt++) {
    await page.click('.type-row:has-text("Academic")')
    if (await page.locator('.type-row.selected').count() === 1) break
    await page.waitForTimeout(400)
  }
  await expect(page.locator('.type-row.selected')).toHaveCount(1)
  await page.click('button:has-text("Continue")')

  // step 2 — participant information
  await page.fill('input[name="fullName"]', fullName)
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="affiliation"]', 'E2E Institute of Polymers')
  await page.fill('input[name="country"]', 'China')
  await page.click('form button:has-text("Continue")')

  // step 3 — confirm and create the order
  await page.click('button:has-text("Create order")')
  await page.waitForURL(/\/payment\//, { timeout: 20_000 })

  /* 3. payment — auto-started mock payment with QR */
  await expect(page.locator('.amount')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('img.qr')).toBeVisible()

  /* 4. simulate scan → mock cashier → paid */
  await page.click('text=Open simulated cashier')
  await page.waitForURL(/\/pay\/mock\//)
  await page.click('button:has-text("Simulate successful payment")')
  await expect(page.locator('.state.done')).toContainText('PAID')

  /* 5. back to payment page → poll detects paid → credential */
  await page.goBack()
  await page.waitForURL(/\/credential\//, { timeout: 30_000 })
  await expect(page.locator('.pass')).toBeVisible()
  await expect(page.locator('.pass')).toContainText(fullName)

  const credentialUrl = page.url()
  const token = credentialUrl.split('/credential/')[1]!

  /* 6. QR verification page (what the QR encodes) */
  await page.goto(`/verify/${token}`)
  await expect(page.locator('.verdict.good')).toBeVisible()
  await expect(page.locator('.verdict')).toContainText('Valid credential')

  /* 7. admin login + dashboard (retry until hydration-backed submit works) */
  await page.goto('/admin/login')
  await page.waitForLoadState('networkidle')
  for (let attempt = 0; attempt < 6 && page.url().includes('/admin/login'); attempt++) {
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'pps26-admin')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1500)
  }
  await page.waitForURL(/\/admin$/, { timeout: 20_000 })
  await expect(page.locator('.stat-grid')).toBeVisible()

  /* 8. staff scanner — manual entry path, confirm check-in */
  await page.goto('/scan')
  await page.waitForLoadState('networkidle')
  // signed in as admin in this context — the scanner shows the reader/manual pane
  await expect(page.locator('#manual-token')).toBeVisible({ timeout: 30_000 })
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.fill('#manual-token', token)
    await page.click('.manual button[type="submit"]')
    if (await page.locator('.kicker.good, .kicker.bad').count() > 0) break
    await page.waitForTimeout(800)
  }
  await expect(page.locator('.kicker.good')).toContainText('VALID CREDENTIAL')
  await page.click('button:has-text("Confirm check-in")')
  await expect(page.locator('.log-row').first()).toContainText('checked in')

  /* 9. dashboard reflects the check-in (participant listed) */
  await page.goto('/admin/checkins')
  await expect(page.locator('.tbl')).toContainText(fullName)
})

test('homepage is responsive and sections render at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.hero-title')).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})
