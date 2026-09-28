import type { DbExecutor } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

export async function findUserByEmail(db: DbExecutor, email: string) {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return rows[0] ?? null
}

export async function createUser(db: DbExecutor, values: { email: string, fullName?: string | null }) {
  const rows = await db.insert(users).values(values).returning()
  return rows[0]!
}
