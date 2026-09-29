import { and, desc, eq, inArray, ilike, or, sql } from 'drizzle-orm'
import type { DbExecutor } from '../db'
import {
  abstractEvents,
  abstracts,
  adminUsers,
  checkins,
  credentials,
  orders,
  registrations,
  registrationTypes,
  users,
} from '../db/schema'

/** 管理台查询层 —— 全部走 Drizzle 参数化构建器。 */

export async function findAdminByUsername(db: DbExecutor, username: string) {
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1)
  return rows[0] ?? null
}

export interface ParticipantRow {
  id: string
  displayId: string
  fullName: string
  email: string
  affiliation: string
  country: string
  typeName: string
  status: string
  isMember: boolean
  createdAt: Date
  order: {
    id: string
    orderNo: string
    totalFen: number
    currency: string
    status: string
    reference: string | null
    claimedAt: Date | null
  } | null
  credential: { id: string, token: string, status: string } | null
  checkedIn: boolean
}

export async function listParticipants(db: DbExecutor, query: { q?: string, status?: string }): Promise<ParticipantRow[]> {
  const conditions = []
  if (query.q) {
    const like = `%${query.q}%`
    conditions.push(or(
      ilike(registrations.fullName, like),
      ilike(registrations.email, like),
      ilike(registrations.displayId, like),
      ilike(registrations.affiliation, like),
    ))
  }
  if (query.status && ['submitted', 'confirmed', 'cancelled'].includes(query.status)) {
    conditions.push(eq(registrations.status, query.status))
  }

  const base = db
    .select({
      id: registrations.id,
      displayId: registrations.displayId,
      fullName: registrations.fullName,
      email: registrations.email,
      affiliation: registrations.affiliation,
      country: registrations.country,
      typeName: registrationTypes.name,
      status: registrations.status,
      isMember: registrations.isMember,
      createdAt: registrations.createdAt,
    })
    .from(registrations)
    .innerJoin(registrationTypes, eq(registrations.typeId, registrationTypes.id))
    .$dynamic()

  const rows = await (conditions.length ? base.where(and(...conditions)) : base)
    .orderBy(desc(registrations.createdAt))
    .limit(300)

  if (rows.length === 0) return []

  const ids = rows.map(r => r.id)
  const orderRows = await db.select().from(orders).where(inArray(orders.registrationId, ids)).orderBy(desc(orders.createdAt))
  const credRows = await db
    .select({
      id: credentials.id,
      registrationId: credentials.registrationId,
      token: credentials.token,
      status: credentials.status,
      checkedInAt: checkins.checkedInAt,
    })
    .from(credentials)
    .leftJoin(checkins, eq(checkins.credentialId, credentials.id))
    .where(inArray(credentials.registrationId, ids))

  return rows.map((row) => {
    const order = orderRows.find(o => o.registrationId === row.id) ?? null
    const cred = credRows.find(c => c.registrationId === row.id) ?? null
    return {
      id: row.id,
      displayId: row.displayId,
      fullName: row.fullName,
      email: row.email,
      affiliation: row.affiliation,
      country: row.country,
      typeName: row.typeName,
      status: row.status,
      isMember: row.isMember,
      createdAt: row.createdAt,
      order: order
        ? {
            id: order.id,
            orderNo: order.orderNo,
            totalFen: order.totalFen,
            currency: order.currency,
            status: order.status,
            reference: order.reference,
            claimedAt: order.claimedAt,
          }
        : null,
      credential: cred ? { id: cred.id, token: cred.token, status: cred.status } : null,
      checkedIn: cred?.checkedInAt != null,
    }
  })
}

export async function findOrderWithParticipant(db: DbExecutor, orderId: string) {
  const rows = await db
    .select({
      order: orders,
      registrationId: registrations.id,
      displayId: registrations.displayId,
      fullName: registrations.fullName,
      email: registrations.email,
      typeName: registrationTypes.name,
    })
    .from(orders)
    .innerJoin(registrations, eq(orders.registrationId, registrations.id))
    .innerJoin(registrationTypes, eq(registrations.typeId, registrationTypes.id))
    .where(eq(orders.id, orderId))
    .limit(1)
  return rows[0] ?? null
}

export async function listApprovalQueue(db: DbExecutor) {
  return db
    .select({
      orderId: orders.id,
      orderNo: orders.orderNo,
      status: orders.status,
      totalFen: orders.totalFen,
      currency: orders.currency,
      reference: orders.reference,
      claimedAt: orders.claimedAt,
      displayId: registrations.displayId,
      fullName: registrations.fullName,
      email: registrations.email,
      affiliation: registrations.affiliation,
      typeName: registrationTypes.name,
    })
    .from(orders)
    .innerJoin(registrations, eq(orders.registrationId, registrations.id))
    .innerJoin(registrationTypes, eq(registrations.typeId, registrationTypes.id))
    .where(inArray(orders.status, ['pending', 'reviewing']))
    .orderBy(sql`orders.claimed_at desc nulls last`)
    .limit(200)
}

export async function findRegistrationForOrder(db: DbExecutor, orderId: string) {
  const rows = await db
    .select({ registrationId: registrations.id, isMember: registrations.isMember })
    .from(orders)
    .innerJoin(registrations, eq(orders.registrationId, registrations.id))
    .where(eq(orders.id, orderId))
    .limit(1)
  return rows[0] ?? null
}

export async function setMembership(db: DbExecutor, registrationId: string, isMember: boolean) {
  const rows = await db.update(registrations)
    .set({ isMember, updatedAt: new Date() })
    .where(eq(registrations.id, registrationId))
    .returning({ id: registrations.id, isMember: registrations.isMember })
  return rows[0] ?? null
}

/** 取消会员的联动：吊销该报名下所有 active 凭证（旧 QR 立即失效）。 */
export async function revokeActiveCredentials(db: DbExecutor, registrationId: string) {
  const rows = await db.update(credentials)
    .set({ status: 'revoked' })
    .where(and(eq(credentials.registrationId, registrationId), eq(credentials.status, 'active')))
    .returning({ id: credentials.id })
  return rows.length
}

export async function findCredentialByRegistration(db: DbExecutor, registrationId: string) {
  const rows = await db.select().from(credentials).where(eq(credentials.registrationId, registrationId)).limit(1)
  return rows[0] ?? null
}

export async function insertCredential(db: DbExecutor, values: { registrationId: string, token: string }) {
  const rows = await db.insert(credentials).values(values).returning()
  return rows[0]!
}

export async function setCredentialStatus(db: DbExecutor, id: string, status: 'active' | 'revoked') {
  const rows = await db.update(credentials).set({ status }).where(eq(credentials.id, id)).returning()
  return rows[0] ?? null
}

export async function transitionOrder(db: DbExecutor, orderId: string, from: string, to: string) {
  const rows = await db.update(orders)
    .set({ status: to, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, from)))
    .returning()
  return rows[0] ?? null
}

export async function setOrderReview(db: DbExecutor, orderId: string, fields: {
  reviewedBy?: string
  reviewedAt?: Date
  reviewNote?: string | null
  reference?: string | null
  claimedAt?: Date
}) {
  await db.update(orders).set({ ...fields, updatedAt: new Date() }).where(eq(orders.id, orderId))
}

export async function confirmIfSubmitted(db: DbExecutor, registrationId: string) {
  await db.update(registrations)
    .set({ status: 'confirmed', updatedAt: new Date() })
    .where(and(eq(registrations.id, registrationId), eq(registrations.status, 'submitted')))
}

export async function listAllAbstracts(db: DbExecutor) {
  return db
    .select({
      id: abstracts.id,
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
      userEmail: users.email,
    })
    .from(abstracts)
    .leftJoin(users, eq(abstracts.userId, users.id))
    .orderBy(desc(abstracts.createdAt))
}

export async function findAbstractById(db: DbExecutor, id: string) {
  const rows = await db.select().from(abstracts).where(eq(abstracts.id, id)).limit(1)
  return rows[0] ?? null
}

export async function listAbstractEvents(db: DbExecutor, abstractId: string) {
  return db.select().from(abstractEvents)
    .where(eq(abstractEvents.abstractId, abstractId))
    .orderBy(desc(abstractEvents.createdAt))
}

export async function insertAbstractEvent(db: DbExecutor, values: {
  abstractId: string
  kind: string
  comment?: string | null
  actor: string
}) {
  await db.insert(abstractEvents).values(values)
}

export async function setAbstractStatus(db: DbExecutor, id: string, status: 'accepted' | 'returned') {
  const rows = await db.update(abstracts)
    .set({ status, updatedAt: new Date() })
    .where(eq(abstracts.id, id))
    .returning({ id: abstracts.id, title: abstracts.title, version: abstracts.version })
  return rows[0] ?? null
}

export async function findAbstractOwner(db: DbExecutor, abstractId: string) {
  const rows = await db
    .select({ email: users.email, fullName: users.fullName })
    .from(abstracts)
    .innerJoin(users, eq(abstracts.userId, users.id))
    .where(eq(abstracts.id, abstractId))
    .limit(1)
  return rows[0] ?? null
}

export async function dashboardStats(db: DbExecutor) {
  const [participants] = await db.select({ n: sql<number>`count(*)::int` }).from(registrations)
  const [members] = await db.select({ n: sql<number>`count(*)::int` }).from(registrations).where(eq(registrations.isMember, true))
  const [reviewing] = await db.select({ n: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, 'reviewing'))
  const [abstractsPending] = await db.select({ n: sql<number>`count(*)::int` }).from(abstracts).where(eq(abstracts.status, 'submitted'))
  const [revenue] = await db.select({ fen: sql<number>`coalesce(sum(total_fen), 0)::int` }).from(orders).where(eq(orders.status, 'paid'))
  const [checkinCount] = await db.select({ n: sql<number>`count(*)::int` }).from(checkins)
  return {
    participants: participants?.n ?? 0,
    members: members?.n ?? 0,
    reviewingOrders: reviewing?.n ?? 0,
    pendingAbstracts: abstractsPending?.n ?? 0,
    revenueFen: revenue?.fen ?? 0,
    checkins: checkinCount?.n ?? 0,
  }
}
