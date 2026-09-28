import type { DbExecutor } from '../db'
import { orders, registrationTypes, registrations, users } from '../db/schema'
import { and, count, desc, eq, ilike, inArray, or } from 'drizzle-orm'

export interface ParticipantListQuery {
  search?: string
  status?: string
  page?: number
  pageSize?: number
}

export interface ParticipantRow {
  registration: typeof registrations.$inferSelect
  user: typeof users.$inferSelect
  typeName: string
  order: { orderNo: string, status: string, totalFen: number } | null
  credential: { id: string, token: string, status: string } | null
}

/**
 * 统一参会人员管理列表：报名 + 账号 + 票种 + 最新订单 + 凭证，一次查全。
 */
export async function listParticipants(db: DbExecutor, query: ParticipantListQuery) {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20))
  const filters = []
  if (query.status) filters.push(eq(registrations.status, query.status))
  if (query.search) {
    const pattern = `%${query.search}%`
    filters.push(
      or(
        ilike(registrations.fullName, pattern),
        ilike(registrations.email, pattern),
        ilike(registrations.affiliation, pattern),
        ilike(registrations.displayId, pattern),
      ),
    )
  }
  const where = filters.length ? and(...filters) : undefined

  const rows = await db
    .select({ registration: registrations, user: users, type: registrationTypes })
    .from(registrations)
    .innerJoin(users, eq(registrations.userId, users.id))
    .innerJoin(registrationTypes, eq(registrations.typeId, registrationTypes.id))
    .where(where)
    .orderBy(desc(registrations.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const total = await db.select({ value: count() }).from(registrations).where(where)

  const ids = rows.map(r => r.registration.id)
  const orderRows = ids.length
    ? await db.select().from(orders).where(inArray(orders.registrationId, ids)).orderBy(desc(orders.createdAt))
    : []
  const latestOrder = new Map<string, typeof orders.$inferSelect>()
  for (const order of orderRows) {
    if (!latestOrder.has(order.registrationId)) latestOrder.set(order.registrationId, order)
  }

  const result: ParticipantRow[] = []
  for (const row of rows) {
    const order = latestOrder.get(row.registration.id)
    result.push({
      registration: row.registration,
      user: row.user,
      typeName: row.type.name,
      order: order ? { orderNo: order.orderNo, status: order.status, totalFen: order.totalFen } : null,
      credential: null,
    })
  }
  return { rows: result, total: total[0]?.value ?? 0, page, pageSize }
}

/** 管理端设置 / 取消会员标识。 */
export async function setMembership(db: DbExecutor, registrationId: string, isMember: boolean) {
  const rows = await db
    .update(registrations)
    .set({ isMember, updatedAt: new Date() })
    .where(eq(registrations.id, registrationId))
    .returning({ id: registrations.id, isMember: registrations.isMember })
  return rows[0] ?? null
}
