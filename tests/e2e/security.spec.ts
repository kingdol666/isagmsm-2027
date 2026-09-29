import { expect, request as apiRequest, test } from '@playwright/test'
import { base, consoleBase, createRegistrationWithClaimViaApi } from './helpers'

/**
 * 安全加固回归（真实 HTTP 层）：
 *  - 安全响应头
 *  - 蜜罐反垃圾
 *  - 一账号一有效报名（防刷单）
 *  - SQL 注入载荷不生效（参数化 + 系统保持可用）
 *  - 越权（IDOR）与路径穿越被拒
 *  - 管理台匿名访问 401
 */

const SQLI_SAMPLES = [
  "'; DROP TABLE users; --",
  "' OR '1'='1",
  '1; UPDATE registrations SET status=$$confirmed$$',
  "admin'--",
  "%%'; DELETE FROM orders; --",
]

test('security headers are present on the portal', async ({ request }) => {
  const res = await request.get(base)
  expect(res.headers()['x-content-type-options']).toBe('nosniff')
  expect(res.headers()['x-frame-options']).toBe('DENY')
  expect(res.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(res.headers()['permissions-policy']).toContain('camera=(self)')
})

test('console security headers include no-store and camera denial', async ({ request }) => {
  const res = await request.get(`${consoleBase}/login`)
  expect(res.headers()['x-content-type-options']).toBe('nosniff')
  expect(res.headers()['x-frame-options']).toBe('DENY')
  expect(res.headers()['cache-control']).toBe('no-store')
  expect(res.headers()['permissions-policy']).toContain('camera=()')
})

test('honeypot-filled registrations are rejected and nothing is created', async ({ request }) => {
  const email = `honey-${Date.now()}@example.test`
  const res = await request.post(`${base}/api/auth/register`, {
    data: {
      email,
      code: '000000',
      password: `Honey-${Date.now()}-Pass!`,
      fullName: '蜜罐机器人',
      website: 'http://spam.example',
    },
  })
  expect(res.status()).toBe(422)

  // 没有创建账号：用该邮箱再走正常注册流程应仍然可用（验证码路径）
  const code = await request.post(`${base}/api/auth/send-code`, { data: { email, purpose: 'signup' } }).then(r => r.json())
  expect(code.devCode).toMatch(/^\d{6}$/)
})

test('a second active registration for the same account is rejected', async ({ request }) => {
  const created = await createRegistrationWithClaimViaApi({ request }, '防刷单测试', 'AntiCheat 大学', `E2E-AC-${Date.now()}`)

  // 同一账号（同一 session cookie 已由 fixture 注入到 request context）再次报名 → 409
  const types = await request.get(`${base}/api/registration-types`).then(r => r.json())
  const academicId = types.find((t: { code: string }) => t.code === 'academic').id
  const dup = await request.post(`${base}/api/registrations`, {
    data: { participant: { typeId: academicId, fullName: created.fullName, email: created.email, phone: '13800000001', affiliation: 'AntiCheat 大学', country: '中国' } },
  })
  expect(dup.status()).toBe(409)
})

test('SQL injection payloads are inert (parameters) and the system stays healthy', async ({ request }) => {
  // 登录接口上的注入载荷 → 一律 401/422，不产生 500
  for (const payload of SQLI_SAMPLES) {
    const res = await request.post(`${base}/api/auth/login`, {
      data: { email: payload, password: payload },
    })
    expect([401, 422]).toContain(res.status())
  }

  // 注册接口上的注入载荷 → 校验拒绝，不产生 500
  for (const payload of SQLI_SAMPLES.slice(0, 2)) {
    const res = await request.post(`${base}/api/auth/register`, {
      data: { email: `${payload}@example.test`.replace(/[\s;]/g, ''), code: '000000', password: `P-${Date.now()}-x!`, fullName: payload },
    })
    // 验证码错误(400)或邮箱格式拒绝(422)——都不应是 5xx
    expect(res.status()).toBeLessThan(500)
  }

  // 系统仍然健康：注册/查询链路可用
  const health = await request.get(`${base}/api/health`)
  expect(health.status()).toBe(200)
  const types = await request.get(`${base}/api/registration-types`)
  expect(types.status()).toBe(200)
})

test('abstract injection payloads are stored inertly (no execution surface)', async ({ request }) => {
  await createRegistrationWithClaimViaApi({ request }, '注入测试员', 'Injection 大学', `E2E-SQLI-${Date.now()}`)
  const created2 = await request.post(`${base}/api/abstracts`, {
    data: {
      title: "'); DROP TABLE abstracts; --",
      topic: 'A',
      reportType: 'oral',
      abstractText: "摘要含注入样例 ' OR '1'='1 与 $$ 标记，验证参数化存储不产生任何执行面。",
      submitterName: '注入测试员',
      submitterAffiliation: 'Injection 大学',
      authors: [{ name: '注入测试员', affiliation: 'Injection 大学' }],
    },
  })
  expect(created2.status()).toBe(201)

  // abstracts 表仍然可用（未被 DROP），内容按字面量存储
  const mine = await request.get(`${base}/api/abstracts/mine`).then(r => r.json())
  expect(mine.abstracts.some((a: { title: string }) => a.title.includes('DROP TABLE'))).toBe(true)
})

test('cross-user access is rejected (IDOR)', async ({ request }) => {
  const victim = await createRegistrationWithClaimViaApi({ request }, '受害者甲', 'IDOR 大学', `E2E-IDOR-${Date.now()}`)

  // 攻击者自己的请求上下文（登录了另一个账号）→ 用 victim 的 orderId claim → 404
  const attacker = await apiRequest.newContext()
  await createRegistrationWithClaimViaApi({ request: attacker }, '攻击者乙', 'IDOR 大学', `E2E-IDORA-${Date.now()}`)
  const hijack = await attacker.post(`${base}/api/orders/${victim.orderId}/claim`, {
    data: { reference: 'IDOR-TRY' },
  })
  expect(hijack.status()).toBe(404)
  await attacker.dispose()

  // 匿名上下文 → 401
  const anon = await apiRequest.newContext()
  const anonClaim = await anon.post(`${base}/api/orders/${victim.orderId}/claim`, {
    data: { reference: 'IDOR-TRY' },
  })
  expect(anonClaim.status()).toBe(401)
  await anon.dispose()
})

test('console rejects anonymous access and backup path traversal', async ({ request }) => {
  const anonDash = await request.get(`${consoleBase}/api/dashboard`)
  expect(anonDash.status()).toBe(401)

  const anonBackups = await request.get(`${consoleBase}/api/backups`)
  expect(anonBackups.status()).toBe(401)

  // 路径穿越（管理员会话才触达文件层）：非法文件名被 400 拒绝
  const auth = await request.post(`${consoleBase}/api/login`, {
    data: { username: 'admin', password: 'pps26-admin' },
  })
  expect(auth.status()).toBe(200)

  const traversal = await request.get(`${consoleBase}/api/backups/..%2F..%2F.env`)
  expect([400, 404]).toContain(traversal.status())

  const traversal2 = await request.get(`${consoleBase}/api/backups/....dump`)
  expect([400, 404]).toContain(traversal2.status())
})

test('robots.txt sets crawl-delay and blocks sensitive paths', async ({ request }) => {
  const robots = await request.get(`${base}/robots.txt`).then(r => r.text())
  expect(robots).toContain('Crawl-delay: 10')
  for (const path of ['/api/', '/admin', '/scan', '/account', '/verify', '/credential', '/submit', '/payment']) {
    expect(robots).toContain(`Disallow: ${path}`)
  }
})
