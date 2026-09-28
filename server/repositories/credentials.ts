import type { DbExecutor } from '../db'
import { credentials, registrationTypes, registrations } from '../db/schema'
import { desc, eq } from 'drizzle-orm'

export async function listCredentialsDetail(db: DbExecutor, limit = 100) {
  return db
    .select({ credential: credentials, registration: registrations, type: registrationTypes })
    .from(credentials)
    .innerJoin(registrations, eq(credentials.registrationId, registrations.id))
    .innerJoin(registrationTypes, eq(registrations.typeId, registrationTypes.id))
    .orderBy(desc(credentials.issuedAt))
    .limit(limit)
}

export async function issueCredential(db: DbExecutor, values: typeof credentials.$inferInsert) {
  const rows = await db.insert(credentials).values(values).returning()
  return rows[0]!
}

/** Idempotent issue: returns the existing credential if one already exists. */
export async function findCredentialByRegistration(db: DbExecutor, registrationId: string) {
  const rows = await db
    .select()
    .from(credentials)
    .where(eq(credentials.registrationId, registrationId))
    .limit(1)
  return rows[0] ?? null
}

export async function findCredentialDetailByToken(db: DbExecutor, token: string) {
  const rows = await db
    .select({
      credential: credentials,
      registration: registrations,
      type: registrationTypes,
    })
    .from(credentials)
    .innerJoin(registrations, eq(credentials.registrationId, registrations.id))
    .innerJoin(registrationTypes, eq(registrations.typeId, registrationTypes.id))
    .where(eq(credentials.token, token))
    .limit(1)
  return rows[0] ?? null
}

export async function setCredentialStatus(db: DbExecutor, id: string, status: string) {
  const rows = await db
    .update(credentials)
    .set({ status })
    .where(eq(credentials.id, id))
    .returning()
  return rows[0] ?? null
}
