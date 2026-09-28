import type { Db } from '../db'
import type { ReviewAbstractInput, SubmitAbstractInput } from '../../shared/schemas/abstract'
import {
  findAbstractById,
  insertAbstract,
  insertAbstractEvent,
  listAbstractsByUser,
  listAllAbstracts,
  listEventsByAbstract,
  setAbstractStatus,
  updateAbstractContent,
} from '../repositories/abstracts'
import { findUserById } from '../repositories/users'
import { DomainError } from './registration.service'
import type { AbstractDecisionMail, Mailer } from './mail.types'

/**
 * AbstractReviewService — 投稿送审状态机。
 *   submitted → accepted（接收，附审稿意见）
 *   submitted → returned （返稿，附返稿意见，邮件通知投稿人）
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

/** 审稿（admin）：迁移状态 + 记录事件 + 邮件通知投稿人注册邮箱。 */
export async function reviewAbstract(
  db: Db,
  abstractId: string,
  reviewerName: string,
  input: ReviewAbstractInput,
  mailer: Mailer,
) {
  const abstract = await findAbstractById(db, abstractId)
  if (!abstract) throw new DomainError(404, '稿件不存在')
  if (abstract.status !== 'submitted') throw new DomainError(409, '该稿件当前状态不可审稿（已审结或待重投）')

  const action = input.action === 'accept' ? 'accepted' : 'returned'
  const comment = input.comment.trim()
  await setAbstractStatus(db, abstractId, action)
  await insertAbstractEvent(db, {
    abstractId,
    kind: action,
    comment,
    actor: `admin:${reviewerName}`,
  })

  const owner = await findUserById(db, abstract.userId)
  if (owner) {
    const decisionMail: AbstractDecisionMail = {
      email: owner.email,
      displayName: abstract.submitterName || owner.fullName || owner.email,
      title: abstract.title,
      action,
      comment,
      version: abstract.version,
    }
    try {
      await mailer.sendAbstractDecision(decisionMail)
    }
    catch (error) {
      // 审稿结果已落库；邮件失败不阻塞审稿，由邮件服务自身重试/告警
      console.error(`[abstract] decision mail failed for ${owner.email}:`, error)
    }
  }

  return { ...abstract, status: action }
}

export async function listMyAbstractsWithEvents(db: Db, userId: string): Promise<AbstractWithEvents[]> {
  const mine = await listAbstractsByUser(db, userId)
  const withEvents = await Promise.all(mine.map(async abstract => ({
    ...abstract,
    events: await listEventsByAbstract(db, abstract.id),
  })))
  return withEvents
}

export async function listAbstractsForAdmin(db: Db) {
  return listAllAbstracts(db)
}

export async function getAbstractEventsForAdmin(db: Db, abstractId: string) {
  return listEventsByAbstract(db, abstractId)
}
