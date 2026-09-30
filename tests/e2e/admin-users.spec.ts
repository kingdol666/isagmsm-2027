import { execFileSync } from 'node:child_process'
import { randomBytes, scryptSync } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { base, consoleBase, consoleLoginViaApi } from './helpers'

/**
 * 管理台用户管理：
 *  1. 数据库直插一个已验证用户（未报名 —— 验证"未报名也可见"）
 *  2. 管理台强制修改密码：旧密码失效、新密码可登录
 *  3. 管理台代编辑个人资料：门户侧读到更新后的资料
 *  4. UI 烟雾：用户管理页搜索可见目标用户
 *
 * 注：用户创建走 DB 直插（生产 SMTP 激活后 devCode 不可用）；
 *     密码散列与门户 auth.service 同格式（scrypt:salt:hash, keylen 64）。
 *     psql 以参数数组直传（无 shell 拼接）。
 */

const EMAIL = `usr-mgmt-${Date.now()}@example.test`
const NAME = '用户管理测试员'
const OLD_PASS = `Old-${Date.now()}-Pass!`
const NEW_PASS = `New-${Date.now()}-Pass!`

function scryptHash(password: string, salt: string) {
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

function insertUser() {
  const salt = randomBytes(16).toString('hex')
  const passwordHash = scryptHash(OLD_PASS, salt)
  const sql = `INSERT INTO users (email, full_name, password_hash, email_verified_at) VALUES ('${EMAIL}', '${NAME}', '${passwordHash}', now())`
  execFileSync('docker', ['exec', 'pps-postgres', 'psql', '-U', 'pps', '-d', 'pps2026', '-c', sql], { stdio: 'pipe' })
}

test('admin views registered users, resets password, edits profile', async ({ page }) => {
  const ctx = page.context()

  /* 1. DB 直插已验证用户（未报名）+ 旧密码可登录 */
  insertUser()
  expect((await ctx.request.post(`${base}/api/auth/login`, {
    data: { email: EMAIL, password: OLD_PASS },
  })).status()).toBe(200)

  /* 2. 管理台：用户列表可见（未报名也可见） */
  await consoleLoginViaApi(ctx)
  const list = await ctx.request.get(`${consoleBase}/api/users?q=${encodeURIComponent(EMAIL)}`)
  expect(list.status()).toBe(200)
  const listJson = await list.json()
  const row = listJson.rows.find((r: { email: string }) => r.email === EMAIL)
  expect(row).toBeTruthy()
  expect(row.fullName).toBe(NAME)
  expect(row.registrationCount).toBe(0)
  expect(row.hasPassword).toBe(true)
  expect(row.emailVerified).toBe(true)

  /* 3. 强制修改密码：旧密码失效、新密码可登录 */
  expect((await ctx.request.post(`${consoleBase}/api/users/${row.id}/password`, {
    data: { password: NEW_PASS },
  })).status()).toBe(200)

  expect((await ctx.request.post(`${base}/api/auth/login`, {
    data: { email: EMAIL, password: OLD_PASS },
  })).status()).toBe(401)
  expect((await ctx.request.post(`${base}/api/auth/login`, {
    data: { email: EMAIL, password: NEW_PASS },
  })).status()).toBe(200)

  /* 4. 代编辑个人资料 → 门户侧读到更新值 */
  expect((await ctx.request.post(`${consoleBase}/api/users/${row.id}/profile`, {
    data: { profile: {
      fullName: `${NAME}（已改）`,
      englishName: '',
      phone: '13900002222',
      affiliation: '用户管理大学',
      department: '',
      position: '',
      country: '中国',
      dietary: '',
    } },
  })).status()).toBe(200)

  const userLogin2 = await ctx.request.post(`${base}/api/auth/login`, {
    data: { email: EMAIL, password: NEW_PASS },
  })
  const userCookie = (userLogin2.headers()['set-cookie'] ?? '').split(';')[0]
  const me = await ctx.request.get(`${base}/api/account/profile`, { headers: { cookie: userCookie } })
  const meJson = await me.json()
  expect(meJson.profile.affiliation).toBe('用户管理大学')
  expect(meJson.profile.phone).toBe('13900002222')
  expect(meJson.fullName).toBe(`${NAME}（已改）`)

  /* 5. UI 烟雾：用户管理页搜索可见目标用户（先等水合，避免对未绑定输入框操作） */
  await page.goto(`${consoleBase}/users`)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as { __vue_app__?: unknown })?.__vue_app__))
  await page.fill('.filter-input', EMAIL)
  await expect(page.locator('.user-table tbody tr')).toHaveCount(1, { timeout: 15_000 })
  await page.click('.user-table button:has-text("详情")')
  await expect(page.locator('.detail .d-sub', { hasText: '个人资料' })).toBeVisible()
})
