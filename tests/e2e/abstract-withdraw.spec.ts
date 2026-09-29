import { expect, test } from '@playwright/test'
import { base, consoleBase, consoleUiLogin, createAccountViaApi, uniqueEmail } from './helpers'

/**
 * 论文投稿完整设计（多论文投递 + 稿件内容可见 + 撤回 + 版本历史）：
 *  1. 同一账号连续投递两篇稿件（多论文投递）
 *  2. 投稿人展开稿件：可见当前稿件内容 + 投稿版本快照
 *  3. 撤回稿件 A：状态变已撤回，历史记录含「撤回」事件
 *  4. 管理台搜索 A → 不再显示（销毁不可见）；搜索 B → 正常待审
 */

async function fillAndSubmit(page: import('@playwright/test').Page, title: string, text: string) {
  await page.goto(`${base}/submit`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="title"]', title)
  await page.selectOption('select[name="topic"]', 'A')
  await page.selectOption('select[name="reportType"]', 'poster')
  await page.fill('textarea[name="abstractText"]', text)
  await page.fill('input[name="submitterName"]', '陈投稿')
  await page.fill('input[name="submitterAffiliation"]', '凝胶大学材料学院')
  await page.fill('input[name="author-name-0"]', '陈投稿')
  await page.fill('input[name="author-aff-0"]', '凝胶大学材料学院')
  await page.click('button:has-text("提交稿件")')
  await expect(page.locator('.done-title')).toContainText('投稿成功', { timeout: 15_000 })
}

test('multi-submission, content visibility, withdraw hides from console', async ({ browser }) => {
  const email = uniqueEmail('wd')
  const password = `wd-${Date.now()}-pass!`
  const stamp = Date.now()
  const titleA = `多论文投递与撤回机制研究-${stamp}`
  const titleB = `继续投递的第二篇稿件-${stamp}`

  const userCtx = await browser.newContext()
  const userPage = await userCtx.newPage()
  await createAccountViaApi(userCtx, email, password, '陈投稿')

  /* 1. 多论文投递：同一账号连续两篇 */
  await fillAndSubmit(userPage, titleA, `第一篇稿件摘要：研究可撤回机制对投稿系统完整性的影响，包含版本快照与历史记录设计验证。`)
  await fillAndSubmit(userPage, titleB, `第二篇稿件摘要：验证同一账号的多论文投递能力与待审上限逻辑，两篇互不影响。`)

  /* 2. 投稿人查看稿件内容 + 版本快照 */
  await userPage.goto(`${base}/account?t=${Date.now()}#abstracts`, { waitUntil: 'networkidle' })
  await userPage.waitForLoadState('networkidle')
  const itemA = userPage.locator('li.ab-item').filter({ has: userPage.locator(`.ab-title:text-is("${titleA}")`) })
  const itemB = userPage.locator('li.ab-item').filter({ has: userPage.locator(`.ab-title:text-is("${titleB}")`) })
  await expect(itemA).toHaveCount(1)
  await expect(itemB).toHaveCount(1)
  await expect(itemA.locator('.badge.st')).toContainText('待审')
  await expect(itemB.locator('.badge.st')).toContainText('待审')

  await itemA.locator('button:has-text("稿件内容 / 历史")').click()
  await expect(itemA.locator('.ab-detail-label', { hasText: '当前稿件内容' })).toContainText('第 1 版')
  await expect(itemA.locator('.ab-abstract')).toContainText('可撤回机制')
  await expect(itemA.locator('.ev-snap-title').first()).toContainText(titleA)

  /* 3. 撤回稿件 A（确认弹窗接受） */
  userPage.on('dialog', d => d.accept())
  await itemA.locator('.ab-actions button:has-text("撤回稿件")').click()
  await expect(itemA.locator('.badge.st')).toContainText('已撤回', { timeout: 15_000 })
  await expect(itemA.locator('.ab-timeline .ab-ev').filter({ has: userPage.locator('.ev-kind:text-is("撤回")') })).toBeVisible()

  // 已撤回的稿件不可再撤回/重投（按钮消失）
  await expect(itemA.locator('.ab-actions button:has-text("撤回稿件")')).toHaveCount(0)
  await expect(itemA.locator('.ab-actions a:has-text("修改重投")')).toHaveCount(0)

  /* 4. 管理台：A 不可见（销毁），B 正常待审 */
  const adminCtx = await browser.newContext()
  const adminPage = await adminCtx.newPage()
  await consoleUiLogin(adminPage)
  await adminPage.goto(`${consoleBase}/abstracts`, { waitUntil: 'networkidle' })

  await adminPage.fill('.filter-input', titleA)
  await adminPage.waitForTimeout(800)
  await expect(adminPage.locator('.abs-list .abs')).toHaveCount(0)
  await expect(adminPage.locator('.empty')).toContainText('没有符合条件的稿件')

  await adminPage.fill('.filter-input', titleB)
  await adminPage.waitForTimeout(800)
  const rowB = adminPage.locator('li.abs').filter({ has: adminPage.locator(`.abs-title:text-is("${titleB}")`) })
  await expect(rowB).toHaveCount(1)
  await expect(rowB.locator('.badge.st')).toContainText('待审')

  // 管理台也能看到投稿人的版本历史（B 展开 → 投稿事件带快照）
  await rowB.locator('.abs-head').click()
  await expect(rowB.locator('.ev', { hasText: '投稿' }).first()).toBeVisible()
  await expect(rowB.locator('.ev-comment.snap-title').first()).toContainText(titleB)

  await userCtx.close()
  await adminCtx.close()
})
