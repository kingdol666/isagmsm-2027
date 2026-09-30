import type { DbExecutor } from '../db'
import type { AbstractAuthor, AbstractEventSnapshot } from '../db/schema'
import { abstractEvents, abstracts, users } from '../db/schema'
import { and, desc, eq, isNotNull, ne, sql } from 'drizzle-orm'

export type { AbstractAuthor, AbstractEventSnapshot as AbstractSnapshot }

export interface AbstractRow {
  id: string
  userId: string
  title: string
  topic: string
  reportType: string
  abstractText: string
  submitterName: string
  submitterAffiliation: string
  authors: AbstractAuthor[]
  status: string
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface AbstractEventRow {
  id: string
  abstractId: string
  kind: string
  comment: string | null
  snapshot: AbstractEventSnapshot | null
  version: number | null
  fileName: string | null
  fileKey: string | null
  fileSize: number | null
  fileType: string | null
  actor: string
  createdAt: Date
}

export async function insertAbstract(db: DbExecutor, values: {
  userId: string
  title: string
  topic: string
  reportType: string
  abstractText: string
  submitterName: string
  submitterAffiliation: string
  authors: AbstractAuthor[]
}): Promise<AbstractRow> {
  const rows = await db.insert(abstracts).values(values).returning()
  return rows[0]!
}

/** 重投：覆盖稿件内容、版本 +1、状态回到 submitted。仅 returned 状态允许（服务层守卫）。 */
export async function updateAbstractContent(db: DbExecutor, id: string, values: {
  title: string
  topic: string
  reportType: string
  abstractText: string
  submitterName: string
  submitterAffiliation: string
  authors: AbstractAuthor[]
}): Promise<AbstractRow | null> {
  const rows = await db.update(abstracts).set({
    ...values,
    status: 'submitted',
    version: sql`${abstracts.version} + 1`,
    updatedAt: new Date(),
  }).where(eq(abstracts.id, id)).returning()
  return rows[0] ?? null
}

export async function findAbstractById(db: DbExecutor, id: string): Promise<AbstractRow | null> {
  const rows = await db.select().from(abstracts).where(eq(abstracts.id, id)).limit(1)
  return rows[0] ?? null
}

export async function listAbstractsByUser(db: DbExecutor, userId: string): Promise<AbstractRow[]> {
  return db.select().from(abstracts).where(eq(abstracts.userId, userId)).orderBy(desc(abstracts.createdAt))
}

/** 投稿数量上限（防灌水）用的计数。 */
export async function countUserAbstracts(db: DbExecutor, userId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(abstracts)
    .where(and(eq(abstracts.userId, userId), ne(abstracts.status, 'withdrawn')))
  return rows[0]?.n ?? 0
}

export async function countPendingAbstracts(db: DbExecutor, userId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(abstracts)
    .where(and(eq(abstracts.userId, userId), eq(abstracts.status, 'submitted')))
  return rows[0]?.n ?? 0
}

export async function listAllAbstracts(db: DbExecutor): Promise<Array<AbstractRow & { userEmail: string | null }>> {
  return db
    .select({
      id: abstracts.id,
      userId: abstracts.userId,
      title: abstracts.title,
      topic: abstracts.topic,
      reportType: abstracts.reportType,
      abstractText: abstracts.abstractText,
      submitterName: abstracts.submitterName,
      submitterAffiliation: abstracts.submitterAffiliation,
      authors: abstracts.authors,
      status: abstracts.status,
      version: abstracts.version,
      createdAt: abstracts.createdAt,
      updatedAt: abstracts.updatedAt,
      userEmail: users.email,
    })
    .from(abstracts)
    .leftJoin(users, eq(abstracts.userId, users.id))
    .orderBy(desc(abstracts.createdAt))
}

/** 审稿动作（admin）：更新状态并写入事件，同一事务由服务层用 db.transaction 包裹。 */
export async function setAbstractStatus(db: DbExecutor, id: string, status: 'accepted' | 'returned' | 'withdrawn'): Promise<AbstractRow | null> {
  const rows = await db.update(abstracts).set({ status, updatedAt: new Date() }).where(eq(abstracts.id, id)).returning()
  return rows[0] ?? null
}

export async function insertAbstractEvent(db: DbExecutor, values: {
  abstractId: string
  kind: 'submitted' | 'resubmitted' | 'accepted' | 'returned' | 'withdrawn'
  comment?: string | null
  snapshot?: AbstractEventSnapshot | null
  /** 稿件版本（投稿/重投事件必填；审稿/撤回事件留空） */
  version?: number | null
  /** 附件元数据（仅投稿/重投事件；对象存 OSS，DB 只存 key） */
  file?: { fileName: string, fileKey: string, fileSize: number, fileType: string } | null
  actor: string
}): Promise<AbstractEventRow> {
  const rows = await db.insert(abstractEvents).values({
    abstractId: values.abstractId,
    kind: values.kind,
    comment: values.comment ?? null,
    snapshot: values.snapshot ?? null,
    version: values.version ?? null,
    fileName: values.file?.fileName ?? null,
    fileKey: values.file?.fileKey ?? null,
    fileSize: values.file?.fileSize ?? null,
    fileType: values.file?.fileType ?? null,
    actor: values.actor,
  }).returning()
  return rows[0]!
}

/** 按版本取附件元数据（投稿/重投事件）——下载接口用。 */
export async function findAbstractEventFile(db: DbExecutor, abstractId: string, version: number): Promise<AbstractEventRow | null> {
  const rows = await db.select().from(abstractEvents)
    .where(and(
      eq(abstractEvents.abstractId, abstractId),
      eq(abstractEvents.version, version),
      isNotNull(abstractEvents.fileKey),
    ))
    .limit(1)
  return rows[0] ?? null
}

export async function listEventsByAbstract(db: DbExecutor, abstractId: string): Promise<AbstractEventRow[]> {
  return db
    .select()
    .from(abstractEvents)
    .where(and(eq(abstractEvents.abstractId, abstractId)))
    .orderBy(desc(abstractEvents.createdAt))
}
