import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { DbExecutor } from '../db'
import { adminUsers } from '../db/schema'
import { eq } from 'drizzle-orm'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(':')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

export async function findAdminByUsername(db: DbExecutor, username: string) {
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1)
  return rows[0] ?? null
}

export async function authenticateAdmin(db: DbExecutor, username: string, password: string) {
  const user = await findAdminByUsername(db, username)
  if (!user) return null
  if (!verifyPassword(password, user.passwordHash)) return null
  return user
}
