/**
 * pm2 托管配置 —— 直接托管 `pnpm start` 启动管道（scripts/start-all.mjs）。
 *
 * start-all.mjs 自身包含：Docker 三态拉起 PostgreSQL/OSS → 就绪等待 → 幂等迁移
 * → 同时拉起门户(:3000)与管理台(:3001)，监听 0.0.0.0。崩溃时 pm2 自动重启整个管道。
 *
 *   pnpm pm2:start    →  pm2 startOrReload ecosystem.config.cjs --update-env
 *   pnpm pm2:stop / restart / status / logs
 *
 * 环境变量：启动时从仓库根 `.env` 读取并注入进程（DATABASE_URL 桥接 NUXT_DATABASE_URL）。
 * 需要生产构建托管时改用 ecosystem.prod.cjs（pnpm build:all 后 pnpm pm2:start:prod）。
 */
const { readFileSync, existsSync } = require('node:fs')
const { join } = require('node:path')

/** 解析简单 KEY=VALUE 的 .env 文件（忽略注释/空行，去引号）。 */
function loadEnvFile(rel) {
  const p = join(__dirname, rel)
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

const portalEnv = loadEnvFile('.env')

const DEFAULT_DB = 'postgresql://pps:pps_dev_pw@localhost:5433/pps2026'

module.exports = {
  apps: [
    {
      name: 'isagmsm',
      cwd: __dirname,
      script: 'scripts/start-all.mjs', // = pnpm start 的内容
      exec_mode: 'fork',
      instances: 1,
      time: true,
      env: {
        PORTAL_PORT: process.env.PORTAL_PORT || '3000',
        CONSOLE_PORT: process.env.CONSOLE_PORT || '3001',
        ...portalEnv,
        NUXT_DATABASE_URL: portalEnv.DATABASE_URL || DEFAULT_DB,
        DATABASE_URL: portalEnv.DATABASE_URL || DEFAULT_DB,
      },
    },
  ],
}
