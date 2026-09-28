import type { DbExecutor } from './index'
import { counters } from './schema'
import { eq, sql } from 'drizzle-orm'

/** Anything that can run queries: the root db or a transaction. */
/**
 * Atomic, race-safe counter increment for human-friendly display ids.
 * Single UPDATE ... RETURNING is atomic in PostgreSQL; the INSERT ... ON
 * CONFLICT branch covers first use. No user input ever reaches SQL text.
 */
export async function bumpCounter(db: DbExecutor, key: string): Promise<number> {
  const updated = await db
    .update(counters)
    .set({ value: sql`${counters.value} + 1` })
    .where(eq(counters.key, key))
    .returning({ value: counters.value })

  if (updated[0]) return updated[0].value

  const inserted = await db
    .insert(counters)
    .values({ key, value: 1 })
    .onConflictDoUpdate({
      target: counters.key,
      set: { value: sql`${counters.value} + 1` },
    })
    .returning({ value: counters.value })

  return inserted[0]!.value
}

export function formatDisplayId(seq: number): string {
  return `PPS26-${String(seq).padStart(6, '0')}`
}

export function formatOrderNo(seq: number): string {
  return `PPS26-ORD-${String(seq).padStart(6, '0')}`
}
