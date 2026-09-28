import type { DbExecutor } from '../db'
import { checkins, credentials, registrations } from '../db/schema'
import { eq, inArray } from 'drizzle-orm'

/** 凭证状态（含签到信息）按 registrationIds 批量查询。 */
export async function findCredentialsForRegistrations(db: DbExecutor, registrationIds: string[]) {
  if (!registrationIds.length) return []
  const creds = await db
    .select()
    .from(credentials)
    .where(inArray(credentials.registrationId, registrationIds))
  if (!creds.length) return []

  const checkinRows = await db
    .select({ credentialId: checkins.credentialId, checkedInAt: checkins.checkedInAt })
    .from(checkins)
    .where(inArray(checkins.credentialId, creds.map(c => c.id)))
  const checkinByCred = new Map(checkinRows.map(r => [r.credentialId, r.checkedInAt]))

  return creds.map(credential => ({
    registrationId: credential.registrationId,
    id: credential.id,
    token: credential.token,
    status: credential.status,
    issuedAt: credential.issuedAt,
    checkedInAt: checkinByCred.get(credential.id) ?? null,
  }))
}

export async function findCredentialById(db: DbExecutor, id: string) {
  const rows = await db.select().from(credentials).where(eq(credentials.id, id)).limit(1)
  return rows[0] ?? null
}

export async function findRegistrationById(db: DbExecutor, id: string) {
  const rows = await db.select().from(registrations).where(eq(registrations.id, id)).limit(1)
  return rows[0] ?? null
}
