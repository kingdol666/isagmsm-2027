import { chromium } from '@playwright/test'

// 确定性截图脚本：全部走 API，浏览器只负责渲染
const base = 'http://localhost:3000'
const stamp = Date.now()
const email = `ecard-${stamp}@example.test`
const password = `ecard-${stamp}-pass!`

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })

// 1. API 注册（devCode 走测试通道）
const codeRes = await ctx.request.post(`${base}/api/auth/send-code`, {
  data: { email, purpose: 'signup' },
}).then(r => r.json())

// 2. 注册
await ctx.request.post(`${base}/api/auth/register`, {
  data: { email, code: codeRes.devCode, password, fullName: '陈凝胶' },
})

// 3. 登录（注入会话 cookie）
const login = await ctx.request.post(`${base}/api/auth/login`, {
  data: { email, password },
})
const raw = login.headers()['set-cookie'] ?? ''
const session = /pps_user=([^;]+)/.exec(raw)?.[1]
await ctx.addCookies([{ name: 'pps_user', value: session, domain: 'localhost', path: '/' }])

// 4. 报名（正式代表）+ 提交转账审核
const types = await ctx.request.get(`${base}/api/registration-types`).then(r => r.json())
const academic = types.find(t => t.code === 'academic').id
const created = await ctx.request.post(`${base}/api/registrations`, {
  data: { participant: { typeId: academic, fullName: '陈凝胶', email, phone: '13900001234', affiliation: '中国科学技术大学', country: '中国' } },
}).then(r => r.json())
await ctx.request.post(`${base}/api/orders/${created.order.id}/claim`, {
  data: { reference: 'ECARD-SHOT' },
})

// 5. admin 审批下发
await ctx.request.post(`${base}/api/admin/login`, {
  data: { username: 'admin', password: 'pps26-admin' },
})
await ctx.request.post(`${base}/api/admin/orders/${created.order.id}/review`, {
  data: { action: 'approve' },
})

// 6. 渲染 /account 电子会议卡 + 头像下拉
const page = await ctx.newPage()
await page.goto(`${base}/account`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.screenshot({ path: 'shots/ecard-account.png' })

await page.goto(base, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.getByRole('banner').locator('.avatar-btn').click()
await page.waitForTimeout(400)
await page.screenshot({ path: 'shots/ecard-avatar-menu.png', clip: { x: 700, y: 0, width: 740, height: 420 } })

console.log('ecard shots ok —', created.registration.displayId)
await b.close()
