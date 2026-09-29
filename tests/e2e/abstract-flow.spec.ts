import { expect, test } from '@playwright/test'
import { base, consoleBase, consoleUiLogin, createAccountViaApi, uniqueEmail } from './helpers'

/**
 * 投稿送审全流程（管理台在独立应用 :3001）：
 * 注册用户投稿（含添加作者行）→ 管理台查看并返稿（附意见，邮件通知）
 * → 投稿人看到返稿意见并修改重投（版本 +1）→ 管理台接收
 * → 投稿人看到接收结果与完整历史记录。
 */

const TITLE_V1 = () => `双网络离子凝胶界面增强研究-${Date.now()}`

test('abstract submission, return with comment, resubmit, accept, history', async ({ browser }) => {
  const email = uniqueEmail('abs')
  const password = `abs-${Date.now()}-pass!`
  const titleV1 = TITLE_V1()

  /* 1. 注册账号后进入投稿页 */
  const userCtx = await browser.newContext()
  const userPage = await userCtx.newPage()
  await createAccountViaApi(userCtx, email, password, '陈投稿')

  await userPage.goto(`${base}/submit`, { waitUntil: 'networkidle' })
  await userPage.waitForLoadState('networkidle')
  await expect(userPage.locator('.sec-title')).toContainText('论文投稿')

  await userPage.fill('input[name="title"]', titleV1)
  await userPage.selectOption('select[name="topic"]', 'A')
  await userPage.selectOption('select[name="reportType"]', 'oral')
  await userPage.fill('textarea[name="abstractText"]', '本研究提出双网络离子凝胶的界面增强策略，通过滑移环网络设计显著提升界面断裂能，并验证了其在柔性器件中的稳定性表现。')
  await userPage.fill('input[name="submitterName"]', '陈投稿')
  await userPage.fill('input[name="submitterAffiliation"]', '凝胶大学材料学院')

  // 作者 1 已有默认行；添加作者 2（姓名与机构都必填）
  await userPage.fill('input[name="author-name-0"]', '陈投稿')
  await userPage.fill('input[name="author-aff-0"]', '凝胶大学材料学院')
  await userPage.click('button:has-text("添加作者")')
  await userPage.fill('input[name="author-name-1"]', '李合作')
  await userPage.fill('input[name="author-aff-1"]', '软物质研究所')

  await userPage.click('button:has-text("提交稿件")')
  await expect(userPage.locator('.done-title')).toContainText('投稿成功')

  /* 2. 个人中心：待审状态 + 历史记录 */
  await userPage.goto(`${base}/account?t=${Date.now()}#abstracts`, { waitUntil: 'networkidle' })
  await userPage.waitForLoadState('networkidle')
  const item = userPage.locator('.ab-item', { hasText: titleV1 })
  await expect(item).toBeVisible()
  await expect(item.locator('.badge.st')).toContainText('待审')
  await item.locator('button:has-text("稿件内容 / 历史")').click()
  await expect(item.locator('.ab-ev', { hasText: '投稿' })).toBeVisible()

  /* 3. 后台：搜索、展开、返稿（附意见） */
  const adminCtx = await browser.newContext()
  const adminPage = await adminCtx.newPage()
  await consoleUiLogin(adminPage)
  await adminPage.goto(`${consoleBase}/abstracts`, { waitUntil: 'networkidle' })

  await adminPage.fill('.filter-input', titleV1)
  const row = adminPage.locator('.abs', { hasText: titleV1 })
  await expect(row).toHaveCount(1)
  await row.locator('.abs-head').click()
  await expect(row.locator('.abs-detail')).toBeVisible()
  await expect(row.locator('.d-row', { hasText: '作者' })).toContainText('李合作（软物质研究所）')

  await row.locator('textarea.comment').fill('摘要缺少定量实验结果与对比基线，请补充后重新提交。')
  await row.locator('button:has-text("返稿")').click()
  await expect(adminPage.locator('.msg')).toContainText('已返稿', { timeout: 15_000 })
  await expect(adminPage.locator('.msg')).toContainText(email)
  await expect(row.locator('.badge.st')).toContainText('已返稿')

  /* 4. 投稿人：看到返稿意见 → 修改重投 → 第 2 版 */
  await userPage.goto(`${base}/account?t=${Date.now()}#abstracts`, { waitUntil: 'networkidle' })
  await userPage.waitForLoadState('networkidle')
  const returned = userPage.locator('.ab-item', { hasText: titleV1 })
  await expect(returned.locator('.badge.st')).toContainText('已返稿')
  await expect(returned.locator('.ab-verdict')).toContainText('摘要缺少定量实验结果')

  await returned.locator('a:has-text("修改重投")').click()
  await userPage.waitForLoadState('networkidle')
  await expect(userPage.locator('.sec-title')).toContainText('修改重投')
  await expect(userPage.locator('.return-note')).toContainText('摘要缺少定量实验结果')
  // 表单已预填旧内容
  await expect(userPage.locator('input[name="title"]')).toHaveValue(titleV1)
  await expect(userPage.locator('input[name="author-name-1"]')).toHaveValue('李合作')

  const titleV2 = `${titleV1}-修订`
  await userPage.fill('input[name="title"]', titleV2)
  await userPage.fill('textarea[name="abstractText"]', '修订说明：补充了三组对照实验的定量断裂能数据（提升 42%）与商用凝胶基线对比，其余内容保持不变。本研究提出双网络离子凝胶的界面增强策略。')
  await userPage.click('button:has-text("提交新版本")')
  await expect(userPage.locator('.done-title')).toContainText('第 2 版')

  /* 5. 后台：接收第 2 版 */
  await adminPage.goto(`${consoleBase}/abstracts`, { waitUntil: 'networkidle' })
  await adminPage.fill('.filter-input', titleV2)
  const row2 = adminPage.locator('.abs', { hasText: titleV2 })
  await expect(row2).toHaveCount(1)
  await expect(row2.locator('.badge', { hasText: 'v2' })).toBeVisible()
  await row2.locator('.abs-head').click()
  // 历史已含返稿与重投
  await expect(row2.locator('.ev', { hasText: '返稿' })).toBeVisible()
  await expect(row2.locator('.ev', { hasText: '修改重投' })).toBeVisible()
  await row2.locator('textarea.comment').fill('修订到位，数据完整，予以接收。')
  await row2.locator('button:has-text("接收")').click()
  await expect(adminPage.locator('.msg')).toContainText('已接收', { timeout: 15_000 })

  /* 6. 投稿人：最终状态已接收 + 完整历史 */
  await userPage.goto(`${base}/account?t=${Date.now()}#abstracts`, { waitUntil: 'networkidle' })
  await userPage.waitForLoadState('networkidle')
  const final = userPage.locator('.ab-item', { hasText: titleV2 })
  await expect(final.locator('.badge.st')).toContainText('已接收')
  await expect(final.locator('.ab-verdict.accepted')).toContainText('修订到位，数据完整')
  await final.locator('button:has-text("稿件内容 / 历史")').click()
  await expect(final.locator('.ab-ev', { hasText: '修改重投' })).toBeVisible()
  await expect(final.locator('.ab-ev', { hasText: '返稿' })).toBeVisible()
  await expect(final.locator('.ab-ev', { hasText: '接收' })).toBeVisible()

  await userCtx.close()
  await adminCtx.close()
})
