import type { Db } from '../db'
import type { SubmitAbstractInput } from '../../shared/schemas/abstract'
import {
  countPendingAbstracts,
  countUserAbstracts,
  findAbstractById,
  insertAbstract,
  insertAbstractEvent,
  listAbstractsByUser,
  listEventsByAbstract,
  updateAbstractContent,
} from '../repositories/abstracts'
import { DomainError } from './registration.service'

/**
 * AbstractSubmissionService（门户侧）— 投稿与重投。
 *   submitted → accepted | returned（审稿动作在独立的 admin 项目中实现）
 *   returned  → submitted（投稿人修改后重投，版本 +1）
 * 每次状态迁移都写入 abstract_events（投稿人可见的历史记录）。
 * 防灌水：每账号累计 ≤ 20 篇；同时待审中的稿件 ≤ 2 篇。
 */

const MAX_TOTAL_ABSTRACTS = 20
const MAX_PENDING_ABSTRACTS = 2

export interface AbstractWithEvents {
  id: string
  title: string
  topic: string
  reportType: string
  abstractText: string
  submitterName: string
  submitterAffiliation: string
  authors: Array<{ name: string, affiliation: string }>
  status: string
  version: number
  createdAt: Date
  updatedAt: Date
  events: Array<{ id: string, kind: string, comment: string | null, actor: string, createdAt: Date }>
}

export async function submitAbstract(
  db: Db,
  user: { id: string, email: string, fullName: string | null },
  input: SubmitAbstractInput,
) {
  const total = await countUserAbstracts(db, user.id)
  if (total >= MAX_TOTAL_ABSTRACTS) {
    throw new DomainError(409, `投稿数量已达上限（${MAX_TOTAL_ABSTRACTS} 篇），请联系会务组`)
  }
  const pending = await countPendingAbstracts(db, user.id)
  if (pending >= MAX_PENDING_ABSTRACTS) {
    throw new DomainError(409, `您已有 ${pending} 篇待审稿件，请等待审稿结果后再投稿`)
  }

  const abstract = await insertAbstract(db, {
    userId: user.id,
    title: input.title,
    topic: input.topic,
    reportType: input.reportType,
    abstractText: input.abstractText,
    submitterName: input.submitterName,
    submitterAffiliation: input.submitterAffiliation,
    authors: input.authors,
  })
  await insertAbstractEvent(db, {
    abstractId: abstract.id,
    kind: 'submitted',
    actor: `user:${user.email}`,
  })
  return abstract
}

export async function resubmitAbstract(
  db: Db,
  abstractId: string,
  user: { id: string, email: string },
  input: SubmitAbstractInput,
) {
  const abstract = await findAbstractById(db, abstractId)
  if (!abstract) throw new DomainError(404, '稿件不存在')
  if (abstract.userId !== user.id) throw new DomainError(403, '只能操作自己的稿件')
  if (abstract.status !== 'returned') throw new DomainError(409, '仅被返稿的稿件可以修改重投')

  const pendingOthers = await countPendingAbstracts(db, user.id)
  if (pendingOthers >= MAX_PENDING_ABSTRACTS) {
    throw new DomainError(409, `您已有 ${pendingOthers} 篇待审稿件，请等待审稿结果后再重投`)
  }

  const updated = await updateAbstractContent(db, abstractId, {
    title: input.title,
    topic: input.topic,
    reportType: input.reportType,
    abstractText: input.abstractText,
    submitterName: input.submitterName,
    submitterAffiliation: input.submitterAffiliation,
    authors: input.authors,
  })
  if (!updated) throw new DomainError(404, '稿件不存在')
  await insertAbstractEvent(db, {
    abstractId,
    kind: 'resubmitted',
    actor: `user:${user.email}`,
  })
  return updated
}

export async function listMyAbstractsWithEvents(db: Db, userId: string): Promise<AbstractWithEvents[]> {
  const mine = await listAbstractsByUser(db, userId)
  const withEvents = await Promise.all(mine.map(async abstract => ({
    ...abstract,
    events: await listEventsByAbstract(db, abstract.id),
  })))
  return withEvents
}
