// 登录态视觉截图：投稿表单 / 我的投稿（含历史）/ 后台审稿台
import { chromium } from '@playwright/test'

const base = process.env.SHOT_BASE ?? 'http://localhost:3000'
const outDir = process.env.SHOT_DIR ?? '.tmp/shots'
const runTag = Date.now()

async function apiRegister(ctx, name) {
  const email = `shot-${name}-${runTag}@example.test`
  const codeRes = await fetch(`${base}/api/auth/send-code`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, purpose: 'signup' }),
  }).then(r => r.json())
  if (!codeRes.devCode) throw new Error(`no devCode: ${JSON.stringify(codeRes)}`)
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, code: codeRes.devCode, password: `shot-${runTag}-pass!`, fullName: '陈投稿' }),
  })
  if (!res.ok) throw new Error(`register failed ${res.status}`)
  const session = res.headers.get('set-cookie')?.match(/pps_user=([^;]+)/)?.[1]
  if (!session) throw new Error('no pps_user cookie')
  await ctx.addCookies([{ name: 'pps_user', value: session, domain: 'localhost', path: '/' }])
  return session
}

async function apiSubmitAbstract(userSession, title) {
  const res = await fetch(`${base}/api/abstracts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `pps_user=${userSession}` },
    body: JSON.stringify({
      title,
      topic: 'A',
      reportType: 'oral',
      abstractText: '本研究提出双网络离子凝胶的界面增强策略，通过滑移环网络设计显著提升界面断裂能，并验证其在柔性离子器件中的长期稳定性，为高性能离子皮肤设计提供新路径。（示例内容）',
      submitterName: '陈投稿',
      submitterAffiliation: '凝胶大学材料学院',
      authors: [
        { name: '陈投稿', affiliation: '凝胶大学材料学院' },
        { name: '李合作', affiliation: '软物质研究所' },
        { name: 'W. Müller', affiliation: 'RWTH Aachen University' },
      ],
    }),
  })
  if (!res.ok) throw new Error(`submit failed ${res.status}: ${await res.text()}`)
}

async function adminCookies(ctx) {
  const res = await fetch(`${base}/api/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'pps26-admin' }),
  })
  if (!res.ok) throw new Error(`admin login failed ${res.status}`)
  for (const raw of res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie')]) {
    const m = raw?.match(/(pps_admin)=([^;]+)/)
    if (m) await ctx.addCookies([{ name: m[1], value: m[2], domain: 'localhost', path: '/' }])
  }
}

const browser = await chromium.launch()
const targets = [
  { name: 'submit-1440', path: '/submit', width: 1440, height: 900, fullPage: true, who: 'user' },
  { name: 'submit-390', path: '/submit', width: 390, height: 844, fullPage: true, who: 'user' },
  { name: 'account-abstracts-1440', path: '/account?t=shot#abstracts', width: 1440, height: 900, fullPage: true, who: 'user' },
  { name: 'admin-abstracts-1440', path: '/admin/abstracts', width: 1440, height: 900, fullPage: true, who: 'admin' },
]

for (const t of targets) {
  const ctx = await browser.newContext({ viewport: { width: t.width, height: t.height } })
  if (t.who === 'user') {
    const session = await apiRegister(ctx, t.name)
    await apiSubmitAbstract(session, `界面增强离子凝胶研究-${t.name}-${runTag}`)
  }
  else {
    await adminCookies(ctx)
  }
  const page = await ctx.newPage()
  await page.goto(`${base}${t.path}`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${outDir}/${t.name}.png`, fullPage: t.fullPage })
  console.log(`shot ${t.name}`)
  await ctx.close()
}
await browser.close()
