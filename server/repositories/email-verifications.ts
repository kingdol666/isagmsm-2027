import type { DbExecutor } from '../db'
import { emailVerifications } from '../db/schema'
import { and, eq } from 'drizzle-orm'

export type CodePurpose = 'signup' | 'reset'

/**
 * Stores the ACTIVE code for (email, purpose) — a new code overwrites the old
 * one (attempts reset). Codes are stored hashed; expiry is checked on read.
 */
export async function issueCode(
  db: DbExecutor,
  values: { email: string, purpose: CodePurpose, codeHash: string, expiresAt: Date },
) {
  await db
    .insert(emailVerifications)
    .values(values)
    .onConflictDoUpdate({
      target: [emailVerifications.email, emailVerifications.purpose],
      set: {
        codeHash: values.codeHash,
        attempts: 0,
        expiresAt: values.expiresAt,
        consumedAt: null,
        createdAt: new Date(),
      },
    })
}

export async function findActiveCode(db: DbExecutor, email: string, purpose: CodePurpose) {
  const rows = await db
    .select()
    .from(emailVerifications)
    .where(and(eq(emailVerifications.email, email), eq(emailVerifications.purpose, purpose)))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  if (row.consumedAt || row.expiresAt.getTime() < Date.now()) return null
  return row
}

export async function bumpAttempts(db: DbExecutor, id: string, attempts: number) {
  await db.update(emailVerifications).set({ attempts }).where(eq(emailVerifications.id, id))
}

export async function consumeCode(db: DbExecutor, id: string) {
  await db.update(emailVerifications).set({ consumedAt: new Date() }).where(eq(emailVerifications.id, id))
}
