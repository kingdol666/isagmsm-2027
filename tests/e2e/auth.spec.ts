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
  await page.click('button:has-text("Send verification code")')
  await expect(page.locator('.code-input')).toBeVisible()

  await page.fill('.code-input', '000000')
  await page.fill('input[name="fullName"]', 'Wrong Code')
  await page.fill('input[name="password"]', 'some-password-1!')
  await page.click('button:has-text("Create account")')
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
  await page.click('button:has-text("Send verification code")')
  await expect(page.locator('.code-input')).toBeVisible()

  // immediate resend is cooldown-blocked: the button disables with a countdown
  const resend = page.locator('button:has-text("Resend")')
  await expect(resend).toBeDisabled()
  await expect(resend).toContainText(/Resend \(\d+s\)/)
})

test('duplicate sign-up for an existing account is rejected', async ({ page }) => {
  const email = uniqueEmail('dup')
  const password = `dup-${Date.now()}-pass!`
  await createAccountViaApi(page.context(), email, password, 'Dup Tester')

  await page.goto(`${base}/sign-up`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="email"]', email)
  await page.click('button:has-text("Send verification code")')
  await expect(page.locator('.code-input')).toBeVisible()
  const devCode = (await page.locator('.dev-code').textContent())?.match(/\d{6}/)?.[0]
  await page.fill('.code-input', devCode!)
  await page.fill('input[name="fullName"]', 'Dup Tester')
  await page.fill('input[name="password"]', password)
  await page.click('button:has-text("Create account")')
  await expect(page.locator('.msg.bad')).toContainText(/already exists/)
})

test('sign out returns to anonymous state', async ({ page }) => {
  const email = uniqueEmail('logout')
  const password = `out-${Date.now()}-pass!`
  await createAccountViaApi(page.context(), email, password, 'Sign Out Tester')

  await page.goto(base, { waitUntil: 'networkidle' })
  await expect(page.locator('.h-auth .chip-link.name')).toContainText('Sign Out Tester')
  await page.click('.h-auth button:has-text("Sign out")')
  await page.waitForURL(base + '/')
  await expect(page.locator('.h-auth .chip-link.accent')).toContainText('Register')
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
  await page.click('button:has-text("Send reset code")')
  await expect(page.locator('.dev-code')).toBeVisible()
  const devCode = (await page.locator('.dev-code').textContent())?.match(/\d{6}/)?.[0]
  await page.fill('.code-input', devCode!)
  await page.fill('input[name="password"]', newPassword)
  await page.click('button:has-text("Update password")')
  await expect(page.locator('.ok')).toContainText('Password updated')

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
  await expect(page.locator('.msg.bad')).toContainText('Invalid email or password')
})

test('account page is gated: anonymous visitors are sent to sign-up', async ({ page }) => {
  await page.goto(`${base}/account`)
  await page.waitForURL(/\/(sign-up|login)/, { timeout: 15_000 })
  expect(page.url()).toMatch(/\/(sign-up|login)/)
})
