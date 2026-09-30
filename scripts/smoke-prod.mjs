/**
 * 生产部署自检 —— 对正在运行的（pm2 生产）部署做端到端冒烟验收。
 *
 *   pnpm smoke:prod            # 检查 127.0.0.1:3000 / :3001
 *   SMOKE_HOST=192.168.17.1 pnpm smoke:prod   # 从外部视角检查局域网/公网地址
 *
 * 覆盖：健康检查、首页 SSR、登录页、404 错误页、安全响应头、管理台登录（真实凭据）、
 * 门户演示账号登录、对象存储 OSS 健康。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const IS_WIN = process.platform === 'win32'
const HOST = process.env.SMOKE_HOST || '127.0.0.1'
const PORTAL = `http://${HOST}:${process.env.PORTAL_PORT || 3000}`
const CONSOLE = `http://${HOST}:${process.env.CONSOLE_PORT || 3001}`

function loadEnvFile(rel) {
  const p = new URL(`../${rel}`, import.meta.url)
  if (!existsSync(p)) return {}
  const out = {}
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

const portalEnv = loadEnvFile('.env')
const ADMIN_USER = 'admin'
const ADMIN_PASS = portalEnv.ADMIN_PASSWORD || 'pps26-admin'
const DEMO_EMAIL = 'demo.user@example.test'
const DEMO_PASS = portalEnv.DEMO_PASSWORD || 'Demo-2027-Pass!'

function request(url, { method = 'GET', body, headers = {} } = {}) {
  // 必须绕过 shell：cmd 会把 -w '%{http_code}' 里的百分号当环境变量展开吞掉
  const nullFile = IS_WIN ? 'NUL' : '/dev/null'
  const args = ['-s', '-m', '10', '-o', nullFile, '-w', '%{http_code}|%{header_json}', url]
  if (method !== 'GET') args.push('-X', method)
  if (body) args.push('--data-binary', body, '-H', 'content-type: application/json')
  for (const [k, v] of Object.entries(headers)) args.push('-H', `${k}: ${v}`)
  const r = spawnSync('curl', args, { shell: false, encoding: 'utf8' })
  const [code = '000', headerJson = '{}'] = String(r.stdout).trim().split('|')
  let parsed = {}
  try { parsed = JSON.parse(headerJson) } catch { /* no headers */ }
  return { status: Number(code), headers: parsed }
}

let pass = 0
let fail = 0

function check(name, ok, detail = '') {
  if (ok) {
    pass++
    console.log(`  ✓ ${name}`)
  }
  else {
    fail++
    console.log(`  ✘ ${name}${detail ? ` —— ${detail}` : ''}`)
  }
}

console.log(`── ISAGMSM 2027 生产自检（${PORTAL} / ${CONSOLE}）─────────────`)

/* 门户 */
const health = request(`${PORTAL}/api/health`)
check('门户 /api/health = 200', health.status === 200)

const home = spawnSync('curl', ['-s', '-m', '10', PORTAL], { shell: IS_WIN, encoding: 'utf8' })
check('门户首页 SSR 含会议标识', home.stdout.includes('ISAGMSM'))
check('首页含中文内容（默认语言）', /先进凝胶材料|Advanced Gel/.test(home.stdout))

const loginPage = request(`${PORTAL}/login`)
check('登录页可达 = 200', loginPage.status === 200)

const notFound = request(`${PORTAL}/definitely-not-a-page-${Date.now()}`)
check('未知路由返回 404', notFound.status === 404)

const cspNoSniff = health.headers['x-content-type-options']?.[0]
check('安全响应头 x-content-type-options: nosniff', cspNoSniff === 'nosniff')

/* 样式资产自检：内联 <style> 或外部 CSS 二者有其一即算到达 */
const inlineBlocks = (home.stdout.match(/<style[^>]*>/g) || []).length
const inlineBytes = (home.stdout.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).reduce((n, b) => n + b.length, 0)
const cssPath = (home.stdout.match(/href="(\/_nuxt\/[^"]+\.css)"/) || [])[1]
if (inlineBytes > 10000) {
  check(`样式已内联随 HTML 到达（${inlineBlocks} 块 / ${Math.round(inlineBytes / 1024)}KB）`, true)
}
else if (cssPath) {
  const cssResp = request(`${PORTAL}${cssPath}`)
  check(`样式表加载 ${cssPath}`, cssResp.status === 200 && /^text\/css/.test(cssResp.headers['content-type']?.[0] ?? ''),
    `status=${cssResp.status} type=${cssResp.headers['content-type']?.[0] ?? '无'}`)
}
else {
  check('首页存在样式（内联或外部 CSS）', false, '既无内联 <style> 也无 /_nuxt/*.css 引用')
}

/* 演示账号真实登录（cookie 未加 Secure 才能被 curl 场景外的浏览器使用） */
const demoLogin = request(`${PORTAL}/api/auth/login`, {
  method: 'POST',
  body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASS }),
})
check(`门户演示账号登录 = 200`, demoLogin.status === 200)
const demoCookie = demoLogin.headers['set-cookie']?.[0] ?? ''
check('会话 cookie 无 Secure 标志（HTTP 部署可用）', !/; secure/i.test(demoCookie), demoCookie ? '未收到 cookie' : '')

const demoMe = request(`${PORTAL}/api/auth/me`, { headers: { cookie: demoCookie.split(';')[0] ?? '' } })
check('会话有效（/api/auth/me 识别登录态）', demoMe.status === 200)

/* 管理台 */
const consoleLoginPage = request(`${CONSOLE}/login`)
check('管理台登录页可达 = 200', consoleLoginPage.status === 200)

const consoleLogin = request(`${CONSOLE}/api/login`, {
  method: 'POST',
  body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
})
check('管理台管理员登录 = 200', consoleLogin.status === 200)
const consoleCookie = consoleLogin.headers['set-cookie']?.[0]?.split(';')[0] ?? ''

const dashboard = request(`${CONSOLE}/api/dashboard`, { headers: { cookie: consoleCookie } })
check('管理台数据面板 = 200（会话有效）', dashboard.status === 200)

/* 对象存储 */
const oss = request(`http://${HOST}:9100/health`)
check('对象存储 OSS 健康 = 200', oss.status === 200)

console.log('────────────────────────────────────────────')
console.log(`  结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail > 0 ? 1 : 0)
