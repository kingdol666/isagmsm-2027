import { expect, test } from '@playwright/test'
import {
  base,
  consoleBase,
  consoleUiLogin,
  createAccountViaApi,
  FIXTURE_PDF,
  uniqueEmail,
} from './helpers'
import { readFileSync } from 'node:fs'

/**
 * 投稿附件（对象存储 OSS）全链路：
 *  1. 用户投稿必须附 Word 附件（≤10MB，pdf/doc/docx），随 v1 存 OSS（中文文件名场景）
 *  2. 匿名 / 他人无法下载该附件（属主校验）
 *  3. 管理台展开稿件 → 看到附件并成功下载（字节与上传一致）
 *  4. 管理台返稿（附意见，邮件通知）→ 用户看到意见与 v1 附件
 *  5. 用户修改重投（新附件 PDF，版本 +1，v1/v2 附件各自独立存档）
 *  6. 管理台下载 v2 附件并接收；用户看到接收结果
 *  7. 附件伪造（文本伪装 PDF）与超限（>10MB）被拒
 */

const TITLE = () => `带附件投稿流程验证-${Date.now()}`
const DOCX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04])
/** 中文文件名 fixture（同 sample.docx 字节）——覆盖非 ASCII 文件名上传与 RFC 5987 下载头 */
const FIXTURE_DOCX_ZH = `tests/e2e/fixtures/中文报告.docx`

async function fillForm(page: import('@playwright/test').Page, title: string) {
  await page.fill('input[name="title"]', title)
  await page.selectOption('select[name="topic"]', 'A')
  await page.selectOption('select[name="reportType"]', 'oral')
  await page.fill('textarea[name="abstractText"]', '本研究提出双网络离子凝胶的界面增强策略，附完整实验数据与附件文档，验证投稿附件的对象存储链路。')
  await page.fill('input[name="submitterName"]', '陈投稿')
  await page.fill('input[name="submitterAffiliation"]', '凝胶大学材料学院')
  await page.fill('input[name="author-name-0"]', '陈投稿')
  await page.fill('input[name="author-aff-0"]', '凝胶大学材料学院')
}

test('attachment upload, console download, return, resubmit, accept', async ({ browser }) => {
  const email = uniqueEmail('att')
  const password = `att-${Date.now()}-pass!`
  const titleV1 = TITLE()

  /* 1. 用户投稿（Word 附件） */
  const userCtx = await browser.newContext()
  const userPage = await userCtx.newPage()
  await createAccountViaApi(userCtx, email, password, '陈投稿')

  await userPage.goto(`${base}/submit`, { waitUntil: 'networkidle' })
  await userPage.waitForLoadState('networkidle')
  await fillForm(userPage, titleV1)
  await userPage.setInputFiles('input[name="file"]', FIXTURE_DOCX_ZH)
  await expect(userPage.locator('.file-name')).toContainText('中文报告.docx')
  await userPage.click('button:has-text("提交稿件")')
  await expect(userPage.locator('.done-title')).toContainText('投稿成功')

  // 个人中心历史里出现 v1 附件下载链接
  await userPage.goto(`${base}/account?t=${Date.now()}#abstracts`, { waitUntil: 'networkidle' })
  await userPage.waitForLoadState('networkidle')
  const item = userPage.locator('.ab-item', { hasText: titleV1 })
  await expect(item).toBeVisible()
  await item.locator('button:has-text("稿件内容 / 历史")').click()
  const v1Link = item.locator('.ev-file', { hasText: '中文报告.docx' })
  await expect(v1Link).toBeVisible()

  // 从 mine 接口拿稿件 id
  const mine = await userCtx.request.get(`${base}/api/abstracts/mine`).then(r => r.json())
  const id = mine.abstracts[0].id as string
  expect(id).toBeTruthy()

  /* 2. 属主校验：匿名 401；他人 404 */
  const anon = await browser.newContext()
  const anonDownload = await anon.request.get(`${base}/api/abstracts/${id}/files/1`)
  expect(anonDownload.status()).toBe(401)
  await anon.close()

  const otherCtx = await browser.newContext()
  await createAccountViaApi(otherCtx, uniqueEmail('other'), `other-${Date.now()}-pass!`, '路人甲')
  const otherDownload = await otherCtx.request.get(`${base}/api/abstracts/${id}/files/1`)
  expect(otherDownload.status()).toBe(404)
  await otherCtx.close()

  // 属主本人可下载且字节一致
  const own = await userCtx.request.get(`${base}/api/abstracts/${id}/files/1`)
  expect(own.status()).toBe(200)
  expect(own.headers()['content-disposition']).toContain('.docx')
  const ownBytes = await own.body()
  expect(ownBytes.subarray(0, 4)).toEqual(DOCX_MAGIC)
  expect(ownBytes.equals(readFileSync('tests/e2e/fixtures/中文报告.docx'))).toBe(true)

  /* 3. 管理台：展开 → 附件可见 → 下载一致 */
  const adminCtx = await browser.newContext()
  const adminPage = await adminCtx.newPage()
  await consoleUiLogin(adminPage)
  await adminPage.goto(`${consoleBase}/abstracts`, { waitUntil: 'networkidle' })
  await adminPage.fill('.filter-input', titleV1)
  const row = adminPage.locator('.abs', { hasText: titleV1 })
  await expect(row).toHaveCount(1)
  await row.locator('.abs-head').click()
  await expect(row.locator('.d-row', { hasText: '稿件附件' })).toContainText('中文报告.docx')
  await expect(row.locator('.ev .file-link', { hasText: '中文报告.docx' }).first()).toBeVisible()

  const adminDownload = await adminCtx.request.get(`${consoleBase}/api/abstracts/${id}/files/1`)
  expect(adminDownload.status()).toBe(200)
  expect(adminDownload.headers()['content-disposition']).toContain(encodeURIComponent('中文报告.docx'))
  expect((await adminDownload.body()).equals(readFileSync('tests/e2e/fixtures/中文报告.docx'))).toBe(true)

  /* 4. 管理台返稿（附意见） */
  await row.locator('textarea.comment').fill('附件图片清晰度不足，请提供矢量图后重新提交。')
  await row.locator('button:has-text("返稿")').click()
  await expect(adminPage.locator('.msg')).toContainText('已返稿', { timeout: 15_000 })

  /* 5. 用户看到返稿意见 → 修改重投（PDF 新附件，v2） */
  await userPage.goto(`${base}/account?t=${Date.now()}#abstracts`, { waitUntil: 'networkidle' })
  await userPage.waitForLoadState('networkidle')
  const returned = userPage.locator('.ab-item', { hasText: titleV1 })
  await expect(returned.locator('.badge.st')).toContainText('已返稿')
  await expect(returned.locator('.ab-verdict')).toContainText('矢量图')

  await returned.locator('a:has-text("修改重投")').click()
  await userPage.waitForLoadState('networkidle')
  await expect(userPage.locator('.sec-title')).toContainText('修改重投')
  const titleV2 = `${titleV1}-修订`
  await userPage.fill('input[name="title"]', titleV2)
  await userPage.setInputFiles('input[name="file"]', FIXTURE_PDF)
  await userPage.click('button:has-text("提交新版本")')
  await expect(userPage.locator('.done-title')).toContainText('第 2 版')

  /* 6. 管理台下载 v2 附件并接收 */
  await adminPage.goto(`${consoleBase}/abstracts`, { waitUntil: 'networkidle' })
  await adminPage.fill('.filter-input', titleV2)
  const row2 = adminPage.locator('.abs', { hasText: titleV2 })
  await expect(row2).toHaveCount(1)
  await row2.locator('.abs-head').click()
  await expect(row2.locator('.d-row', { hasText: '稿件附件' })).toContainText('sample.pdf')

  const v2 = await adminCtx.request.get(`${consoleBase}/api/abstracts/${id}/files/2`)
  expect(v2.status()).toBe(200)
  expect(Buffer.from(await v2.body()).subarray(0, 4)).toEqual(Buffer.from('%PDF'))

  // 历史里 v1 附件仍可下载（每版独立存档）
  const v1Again = await adminCtx.request.get(`${consoleBase}/api/abstracts/${id}/files/1`)
  expect(v1Again.status()).toBe(200)
  expect((await v1Again.body()).equals(readFileSync('tests/e2e/fixtures/中文报告.docx'))).toBe(true)

  await row2.locator('textarea.comment').fill('修订到位，予以接收。')
  await row2.locator('button:has-text("接收")').click()
  await expect(adminPage.locator('.msg')).toContainText('已接收', { timeout: 15_000 })

  /* 7. 用户最终看到接收结果与两版附件 */
  await userPage.goto(`${base}/account?t=${Date.now()}#abstracts`, { waitUntil: 'networkidle' })
  await userPage.waitForLoadState('networkidle')
  const final = userPage.locator('.ab-item', { hasText: titleV2 })
  await expect(final.locator('.badge.st')).toContainText('已接收')
  await final.locator('button:has-text("稿件内容 / 历史")').click()
  await expect(final.locator('.ev-file', { hasText: '中文报告.docx' })).toBeVisible()
  await expect(final.locator('.ev-file', { hasText: 'sample.pdf' })).toBeVisible()

  await userCtx.close()
  await adminCtx.close()
})

test('rejects fake-type and oversized attachments at the API boundary', async ({ browser }) => {
  const ctx = await browser.newContext()
  const email = uniqueEmail('attbad')
  await createAccountViaApi(ctx, email, `attbad-${Date.now()}-pass!`, '附件测试')

  const fields = {
    title: `附件校验边界-${Date.now()}`,
    topic: 'A',
    reportType: 'poster',
    abstractText: '附件校验边界测试：伪造类型与超限附件必须在服务端被拒绝，且不产生任何存储副作用。',
    submitterName: '附件测试',
    submitterAffiliation: '测试大学',
    authors: JSON.stringify([{ name: '附件测试', affiliation: '测试大学' }]),
    website: '',
  }

  // 文本伪装成 PDF → 422（内容与扩展名不符）
  const fake = await ctx.request.post(`${base}/api/abstracts`, {
    multipart: { ...fields, file: { name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('plain text pretending to be pdf') } },
  })
  expect(fake.status()).toBe(422)

  // >10MB → 413
  const big = await ctx.request.post(`${base}/api/abstracts`, {
    multipart: { ...fields, file: { name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 0x25) } },
  })
  expect(big.status()).toBe(413)

  // 不带附件 → 422
  const noFile = await ctx.request.post(`${base}/api/abstracts`, { multipart: { ...fields } })
  expect(noFile.status()).toBe(422)

  // 全部被拒 → 没有产生投稿
  const mine = await ctx.request.get(`${base}/api/abstracts/mine`).then(r => r.json())
  expect(mine.abstracts).toHaveLength(0)
  await ctx.close()
})
