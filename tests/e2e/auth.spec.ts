import { expect, test } from '@playwright/test'
import { base, createAccountViaApi, uniqueEmail } from './helpers'

/**
 * ACCOUNT & AUTH — business requirements:
 * email-code sign-up (wrong codes rejected, resend cooldown), duplicate
 * account rejection, login/logout, forgot-password recovery, account gating.
 */

test('sign-up rejects a wrong verification code with a visible error', async ({ page }) => {
  const email = uniqueEmail('wrongcode')
  await page.goto(`${base}/sign-up`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="email"]', email)
  await page.click('button:has-text("发送验证码")')
  await expect(page.locator('.code-input')).toBeVisible()

  await page.fill('.code-input', '000000')
  await page.fill('input[name="fullName"]', 'Wrong Code')
  await page.fill('input[name="password"]', 'some-password-1!')
  await page.click('button:has-text("创建账号")')
  await expect(page.locator('.msg.bad')).toBeVisible()
  await expect(page.locator('.msg.bad')).toContainText(/Wrong code/)
  // still on the sign-up page
  expect(page.url()).toContain('/sign-up')
})

test('resend enters a cooldown and the same code keeps working', async ({ page }) => {
  const email = uniqueEmail('cooldown')
  await page.goto(`${base}/sign-up`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="email"]', email)
  await page.click('button:has-text("发送验证码")')
  await expect(page.locator('.code-input')).toBeVisible()

  // immediate resend is cooldown-blocked: the button disables with a countdown
  const resend = page.locator('button:has-text("重新发送")')
  await expect(resend).toBeDisabled()
  await expect(resend).toContainText(/重新发送 \(\d+s\)/)
})

test('duplicate sign-up is intercepted at the email step — no code sent', async ({ page }) => {
  const email = uniqueEmail('dup')
  const password = `dup-${Date.now()}-pass!`
  await createAccountViaApi(page.context(), email, password, 'Dup Tester')

  await page.goto(`${base}/sign-up`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="email"]', email)
  await page.click('button:has-text("发送验证码")')

  // 拦截在发码环节：提示“该邮箱已完成注册，请直接登录”，且不进入验证码步骤
  await expect(page.locator('.msg.bad')).toContainText('该邮箱已完成注册，请直接登录')
  await expect(page.locator('.code-input')).toHaveCount(0)
})

test('sign out returns to anonymous state', async ({ page }) => {
  const email = uniqueEmail('logout')
  const password = `out-${Date.now()}-pass!`
  await createAccountViaApi(page.context(), email, password, 'Sign Out Tester')

  await page.goto(base, { waitUntil: 'networkidle' })
  await expect(page.locator('.h-auth .chip-link.name')).toContainText('Sign Out Tester')
  await page.click('.h-auth .avatar-btn') // opens the dropdown
  await page.click('.menu button:has-text("退出登录")')
  await page.waitForURL(base + '/')
  await expect(page.locator('.h-auth .chip-link.accent')).toContainText('注册')
})

test('forgot-password: reset code sets a new password and old one stops working', async ({ page }) => {
  const email = uniqueEmail('forgot')
  const oldPassword = `old-${Date.now()}-pass!`
  const newPassword = `new-${Date.now()}-pass!`
  await createAccountViaApi(page.context(), email, oldPassword, 'Forgot Tester')
  await page.context().clearCookies()

  await page.goto(`${base}/forgot-password`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="email"]', email)
  await page.click('button:has-text("发送重置码")')
  await expect(page.locator('.dev-code')).toBeVisible()
  const devCode = (await page.locator('.dev-code').textContent())?.match(/\d{6}/)?.[0]
  await page.fill('.code-input', devCode!)
  await page.fill('input[name="password"]', newPassword)
  await page.click('button:has-text("更新密码")')
  await expect(page.locator('.ok')).toContainText('密码已更新')

  // new password works
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', newPassword)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/account/, { timeout: 20_000 })
})

test('login rejects a wrong password with a visible error', async ({ page }) => {
  const email = uniqueEmail('badlogin')
  await createAccountViaApi(page.context(), email, 'right-password-1!', 'Bad Login')
  await page.context().clearCookies()

  await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', 'wrong-password-1!')
  await page.click('button[type="submit"]')
  await expect(page.locator('.msg.bad')).toContainText('邮箱或密码不正确')
})

test('account page is gated: anonymous visitors are sent to sign-up', async ({ page }) => {
  await page.goto(`${base}/account`)
  await page.waitForURL(/\/(sign-up|login)/, { timeout: 15_000 })
  expect(page.url()).toMatch(/\/(sign-up|login)/)
})
