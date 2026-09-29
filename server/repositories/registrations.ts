import type { DbExecutor } from '../db'
import { orders, registrationTypes, registrations, users } from '../db/schema'
import { and, count, desc, eq, ilike, inArray, or } from 'drizzle-orm'

export async function createRegistration(
  db: DbExecutor,
  values: typeof registrations.$inferInsert,
) {
  const rows = await db.insert(registrations).values(values).returning()
  return rows[0]!
}

export async function findRegistrationDetail(db: DbExecutor, id: string) {
  const rows = await db
    .select({
      registration: registrations,
      type: registrationTypes,
    })
    .from(registrations)
    .innerJoin(registrationTypes, eq(registrations.typeId, registrationTypes.id))
    .where(eq(registrations.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function setStatus(db: DbExecutor, id: string, status: string) {
  const rows = await db
    .update(registrations)
    .set({ status, updatedAt: new Date() })
    .where(eq(registrations.id, id))
    .returning()
  return rows[0] ?? null
}

/** 该账号当前的有效报名（待缴费/已确认）—— 一账号一有效报名（防批量注册刷单）。 */
export async function findActiveRegistrationByUser(db: DbExecutor, userId: string) {
  const rows = await db
    .select({ id: registrations.id, displayId: registrations.displayId })
    .from(registrations)
    .where(and(eq(registrations.userId, userId), inArray(registrations.status, ['submitted', 'confirmed'])))
    .orderBy(desc(registrations.createdAt))
    .limit(1)
  return rows[0] ?? null
}

/** Confirmed only when currently submitted — payment flow calls this inside the paid transaction. */
export async function confirmIfSubmitted(db: DbExecutor, id: string) {
  const rows = await db
    .update(registrations)
    .set({ status: 'confirmed', updatedAt: new Date() })
    .where(and(eq(registrations.id, id), eq(registrations.status, 'submitted')))
    .returning()
  return rows[0] ?? null
}

export async function findByEmail(db: DbExecutor, email: string) {
  return db
    .select({ registration: registrations, type: registrationTypes })
    .from(registrations)
    .innerJoin(registrationTypes, eq(registrations.typeId, registrationTypes.id))
    .innerJoin(users, eq(registrations.userId, users.id))
    .where(eq(users.email, email))
    .orderBy(desc(registrations.createdAt))
}

export interface RegistrationListQuery {
  search?: string
  status?: string
  page?: number
  pageSize?: number
}

export async function countByStatus(db: DbExecutor) {
  const rows = await db
    .select({ status: registrations.status, value: count() })
    .from(registrations)
    .groupBy(registrations.status)
  return Object.fromEntries(rows.map(r => [r.status, r.value]))
}

export async function countAll(db: DbExecutor) {
  const rows = await db.select({ value: count() }).from(registrations)
  return rows[0]?.value ?? 0
}

export interface RegistrationListRow {
  registration: typeof registrations.$inferSelect
  type: typeof registrationTypes.$inferSelect
  order: typeof orders.$inferSelect | null
}

export async function listRegistrations(db: DbExecutor, query: RegistrationListQuery) {
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
    .select({ registration: registrations, type: registrationTypes })
    .from(registrations)
    .innerJoin(registrationTypes, eq(registrations.typeId, registrationTypes.id))
    .where(where)
    .orderBy(desc(registrations.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const total = await db.select({ value: count() }).from(registrations).where(where)

  // attach each registration's latest order (payment visibility for admins)
  const ids = rows.map(r => r.registration.id)
  const orderRows = ids.length
    ? await db.select().from(orders).where(inArray(orders.registrationId, ids)).orderBy(desc(orders.createdAt))
    : []
  const latestOrder = new Map<string, typeof orders.$inferSelect>()
  for (const order of orderRows) {
    if (!latestOrder.has(order.registrationId)) latestOrder.set(order.registrationId, order)
  }

  const withOrders: RegistrationListRow[] = rows.map(row => ({
    ...row,
    order: latestOrder.get(row.registration.id) ?? null,
  }))

  return { rows: withOrders, total: total[0]?.value ?? 0, page, pageSize }
}
