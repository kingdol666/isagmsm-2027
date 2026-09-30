import type { Db } from '../db'
import type { SubmitAbstractInput } from '../../shared/schemas/abstract'
import type { AbstractSnapshot } from '../repositories/abstracts'
import type { RawAttachment } from '../utils/attachment'
import {
  countPendingAbstracts,
  countUserAbstracts,
  findAbstractById,
  insertAbstract,
  insertAbstractEvent,
  listAbstractsByUser,
  listEventsByAbstract,
  setAbstractStatus,
  updateAbstractContent,
} from '../repositories/abstracts'
import { validateAttachment } from '../utils/attachment'
import { abstractStorage } from './storage.service'
import { DomainError } from './registration.service'

/**
 * AbstractSubmissionService（门户侧）— 投稿 / 多篇投递 / 撤回 / 重投。
 *   submitted → accepted | returned（审稿动作在独立的 admin 项目中实现）
 *   submitted | returned → withdrawn（投稿人撤回；管理台列表不再显示）
 *   returned  → submitted（投稿人修改后重投，版本 +1）
 * 每次状态迁移都写入 abstract_events；投稿/重投附带稿件内容快照 + Word/PDF 附件
 * （附件先上传 OSS，再落库 —— 每个版本独立存储一份附件）。
 * 防灌水：每账号有效稿件 ≤ 20 篇（已撤回不计）；同时待审 ≤ 3 篇。
 */

const MAX_TOTAL_ABSTRACTS = 20
const MAX_PENDING_ABSTRACTS = 3

/** 存储适配器 —— 单元测试可注入假实现（不依赖 MinIO）。 */
export interface AbstractStorage {
  putAbstractFile(att: { fileName: string, contentType: string, size: number, data: Buffer }): Promise<string>
}

export type AbstractAttachmentInput = RawAttachment

/** 上传前先做全量附件校验（扩展名白名单 + 魔数 + 大小）。 */
function prepareAttachment(raw: AbstractAttachmentInput) {
  return validateAttachment(raw)
}

function snapshotOf(input: SubmitAbstractInput): AbstractSnapshot {
  return {
    title: input.title,
    topic: input.topic,
    reportType: input.reportType,
    abstractText: input.abstractText,
    submitterName: input.submitterName,
    submitterAffiliation: input.submitterAffiliation,
    authors: input.authors,
  }
}

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
  events: Array<{
    id: string
    kind: string
    comment: string | null
    snapshot: AbstractSnapshot | null
    version: number | null
    fileName: string | null
    fileSize: number | null
    fileType: string | null
    actor: string
    createdAt: Date
  }>
}

export async function submitAbstract(
  db: Db,
  user: { id: string, email: string, fullName: string | null },
  input: SubmitAbstractInput,
  attachment: AbstractAttachmentInput,
  storage: AbstractStorage = abstractStorage,
) {
  const total = await countUserAbstracts(db, user.id)
  if (total >= MAX_TOTAL_ABSTRACTS) {
    throw new DomainError(409, `投稿数量已达上限（${MAX_TOTAL_ABSTRACTS} 篇），请联系会务组`)
  }
  const pending = await countPendingAbstracts(db, user.id)
  if (pending >= MAX_PENDING_ABSTRACTS) {
    throw new DomainError(409, `您已有 ${pending} 篇待审稿件，请等待审稿结果后再投稿`)
  }

  // 附件：先校验并上传 OSS（失败则整体放弃），再落库
  const att = prepareAttachment(attachment)
  const fileKey = await storage.putAbstractFile(att)

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
    snapshot: snapshotOf(input),
    version: abstract.version,
    file: { fileName: att.fileName, fileKey, fileSize: att.size, fileType: att.contentType },
    actor: `user:${user.email}`,
  })
  return abstract
}

export async function resubmitAbstract(
  db: Db,
  abstractId: string,
  user: { id: string, email: string },
  input: SubmitAbstractInput,
  attachment: AbstractAttachmentInput,
  storage: AbstractStorage = abstractStorage,
) {
  const abstract = await findAbstractById(db, abstractId)
  if (!abstract) throw new DomainError(404, '稿件不存在')
  if (abstract.userId !== user.id) throw new DomainError(403, '只能操作自己的稿件')
  if (abstract.status !== 'returned') throw new DomainError(409, '仅被返稿的稿件可以修改重投')

  const pendingOthers = await countPendingAbstracts(db, user.id)
  if (pendingOthers >= MAX_PENDING_ABSTRACTS) {
    throw new DomainError(409, `您已有 ${pendingOthers} 篇待审稿件，请等待审稿结果后再重投`)
  }

  // 新版本新附件：先上传 OSS，再更新稿件与版本
  const att = prepareAttachment(attachment)
  const fileKey = await storage.putAbstractFile(att)

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
    snapshot: snapshotOf(input),
    version: updated.version,
    file: { fileName: att.fileName, fileKey, fileSize: att.size, fileType: att.contentType },
    actor: `user:${user.email}`,
  })
  return updated
}

/** 撤回：仅本人、仅待审或已返稿的稿件；撤回后管理台列表不再显示。 */
export async function withdrawAbstract(
  db: Db,
  abstractId: string,
  user: { id: string, email: string },
) {
  const abstract = await findAbstractById(db, abstractId)
  if (!abstract) throw new DomainError(404, '稿件不存在')
  if (abstract.userId !== user.id) throw new DomainError(403, '只能操作自己的稿件')
  if (abstract.status !== 'submitted' && abstract.status !== 'returned') {
    throw new DomainError(409, '当前状态不可撤回（已接收稿件或已撤回）')
  }

  const updated = await setAbstractStatus(db, abstractId, 'withdrawn')
  if (!updated) throw new DomainError(404, '稿件不存在')
  await insertAbstractEvent(db, {
    abstractId,
    kind: 'withdrawn',
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
