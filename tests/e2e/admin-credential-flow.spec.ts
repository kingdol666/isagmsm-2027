import { expect, test } from '@playwright/test'
import { base, consoleBase, consoleUiLogin, createRegistrationWithClaimViaApi } from './helpers'

/**
 * 会员-凭证完整闭环（多上下文真实浏览器）：
 *  管理台设会员 → 收款确认下发凭证 → 用户头像区查看 QR/token → 现场扫码核验 →
 *  管理台撤销（QR 立即失效）→ 恢复（重新有效）→ 取消会员（自动吊销，扫码被拒）
 */
test('member credential loop: issue via console, scan verify, revoke/restore, cancel auto-revokes', async ({ browser }) => {
  const runTag = `cf${Date.now().toString(36)}`
  const fullName = `凭证闭环 ${runTag}`

  /* ---------- fixtures via API on the participant context ---------- */
  const userCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await createRegistrationWithClaimViaApi(
    { request: userCtx.request },
    fullName,
    '闭环测试大学',
    `E2E-CF-${runTag}`,
  )

  /* ---------- 管理台：设会员 → 收款确认（自动下发凭证） ---------- */
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const adminPage = await adminCtx.newPage()
  await consoleUiLogin(adminPage)

  await adminPage.goto(`${consoleBase}/participants`, { waitUntil: 'networkidle' })
  await adminPage.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
  for (let attempt = 0; attempt < 6; attempt++) {
    await adminPage.fill('.filter-input', runTag)
    await adminPage.waitForTimeout(900)
    if ((await adminPage.locator('.tbl tbody tr').count()) === 1) break
  }
  await expect(adminPage.locator('.tbl tbody tr')).toHaveCount(1)
  const row = adminPage.locator('.tbl tbody tr')
  await expect(row).toContainText('审核中')

  // 先入会（会员才可持有凭证），再收款确认 → 凭证自动下发
  await row.locator('.op.primary:has-text("设为会员")').click()
  await expect(adminPage.locator('.msg')).toContainText('已设为会员', { timeout: 15_000 })

  await row.locator('.op.primary:has-text("收款确认")').click()
  await expect(adminPage.locator('.msg')).toContainText('已确认收款并下发凭证', { timeout: 15_000 })
  await expect(row).toContainText('有效')

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

  /* ---------- 管理台撤销 → QR 立即失效 ---------- */
  await adminPage.goto(`${consoleBase}/participants`, { waitUntil: 'networkidle' })
  await adminPage.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
  await adminPage.fill('.filter-input', runTag)
  await adminPage.waitForTimeout(900)
  await adminPage.locator('.op.danger:has-text("撤销")').first().click()
  await expect(adminPage.locator('.msg')).toContainText('已撤销', { timeout: 15_000 })

  await userPage.goto(`/verify/${token}`, { waitUntil: 'networkidle' })
  await expect(userPage.locator('.verdict.bad')).toContainText('已撤销')

  await scanPage.reload({ waitUntil: 'networkidle' })
  await expect(scanPage.locator('#manual-token')).toBeVisible({ timeout: 30_000 })
  await scanPage.fill('#manual-token', token)
  await scanPage.click('.manual button[type="submit"]')
  await expect(scanPage.locator('.kicker.bad')).toContainText('已撤销', { timeout: 20_000 })

  /* ---------- 管理台恢复 → 重新有效 ---------- */
  await adminPage.goto(`${consoleBase}/participants`, { waitUntil: 'networkidle' })
  await adminPage.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
  await adminPage.fill('.filter-input', runTag)
  await adminPage.waitForTimeout(900)
  await adminPage.locator('button:has-text("恢复")').first().click()
  await expect(adminPage.locator('.msg')).toContainText('已恢复', { timeout: 15_000 })

  await userPage.goto(`/verify/${token}`, { waitUntil: 'networkidle' })
  await expect(userPage.locator('.verdict.good')).toBeVisible()

  /* ---------- 取消会员 → 凭证自动吊销，扫码被拒 ---------- */
  await adminPage.locator('button:has-text("取消会员")').first().click()
  await expect(adminPage.locator('.msg')).toContainText('自动吊销', { timeout: 15_000 })
  await expect(adminPage.locator('.tbl tbody tr')).toContainText('已撤销')

  await scanPage.reload({ waitUntil: 'networkidle' })
  await expect(scanPage.locator('#manual-token')).toBeVisible({ timeout: 30_000 })
  await scanPage.fill('#manual-token', token)
  await scanPage.click('.manual button[type="submit"]')
  await expect(scanPage.locator('.kicker.bad')).toContainText('已撤销', { timeout: 20_000 })

  await userPage.goto(`/verify/${token}`, { waitUntil: 'networkidle' })
  await expect(userPage.locator('.verdict.bad')).toContainText('已撤销')
})
