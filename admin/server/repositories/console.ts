import { and, desc, eq, inArray, ilike, isNotNull, lt, ne, or, sql } from 'drizzle-orm'
import type { DbExecutor } from '../db'
import {
  abstractEvents,
  abstracts,
  adminUsers,
  checkins,
  credentials,
  orders,
  payments,
  registrations,
  registrationTypes,
  users,
} from '../db/schema'

/** 管理台查询层 —— 全部走 Drizzle 参数化构建器。 */

/**
 * 转义 LIKE 通配符（% _ \），防止用户输入改变匹配语义。
 * 参数化已杜绝 SQL 注入；这一步保证搜索是「字面量」匹配。
 */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, ch => `\\${ch}`)
}

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
    const like = `%${escapeLike(query.q)}%`
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
    // 已撤回稿件对管理台不可见（投稿人侧仍保留自己的历史）
    .where(ne(abstracts.status, 'withdrawn'))
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

/** 按版本取附件元数据（投稿/重投事件）——管理台附件下载用。 */
export async function findAbstractEventFile(db: DbExecutor, abstractId: string, version: number) {
  const rows = await db.select().from(abstractEvents)
    .where(and(
      eq(abstractEvents.abstractId, abstractId),
      eq(abstractEvents.version, version),
      isNotNull(abstractEvents.fileKey),
    ))
    .limit(1)
  return rows[0] ?? null
}

export async function insertAbstractEvent(db: DbExecutor, values: {
  abstractId: string
  kind: string
  comment?: string | null
  snapshot?: Record<string, unknown> | null
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

export interface PaymentFlowRow {
  orderId: string
  orderNo: string
  subtotalFen: number
  discountFen: number
  totalFen: number
  currency: string
  orderStatus: string
  orderCreatedAt: string
  paymentId: string | null
  provider: string | null
  providerPaymentNo: string | null
  providerTradeNo: string | null
  paymentStatus: string | null
  paidAt: string | null
  displayId: string
  fullName: string
  email: string
  typeName: string
}

/** 订单支付有效期（分钟）—— 与门户 ORDER_TTL_MINUTES 保持一致。 */
function orderTtlMinutes(): number {
  const n = Number(process.env.ORDER_TTL_MINUTES ?? 15)
  return Number.isFinite(n) && n > 0 ? n : 15
}

/** 惰性过期（与门户同逻辑）：超时未付的 pending 订单与其支付一并标记 expired。 */
async function expireStaleOrders(db: DbExecutor): Promise<void> {
  const cutoff = new Date(Date.now() - orderTtlMinutes() * 60_000)
  const expired = await db
    .update(orders)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(and(eq(orders.status, 'pending'), lt(orders.createdAt, cutoff)))
    .returning({ id: orders.id })
  if (expired.length > 0) {
    await db
      .update(payments)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(and(
        eq(payments.status, 'pending'),
        inArray(payments.orderId, expired.map(o => o.id)),
      ))
  }
}

/**
 * 支付订单总览：以订单为中心（含仅对公转账/从未发起在线支付的订单），
 * 每单附最近一次在线支付信息，倒序，支持按订单状态与渠道筛选。
 */
export async function listPaymentOrders(
  db: DbExecutor,
  query: { status?: string, provider?: string } = {},
): Promise<PaymentFlowRow[]> {
  await expireStaleOrders(db)

  const validOrderStatus = ['pending', 'reviewing', 'paid', 'failed', 'expired', 'cancelled', 'refunded']
  const validProviders = ['mock', 'wechat', 'alipay']

  const base = db
    .select({
      orderId: orders.id,
      orderNo: orders.orderNo,
      subtotalFen: orders.subtotalFen,
      discountFen: orders.discountFen,
      totalFen: orders.totalFen,
      currency: orders.currency,
      orderStatus: orders.status,
      orderCreatedAt: orders.createdAt,
      displayId: registrations.displayId,
      fullName: registrations.fullName,
      email: registrations.email,
      typeName: registrationTypes.name,
    })
    .from(orders)
    .innerJoin(registrations, eq(orders.registrationId, registrations.id))
    .innerJoin(registrationTypes, eq(registrations.typeId, registrationTypes.id))
    .$dynamic()

  const conditions = []
  if (query.status && validOrderStatus.includes(query.status)) {
    conditions.push(eq(orders.status, query.status))
  }
  const orderRows = await (conditions.length ? base.where(and(...conditions)) : base)
    .orderBy(desc(orders.createdAt))
    .limit(500)
  if (orderRows.length === 0) return []

  const payRows = await db
    .select()
    .from(payments)
    .where(inArray(payments.orderId, orderRows.map(r => r.orderId)))
    .orderBy(desc(payments.createdAt))

  return orderRows
    .map((row) => {
      const latest = payRows.find(p => p.orderId === row.orderId) ?? null
      return {
        orderId: row.orderId,
        orderNo: row.orderNo,
        subtotalFen: row.subtotalFen,
        discountFen: row.discountFen,
        totalFen: row.totalFen,
        currency: row.currency,
        orderStatus: row.orderStatus,
        orderCreatedAt: row.orderCreatedAt.toISOString(),
        paymentId: latest?.id ?? null,
        provider: latest?.provider ?? null,
        providerPaymentNo: latest?.providerPaymentNo ?? null,
        // 支付成功后落库的渠道真实交易号（支付宝 trade_no）；未支付时为空
        providerTradeNo: ((latest?.payload as Record<string, unknown> | null)?.providerTradeNo as string | undefined) ?? null,
        paymentStatus: latest?.status ?? null,
        paidAt: latest && latest.status === 'paid' ? latest.updatedAt.toISOString() : null,
        displayId: row.displayId,
        fullName: row.fullName,
        email: row.email,
        typeName: row.typeName,
      } satisfies PaymentFlowRow
    })
    .filter((row) => {
      if (query.provider && validProviders.includes(query.provider)) {
        return row.provider === query.provider
      }
      return true
    })
}
