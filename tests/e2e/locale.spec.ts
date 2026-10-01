import { expect, test } from '@playwright/test'
import { base } from './helpers'

/**
 * 中英文切换（i18n）：
 *  1. 默认中文（无 cookie）——导航/横幅/认证页均为中文，html lang=zh-CN
 *  2. 点击 LocaleToggle → 英文即时生效（无刷新），html lang=en
 *  3. 刷新后语言保持（cookie 持久化，SSR 直接渲染英文）
 *  4. 再切回中文 → 恢复
 */

test('locale toggle switches zh/en, persists across reload', async ({ page }) => {
  /* 1. 默认中文 */
  await page.goto(`${base}/`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  await expect(page.locator('.h-nav-link', { hasText: '首 页' })).toBeVisible()
  await expect(page.locator('.ds-item').first()).toContainText('会前缴费优惠期至2027年3月9日')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')

  /* 2. 切换英文：导航与横幅即时变为英文 */
  await page.locator('.locale-toggle').click()
  await expect(page.locator('.h-nav-link', { hasText: 'Home' })).toBeVisible()
  await expect(page.locator('.ds-item').first()).toContainText('Early-bird payment until March 9, 2027')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  // 账号菜单入口同步（AuthChip 在页头+页脚各一份，locator 须 scope 到页头 banner）
  await expect(page.getByRole('banner').locator('.chip-link', { hasText: 'Sign in' })).toBeVisible()

  /* 3. 刷新后保持英文（cookie + SSR 渲染） */
  await page.goto(`${base}/login?t=${Date.now()}`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  await expect(page.locator('.sec-title')).toContainText('Sign')
  await expect(page.locator('button[type="submit"]')).toHaveText('Sign in')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  /* 4. 切回中文 */
  await page.locator('.locale-toggle').click()
  await expect(page.locator('button[type="submit"]')).toHaveText('登录')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
})
