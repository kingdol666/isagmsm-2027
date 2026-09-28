import type { DbExecutor } from '../db'
import { orders } from '../db/schema'
import { and, count, desc, eq, sum } from 'drizzle-orm'

export async function createOrder(db: DbExecutor, values: typeof orders.$inferInsert) {
  const rows = await db.insert(orders).values(values).returning()
  return rows[0]!
}

export async function findOrderById(db: DbExecutor, id: string) {
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  return rows[0] ?? null
}

export async function findOrderByNo(db: DbExecutor, orderNo: string) {
  const rows = await db.select().from(orders).where(eq(orders.orderNo, orderNo)).limit(1)
  return rows[0] ?? null
}

export async function findLatestOrderForRegistration(db: DbExecutor, registrationId: string) {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.registrationId, registrationId))
    .orderBy(desc(orders.createdAt))
    .limit(1)
  return rows[0] ?? null
}

/**
 * Transaction-safe state transition: only applies when the current status
 * matches `from`, so concurrent callbacks can never double-apply.
 */
export async function transitionOrder(db: DbExecutor, id: string, from: string, to: string) {
  const rows = await db
    .update(orders)
    .set({ status: to, updatedAt: new Date() })
    .where(and(eq(orders.id, id), eq(orders.status, from)))
    .returning()
  return rows[0] ?? null
}

export interface OrderListQuery {
  status?: string
  page?: number
  pageSize?: number
}

export async function listOrders(db: DbExecutor, query: OrderListQuery) {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20))
  const where = query.status ? eq(orders.status, query.status) : undefined

  const rows = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const total = await db.select({ value: count() }).from(orders).where(where)
  return { rows, total: total[0]?.value ?? 0, page, pageSize }
}

export async function sumPaidRevenue(db: DbExecutor) {
  const rows = await db
    .select({ total: sum(orders.totalFen) })
    .from(orders)
    .where(eq(orders.status, 'paid'))
  return Number(rows[0]?.total ?? 0)
}
