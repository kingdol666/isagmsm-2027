/**
 * ISAGMSM 2027 全页面内容/主题审计 —— 对运行中的实例（默认 3000/3001）真实浏览器走查。
 * 用法：先启动实例（pnpm start 或 dev:all），然后
 *   NODE_OPTIONS=--max-old-space-size=1024 node scripts/audit-pages.mjs
 * 覆盖：公开页×2语言内容断言 + 旧会期残留检查 + 参会人全链路（demo 账号：
 * 报名→缴费→审核→管理台审批→凭证→核验→扫码）+ 管理台六页。
 * 产物：test-results/audit/*.png + 逐项 PASS/FAIL 日志；有 FAIL 时 exit 1。
 */
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:3000'
const CONSOLE = process.env.AUDIT_CONSOLE ?? 'http://localhost:3001'
const OUT = 'test-results/audit/'
mkdirSync(OUT, { recursive: true })

const results = []
function ok(name) { results.push(['PASS', name]); console.log(`  ✓ ${name}`) }
function bad(name, err) { results.push(['FAIL', name]); console.log(`  ✗ ${name} —— ${err}`) }
async function check(name, fn) {
  try { await fn(); ok(name) }
  catch (e) { bad(name, e?.message?.split('\n')[0] ?? e) }
}
const shot = async (page, name) => page.screenshot({ path: `${OUT}${name}.png`, fullPage: true })

/** 页面文本中不得再出现的旧会期残留 */
const STALE = ['4月24', '4月25日', '4月26日', '2027-04-24']

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.setDefaultTimeout(20_000)

/* ============ A. 公开页（中文默认） ============ */
console.log('\n[A] 公开页 · 中文')
const publicPages = [
  ['/', '首页'],
  ['/organization', '组织机构'],
  ['/abstracts', '征文投稿'],
  ['/registration', '参会注册'],
  ['/transportation', '会场交通'],
  ['/hotels', '酒店预定'],
  ['/sponsorship', '参展赞助'],
]
for (const [path, h1] of publicPages) {
  await check(`公开页 ${path}（h1=${h1}）`, async () => {
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    if (path === '/') {
      /* 首页是 hero 落地页，主标题为 .hero-title 而非 h1.sec-title */
      const hero = await page.locator('.hero-title').textContent()
      if (!hero.trim()) throw new Error('hero 标题为空')
    }
    else {
      const title = await page.locator('h1.sec-title').first().textContent()
      if (!title.includes(h1)) throw new Error(`h1="${title}" 期望 "${h1}"`)
    }
    const body = await page.content()
    for (const s of STALE) if (body.includes(s)) throw new Error(`旧日期残留 "${s}"`)
  })
}

await check('首页：横幅=3月9日 + 沿革(RIKEN/四届) + 六大新方向 + 页脚新会期 + JSON-LD', async () => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  const first = await page.locator('.ds-item').first().textContent()
  if (!first.includes('会前缴费优惠期至2027年3月9日')) throw new Error(`横幅="${first}"`)
  const body = await page.content()
  for (const s of ['RIKEN', '前四届先后于北京', '水凝胶与有机凝胶', '离子凝胶与柔性电子', '软物质物理与数智设计', '2027年4月9—11日'])
    if (!body.includes(s)) throw new Error(`缺 "${s}"`)
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent()
  if (!ld.includes('2027-04-09') || !ld.includes('2027-04-11')) throw new Error('JSON-LD 日期未更新')
})
await shot(page, 'home-zh-1440')

await check('首页 390px 无横向溢出 + 移动端截图', async () => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  if (overflow > 1) throw new Error(`溢出 ${overflow}px`)
  await shot(page, 'home-zh-390')
  await page.setViewportSize({ width: 1440, height: 900 })
})

await check('征文页：摘要截止 3月9日 + 墙报 90×120', async () => {
  await page.goto(BASE + '/abstracts', { waitUntil: 'networkidle' })
  const body = await page.content()
  if (!body.includes('2027年3月9日')) throw new Error('缺摘要截止 3月9日')
  if (!body.includes('90cm')) throw new Error('缺墙报尺寸')
  await shot(page, 'abstracts-zh-1440')
})

await check('注册信息页：会前缴费 2027/3/9 前 + 转账截止 3月31日', async () => {
  await page.goto(BASE + '/registration', { waitUntil: 'networkidle' })
  const body = await page.content()
  if (!body.includes('2027/3/9')) throw new Error('缺会前缴费 2027/3/9')
  if (!body.includes('2027年3月31日')) throw new Error('缺转账截止 3月31日')
  await shot(page, 'registration-zh-1440')
})

await check('交通页含会场 + 地图组件挂载（canvas 或回退卡）', async () => {
  await page.goto(BASE + '/transportation', { waitUntil: 'networkidle' })
  if (!(await page.content()).includes('合肥滨湖国际会展中心')) throw new Error('缺会场名')
  await page.waitForTimeout(4000)
  const mapOk = await page.evaluate(() => Boolean(document.querySelector('canvas')) || Boolean(document.querySelector('[data-testid="map-fallback"]')))
  if (!mapOk) throw new Error('地图 canvas 与回退卡均未挂载')
})

await check('组织机构页含第四届真实名单（RIKEN/龚剑萍/组织委员会）', async () => {
  await page.goto(BASE + '/organization', { waitUntil: 'networkidle' })
  const body = await page.content()
  for (const s of ['RIKEN', '龚剑萍', '系列会议发起单位', '组织委员会', '陈咏梅']) {
    if (!body.includes(s)) throw new Error(`缺 "${s}"`)
  }
  await shot(page, 'organization-zh-1440')
})

await check('认证三页可达（登录/注册/找回）', async () => {
  for (const p of ['/login', '/sign-up', '/forgot-password']) {
    await page.goto(BASE + p, { waitUntil: 'networkidle' })
    const form = await page.locator('form').count()
    if (!form) throw new Error(`${p} 无表单`)
  }
})

await check('404 页样式化渲染', async () => {
  await page.goto(BASE + '/this-page-does-not-exist', { waitUntil: 'networkidle' })
  if (!(await page.locator('.err-code').textContent()).includes('404')) throw new Error('无 404 标识')
})

/* ============ B. 公开页（英文镜像） ============ */
console.log('\n[B] 公开页 · 英文')
const enCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await enCtx.addCookies([{ name: 'pps_locale', value: 'en', domain: 'localhost', path: '/' }])
const enPage = await enCtx.newPage()
await check('英文首页：lang=en + April 9–11 + 英文方向 + Hangzhou 沿革', async () => {
  await enPage.goto(BASE + '/', { waitUntil: 'networkidle' })
  await enPage.waitForLoadState('networkidle')
  if (await enPage.locator('html').getAttribute('lang') !== 'en') throw new Error('lang≠en')
  const body = await enPage.content()
  /* HTML 序列化中 & 转义为 &amp;，主题名只按前缀匹配 */
  for (const s of ['April 9–11, 2027', 'March 9, 2027', 'Ionogels', 'Hangzhou (2025)', 'RIKEN'])
    if (!body.includes(s)) throw new Error(`缺 "${s}"`)
  await enPage.screenshot({ path: `${OUT}home-en-1440.png`, fullPage: true })
})
await check('英文注册页标题 + 英文征文页', async () => {
  await enPage.goto(BASE + '/registration', { waitUntil: 'networkidle' })
  if (!(await enPage.locator('h1.sec-title').first().textContent()).match(/Registration/i)) throw new Error('英文标题缺失')
  await enPage.goto(BASE + '/abstracts', { waitUntil: 'networkidle' })
  if (!(await enPage.content()).includes('March 9, 2027')) throw new Error('英文截止日期缺失')
})
await enCtx.close()

/* ============ C. 参会人全链路（demo 账号，真实浏览器） ============ */
console.log('\n[C] 参会人链路 · demo 账号')
const DEMO = { email: 'demo.user@example.test', password: 'Demo-2027-Pass!' }
let orderId = null
let displayId = null
let orderStatus = 'unknown'
await check('API 登录 demo 账号', async () => {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(DEMO),
  })
  if (res.status !== 200) throw new Error(`login ${res.status}`)
  const raw = res.headers.get('set-cookie') ?? ''
  const session = raw.match(/pps_user=([^;]+)/)?.[1]
  if (!session) throw new Error('无 pps_user cookie')
  await ctx.addCookies([{ name: 'pps_user', value: session, domain: 'localhost', path: '/' }])
})

await check('API 报名（复用已有报名则取旧订单）', async () => {
  const cookie = (await ctx.cookies(BASE)).map(c => `${c.name}=${c.value}`).join('; ')
  const types = await fetch(`${BASE}/api/registration-types`).then(r => r.json())
  const academic = types.find(t => t.code === 'academic') ?? types.find(t => t.availability === 'available')
  const created = await fetch(`${BASE}/api/registrations`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ participant: { typeId: academic.id, fullName: '内容审计演示', email: DEMO.email, phone: '13800000001', affiliation: '审计大学', country: '中国' } }),
  })
  if (created.status === 201) {
    const j = await created.json()
    orderId = j.order.id
  }
  else if (created.status === 409) {
    /* 已有报名：从 /account 解析支付链接；若报名已审结（无支付链接）则从凭证侧继续 */
    await page.goto(`${BASE}/account`, { waitUntil: 'networkidle' })
    const payHref = await page.locator('a[href^="/payment/"]').first().getAttribute('href').catch(() => null)
    if (payHref) orderId = payHref.split('/payment/')[1]
  }
  else throw new Error(`registration ${created.status}: ${await created.text()}`)
  if (orderId) {
    const view = await fetch(`${BASE}/api/orders/${orderId}`, { headers: { cookie } }).then(r => r.json()).catch(() => null)
    orderStatus = view?.order?.status ?? 'unknown'
  }
  else {
    orderStatus = 'finalized' /* 无支付链接 = 已缴费/已发凭证 */
  }
})

await check('缴费页：待转账态（银行信息+参会ID+3月31日）或已审结态', async () => {
  if (orderStatus === 'finalized') {
    await page.goto(`${BASE}/account`, { waitUntil: 'networkidle' })
    if (!(await page.content()).includes('ISAGMSM-')) throw new Error('account 无参会 ID')
    console.log('    （订单已审结，缴费页跳过待转账断言）')
    return
  }
  await page.goto(`${BASE}/payment/${orderId}`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  if (!(await page.locator('.bank-box').count())) throw new Error('缺 .bank-box')
  const body = await page.content()
  if (!body.includes('ISAGMSM-')) throw new Error('缺参会 ID')
  displayId = (body.match(/ISAGMSM-\d{6}/) ?? [])[0] ?? displayId
  await page.screenshot({ path: `${OUT}payment-pending-1440.png`, fullPage: true })
})

await check('提交转账审核 → 审核中/已审结态', async () => {
  if (orderStatus !== 'pending') {
    console.log(`    （订单状态 ${orderStatus}，跳过 claim）`)
    return
  }
  const claim = await fetch(`${BASE}/api/orders/${orderId}/claim`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: (await ctx.cookies(BASE)).map(c => `${c.name}=${c.value}`).join('; ') },
    body: JSON.stringify({ reference: `AUDIT-${Date.now()}` }),
  })
  if (claim.status !== 200) throw new Error(`claim ${claim.status}`)
  orderStatus = 'reviewing'
  await page.goto(`${BASE}/payment/${orderId}`, { waitUntil: 'networkidle' })
  if (!(await page.locator('.panel-title.ok').textContent()).includes('审核中')) throw new Error('未进入审核中')
  await page.screenshot({ path: `${OUT}payment-reviewing-1440.png`, fullPage: true })
})

await check('/account 报名行 + /submit 投稿表单', async () => {
  await page.goto(`${BASE}/account`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  if (!(await page.content()).includes('ISAGMSM-')) throw new Error('account 无参会 ID')
  await page.screenshot({ path: `${OUT}account-1440.png`, fullPage: true })
  await page.goto(`${BASE}/submit`, { waitUntil: 'networkidle' })
  if (!(await page.locator('form').count())) throw new Error('submit 无表单')
  await page.screenshot({ path: `${OUT}submit-1440.png`, fullPage: true })
})

/* ============ D. 管理台 + 凭证闭环 ============ */
console.log('\n[D] 管理台 + 凭证闭环')
await check('管理台 UI 登录', async () => {
  await page.goto(`${CONSOLE}/login`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  for (let i = 0; i < 6 && page.url().includes('/login'); i++) {
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'pps26-admin')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1200)
  }
  if (page.url().includes('/login')) throw new Error('登录未跳转')
})

for (const [p, name] of [['/', '仪表盘'], ['/participants', '参会管理'], ['/users', '用户管理'], ['/approvals', '缴费审批'], ['/abstracts', '稿件审稿'], ['/backups', '数据库备份']]) {
  await check(`管理台 ${p}（${name}）`, async () => {
    await page.goto(CONSOLE + p, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
    await page.waitForLoadState('networkidle')
    const slug = p === '/' ? 'console-dashboard' : `console${p.replace(/\//g, '-')}`
    await page.screenshot({ path: `${OUT}${slug}-1440.png`, fullPage: true })
  })
}

await check('设为会员（已会员则跳过）→ 收款确认 → 有效', async () => {
  await page.goto(`${CONSOLE}/participants`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
  const setMember = page.locator('.op.primary:has-text("设为会员")').first()
  if (await setMember.count()) {
    if (displayId) {
      await page.fill('.filter-input', displayId)
      await page.waitForTimeout(900)
    }
    await page.locator('.op.primary:has-text("设为会员")').first().click()
    await page.waitForTimeout(1500)
  }
  const confirmBtn = page.locator('.op.primary:has-text("收款确认")').first()
  if (await confirmBtn.count()) {
    await confirmBtn.click()
    await page.waitForTimeout(2000)
  }
  await page.fill('.filter-input', displayId ?? DEMO.email.split('@')[0])
  await page.waitForTimeout(900)
  if (!(await page.locator('.tbl tbody tr').first().textContent()).match(/有效/)) throw new Error('凭证未生效')
  await page.screenshot({ path: `${OUT}console-participant-active-1440.png`, fullPage: true })
})

let token = null
await check('凭证页：VALID + 9—11 APRIL 2027 + QR', async () => {
  await page.goto(`${BASE}/account`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  const cred = page.locator('a[href^="/credential/"]').first()
  const href = await cred.getAttribute('href')
  token = href.split('/credential/')[1]
  await page.goto(`${BASE}/credential/${token}`, { waitUntil: 'networkidle' })
  if (!(await page.locator('.pass-status').textContent()).includes('VALID')) throw new Error('状态非 VALID')
  const note = await page.locator('.pass-note').textContent()
  if (!note.includes('9—11 APRIL 2027')) throw new Error(`凭证日期="${note}"`)
  if (!(await page.locator('.pass-qr img').count())) throw new Error('QR 缺失')
  await page.screenshot({ path: `${OUT}credential-1440.png`, fullPage: true })
})

await check('核验页：凭证有效', async () => {
  await page.goto(`${BASE}/verify/${token}`, { waitUntil: 'networkidle' })
  if (!(await page.locator('.verdict.good').textContent()).includes('凭证有效')) throw new Error('核验未通过')
  await page.screenshot({ path: `${OUT}verify-1440.png`, fullPage: true })
})

await check('扫码端：staff 登录 + 手动核验（390px）', async () => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/scan`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  if (await page.locator('input[name="username"]').count()) {
    await page.fill('input[name="username"]', 'staff')
    await page.fill('input[name="password"]', 'pps26-staff')
    await page.click('button:has-text("登录")')
  }
  await page.waitForSelector('#manual-token', { timeout: 30_000 })
  await page.fill('#manual-token', token)
  await page.click('.manual button[type="submit"]')
  await page.waitForTimeout(1500)
  if (!(await page.locator('.kicker.good').textContent()).includes('凭证有效')) throw new Error('扫码核验未通过')
  await shot(page, 'scan-390')
  await page.setViewportSize({ width: 1440, height: 900 })
})

/* ============ 汇总 ============ */
console.log('\n========== 审计汇总 ==========')
const fails = results.filter(([s]) => s === 'FAIL')
console.log(`共 ${results.length} 项：PASS ${results.length - fails.length} / FAIL ${fails.length}`)
for (const [, name] of fails) console.log(`  ✗ ${name}`)
await browser.close()
process.exit(fails.length ? 1 : 0)
