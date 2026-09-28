import type { DbExecutor } from '../db'
import { registrationTypes } from '../db/schema'
import { and, asc, eq } from 'drizzle-orm'

export async function listActiveTypes(db: DbExecutor) {
  return db
    .select()
    .from(registrationTypes)
    .where(and(eq(registrationTypes.active, true)))
    .orderBy(asc(registrationTypes.sortOrder))
}

export async function findTypeById(db: DbExecutor, id: string) {
  const rows = await db.select().from(registrationTypes).where(eq(registrationTypes.id, id)).limit(1)
  return rows[0] ?? null
}
