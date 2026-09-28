import type { DbExecutor } from '../db'
import { registrationTypes, registrations, users } from '../db/schema'
import { and, count, desc, eq, ilike, or } from 'drizzle-orm'

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
  return { rows, total: total[0]?.value ?? 0, page, pageSize }
}
