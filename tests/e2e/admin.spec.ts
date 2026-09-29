import { expect, test } from '@playwright/test'
import { base, consoleBase, consoleLoginViaApi, consoleUiLogin, createRegistrationWithClaimViaApi } from './helpers'

/**
 * 独立管理台（admin/，端口 3001）：
 *  - 认证守卫：匿名 401 / 错密码 401 / staff 被拒 403
 *  - 门户管理面已剥离：/api/admin/** 不存在（404）
 *  - 仪表盘、参会管理（会员开关 → 收款确认 → 凭证下发）
 *  - 会员-凭证绑定：非会员收款确认不发凭证；取消会员自动吊销凭证
 */

test('console guards: anonymous 401, wrong password 401, staff rejected 403, portal admin API gone', async ({ request }) => {
  const anon = await request.get(`${consoleBase}/api/dashboard`)
  expect(anon.status()).toBe(401)

  const bad = await request.post(`${consoleBase}/api/login`, {
    data: { username: 'admin', password: 'totally-wrong' },
  })
  expect(bad.status()).toBe(401)

  const staff = await request.post(`${consoleBase}/api/login`, {
    data: { username: 'staff', password: 'pps26-staff' },
  })
  expect(staff.status()).toBe(403)

  // 门户不再有任何管理 API / 管理页面
  const portalAdmin = await request.get(`${base}/api/admin/dashboard`)
  expect(portalAdmin.status()).toBe(404)
  const portalAdminPage = await request.get(`${base}/admin/login`)
  expect(portalAdminPage.status()).toBe(404)
})

test('dashboard shows live counts and revenue', async ({ page }) => {
  await consoleUiLogin(page)
  await expect(page.locator('.stat-grid')).toBeVisible()
  const revenue = await page.locator('.stat').nth(4).textContent()
  expect(revenue).toContain('¥')

  for (const path of ['participants', 'approvals', 'abstracts']) {
    await page.goto(`${consoleBase}/${path}`, { waitUntil: 'networkidle' })
    await expect(page.locator('main')).toContainText(/管理|审稿|审批|仪表盘/)
  }
})

test('member-first binding: approve pays but issues no credential until membership, then auto-revoke on cancel', async ({ page }) => {
  const runTag = `mb${Date.now().toString(36)}`
  const fullName = `绑定闭环 ${runTag}`

  const created = await createRegistrationWithClaimViaApi(
    { request: page.context().request },
    fullName,
    '绑定测试大学',
    `E2E-MB-${runTag}`,
  )

  await consoleUiLogin(page)

  await page.goto(`${consoleBase}/participants`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.fill('.filter-input', runTag)
    await page.waitForTimeout(900)
    if ((await page.locator('.tbl tbody tr').count()) === 1) break
  }
  await expect(page.locator('.tbl tbody tr')).toHaveCount(1)
  const row = page.locator('.tbl tbody tr')

  // 1) 非会员：收款确认 → 已缴费但凭证不下发
  await row.locator('.op.primary:has-text("收款确认")').click()
  await expect(page.locator('.msg')).toContainText('尚未入会', { timeout: 15_000 })
  await expect(row).toContainText('已缴费')
  await expect(row).toContainText('未下发')

  // 2) 设为会员后：下发凭证可用（仅会员可下发）
  await page.context().request.post(`${consoleBase}/api/participants/${created.registrationId}/membership`, {
    data: { isMember: true },
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.fill('.filter-input', runTag)
    await page.waitForTimeout(900)
    if ((await page.locator('.tbl tbody tr').count()) === 1) break
  }
  const row2 = page.locator('.tbl tbody tr')
  await row2.locator('button:has-text("下发凭证")').click()
  await expect(page.locator('.msg')).toContainText('凭证已下发', { timeout: 15_000 })
  await expect(row2).toContainText('有效')

  // 3) 取消会员 → 自动吊销凭证
  await row2.locator('button:has-text("取消会员")').click()
  await expect(page.locator('.msg')).toContainText('自动吊销', { timeout: 15_000 })
  await expect(row2).toContainText('已撤销')
  await expect(row2).toContainText('非会员')

  // 4) 后端确认
  await consoleLoginViaApi(page.context())
  const dash = await page.context().request.get(`${consoleBase}/api/dashboard`)
  expect(dash.status()).toBe(200)
})

test('staff account cannot pass the console login (scanner-only role)', async ({ page }) => {
  await page.goto(`${consoleBase}/login`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.fill('input[name="username"]', 'staff')
    await page.fill('input[name="password"]', 'pps26-staff')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1000)
    if (await page.locator('.login-err').count() > 0) break
  }
  await expect(page.locator('.login-err')).toContainText('仅限管理员')
  expect(page.url()).toContain('/login')
})
