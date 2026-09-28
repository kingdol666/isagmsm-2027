import { expect, test } from '@playwright/test'
import { base } from './helpers'

/**
 * THE critical smoke test — account + bank-transfer edition:
 * homepage → gated register → email-code sign-up → conference registration →
 * order → bank-transfer instructions → submit transfer claim → admin reviews
 * and approves → QR credential issued → verify → scanner check-in →
 * admin registrations shows paid/confirmed.
 */
test('sign-up → register → bank-transfer claim → approve → credential → check-in chain', async ({ page }) => {
  const stamp = Date.now()
  const email = `e2e-${stamp}@example.test`
  const fullName = `E2E Account ${stamp % 10000}`
  const password = `e2e-${stamp}-${Math.random().toString(36).slice(2, 8)}!A`

  /* 1. homepage → register is gated by the account wall */
  await page.goto('/')
  await expect(page.locator('.hero-title')).toBeVisible()
  await page.click('.hero-cta >> text=立即报名')
  await page.waitForURL(/\/sign-up/, { timeout: 20_000 })
  await page.waitForLoadState('networkidle')

  /* 2. email-code sign-up */
  await page.fill('input[name="email"]', email)
  await page.click('button:has-text("Send verification code")')
  await expect(page.locator('.code-input')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.dev-code')).toBeVisible()
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
    await page.click('.type-row:has-text("正式代表")')
    if (await page.locator('.type-row.selected').count() === 1) break
    await page.waitForTimeout(400)
  }
  await expect(page.locator('.type-row.selected')).toHaveCount(1)
  await page.click('button:has-text("Continue")')

  await expect(page.locator('input[value*="@"]').first()).toBeDisabled()
  for (let attempt = 0; attempt < 6; attempt++) {
    const current = await page.inputValue('input[name="fullName"]')
    if (current) break
    await page.fill('input[name="fullName"]', fullName)
    await page.waitForTimeout(300)
  }
  await page.fill('input[name="affiliation"]', 'E2E 凝胶研究所')
  await page.fill('input[name="country"]', '中国')
  await page.click('form button:has-text("Continue")')
  await page.click('button:has-text("Create order")')
  await page.waitForURL(/\/payment\//, { timeout: 20_000 })

  /* 4. bank-transfer payment page: participant ID + bank info + claim */
  await expect(page.locator('.bank-box')).toBeVisible({ timeout: 20_000 })
  const displayId = (await page.locator('.row .aid').textContent())?.trim()
  expect(displayId).toMatch(/^ISAGMSM-\d{6}$/)

  await page.fill('input[name="reference"]', `E2E-REF-${stamp}`)
  await page.click('button:has-text("提交审核")')
  await expect(page.locator('.panel-title.ok')).toContainText('审核中', { timeout: 20_000 })

  /* 5. admin reviews and approves → QR credential issued */
  await page.goto(`${base}/admin/login`)
  await page.waitForLoadState('networkidle')
  for (let attempt = 0; attempt < 6 && page.url().includes('/admin/login'); attempt++) {
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'pps26-admin')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1200)
  }
  await page.waitForURL(/\/admin$/, { timeout: 20_000 })

  await page.goto(`${base}/admin/approvals`, { waitUntil: 'networkidle' })
  await expect(page.locator('.review').first()).toContainText(displayId!)
  await page.locator('.review .r-actions button:has-text("核对无误")').first().click()
  await expect(page.locator('.msg')).toContainText('电子凭证已下发', { timeout: 20_000 })

  /* 6. participant opens their credential from /account */
  await page.goto(`${base}/account`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  await expect(page.locator('.reg-row')).toContainText('paid')
  await page.locator('.reg-actions a:has-text("View credential")').first().click()
  await page.waitForURL(/\/credential\//, { timeout: 20_000 })
  await expect(page.locator('.pass')).toBeVisible()
  await expect(page.locator('.pass')).toContainText(fullName)

  const token = page.url().split('/credential/')[1]!

  /* 7. QR verification page */
  await page.goto(`/verify/${token}`)
  await expect(page.locator('.verdict.good')).toBeVisible()
  await expect(page.locator('.verdict')).toContainText('Valid credential')

  /* 8. scanner check-in (admin session works at the scan gate) */
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

  /* 9. admin registrations table shows the participant + payment */
  await page.goto(`${base}/admin/registrations`, { waitUntil: 'networkidle' })
  await expect(page.locator('.tbl')).toContainText(fullName)
  await expect(page.locator('.tbl')).toContainText('paid')
})

test('homepage is responsive and sections render at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(base)
  await expect(page.locator('.hero-title')).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})
