import { expect, test } from '@playwright/test'
import { base, uniqueEmail } from './helpers'

/**
 * REAL END-TO-END CREDENTIAL LOOP (multi-context):
 *  admin 下发凭证 → 用户头像区查看 QR/token → 现场扫码核验 →
 *  admin 撤销（QR 立即失效）→ 恢复（重新有效）
 */
test('admin issues credential, user sees it via avatar, scanner verifies, revoke/restore works', async ({ browser }) => {
  const runTag = `cf${Date.now().toString(36)}`
  const email = uniqueEmail('credflow')
  const password = `cred-${Date.now()}-pass!`
  const fullName = `凭证闭环 ${runTag}`

  /* ---------- fixtures via API on the participant context ---------- */
  const userCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const codeRes = await userCtx.request.post(`${base}/api/auth/send-code`, {
    data: { email, purpose: 'signup' },
  }).then(r => r.json())
  expect(codeRes.devCode).toMatch(/^\d{6}$/)

  const reg = await userCtx.request.post(`${base}/api/auth/register`, {
    data: { email, code: codeRes.devCode, password, fullName },
  })
  expect(reg.status()).toBe(201)

  await userCtx.request.post(`${base}/api/auth/login`, { data: { email, password } })

  const types = await userCtx.request.get(`${base}/api/registration-types`).then(r => r.json())
  const studentId = types.find((t: { code: string }) => t.code === 'student').id
  const created = await userCtx.request.post(`${base}/api/registrations`, {
    data: { participant: { typeId: studentId, fullName, email, affiliation: '闭环测试大学', country: '中国' } },
  })
  expect(created.status()).toBe(201)
  const { order } = await created.json() as { order: { id: string } }

  const claim = await userCtx.request.post(`${base}/api/orders/${order.id}/claim`, {
    data: { reference: `E2E-CF-${runTag}` },
  })
  expect(claim.status()).toBe(200)

  /* ---------- admin reviews and issues the credential ---------- */
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const adminPage = await adminCtx.newPage()
  await adminPage.goto(`${base}/admin/login`, { waitUntil: 'networkidle' })
  await pageLoginAdmin(adminPage)

  await adminPage.goto(`${base}/admin/participants`, { waitUntil: 'networkidle' })
  await adminPage.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
  for (let attempt = 0; attempt < 6; attempt++) {
    await adminPage.fill('.filter-input', runTag)
    await adminPage.waitForTimeout(900)
    if ((await adminPage.locator('.tbl tbody tr').count()) === 1) break
  }
  await expect(adminPage.locator('.tbl tbody tr')).toHaveCount(1)
  await expect(adminPage.locator('.tbl')).toContainText('审核中')

  await adminPage.locator('.op.primary:has-text("收款确认")').first().click()
  await expect(adminPage.locator('.msg')).toContainText('凭证已下发', { timeout: 15_000 })
  await expect(adminPage.locator('.tbl')).toContainText('有效')

  /* ---------- participant sees the credential via the avatar menu ---------- */
  const userPage = await userCtx.newPage()
  await userPage.goto(base, { waitUntil: 'networkidle' })
  const avatarBtn = userPage.getByRole('banner').locator('.avatar-btn')
  await expect(avatarBtn.locator('.avatar')).toBeVisible()

  await avatarBtn.click()
  const credentialLink = userPage.getByRole('banner').locator('.menu-item.credential')
  await expect(credentialLink).toContainText('我的会议凭证')
  await credentialLink.click()
  await userPage.waitForURL(/\/credential\//, { timeout: 20_000 })

  await expect(userPage.locator('.pass')).toBeVisible()
  await expect(userPage.locator('.pass-status')).toContainText('VALID')
  await expect(userPage.locator('.pass-qr img')).toBeVisible() // the QR itself
  const token = userPage.url().split('/credential/')[1]!

  /* ---------- scanner verifies the token on-site ---------- */
  const scanCtx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const scanPage = await scanCtx.newPage()
  await scanPage.goto(`${base}/scan`, { waitUntil: 'networkidle' })
  await scanPage.waitForLoadState('networkidle')
  await expect(scanPage.locator('input[name="username"]')).toBeVisible({ timeout: 20_000 })
  await scanPage.fill('input[name="username"]', 'staff')
  await scanPage.fill('input[name="password"]', 'pps26-staff')
  await scanPage.click('button:has-text("登录")')
  await expect(scanPage.locator('#manual-token')).toBeVisible({ timeout: 30_000 })

  await scanPage.fill('#manual-token', token)
  await scanPage.click('.manual button[type="submit"]')
  await expect(scanPage.locator('.kicker.good')).toContainText('凭证有效')

  /* ---------- admin revokes → QR invalidates immediately ---------- */
  await adminPage.goto(`${base}/admin/participants`, { waitUntil: 'networkidle' })
  await adminPage.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
  await adminPage.fill('.filter-input', runTag)
  await adminPage.waitForTimeout(900)
  await adminPage.locator('.op.danger:has-text("撤销")').first().click()
  await expect(adminPage.locator('.msg')).toContainText('已撤销', { timeout: 15_000 })

  await userPage.goto(`/verify/${token}`, { waitUntil: 'networkidle' })
  await expect(userPage.locator('.verdict.bad')).toContainText('Revoked')

  await scanPage.reload({ waitUntil: 'networkidle' })
  await expect(scanPage.locator('#manual-token')).toBeVisible({ timeout: 30_000 })
  await scanPage.fill('#manual-token', token)
  await scanPage.click('.manual button[type="submit"]')
  await expect(scanPage.locator('.kicker.bad')).toContainText('已撤销', { timeout: 20_000 })

  /* ---------- admin restores → valid again ---------- */
  await adminPage.goto(`${base}/admin/participants`, { waitUntil: 'networkidle' })
  await adminPage.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
  await adminPage.fill('.filter-input', runTag)
  await adminPage.waitForTimeout(900)
  await adminPage.locator('button:has-text("恢复")').first().click()
  await expect(adminPage.locator('.msg')).toContainText('已恢复', { timeout: 15_000 })

  await userPage.goto(`/verify/${token}`, { waitUntil: 'networkidle' })
  await expect(userPage.locator('.verdict.good')).toBeVisible()
})

/** Admin UI login helper. */
async function pageLoginAdmin(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle')
  for (let attempt = 0; attempt < 6 && page.url().includes('/admin/login'); attempt++) {
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'pps26-admin')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1200)
  }
  await page.waitForURL(/\/admin$/, { timeout: 20_000 })
}
