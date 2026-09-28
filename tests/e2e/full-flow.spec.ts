import { expect, test } from '@playwright/test'

/**
 * THE critical smoke test — account edition:
 * homepage → gated register → email-code sign-up → conference registration →
 * order → mock payment (QR cashier) → credential → QR verification →
 * account page shows paid → admin login → scanner check-in → dashboard reflects.
 */
test('sign-up → register → pay → credential → check-in chain', async ({ page }) => {
  const stamp = Date.now()
  const email = `e2e-${stamp}@example.test`
  const fullName = `E2E Account ${stamp % 10000}`
  const password = `e2e-${stamp}-${Math.random().toString(36).slice(2, 8)}!A`

  /* 1. homepage → register is gated by the account wall */
  await page.goto('/')
  await expect(page.locator('.hero-title')).toBeVisible()
  await page.click('.hero-cta >> text=Register Now')
  await page.waitForURL(/\/sign-up/, { timeout: 20_000 })
  await page.waitForLoadState('networkidle')

  /* 2. email-code sign-up */
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="email"]', email)
  await page.click('button:has-text("Send verification code")')
  await expect(page.locator('.code-input')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.dev-code')).toBeVisible() // dev mode surfaces the code
  const devCode = (await page.locator('.dev-code').textContent())?.match(/\d{6}/)?.[0]
  expect(devCode).toMatch(/^\d{6}$/)

  await page.fill('.code-input', devCode!)
  await page.fill('input[name="fullName"]', fullName)
  await page.fill('input[name="password"]', password)
  await page.click('button:has-text("Create account")')
  await page.waitForURL(/\/register/, { timeout: 20_000 })

  /* 3. conference registration (email locked to the account) */
  await page.waitForLoadState('networkidle')
  for (let attempt = 0; attempt < 10; attempt++) {
    await page.click('.type-row:has-text("Academic")')
    if (await page.locator('.type-row.selected').count() === 1) break
    await page.waitForTimeout(400)
  }
  await expect(page.locator('.type-row.selected')).toHaveCount(1)
  await page.click('button:has-text("Continue")')

  // email shows locked; profile name prefilled from the account
  await expect(page.locator('input[value*="@"]').first()).toBeDisabled()
  for (let attempt = 0; attempt < 6; attempt++) {
    const current = await page.inputValue('input[name="fullName"]')
    if (current) break
    await page.fill('input[name="fullName"]', fullName)
    await page.waitForTimeout(300)
  }
  await page.fill('input[name="affiliation"]', 'E2E Institute of Polymers')
  await page.fill('input[name="country"]', 'China')
  await page.click('form button:has-text("Continue")')
  await page.click('button:has-text("Create order")')
  await page.waitForURL(/\/payment\//, { timeout: 20_000 })

  /* 4. payment — auto-started mock payment with QR */
  await expect(page.locator('.amount')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('img.qr')).toBeVisible()

  /* 5. simulate scan → mock cashier → paid */
  await page.click('text=Open simulated cashier')
  await page.waitForURL(/\/pay\/mock\//)
  await page.click('button:has-text("Simulate successful payment")')
  await expect(page.locator('.state.done')).toContainText('PAID')

  /* 6. back to payment page → poll detects paid → credential */
  await page.goBack()
  await page.waitForURL(/\/credential\//, { timeout: 30_000 })
  await expect(page.locator('.pass')).toBeVisible()
  await expect(page.locator('.pass')).toContainText(fullName)

  const token = page.url().split('/credential/')[1]!

  /* 7. QR verification page */
  await page.goto(`/verify/${token}`)
  await expect(page.locator('.verdict.good')).toBeVisible()
  await expect(page.locator('.verdict')).toContainText('Valid credential')

  /* 8. account page shows the registration with paid status */
  await page.goto('/account')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('.reg-row .badge.ok').first()).toContainText('confirmed')
  await expect(page.locator('.reg-row')).toContainText('paid')

  /* 9. admin login + dashboard */
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

  /* 10. staff scanner — manual entry, confirm check-in */
  await page.goto('/scan')
  await page.waitForLoadState('networkidle')
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

  /* 11. admin registrations table shows the participant + payment */
  await page.goto('/admin/registrations')
  await expect(page.locator('.tbl')).toContainText(fullName)
  await expect(page.locator('.tbl')).toContainText('paid')
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
