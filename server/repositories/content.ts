import type { DbExecutor } from '../db'
import { programItems, programSessions, siteSettings, speakers, sponsors, venues } from '../db/schema'
import { asc, eq } from 'drizzle-orm'

/* ---- content read APIs (homepage) ---- */

export async function listSpeakers(db: DbExecutor) {
  return db
    .select()
    .from(speakers)
    .where(eq(speakers.active, true))
    .orderBy(asc(speakers.sortOrder))
}

export async function listProgram(db: DbExecutor) {
  const sessions = await db.select().from(programSessions).orderBy(asc(programSessions.dayNo))
  const items = await db
    .select()
    .from(programItems)
    .orderBy(asc(programItems.sortOrder))
  return sessions.map(session => ({
    ...session,
    items: items.filter(item => item.sessionId === session.id),
  }))
}

export async function listSponsors(db: DbExecutor) {
  return db.select().from(sponsors).orderBy(asc(sponsors.sortOrder))
}

export async function findActiveVenue(db: DbExecutor) {
  const rows = await db.select().from(venues).where(eq(venues.active, true)).limit(1)
  return rows[0] ?? null
}

export async function getSetting<T>(db: DbExecutor, key: string): Promise<T | null> {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1)
  return (rows[0]?.value as T) ?? null
}

export async function upsertSetting(db: DbExecutor, key: string, value: unknown) {
  await db
    .insert(siteSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } })
}

/* ---- content write APIs (seed) ---- */

export async function insertSpeakers(db: DbExecutor, values: (typeof speakers.$inferInsert)[]) {
  await db.insert(speakers).values(values)
}

export async function insertProgram(
  db: DbExecutor,
  sessions: (typeof programSessions.$inferInsert)[],
  items: (typeof programItems.$inferInsert)[],
) {
  await db.insert(programSessions).values(sessions)
  await db.insert(programItems).values(items)
}

export async function insertSponsors(db: DbExecutor, values: (typeof sponsors.$inferInsert)[]) {
  await db.insert(sponsors).values(values)
}

export async function insertVenue(db: DbExecutor, values: typeof venues.$inferInsert) {
  await db.insert(venues).values(values)
}
