#!/usr/bin/env node
/**
 * 一键启动（开发模式）：
 *   pnpm start
 *
 * 流程：
 *   1. 检测 Docker 环境：可用且 pps-postgres 容器未运行时执行 `docker compose up -d`，
 *      容器已在运行则跳过（不重复启动）；无 Docker 则提示后继续（假设数据库已在别处运行）
 *   2. 等待 PostgreSQL 就绪 → 幂等执行 drizzle 迁移（已应用的迁移自动跳过）
 *   3. 同时启动 门户(3000, 真实 SMTP 邮箱验证) 与 管理台(3001)
 *
 * 退出时自动结束两个子进程（Windows 用 taskkill /T 结束进程树）。
 */
import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import os from 'node:os'

const isWin = process.platform === 'win32'
const CHILDREN = []
let shuttingDown = false

/** 端口可经环境变量覆盖，默认 3000（门户）/ 3001（管理台）。
 *  用专属变量而非通用 PORT/NUXT_PORT：Nuxt 原生读它们且优先于配置，
 *  两个应用会互相抢端口。 */
const PORT = Number(process.env.PORTAL_PORT ?? 3000)
const ADMIN_PORT = Number(process.env.CONSOLE_PORT ?? 3001)

/** 列出本机网卡 IPv4（用于打印公网/局域网访问提示）。 */
function candidateIps() {
  const out = []
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list ?? []) {
      if (ni && ni.family === 'IPv4' && !ni.internal) out.push(ni.address)
    }
  }
  return out
}

function sh(command, args, opts = {}) {
  return spawnSync(command, args, { stdio: opts.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', shell: isWin, encoding: 'utf8', ...opts })
}

function runStep(label, command, args, opts) {
  process.stdout.write(`[start] ${label} … `)
  const r = sh(command, args, opts)
  if (r.status !== 0) {
    console.log('失败')
    if (opts.capture) console.error(String(r.stderr || r.stdout || '').trim())
    return false
  }
  console.log('完成')
  return true
}

function dockerAvailable() {
  const r = sh('docker', ['info', '--format', 'ok'], { capture: true })
  return r.status === 0
}

function containerRunning(name) {
  const r = sh('docker', ['ps', '--format', '{{.Names}}'], { capture: true })
  return r.status === 0 && String(r.stdout).split(/\r?\n/).includes(name)
}

function waitForPort(port, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve) => {
    const tryOnce = () => {
      const socket = net.connect({ port, host: '127.0.0.1' })
      socket.once('connect', () => { socket.destroy(); resolve(true) })
      socket.once('error', () => {
        socket.destroy()
        if (Date.now() > deadline) resolve(false)
        else setTimeout(tryOnce, 1500)
      })
    }
    tryOnce()
  })
}

function spawnApp(key, command, args) {
  const child = spawn(command, args, { shell: isWin, env: process.env })
  CHILDREN.push(child)
  const tag = `[${key}]`
  child.stdout?.on('data', (chunk) => {
    String(chunk).split(/\r?\n/).filter(Boolean).forEach(line => console.log(`${tag} ${line}`))
  })
  child.stderr?.on('data', (chunk) => {
    String(chunk).split(/\r?\n/).filter(Boolean).forEach(line => console.log(`${tag} ${line}`))
  })
  return child
}

function killChildren() {
  if (shuttingDown) return
  shuttingDown = true
  console.log('\n[start] 正在停止两个应用…')
  for (const child of CHILDREN) {
    if (child.exitCode !== null) continue
    if (isWin) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', shell: true })
    else child.kill('SIGTERM')
  }
  process.exit(0)
}

async function main() {
  console.log('── ISAGMSM 2027 一键启动（开发模式，真实邮箱验证） ─────────────')

  /* 1. Docker / PostgreSQL */
  if (dockerAvailable()) {
    if (containerRunning('pps-postgres')) {
      console.log('[start] Docker: pps-postgres 容器已在运行 —— 跳过启动')
    }
    else {
      if (!runStep('Docker: 启动 PostgreSQL（docker compose up -d）', 'docker', ['compose', 'up', '-d'])) {
        console.error('[start] 数据库容器启动失败，请检查 docker-compose.yml')
        process.exit(1)
      }
    }
    let ready = false
    for (let i = 0; i < 30; i++) {
      const r = sh('docker', ['exec', 'pps-postgres', 'pg_isready', '-U', 'pps'], { capture: true })
      if (r.status === 0) { ready = true; break }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    if (!ready) {
      console.error('[start] PostgreSQL 60 秒内未就绪，请手动检查容器日志')
      process.exit(1)
    }
    console.log('[start] PostgreSQL 已就绪')

    /* 2. 幂等迁移（已应用的自动跳过） */
    runStep('数据库迁移（幂等）', 'pnpm', ['db:migrate'])
  }
  else {
    console.warn('[start] 未检测到 Docker 环境 —— 跳过容器启动；请确保 PostgreSQL 已在 localhost:5433 运行')
  }

  /* 3. 同时启动两个应用（开发模式，门户走真实 SMTP 邮箱验证） */
  console.log(`[start] 启动门户（${PORT}）与管理台（${ADMIN_PORT}）…`)
  spawnApp('门户', 'pnpm', ['dev'])
  spawnApp('管理台', 'pnpm', ['dev:admin'])

  const [portalUp, consoleUp] = await Promise.all([waitForPort(PORT), waitForPort(ADMIN_PORT)])
  const ips = candidateIps()
  const siteUrl = process.env.NUXT_PUBLIC_SITE_URL ?? ''
  const siteUrlWarn = !siteUrl || siteUrl.includes('localhost')

  console.log('')
  console.log('──────────────────────────────────────────────────────────────')
  console.log(`  门户   : http://localhost:${PORT}      ${portalUp ? '✓ 已就绪' : '✗ 启动超时'}`)
  console.log(`  管理台 : http://localhost:${ADMIN_PORT}      ${consoleUp ? '✓ 已就绪' : '✗ 启动超时'}`)
  console.log(`  本机网卡: ${ips.length ? ips.join('  ') : '（未检测到）'} —— 已绑定 0.0.0.0，同网卡可直接访问`)
  if (portalUp && consoleUp) {
    console.log('')
    console.log('  账号（管理台）: admin  / pps26-admin')
    console.log('  账号（扫码端）: staff  / pps26-staff（官网 /scan）')
    console.log('  账号（参会演示）: demo.user@example.test / Demo-2027-Pass!（个人中心）')
    console.log('  邮箱验证: 开发模式走真实 SMTP —— 注册/找回密码的验证码会真实发到邮箱')
  }
  if (siteUrlWarn) {
    console.log('')
    console.warn('  ⚠ 公网部署注意：NUXT_PUBLIC_SITE_URL 未设置或仍为 localhost ——')
    console.warn('    二维码 / 邮件里的验证链接会指向 http://localhost:3000，公网用户打不开。')
    console.warn('    请用外网地址启动，例如（阿里云公网 IP 假设 47.98.x.x）：')
    console.warn('      NUXT_PUBLIC_SITE_URL=http://47.98.x.x:3000 pnpm start')
  }
  console.log('')
  console.log('  ⚠ 公网安全提示（阿里云安全组）：')
  console.log('    • 门户 3000 可对公网放行；')
  console.log('    • 管理台 3001 建议仅对管理 IP 放行（或改为内网访问）；')
  console.log('    • dev 模式对公网暴露有信息泄露风险，正式上线请改用 pnpm build + node .output/server/index.mjs；')
  console.log('    • 若在 nginx 等反向代理之后，请设 TRUST_PROXY=1（限流才信任 X-Forwarded-For）。')
  console.log('  按 Ctrl+C 停止两个应用')
  console.log('──────────────────────────────────────────────────────────────')
}

process.on('SIGINT', killChildren)
process.on('SIGTERM', killChildren)

main().catch((error) => {
  console.error('[start] 启动失败:', error)
  killChildren()
  process.exit(1)
})
