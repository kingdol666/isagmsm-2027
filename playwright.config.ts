import { defineConfig } from '@playwright/test'

/**
 * 双应用 E2E：
 *  - 门户（官网 + 注册/缴费/凭证/投稿/扫码）→ PORTAL_PORT 环境变量，默认 3000
 *  - 管理台（独立项目 admin/，会员/审批/审稿）→ CONSOLE_PORT 环境变量，默认 3001
 */
const PORT = Number(process.env.PORTAL_PORT ?? 3000)
const ADMIN_PORT = Number(process.env.CONSOLE_PORT ?? 3001)

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 150_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      // devServer 绑定 0.0.0.0（仅 IPv4）—— 就绪探测必须走 127.0.0.1，
      // 否则 Node 把 localhost 解析成 ::1 且不回退，导致永远 ECONNREFUSED
      command: 'pnpm dev:e2e',
      url: `http://127.0.0.1:${PORT}/api/health`,
      reuseExistingServer: true,
      timeout: 240_000,
    },
    {
      command: 'pnpm --filter isagmsm-admin-console dev',
      url: `http://127.0.0.1:${ADMIN_PORT}/api/me`,
      reuseExistingServer: true,
      timeout: 240_000,
      env: { ...process.env, MAIL_DRIVER: 'test' },
    },
  ],
})
