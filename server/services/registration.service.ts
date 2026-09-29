import type { Db } from '../db'
import { bumpCounter, formatDisplayId } from '../db/counters'
import type { ParticipantInput } from '../../shared/schemas/registration'
import { findTypeById } from '../repositories/registration-types'
import { createRegistration, findActiveRegistrationByUser, findRegistrationDetail } from '../repositories/registrations'

export class DomainError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

export interface RegistrationRecord {
  id: string
  displayId: string
  status: string
  email: string
}

/**
 * Conference registration for a signed-in account: attaches the registration
 * to the user and locks the email to the account's verified address.
 * 防作弊：每个账号同时只允许一条有效报名（待缴费/已确认）。
 */
export async function submitRegistration(
  db: Db,
  input: ParticipantInput,
  user: { id: string, email: string, fullName: string | null },
): Promise<RegistrationRecord> {
  const type = await findTypeById(db, input.typeId)
  if (!type || !type.active) {
    throw new DomainError(400, '报名类型不存在')
  }
  if (type.availability !== 'available') {
    throw new DomainError(403, '该报名类型不接受自行报名')
  }

  const active = await findActiveRegistrationByUser(db, user.id)
  if (active) {
    throw new DomainError(409, `该账号已有有效报名（${active.displayId}），如需修改请联系会务组`)
  }

  return db.transaction(async (tx) => {
    const seq = await bumpCounter(tx, 'registration')
    const registration = await createRegistration(tx, {
      userId: user.id,
      typeId: type.id,
      status: 'submitted',
      displayId: formatDisplayId(seq),
      fullName: input.fullName || user.fullName || input.englishName || user.email,
      englishName: input.englishName || null,
      email: user.email,
      phone: input.phone || null,
      affiliation: input.affiliation,
      department: input.department || null,
      position: input.position || null,
      country: input.country,
      dietary: input.dietary || null,
      invoiceRequired: input.invoiceRequired,
      invoiceTitle: input.invoiceTitle || null,
    })

    return {
      id: registration.id,
      displayId: registration.displayId,
      status: registration.status,
      email: registration.email,
    }
  })
}

export async function getRegistrationDetail(db: Db, id: string) {
  return findRegistrationDetail(db, id)
}
