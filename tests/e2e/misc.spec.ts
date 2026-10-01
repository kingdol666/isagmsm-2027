import { expect, test } from '@playwright/test'
import { base, createAccountViaApi, uniqueEmail } from './helpers'

/**
 * PLATFORM ESSENTIALS — health report, error page, SEO artifacts,
 * account profile persistence, responsive homepage.
 */

test('health endpoint reports active integrations', async ({ request }) => {
  const res = await request.get(`${base}/api/health`)
  expect(res.status()).toBe(200)
  const body = await res.json() as { status: string, integrations: { payments: string[], mail: string } }
  expect(body.status).toBe('ok')
  expect(body.integrations.payments).toContain('mock')
  expect(['smtp', 'dev']).toContain(body.integrations.mail)
})

test('unknown routes render the styled 404 page', async ({ page }) => {
  await page.goto(`${base}/this-page-does-not-exist`)
  await expect(page.locator('.err-code')).toContainText('404')
  await expect(page.locator('.err-title')).toContainText('此页')
})

test('robots.txt and sitemap.xml are served', async ({ request }) => {
  const robots = await request.get(`${base}/robots.txt`)
  expect(robots.status()).toBe(200)
  expect(await robots.text()).toContain('Disallow: /admin')

  const sitemap = await request.get(`${base}/sitemap.xml`)
  expect(sitemap.status()).toBe(200)
  expect(await sitemap.text()).toContain('<urlset')
})

test('homepage carries structured event data and meta', async ({ page }) => {
  await page.goto(base, { waitUntil: 'networkidle' })
  const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent()
  expect(jsonLd).toContain('ConferenceEvent')
  expect(jsonLd).toContain('2027-04-09')
  const description = await page.locator('meta[name="description"]').getAttribute('content')
  expect(description).toContain('先进凝胶材料')
  // header nav shows the seven conference sections
  for (const label of ['组织机构', '征文投稿', '参会注册', '会场交通', '酒店预定', '参展赞助']) {
    await expect(page.locator('.h-nav')).toContainText(label)
  }
})

test('all seven conference pages render with their section titles', async ({ page }) => {
  const pages = [
    { path: '/organization', title: '组织机构' },
    { path: '/abstracts', title: '征文投稿' },
    { path: '/registration', title: '参会注册' },
    { path: '/transportation', title: '会场交通' },
    { path: '/hotels', title: '酒店预定' },
    { path: '/sponsorship', title: '参展赞助' },
  ]
  for (const p of pages) {
    await page.goto(base + p.path, { waitUntil: 'networkidle' })
    await expect(page.locator('h1.sec-title')).toContainText(p.title)
  }
})

test('account profile saves and persists across reloads', async ({ page }) => {
  const email = uniqueEmail('profile')
  const password = `profile-${Date.now()}-pass!`
  await createAccountViaApi(page.context(), email, password, 'Profile Tester')

  await page.goto(`${base}/account`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  await expect(page.locator('.s-title', { hasText: '参会人资料' })).toBeVisible()
  await page.waitForTimeout(600)

  await page.locator('.grid .field').nth(0).locator('input').fill('Profile Tester Updated')
  await page.locator('.grid .field').nth(3).locator('input').fill('Germany')
  await page.locator('.grid .field').nth(4).locator('input').fill('TU München')
  await page.click('button:has-text("保存修改")')
  await expect(page.locator('.msg.ok')).toContainText('资料已保存')

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await expect(page.locator('.grid .field').nth(0).locator('input')).toHaveValue('Profile Tester Updated')
  await expect(page.locator('.grid .field').nth(3).locator('input')).toHaveValue('Germany')
  await expect(page.locator('.grid .field').nth(4).locator('input')).toHaveValue('TU München')
})

test('homepage renders fully at 390px with zero horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(base, { waitUntil: 'networkidle' })
  await expect(page.locator('.hero-title')).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})
