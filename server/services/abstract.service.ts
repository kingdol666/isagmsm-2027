import type { Db } from '../db'
import type { SubmitAbstractInput } from '../../shared/schemas/abstract'
import {
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
 */

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
