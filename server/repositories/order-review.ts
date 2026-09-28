import type { DbExecutor } from '../db'
import { orders, registrations } from '../db/schema'
import { and, count, desc, eq } from 'drizzle-orm'

export interface ReviewListRow {
  order: typeof orders.$inferSelect
  registration: typeof registrations.$inferSelect
  typeName: string
  userEmail: string
}

/** Orders waiting for bank-transfer review (status = reviewing). */
export async function listReviewingOrders(db: DbExecutor) {
  return db
    .select({ order: orders, registration: registrations })
    .from(orders)
    .innerJoin(registrations, eq(orders.registrationId, registrations.id))
    .where(eq(orders.status, 'reviewing'))
    .orderBy(desc(orders.claimedAt))
}

/** Order + registration ownership check for participant claims. */
export async function findUserOrder(db: DbExecutor, orderId: string, userId: string) {
  const rows = await db
    .select({ order: orders })
    .from(orders)
    .innerJoin(registrations, eq(orders.registrationId, registrations.id))
    .where(and(eq(orders.id, orderId), eq(registrations.userId, userId)))
    .limit(1)
  return rows[0]?.order ?? null
}

export async function setOrderReviewFields(
  db: DbExecutor,
  orderId: string,
  fields: { reference?: string | null, claimedAt?: Date | null, reviewedBy?: string | null, reviewedAt?: Date | null, reviewNote?: string | null },
) {
  await db.update(orders).set({ ...fields, updatedAt: new Date() }).where(eq(orders.id, orderId))
}

export async function countReviewing(db: DbExecutor) {
  const rows = await db.select({ value: count() }).from(orders).where(eq(orders.status, 'reviewing'))
  return rows[0]?.value ?? 0
}
