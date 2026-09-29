import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** 端口可经环境变量覆盖（默认 3000 / 3001，与两应用 devServer 一致）。 */
export const PORT = Number(process.env.PORTAL_PORT ?? 3000)
export const ADMIN_PORT = Number(process.env.CONSOLE_PORT ?? 3001)
export const base = `http://localhost:${PORT}`
export const consoleBase = `http://localhost:${ADMIN_PORT}`

export function uniqueEmail(tag: string) {
  return `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`
}

/** 管理台 API 登录（注入 pps_console cookie；staff 账号会被拒绝，只有 admin 可用）。 */
export async function consoleLoginViaApi(ctx: { addCookies: (c: unknown[]) => Promise<void> }) {
  const res = await fetch(`${consoleBase}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'pps26-admin' }),
  })
  if (!res.ok) throw new Error(`console login failed: ${res.status} ${await res.text()}`)
  const session = res.headers.get('set-cookie')?.match(/pps_console=([^;]+)/)?.[1]
  if (!session) throw new Error('console login did not set pps_console cookie')
  await ctx.addCookies([
    { name: 'pps_console', value: session, domain: 'localhost', path: '/' },
  ])
}

/** 管理台 UI 登录（真实表单 + 水合重试）。 */
export async function consoleUiLogin(page: import('@playwright/test').Page) {
  await page.goto(`${consoleBase}/login`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  for (let attempt = 0; attempt < 6 && page.url().includes('/login'); attempt++) {
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'pps26-admin')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1200)
  }
  await page.waitForURL(new RegExp(`localhost:${ADMIN_PORT}/?(\\?.*)?$`), { timeout: 20_000 })
}

export interface CreatedRegistration {
  email: string
  password: string
  fullName: string
  registrationId: string
  orderId: string
}

/**
 * 通过门户 API 造一个完整报名：注册账号 → 登录 → 报名（academic）→ 提交转账审核。
 * 凭证下发遵循会员门槛：调用方需在管理台先设为会员再审批。
 */
export async function createRegistrationWithClaimViaApi(
  ctx: { request: import('@playwright/test').APIRequestContext },
  fullName: string,
  affiliation: string,
  reference: string,
): Promise<CreatedRegistration> {
  const email = uniqueEmail('reg')
  const password = `reg-${Date.now()}-pass!`

  const codeRes = await ctx.request.post(`${base}/api/auth/send-code`, {
    data: { email, purpose: 'signup' },
  }).then(r => r.json())
  if (!codeRes.devCode) throw new Error(`send-code returned no devCode: ${JSON.stringify(codeRes)}`)

  const reg = await ctx.request.post(`${base}/api/auth/register`, {
    data: { email, code: codeRes.devCode, password, fullName },
  })
  if (reg.status() !== 201) throw new Error(`register failed: ${reg.status()}`)

  await ctx.request.post(`${base}/api/auth/login`, { data: { email, password } })

  const types = await ctx.request.get(`${base}/api/registration-types`).then(r => r.json())
  const academicId = types.find((t: { code: string }) => t.code === 'academic').id

  const created = await ctx.request.post(`${base}/api/registrations`, {
    data: { participant: { typeId: academicId, fullName, email, phone: '13800000000', affiliation, country: '中国' } },
  })
  if (created.status() !== 201) throw new Error(`registration failed: ${created.status()} ${await created.text()}`)
  const { registration, order } = await created.json() as { registration: { id: string }, order: { id: string } }

  const claim = await ctx.request.post(`${base}/api/orders/${order.id}/claim`, {
    data: { reference },
  })
  if (claim.status() !== 200) throw new Error(`claim failed: ${claim.status()}`)

  return { email, password, fullName, registrationId: registration.id, orderId: order.id }
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
