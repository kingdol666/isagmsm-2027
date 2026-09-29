import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createDb } from '../../server/db'
import { credentials, registrationTypes, registrations, users } from '../../server/db/schema'
import { submitAbstract, resubmitAbstract, withdrawAbstract, listMyAbstractsWithEvents } from '../../server/services/abstract.service'
import { reviewAbstract, setMembershipWithBinding } from '../../admin/server/services/console.service'
import { listAllAbstracts } from '../../admin/server/repositories/console'
import { ensureCredential } from '../../server/services/credential.service'
import { DomainError } from '../../server/services/registration.service'
import { reviewAbstractSchema } from '../../shared/schemas/abstract'
import type { ConsoleMailer } from '../../admin/server/services/mail.service'

/**
 * Abstract submission/review integration tests against the dedicated test db
 * (schema applied via drizzle-kit migrate with DATABASE_URL_TEST).
 * 审稿动作来自管理台服务（admin/server/services/console.service）——
 * 与门户解耦后，审稿是管理台的职责。
 */

const DATABASE_URL = process.env.DATABASE_URL_TEST
  ?? 'postgresql://pps:pps_dev_pw@localhost:5433/pps2026_test'

const db = createDb(DATABASE_URL)
const runId = Date.now()

function fakeMailer() {
  const sent: Array<{ email: string, action: string, comment: string, version: number }> = []
  return {
    sent,
    mailer: {
      async sendAbstractDecision(mail: { email: string, action: 'accepted' | 'returned', comment: string, version: number }) {
        sent.push({ email: mail.email, action: mail.action, comment: mail.comment, version: mail.version })
      },
    } satisfies ConsoleMailer,
  }
}

const baseInput = {
  title: '双网络离子凝胶的界面增强策略',
  topic: 'A' as const,
  reportType: 'oral' as const,
  abstractText: '本研究提出一种双网络离子凝胶的界面增强策略，系统研究其机械性能与电化学稳定性。（正文略，用于满足最少长度要求）',
  submitterName: '陈投稿',
  submitterAffiliation: '凝胶大学材料学院',
  authors: [
    { name: '陈投稿', affiliation: '凝胶大学材料学院' },
    { name: '李合作', affiliation: '软物质研究所' },
  ],
}

beforeAll(async () => {
  // tables exist via migrations; nothing to seed — each test creates its own user
})

afterAll(async () => {
  await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end()
})

async function newUser(tag: string) {
  const [user] = await db.insert(users).values({
    email: `abs-${tag}-${runId}@example.test`,
    fullName: `投稿人${tag}`,
    emailVerifiedAt: new Date(),
  }).returning()
  return user!
}

describe('AbstractReviewService (integration)', () => {
  it('submits an abstract and records the submitted event', async () => {
    const user = await newUser('submit')
    const abstract = await submitAbstract(db, { id: user.id, email: user.email, fullName: user.fullName }, baseInput)
    expect(abstract.status).toBe('submitted')
    expect(abstract.version).toBe(1)
    expect(abstract.authors).toHaveLength(2)

    const mine = await listMyAbstractsWithEvents(db, user.id)
    expect(mine).toHaveLength(1)
    expect(mine[0]!.events.map(e => e.kind)).toEqual(['submitted'])
    expect(mine[0]!.events[0]!.actor).toBe(`user:${user.email}`)
  })

  it('accepts a submission with a review comment and emails the owner', async () => {
    const user = await newUser('accept')
    const abstract = await submitAbstract(db, { id: user.id, email: user.email, fullName: user.fullName }, baseInput)
    const { mailer, sent } = fakeMailer()

    const reviewed = await reviewAbstract(db, abstract.id, 'chief', { action: 'accept', comment: '研究完整，予以接收。' }, mailer)
    expect(reviewed.status).toBe('accepted')

    const mine = await listMyAbstractsWithEvents(db, user.id)
    expect(mine[0]!.status).toBe('accepted')
    expect(mine[0]!.events.map(e => e.kind)).toEqual(['accepted', 'submitted'])
    expect(mine[0]!.events[0]!.comment).toBe('研究完整，予以接收。')
    expect(sent).toEqual([
      { email: user.email, action: 'accepted', comment: '研究完整，予以接收。', version: 1 },
    ])
  })

  it('refuses to review an already-settled abstract', async () => {
    const user = await newUser('settled')
    const abstract = await submitAbstract(db, { id: user.id, email: user.email, fullName: user.fullName }, baseInput)
    const { mailer } = fakeMailer()
    await reviewAbstract(db, abstract.id, 'chief', { action: 'accept', comment: 'ok' }, mailer)
    await expect(reviewAbstract(db, abstract.id, 'chief', { action: 'accept', comment: 'again' }, mailer))
      .rejects.toThrow('不可审稿')
  })

  it('returns a submission with a mandatory comment, then resubmission bumps the version', async () => {
    const user = await newUser('return')
    const abstract = await submitAbstract(db, { id: user.id, email: user.email, fullName: user.fullName }, baseInput)
    const { mailer, sent } = fakeMailer()

    await reviewAbstract(db, abstract.id, 'chief', { action: 'return', comment: '摘要缺少关键实验数据，请补充后重新提交。' }, mailer)
    expect(sent[0]).toMatchObject({ email: user.email, action: 'returned' })

    // resubmission by another user is forbidden
    const other = await newUser('other')
    await expect(resubmitAbstract(db, abstract.id, { id: other.id, email: other.email }, baseInput))
      .rejects.toBeInstanceOf(DomainError)

    const revised = { ...baseInput, title: '双网络离子凝胶的界面增强策略（修订版）' }
    const updated = await resubmitAbstract(db, abstract.id, { id: user.id, email: user.email }, revised)
    expect(updated.status).toBe('submitted')
    expect(updated.version).toBe(2)
    expect(updated.title).toContain('修订版')

    const mine = await listMyAbstractsWithEvents(db, user.id)
    expect(mine[0]!.events.map(e => e.kind)).toEqual(['resubmitted', 'returned', 'submitted'])

    // final accept on v2
    await reviewAbstract(db, abstract.id, 'chief', { action: 'accept', comment: '修改到位，接收。' }, mailer)
    const final = await listMyAbstractsWithEvents(db, user.id)
    expect(final[0]!.status).toBe('accepted')
    expect(final[0]!.version).toBe(2)
    expect(sent).toHaveLength(2)
    expect(sent[1]).toMatchObject({ action: 'accepted', version: 2 })
  })

  it('rejects resubmission of a non-returned abstract', async () => {
    const user = await newUser('noresub')
    const abstract = await submitAbstract(db, { id: user.id, email: user.email, fullName: user.fullName }, baseInput)
    await expect(resubmitAbstract(db, abstract.id, { id: user.id, email: user.email }, baseInput))
      .rejects.toBeInstanceOf(DomainError)
  })

  it('stores a content snapshot on submit and resubmit (complete version history)', async () => {
    const user = await newUser('snapshot')
    const abstract = await submitAbstract(db, { id: user.id, email: user.email, fullName: user.fullName }, baseInput)
    const { mailer } = fakeMailer()
    await reviewAbstract(db, abstract.id, 'chief', { action: 'return', comment: '请补充实验部分。' }, mailer)

    const revised = { ...baseInput, title: '双网络离子凝胶的界面增强策略（第二版）' }
    await resubmitAbstract(db, abstract.id, { id: user.id, email: user.email }, revised)

    const mine = await listMyAbstractsWithEvents(db, user.id)
    const snapshotEvents = mine[0]!.events.filter(e => e.snapshot)
    expect(snapshotEvents).toHaveLength(2)
    // 事件倒序：最新（重投）在前
    expect(snapshotEvents[0]!.snapshot!.title).toContain('第二版')
    expect(snapshotEvents[1]!.snapshot!.title).toBe(baseInput.title)
    expect(snapshotEvents[1]!.snapshot!.authors).toHaveLength(2)
  })

  it('withdraws own pending submission, frees the pending slot, hides from admin list', async () => {
    const user = await newUser('withdraw')
    const abstract = await submitAbstract(db, { id: user.id, email: user.email, fullName: user.fullName }, baseInput)

    // 他人不可撤回
    const other = await newUser('withdraw-other')
    await expect(withdrawAbstract(db, abstract.id, { id: other.id, email: other.email }))
      .rejects.toBeInstanceOf(DomainError)

    const withdrawn = await withdrawAbstract(db, abstract.id, { id: user.id, email: user.email })
    expect(withdrawn.status).toBe('withdrawn')

    // 管理台列表不再显示已撤回稿件
    const adminList = await listAllAbstracts(db)
    expect(adminList.some(a => a.id === abstract.id)).toBe(false)

    // 撤回不可逆（再撤 → 409），重投也不允许
    await expect(withdrawAbstract(db, abstract.id, { id: user.id, email: user.email }))
      .rejects.toBeInstanceOf(DomainError)
    await expect(resubmitAbstract(db, abstract.id, { id: user.id, email: user.email }, baseInput))
      .rejects.toBeInstanceOf(DomainError)

    // 用户自己的历史完整保留（投稿 + 撤回），且内容快照仍在
    const mine = await listMyAbstractsWithEvents(db, user.id)
    expect(mine[0]!.status).toBe('withdrawn')
    expect(mine[0]!.events.map(e => e.kind)).toEqual(['withdrawn', 'submitted'])
    expect(mine[0]!.events.find(e => e.kind === 'submitted')!.snapshot!.title).toBe(baseInput.title)
  })

  it('auto-revokes active credentials when membership is cancelled', async () => {
    // 会员-凭证绑定：取消会员在同一事务内吊销全部 active 凭证
    const [type] = await db.insert(registrationTypes).values({
      code: `bind-${runId}`,
      name: '绑定测试类型',
      priceFen: 100000,
    }).returning()
    const [user] = await db.insert(users).values({
      email: `bind-${runId}@example.test`,
      fullName: '绑定测试',
      emailVerifiedAt: new Date(),
    }).returning()
    const [registration] = await db.insert(registrations).values({
      userId: user!.id,
      typeId: type!.id,
      status: 'confirmed',
      displayId: `BIND-${runId}`,
      fullName: '绑定测试',
      email: user!.email,
      affiliation: '绑定大学',
      country: '中国',
      isMember: true,
    }).returning()

    const credential = await ensureCredential(db, registration!.id)
    expect(credential).not.toBeNull()
    expect(credential!.status).toBe('active')

    const result = await setMembershipWithBinding(db, registration!.id, false)
    expect(result).toEqual({ isMember: false, revokedCredentials: 1 })

    const after = await db.select().from(credentials).where(eq(credentials.registrationId, registration!.id))
    expect(after).toHaveLength(1)
    expect(after[0]!.status).toBe('revoked')
  })
})

describe('reviewAbstractSchema (validation)', () => {
  it('requires a comment of at least 5 chars when returning', () => {
    expect(reviewAbstractSchema.safeParse({ action: 'return', comment: '太短' }).success).toBe(false)
    expect(reviewAbstractSchema.safeParse({ action: 'return', comment: '请补充实验部分后重新提交。' }).success).toBe(true)
    expect(reviewAbstractSchema.safeParse({ action: 'accept', comment: '' }).success).toBe(true)
  })

  it('rejects unknown actions', () => {
    expect(reviewAbstractSchema.safeParse({ action: 'reject', comment: '' }).success).toBe(false)
  })
})
