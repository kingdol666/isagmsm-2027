import type { DbExecutor } from '../db'
import { checkins } from '../db/schema'
import { desc, eq } from 'drizzle-orm'

/**
 * Records a check-in. The unique index on credential_id makes duplicate
 * check-ins impossible at the storage layer: a repeat insert returns null.
 */
export async function recordCheckin(db: DbExecutor, values: typeof checkins.$inferInsert) {
  const rows = await db
    .insert(checkins)
    .values(values)
    .onConflictDoNothing({ target: checkins.credentialId })
    .returning()
  return rows[0] ?? null
}

export async function findCheckinByCredential(db: DbExecutor, credentialId: string) {
  const rows = await db
    .select()
    .from(checkins)
    .where(eq(checkins.credentialId, credentialId))
    .limit(1)
  return rows[0] ?? null
}

export async function listCheckins(db: DbExecutor, limit = 100) {
  return db.select().from(checkins).orderBy(desc(checkins.checkedInAt)).limit(limit)
}
