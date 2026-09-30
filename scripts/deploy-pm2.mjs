 
/**
 * 一键生产部署（Aliyun / 任意 Linux 主机 / 本机）—— pm2 托管双应用 + Docker 双容器。
 *
 *   pnpm deploy:pm2 [--skip-build]
 *
 * 步骤：
 *   1. 校验 node/pnpm，按需全局安装 pm2
 *   2. 缺失时生成 .env / admin/.env（会话密钥随机生成；SMTP 留空 = 验证码走屏显 devCode）
 *   3. Docker 三态拉起 pps-postgres + pps-minio（运行中跳过 / 停止即启动 / 缺失则 compose up -d）
 *   4. 等 PostgreSQL / OSS 就绪 → 幂等迁移 → 空库自动 seed（管理员/扫码/演示账号）
 *   5. pnpm install → 生产构建（门户 + 管理台；--skip-build 跳过）
 *   6. pm2 startOrReload ecosystem.config.cjs（后台托管，开机自启见 `pnpm pm2:save` + pm2 startup）
 *   7. 健康检查 + 打印访问地址、局域网 IP 与默认账号
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { connect } from 'node:net'
import os from 'node:os'

const ROOT = process.cwd()
const IS_WIN = process.platform === 'win32'
const SKIP_BUILD = process.argv.includes('--skip-build')

const DB_CONTAINER = 'pps-postgres'
const OSS_CONTAINER = 'pps-minio'
const PORTAL_PORT = Number(process.env.PORTAL_PORT ?? 3000)
const CONSOLE_PORT = Number(process.env.CONSOLE_PORT ?? 3001)

function shOut(command, args, env) {
  const r = spawnSync(command, args, { cwd: ROOT, stdio: 'pipe', shell: IS_WIN, env: { ...process.env, ...env } })
  return { status: r.status, stdout: String(r.stdout ?? ''), stderr: String(r.stderr ?? '') }
}

/** 直接执行（不经 shell）——带空格/括号参数的命令必须用这个，Windows shell 拼接会损坏参数。 */
function shRaw(command, args) {
  const r = spawnSync(command, args, { cwd: ROOT, stdio: 'pipe', shell: false })
  return { status: r.status, stdout: String(r.stdout ?? ''), stderr: String(r.stderr ?? '') }
}

async function runStep(label, command, args, env) {
  process.stdout.write(`[deploy] ${label} … `)
  const r = await new Promise((resolve) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: 'ignore', shell: IS_WIN, env: { ...process.env, ...env } })
    child.on('exit', code => resolve(code ?? 1))
    child.on('error', () => resolve(1))
  })
  if (r !== 0) {
    console.log('失败')
    throw new Error(`${label} 失败（exit ${r}）`)
  }
  console.log('完成')
}

function secret() {
  return randomBytes(24).toString('hex')
}

function parseEnvFile(rel) {
  const p = `${ROOT}/${rel}`
  if (!existsSync(p)) return {}
  const out = {}
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    out[m[1]] = v
  }
  return out
}

/* ── 2. 首次部署生成 .env ─────────────────────────────────────── */

const PORTAL_ENV_TEMPLATE = secrets => `# ═══ ISAGMSM 2027 门户 —— 生产环境配置（deploy:pm2 自动生成）═══
# 公网部署必改：改成 http://<公网IP>:3000 或 https://你的域名（影响 QR/邮件链接）
NUXT_PUBLIC_SITE_URL=http://localhost:${PORTAL_PORT}

# 数据库（docker compose 的 pps-postgres，端口 5433）
DATABASE_URL=postgresql://pps:pps_dev_pw@localhost:5433/pps2026

# 会话密钥（部署时随机生成；泄露时更换并 pm2:restart）
NUXT_SESSION_SECRET=${secrets.session}
NUXT_MOCK_PAYMENT_SECRET=${secrets.mock}

# 种子账号口令（留空/注释 = 默认 admin/pps26-admin · staff/pps26-staff · demo/Demo-2027-Pass!）
# 首次部署前在此设置即可改变种子口令；部署后修改需重跑 pnpm db:seed（会清空业务数据）
# ADMIN_PASSWORD=
# STAFF_PASSWORD=
# DEMO_PASSWORD=

# 邮箱验证码 SMTP（留空 = 开发模式：验证码打印在服务器日志并屏显 devCode）
MAIL_SMTP_HOST=
MAIL_SMTP_PORT=465
MAIL_SMTP_SECURE=true
MAIL_SMTP_USER=
MAIL_SMTP_PASS=
MAIL_FROM=

# 对象存储 OSS（docker compose 的 pps-minio 容器，宿主端口 9100）
OSS_ENDPOINT=localhost
OSS_PORT=9100
OSS_USE_SSL=false
OSS_ACCESS_KEY=ppsoss
OSS_SECRET_KEY=pps-oss-dev-pw
OSS_BUCKET=pps-abstracts

# 限流整体倍率（只放大不缩小）
RATE_LIMIT_SCALE=1
`

const ADMIN_ENV_TEMPLATE = secrets => `# ═══ ISAGMSM 2027 管理台 —— 生产环境配置（deploy:pm2 自动生成）═══
# 与门户共用同一个 PostgreSQL
DATABASE_URL=postgresql://pps:pps_dev_pw@localhost:5433/pps2026

# 管理台会话密钥（与门户 NUXT_SESSION_SECRET 不同；已随机生成）
NUXT_CONSOLE_SESSION_SECRET=${secrets.console}

# 门户地址（凭证「查看 QR」跳转；公网部署与 NUXT_PUBLIC_SITE_URL 保持一致）
NUXT_PUBLIC_PORTAL_URL=http://localhost:${PORTAL_PORT}

# 数据库定时备份
BACKUP_INTERVAL_HOURS=24
BACKUP_KEEP=14
BACKUP_DOCKER_CONTAINER=pps-postgres

# 审稿结果邮件（留空 = 仅日志）
MAIL_SMTP_HOST=
MAIL_SMTP_PORT=465
MAIL_SMTP_SECURE=true
MAIL_SMTP_USER=
MAIL_SMTP_PASS=
MAIL_FROM=

# 对象存储 OSS（与门户保持一致）
OSS_ENDPOINT=localhost
OSS_PORT=9100
OSS_USE_SSL=false
OSS_ACCESS_KEY=ppsoss
OSS_SECRET_KEY=pps-oss-dev-pw
OSS_BUCKET=pps-abstracts
`

function ensureEnvFiles() {
  const secrets = { session: secret(), mock: secret(), console: secret() }
  if (!existsSync(`${ROOT}/.env`)) {
    writeFileSync(`${ROOT}/.env`, PORTAL_ENV_TEMPLATE(secrets))
    console.log('[deploy] 已生成 .env（会话密钥随机；SMTP 留空 = 屏显验证码）')
  }
  if (!existsSync(`${ROOT}/admin/.env`)) {
    writeFileSync(`${ROOT}/admin/.env`, ADMIN_ENV_TEMPLATE(secrets))
    console.log('[deploy] 已生成 admin/.env（管理台会话密钥随机）')
  }
}

/* ── 3/4. Docker 双容器 ──────────────────────────────────────── */

function dockerAvailable() {
  return shOut('docker', ['info', '--format', 'ok']).status === 0
}

function containerRunning(name) {
  const r = shOut('docker', ['ps', '--format', '{{.Names}}'])
  return r.status === 0 && r.stdout.split(/\r?\n/).includes(name)
}

function containerExists(name) {
  const r = shOut('docker', ['ps', '-a', '--format', '{{.Names}}'])
  return r.status === 0 && r.stdout.split(/\r?\n/).includes(name)
}

function dockerComposeUp(service, label) {
  const r = shOut('docker', ['compose', 'up', '-d', service])
  if (r.status !== 0) {
    console.error(`[deploy] ${label} 容器创建失败：\n${r.stderr}`)
    throw new Error(label)
  }
  console.log(`[deploy] ${label} 容器已创建并启动`)
}

function dockerStart(name, label) {
  const r = shOut('docker', ['start', name])
  if (r.status !== 0) {
    console.error(`[deploy] ${label} 容器启动失败：\n${r.stderr}`)
    throw new Error(label)
  }
  console.log(`[deploy] ${label} 容器已启动（已存在但停止）`)
}

async function waitUntil(check, label, tries = 40, gapMs = 2000) {
  for (let i = 0; i < tries; i++) {
    if (await check()) return
    await new Promise(resolve => setTimeout(resolve, gapMs))
  }
  throw new Error(`${label} 在 ${Math.round(tries * gapMs / 1000)}s 内未就绪`)
}

function pgReady() {
  return shRaw('docker', ['exec', DB_CONTAINER, 'pg_isready', '-U', 'pps', '-d', 'pps2026']).status === 0
}

function ossReady() {
  const r = shRaw('curl', ['-sf', 'http://127.0.0.1:9100/health'])
  if (r.status === 0) return true
  // 无 curl 的环境退化为 TCP 探测
  return new Promise((resolve) => {
    const socket = connect({ port: 9100, host: '127.0.0.1' })
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('error', () => { socket.destroy(); resolve(false) })
  })
}

/** HTTP 可达探测：任意 HTTP 响应（含 401/302）都算服务已启动；仅连接失败算未就绪。 */
function httpGet(port, path) {
  return new Promise((resolve) => {
    const req = spawn('curl', ['-s', '-m', '3', `http://127.0.0.1:${port}${path}`], { shell: IS_WIN, stdio: 'ignore' })
    req.on('exit', code => resolve(code === 0))
    req.on('error', () => resolve(false))
  })
}

function waitForHttp(port, path, label, tries = 45) {
  return waitUntil(() => httpGet(port, path), label, tries, 2000)
}

/* ── 主流程 ─────────────────────────────────────────────────── */

async function main() {
  console.log('── ISAGMSM 2027 · pm2 一键生产部署 ─────────────────────────')

  /* 1. 基础工具 */
  if (shOut('node', ['-v']).status !== 0) throw new Error('未检测到 node')
  if (shOut('pnpm', ['-v']).status !== 0) throw new Error('未检测到 pnpm（npm i -g pnpm）')
  if (shOut('pm2', ['-v']).status !== 0) {
    console.log('[deploy] 未检测到 pm2 —— 全局安装中（npm i -g pm2）…')
    const r = shOut('npm', ['install', '-g', 'pm2'])
    if (r.status !== 0) throw new Error('pm2 安装失败，请手动执行 npm i -g pm2')
    console.log('[deploy] pm2 安装完成')
  }
  const pm2Version = shOut('pm2', ['-v']).stdout.trim()
  console.log(`[deploy] pm2 v${pm2Version}`)

  /* 2. 环境文件（缺失才生成，绝不覆盖已有配置） */
  ensureEnvFiles()
  const portalEnv = parseEnvFile('.env')

  /* 3. Docker 双容器 */
  if (dockerAvailable()) {
    if (containerRunning(DB_CONTAINER)) console.log('[deploy] pps-postgres 已在运行 —— 跳过')
    else if (containerExists(DB_CONTAINER)) dockerStart(DB_CONTAINER, 'PostgreSQL')
    else dockerComposeUp('db', 'PostgreSQL')

    if (containerRunning(OSS_CONTAINER)) console.log('[deploy] pps-minio 已在运行 —— 跳过')
    else if (containerExists(OSS_CONTAINER)) dockerStart(OSS_CONTAINER, '对象存储 OSS')
    else dockerComposeUp('oss', '对象存储 OSS')

    await waitUntil(pgReady, 'PostgreSQL')
    console.log('[deploy] PostgreSQL 已就绪（5433）')
    await waitUntil(ossReady, '对象存储 OSS')
    console.log('[deploy] 对象存储 OSS 已就绪（9100，桶在首次上传时自动创建）')
  }
  else {
    throw new Error('未检测到 Docker —— 请先安装并启动 Docker（Aliyun: yum/dnf install docker 或 Docker CE）')
  }

  /* 4. 迁移 + 空库 seed */
  const dbEnv = { DATABASE_URL: portalEnv.DATABASE_URL || 'postgresql://pps:pps_dev_pw@localhost:5433/pps2026' }
  await runStep('数据库迁移（幂等）', 'pnpm', ['db:migrate'], dbEnv)

  const count = shRaw('docker', ['exec', DB_CONTAINER, 'psql', '-U', 'pps', '-d', 'pps2026', '-tAc', 'select count(*) from users'])
  const userCount = Number.parseInt(count.stdout.trim(), 10)
  if (!Number.isFinite(userCount)) {
    throw new Error(`无法读取用户数（psql: ${count.stderr.trim() || count.stdout.trim() || '空输出'}）`)
  }
  if (userCount === 0) {
    console.log('[deploy] 空库 —— 写入种子数据（管理员/扫码/演示账号 + 展示数据）')
    await runStep('种子数据', 'pnpm', ['db:seed'], dbEnv)
  }
  else {
    console.log(`[deploy] 库中已有 ${userCount} 个用户 —— 跳过 seed（重置请手动 pnpm db:seed，会清空业务数据）`)
  }

  /* 5. 依赖 + 构建 */
  await runStep('安装依赖（pnpm install）', 'pnpm', ['install'])
  if (!SKIP_BUILD) {
    await runStep('生产构建 —— 门户', 'pnpm', ['build'])
    await runStep('生产构建 —— 管理台', 'pnpm', ['build:admin'])
  }
  else {
    console.log('[deploy] --skip-build：复用既有 .output 构建产物')
  }
  if (!existsSync(`${ROOT}/.output/server/index.mjs`)) throw new Error('门户构建产物缺失（.output）')
  if (!existsSync(`${ROOT}/admin/.output/server/index.mjs`)) throw new Error('管理台构建产物缺失（admin/.output）')

  /* 6. pm2 托管 */
  await runStep('pm2 启动/热重载双应用', 'pm2', ['startOrReload', 'ecosystem.config.cjs', '--update-env'])

  /* 7. 健康检查 + 部署摘要 */
  await waitForHttp(PORTAL_PORT, '/api/health', '门户健康检查')
  console.log('[deploy] 门户健康检查通过 ✓')
  await waitForHttp(CONSOLE_PORT, '/api/me', '管理台健康检查')
  console.log('[deploy] 管理台健康检查通过 ✓')

  const nets = []
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) nets.push(net.address)
    }
  }

  console.log('')
  console.log('── 部署完成 ────────────────────────────────────────────────')
  const lanIp = nets[0] ?? 'localhost'
  console.log(`  门户     : http://<公网IP>:${PORTAL_PORT}   （本机/局域网: http://${lanIp}:${PORTAL_PORT}）`)
  console.log(`  管理台   : http://<公网IP>:${CONSOLE_PORT}   （默认账号 admin / ${portalEnv.ADMIN_PASSWORD || 'pps26-admin'}）`)
  console.log(`  扫码端   : http://${lanIp}:${PORTAL_PORT}/scan   （staff / ${portalEnv.STAFF_PASSWORD || 'pps26-staff'}）`)
  console.log(`  演示账号 : demo.user@example.test / ${portalEnv.DEMO_PASSWORD || 'Demo-2027-Pass!'}`)
  console.log('')
  console.log('  常用命令：pnpm pm2:status · pnpm pm2:logs · pnpm pm2:stop · pnpm pm2:restart')
  console.log('  开机自启：pnpm pm2:save 后按 SETUP.md 执行 pm2 startup')
  console.log('  阿里云安全组：放行 TCP ' + `${PORTAL_PORT} 与 ${CONSOLE_PORT} 端口（0.0.0.0/0）`)
  if (!portalEnv.MAIL_SMTP_HOST) {
    console.log('  ⚠ SMTP 未配置：注册验证码走开发模式（服务器日志 + 屏显 devCode）。生产请填 .env 的 MAIL_SMTP_* 后 pnpm pm2:restart')
  }
  console.log('────────────────────────────────────────────────────────────')
}

main().catch((error) => {
  console.error(`\n[deploy] ✘ ${error instanceof Error ? error.message : error}`)
  console.error('[deploy] 部署失败——修复后重新执行 pnpm deploy:pm2 即可（各步骤均幂等）')
  process.exit(1)
})
