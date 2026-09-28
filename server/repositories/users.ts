import type { DbExecutor } from '../db'
import { users } from '../db/schema'
import type { AccountProfile } from '../../shared/schemas/auth'
import { eq } from 'drizzle-orm'

export async function findUserByEmail(db: DbExecutor, email: string) {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return rows[0] ?? null
}

export async function findUserById(db: DbExecutor, id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return rows[0] ?? null
}

export async function createUser(db: DbExecutor, values: {
  email: string
  fullName?: string | null
  passwordHash?: string | null
}) {
  const rows = await db.insert(users).values(values).returning()
  return rows[0]!
}

export async function updateUserProfile(db: DbExecutor, id: string, fullName: string, profile: AccountProfile) {
  const rows = await db
    .update(users)
    .set({ fullName, profile })
    .where(eq(users.id, id))
    .returning()
  return rows[0] ?? null
}

export async function setUserPassword(db: DbExecutor, id: string, passwordHash: string) {
  await db.update(users).set({ passwordHash }).where(eq(users.id, id))
}

export async function markEmailVerified(db: DbExecutor, id: string) {
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, id))
}
