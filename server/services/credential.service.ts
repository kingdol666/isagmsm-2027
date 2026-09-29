import { randomBytes } from 'node:crypto'
import type { DbExecutor } from '../db'
import { registrations } from '../db/schema'
import { eq } from 'drizzle-orm'
import { findCheckinByCredential } from '../repositories/checkins'
import { findCredentialByRegistration, findCredentialDetailByToken, issueCredential } from '../repositories/credentials'

/**
 * Credential tokens are cryptographically random (256-bit) — the QR encodes
 * the token, never a guessable registration id.
 */
export function generateCredentialToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Idempotent: issuing twice returns the same credential (unique per registration).
 * 会员门槛：凭证只授予 isMember=true 的报名。非会员（含支付成功路径）不发证，
 * 由管理员在管理台设为会员后再下发 — 这条规则是签发的唯一硬闸口。
 */
export async function ensureCredential(db: DbExecutor, registrationId: string) {
  const existing = await findCredentialByRegistration(db, registrationId)
  if (existing) return existing

  const reg = await db
    .select({ isMember: registrations.isMember })
    .from(registrations)
    .where(eq(registrations.id, registrationId))
    .limit(1)
  if (!reg[0]?.isMember) return null

  try {
    return await issueCredential(db, {
      registrationId,
      token: generateCredentialToken(),
      status: 'active',
    })
  }
  catch (error) {
    // Concurrent first-issue lost the unique race — return the winner's row.
    const winner = await findCredentialByRegistration(db, registrationId)
    if (winner) return winner
    throw error
  }
}

export interface CredentialView {
  credentialId: string
  token: string
  status: string
  issuedAt: Date
  registration: {
    id: string
    displayId: string
    fullName: string
    email: string
    affiliation: string
    country: string
    status: string
  }
  type: {
    code: string
    name: string
  }
  checkedInAt: Date | null
}

export async function getCredentialView(db: DbExecutor, token: string): Promise<CredentialView | null> {
  const detail = await findCredentialDetailByToken(db, token)
  if (!detail) return null

  const checkin = await findCheckinByCredential(db, detail.credential.id)
  return {
    credentialId: detail.credential.id,
    token: detail.credential.token,
    status: detail.credential.status,
    issuedAt: detail.credential.issuedAt,
    registration: {
      id: detail.registration.id,
      displayId: detail.registration.displayId,
      fullName: detail.registration.fullName,
      email: detail.registration.email,
      affiliation: detail.registration.affiliation,
      country: detail.registration.country,
      status: detail.registration.status,
    },
    type: {
      code: detail.type.code,
      name: detail.type.name,
    },
    checkedInAt: checkin?.checkedInAt ?? null,
  }
}
