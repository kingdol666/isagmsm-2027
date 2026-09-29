import { defineConfig } from '@playwright/test'

/**
 * 双应用 E2E：
 *  - 门户（官网 + 注册/缴费/凭证/投稿/扫码）→ 3000
 *  - 管理台（独立项目 admin/，会员/审批/审稿）→ 3001
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 150_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm dev:e2e',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter isagmsm-admin-console dev',
      url: 'http://localhost:3001/api/me',
      reuseExistingServer: true,
      timeout: 120_000,
      env: { MAIL_DRIVER: 'test' },
    },
  ],
})
