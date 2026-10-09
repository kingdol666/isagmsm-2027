import type { DbExecutor } from '../db'
import { orders, payments } from '../db/schema'
import { and, count, desc, eq, inArray, lt, sum } from 'drizzle-orm'

/** 订单支付有效期（分钟）—— 超时未付的订单与其 pending 支付一并惰性过期。 */
export function orderTtlMinutes(): number {
  const n = Number(process.env.ORDER_TTL_MINUTES ?? 15)
  return Number.isFinite(n) && n > 0 ? n : 15
}

/**
 * 惰性过期：把创建时间早于 TTL 的 pending 订单置为 expired（并级联其 pending 支付）。
 * 在订单读取 / 支付发起 / 列表查询前调用 —— 无需定时器，任何入口读到即生效。
 * 与支付宝 timeout_express（二维码同 TTL 自动关单）配合：渠道侧关单走回调，
 * 渠道侧未通知时由这里兜底；两边对同一订单的 pending→expired 迁移幂等安全。
 */
export async function expireStaleOrders(db: DbExecutor): Promise<number> {
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
  return expired.length
}

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
