import { createHash, randomInt, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { Db } from '../db'
import type { AccountProfile } from '../../shared/schemas/auth'
import { bumpAttempts, consumeCode, findActiveCode, issueCode, type CodePurpose } from '../repositories/email-verifications'
import { createUser, findUserByEmail, markEmailVerified, setUserPassword } from '../repositories/users'

export const CODE_TTL_MS = 10 * 60 * 1000
export const CODE_MAX_ATTEMPTS = 5
const RESEND_COOLDOWN_MS = 60 * 1000

export class AuthError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

function hashCode(email: string, code: string): string {
  return createHash('sha256').update(`${email.toLowerCase()}:${code}`).digest('hex')
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(':')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

/**
 * Issues a fresh code for (email, purpose). Throws 429 when the previous code
 * is still within the resend cooldown. Returns the plain code so DEV mode can
 * surface it; production mails it and never returns it.
 */
export async function requestEmailCode(db: Db, email: string, purpose: CodePurpose) {
  const existing = await findActiveCode(db, email, purpose)
  if (existing) {
    const age = Date.now() - existing.createdAt.getTime()
    if (age < RESEND_COOLDOWN_MS) {
      throw new AuthError(429, `Please wait ${Math.ceil((RESEND_COOLDOWN_MS - age) / 1000)}s before requesting another code`)
    }
  }
  const code = generateCode()
  await issueCode(db, {
    email: email.toLowerCase(),
    purpose,
    codeHash: hashCode(email, code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  })
  return code
}

/** Shared code check: expiry + attempt limit + timing-safe comparison. */
export async function checkEmailCode(db: Db, email: string, purpose: CodePurpose, code: string) {
  const row = await findActiveCode(db, email.toLowerCase(), purpose)
  if (!row) {
    throw new AuthError(400, 'No valid code — request a new one')
  }
  const expected = Buffer.from(row.codeHash, 'hex')
  const candidate = Buffer.from(hashCode(email, code), 'hex')
  const ok = expected.length === candidate.length && timingSafeEqual(expected, candidate)
  if (!ok) {
    const attempts = row.attempts + 1
    await bumpAttempts(db, row.id, attempts)
    if (attempts >= CODE_MAX_ATTEMPTS) {
      await consumeCode(db, row.id) // burn the code after too many wrong tries
      throw new AuthError(400, 'Too many wrong attempts — request a new code')
    }
    throw new AuthError(400, 'Wrong code')
  }
  await consumeCode(db, row.id)
}

/** Sign-up: verify the code, create (or upgrade) the account, mark verified. */
export async function registerAccount(
  db: Db,
  input: { email: string, code: string, password: string, fullName: string },
) {
  await checkEmailCode(db, input.email, 'signup', input.code)

  const existing = await findUserByEmail(db, input.email)
  if (existing?.passwordHash) {
    throw new AuthError(409, 'An account with this email already exists — sign in instead')
  }
  const passwordHash = hashPassword(input.password)
  let userId: string
  if (existing) {
    // seeded/demo user upgrading to a real account
    await setUserPassword(db, existing.id, passwordHash)
    await markEmailVerified(db, existing.id)
    userId = existing.id
  }
  else {
    const user = await createUser(db, {
      email: input.email.toLowerCase(),
      fullName: input.fullName,
      passwordHash,
    })
    await markEmailVerified(db, user.id)
    userId = user.id
  }
  return { userId, email: input.email.toLowerCase() }
}

export async function login(db: Db, email: string, password: string) {
  const user = await findUserByEmail(db, email)
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    throw new AuthError(401, 'Invalid email or password')
  }
  return { userId: user.id, email: user.email }
}

/** Password reset: verify the reset code, then set the new password. */
export async function resetPassword(db: Db, input: { email: string, code: string, password: string }) {
  await checkEmailCode(db, input.email, 'reset', input.code)
  const user = await findUserByEmail(db, input.email)
  if (!user) {
    throw new AuthError(404, 'No account with this email')
  }
  await setUserPassword(db, user.id, hashPassword(input.password))
  return { userId: user.id }
}

export async function updateProfile(db: Db, userId: string, fullName: string, profile: AccountProfile) {
  const { updateUserProfile } = await import('../repositories/users')
  const user = await updateUserProfile(db, userId, fullName, profile)
  if (!user) throw new AuthError(404, 'Account not found')
  return user
}
