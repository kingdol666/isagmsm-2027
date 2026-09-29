import { expect, test } from '@playwright/test'
import { base, consoleBase, consoleLoginViaApi, createRegistrationWithClaimViaApi } from './helpers'

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
  await page.click('button:has-text("登录")')
  await expect(page.locator('#manual-token')).toBeVisible({ timeout: 30_000 })
}

/**
 * Drives a fresh registration through the console (member-first):
 * claim → console 设会员 → approve → credential issued, returns the token.
 */
async function paidCredentialToken(context: import('@playwright/test').BrowserContext) {
  const { registrationId, orderId } = await createRegistrationWithClaimViaApi(
    { request: context.request },
    'Scan Tester',
    'Scan Institute',
    'E2E-SCAN-REF',
  )

  // 会员门槛：先在管理台设为会员，再收款确认（凭证自动下发）
  await consoleLoginViaApi(context)
  const member = await context.request.post(`${consoleBase}/api/participants/${registrationId}/membership`, {
    data: { isMember: true },
  })
  expect(member.status()).toBe(200)

  const approve = await context.request.post(`${consoleBase}/api/orders/${orderId}/approve`)
  expect(approve.status()).toBe(200)

  const orderView = await context.request.get(`${base}/api/orders/${orderId}`).then(r => r.json())
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
  await expect(page.locator('.kicker.bad')).toContainText('未识别')
})

test('valid credential: verify → confirm check-in → duplicate blocked', async ({ page }) => {
  const token = await paidCredentialToken(page.context())
  await staffLogin(page)

  await page.fill('#manual-token', token)
  await page.click('.manual button[type="submit"]')
  await expect(page.locator('.kicker.good')).toContainText('凭证有效')
  await expect(page.locator('.p-name')).toContainText('Scan Tester')

  await page.click('button:has-text("确认签到")')
  await expect(page.locator('.log-row').first()).toContainText('checked in')

  // scanning the same credential again reports ALREADY CHECKED IN
  await page.click('button:has-text("扫下一个")')
  await page.fill('#manual-token', token)
  await page.click('.manual button[type="submit"]')
  await expect(page.locator('.kicker.bad')).toContainText('已签到')
})

test('check-in state persists on the public verify page', async ({ page }) => {
  const token = await paidCredentialToken(page.context())
  await staffLogin(page)
  await page.fill('#manual-token', token)
  await page.click('.manual button[type="submit"]')
  await expect(page.locator('.kicker.good')).toBeVisible()
  await page.click('button:has-text("确认签到")')
  await expect(page.locator('.log-row').first()).toContainText('checked in')

  // user-visible persistence: the public verify page shows the check-in
  await page.goto(`/verify/${token}`, { waitUntil: 'networkidle' })
  await expect(page.locator('.verdict.good')).toContainText('Valid — checked in')
})
