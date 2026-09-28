import type { DbExecutor } from '../db'
import { paymentEvents, payments } from '../db/schema'
import { and, count, desc, eq } from 'drizzle-orm'

export async function createPayment(db: DbExecutor, values: typeof payments.$inferInsert) {
  const rows = await db.insert(payments).values(values).returning()
  return rows[0]!
}

export async function findPaymentById(db: DbExecutor, id: string) {
  const rows = await db.select().from(payments).where(eq(payments.id, id)).limit(1)
  return rows[0] ?? null
}

export async function transitionPayment(db: DbExecutor, id: string, from: string, to: string) {
  const rows = await db
    .update(payments)
    .set({ status: to, updatedAt: new Date() })
    .where(and(eq(payments.id, id), eq(payments.status, from)))
    .returning()
  return rows[0] ?? null
}

export async function setProviderPaymentNo(db: DbExecutor, id: string, providerPaymentNo: string) {
  const rows = await db
    .update(payments)
    .set({ providerPaymentNo, updatedAt: new Date() })
    .where(eq(payments.id, id))
    .returning()
  return rows[0] ?? null
}

export async function findPaymentByProviderNo(db: DbExecutor, providerPaymentNo: string) {
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.providerPaymentNo, providerPaymentNo))
    .limit(1)
  return rows[0] ?? null
}

export async function findLatestPaymentForOrder(db: DbExecutor, orderId: string) {
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(desc(payments.createdAt))
    .limit(1)
  return rows[0] ?? null
}

/**
 * Idempotency gate: records a provider event exactly once. Returns
 * `accepted = true` only for the FIRST time this (provider, eventId) pair is
 * seen — duplicates are stored with accepted = false and never re-processed.
 */
export async function recordPaymentEvent(
  db: DbExecutor,
  values: typeof paymentEvents.$inferInsert,
): Promise<boolean> {
  const rows = await db
    .insert(paymentEvents)
    .values(values)
    .onConflictDoNothing({ target: [paymentEvents.provider, paymentEvents.eventId] })
    .returning({ id: paymentEvents.id })
  return rows.length > 0
}

export interface PaymentListQuery {
  status?: string
  page?: number
  pageSize?: number
}

export async function listPayments(db: DbExecutor, query: PaymentListQuery) {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20))
  const where = query.status ? eq(payments.status, query.status) : undefined

  const rows = await db
    .select()
    .from(payments)
    .where(where)
    .orderBy(desc(payments.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const total = await db.select({ value: count() }).from(payments).where(where)
  return { rows, total: total[0]?.value ?? 0, page, pageSize }
}
