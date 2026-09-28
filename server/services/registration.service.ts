import type { Db } from '../db'
import { bumpCounter, formatDisplayId } from '../db/counters'
import type { ParticipantInput } from '../../shared/schemas/registration'
import { findTypeById } from '../repositories/registration-types'
import { createUser, findUserByEmail } from '../repositories/users'
import { createRegistration, findRegistrationDetail } from '../repositories/registrations'

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

/** Email registration: upserts the user by email, creates the registration. */
export async function submitRegistration(
  db: Db,
  input: ParticipantInput,
): Promise<RegistrationRecord> {
  const type = await findTypeById(db, input.typeId)
  if (!type || !type.active) {
    throw new DomainError(400, 'Unknown registration type')
  }
  if (type.availability !== 'available') {
    throw new DomainError(403, 'This registration type is not open for self-service')
  }

  return db.transaction(async (tx) => {
    let user = await findUserByEmail(tx, input.email)
    if (!user) {
      user = await createUser(tx, { email: input.email, fullName: input.fullName })
    }

    const seq = await bumpCounter(tx, 'registration')
    const registration = await createRegistration(tx, {
      userId: user.id,
      typeId: type.id,
      status: 'submitted',
      displayId: formatDisplayId(seq),
      fullName: input.fullName,
      englishName: input.englishName || null,
      email: input.email,
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
