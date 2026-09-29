import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

/** 与门户一致的 scrypt 口令散列（admin_users 表共享）。 */

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(':')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

export function generateCredentialToken(): string {
  return randomBytes(32).toString('base64url')
}
