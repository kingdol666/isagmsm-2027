/**
 * 生产构建托管（nuxt build 产物，性能更好、不暴露源码路径）。
 * 由 `pnpm deploy:pm2` / `pnpm start`（scripts/deploy-pm2.mjs）自动构建并 startOrReload 本文件；
 * 也可手动：pnpm build:all && pm2 startOrReload ecosystem.prod.config.cjs --update-env
 * （注意：pm2 按文件名包含 .config.cjs / .config.js / .json 识别配置文件，改名会导致启动失败。）
 *
 * 环境变量：启动时从仓库根 `.env` 与 `admin/.env` 读取并全量注入进程；
 * DATABASE_URL 会同时桥接为 NUXT_DATABASE_URL（Nuxt runtimeConfig 的运行时覆盖名）。
 * 端口可用 PORTAL_PORT / CONSOLE_PORT 覆盖（默认 3000 / 3001），监听 0.0.0.0（公网/局域网可访问）。
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
const adminEnv = loadEnvFile('admin/.env')

const DEFAULT_DB = 'postgresql://pps:pps_dev_pw@localhost:5433/pps2026'

module.exports = {
  apps: [
    {
      name: 'isagmsm-portal',
      cwd: __dirname,
      script: '.output/server/index.mjs',
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '700M',
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORTAL_PORT || '3000',
        NITRO_PORT: process.env.PORTAL_PORT || '3000',
        HOST: '0.0.0.0',
        NITRO_HOST: '0.0.0.0',
        ...portalEnv,
        NUXT_DATABASE_URL: portalEnv.DATABASE_URL || DEFAULT_DB,
        DATABASE_URL: portalEnv.DATABASE_URL || DEFAULT_DB,
      },
    },
    {
      name: 'isagmsm-admin',
      cwd: __dirname,
      script: 'admin/.output/server/index.mjs',
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '600M',
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.CONSOLE_PORT || '3001',
        NITRO_PORT: process.env.CONSOLE_PORT || '3001',
        HOST: '0.0.0.0',
        NITRO_HOST: '0.0.0.0',
        ...adminEnv,
        NUXT_DATABASE_URL: adminEnv.DATABASE_URL || DEFAULT_DB,
        DATABASE_URL: adminEnv.DATABASE_URL || DEFAULT_DB,
        // 备份目录相对 pm2 cwd（仓库根）——与 dev 的 admin/backups 保持一致
        BACKUP_DIR: adminEnv.BACKUP_DIR || 'admin/backups',
      },
    },
  ],
}
