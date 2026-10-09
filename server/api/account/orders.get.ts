import { desc, eq, inArray } from 'drizzle-orm'
import { orders, payments, registrations, registrationTypes } from '../../db/schema'
import { expireStaleOrders } from '../../repositories/orders'
import { requireUser } from '../../utils/session'

export interface MyOrderRow {
  orderId: string
  orderNo: string
  displayId: string
  typeName: string
  subtotalFen: number
  discountFen: number
  totalFen: number
  currency: string
  orderStatus: string
  createdAt: string
  provider: string | null
  providerPaymentNo: string | null
  providerTradeNo: string | null
  payStatus: string | null
  paidAt: string | null
}

/**
 * 本人全部订单及支付情况（个人主页「订单记录」）。
 * 读取前先惰性过期 —— 状态呈现永远是"现在时"。
 */
export default defineEventHandler(async (event) => {
  const session = requireUser(event)
  const db = useDb()
  await expireStaleOrders(db)

  const regs = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(eq(registrations.userId, session.userId))
  if (regs.length === 0) return { rows: [] as MyOrderRow[] }

  const regIds = regs.map(r => r.id)
  const rows = await db
    .select({
      orderId: orders.id,
      orderNo: orders.orderNo,
      displayId: registrations.displayId,
      typeName: registrationTypes.name,
      subtotalFen: orders.subtotalFen,
      discountFen: orders.discountFen,
      totalFen: orders.totalFen,
      currency: orders.currency,
      orderStatus: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(registrations, eq(orders.registrationId, registrations.id))
    .innerJoin(registrationTypes, eq(registrations.typeId, registrationTypes.id))
    .where(inArray(orders.registrationId, regIds))
    .orderBy(desc(orders.createdAt))
    .limit(100)

  if (rows.length === 0) return { rows: [] as MyOrderRow[] }

  const payRows = await db
    .select()
    .from(payments)
    .where(inArray(payments.orderId, rows.map(r => r.orderId)))
    .orderBy(desc(payments.createdAt))

  return {
    rows: rows.map((row) => {
      const latest = payRows.find(p => p.orderId === row.orderId) ?? null
      return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        provider: latest?.provider ?? null,
        providerPaymentNo: latest?.providerPaymentNo ?? null,
        providerTradeNo: ((latest?.payload as Record<string, unknown> | null)?.providerTradeNo as string | undefined) ?? null,
        payStatus: latest?.status ?? null,
        paidAt: latest && latest.status === 'paid' ? latest.updatedAt.toISOString() : null,
      } satisfies MyOrderRow
    }),
  }
})
