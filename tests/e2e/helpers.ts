import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export const base = 'http://localhost:3000'

export function uniqueEmail(tag: string) {
  return `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`
}

/**
 * Creates an account through the API (bypasses UI/hydration races) and
 * injects the participant session cookie into the browser context.
 */
export async function createAccountViaApi(ctx: { addCookies: (c: unknown[]) => Promise<void> }, email: string, password: string, fullName: string) {
  const codeRes = await fetch(`${base}/api/auth/send-code`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, purpose: 'signup' }),
  }).then(r => r.json())
  if (!codeRes.devCode) throw new Error(`send-code returned no devCode: ${JSON.stringify(codeRes)}`)

  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, code: codeRes.devCode, password, fullName }),
  })
  if (!res.ok) throw new Error(`register failed: ${res.status} ${await res.text()}`)
  const raw = res.headers.get('set-cookie') ?? ''
  const session = raw.match(/pps_user=([^;]+)/)?.[1]
  if (!session) throw new Error('register did not set pps_user cookie')
  await ctx.addCookies([
    { name: 'pps_user', value: session, domain: 'localhost', path: '/' },
  ])
  return { email, password, fullName }
}

/** UI sign-up through the real form (uses the on-screen dev code). */
export async function signUpViaUi(page: Page, email: string, password: string, fullName: string) {
  await page.goto(`${base}/sign-up`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="email"]', email)
  await page.click('button:has-text("Send verification code")')
  await expect(page.locator('.code-input')).toBeVisible({ timeout: 20_000 })
  const devCode = (await page.locator('.dev-code').textContent())?.match(/\d{6}/)?.[0]
  if (!devCode) throw new Error('dev code not shown')
  await page.fill('.code-input', devCode)
  await page.fill('input[name="fullName"]', fullName)
  await page.fill('input[name="password"]', password)
  await page.click('button:has-text("Create account")')
}
