import type { Db } from '../db'
import { DomainError } from './registration.service'
import { getCredentialView } from './credential.service'
import { recordCheckin } from '../repositories/checkins'

export interface VerifyResult {
  valid: boolean
  reason: 'ok' | 'not_found' | 'revoked' | 'registration_not_confirmed' | null
  checkedInAt: string | null
  participant?: {
    displayId: string
    fullName: string
    affiliation: string
    country: string
    typeName: string
  }
}

/** Read-only token verification (what the scanner shows before confirming). */
export async function verifyByToken(db: Db, token: string): Promise<VerifyResult> {
  const view = await getCredentialView(db, token)
  if (!view) {
    return { valid: false, reason: 'not_found', checkedInAt: null }
  }
  if (view.status !== 'active') {
    return { valid: false, reason: 'revoked', checkedInAt: null }
  }
  if (view.registration.status !== 'confirmed') {
    return {
      valid: false,
      reason: 'registration_not_confirmed',
      checkedInAt: null,
      participant: {
        displayId: view.registration.displayId,
        fullName: view.registration.fullName,
        affiliation: view.registration.affiliation,
        country: view.registration.country,
        typeName: view.type.name,
      },
    }
  }

  return {
    valid: true,
    reason: 'ok',
    checkedInAt: view.checkedInAt?.toISOString() ?? null,
    participant: {
      displayId: view.registration.displayId,
      fullName: view.registration.fullName,
      affiliation: view.registration.affiliation,
      country: view.registration.country,
      typeName: view.type.name,
    },
  }
}

/** Confirms the check-in; the storage-layer unique constraint blocks repeats. */
export async function checkinByToken(
  db: Db,
  token: string,
  method: 'scan' | 'manual',
  checkedBy?: string,
) {
  const verification = await verifyByToken(db, token)
  if (!verification.valid || !verification.participant) {
    throw new DomainError(409, `Credential not checkable: ${verification.reason}`)
  }

  const view = await getCredentialView(db, token)
  if (!view) throw new DomainError(404, 'Credential not found')

  const inserted = await recordCheckin(db, {
    credentialId: view.credentialId,
    method,
    checkedBy: checkedBy ?? null,
  })

  return {
    duplicate: inserted === null,
    checkedInAt: (inserted?.checkedInAt ?? view.checkedInAt)!.toISOString(),
    participant: verification.participant,
  }
}
