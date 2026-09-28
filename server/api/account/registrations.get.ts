import { getUserSession } from '../../utils/session'
import { findByEmail } from '../../repositories/registrations'
import { findLatestOrderForRegistration } from '../../repositories/orders'
import { findCredentialByRegistration } from '../../repositories/credentials'
import { findUserById } from '../../repositories/users'

/** The signed-in account's registrations with order/payment status + credential links. */
export default defineEventHandler(async (event) => {
  const session = getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Please sign in to continue' })
  }
  const db = useDb()
  const user = await findUserById(db, session.userId)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'Account not found' })

  const rows = await findByEmail(db, user.email)

  const registrations = await Promise.all(rows.map(async ({ registration, type }) => {
    const order = await findLatestOrderForRegistration(db, registration.id)
    const credential = await findCredentialByRegistration(db, registration.id)
    return {
      id: registration.id,
      displayId: registration.displayId,
      status: registration.status,
      createdAt: registration.createdAt,
      typeName: type.name,
      affiliation: registration.affiliation,
      credentialStatus: credential?.status ?? null,
      order: order
        ? { id: order.id, orderNo: order.orderNo, totalFen: order.totalFen, currency: order.currency, status: order.status }
        : null,
      credentialToken: credential?.token ?? null,
    }
  }))

  // newest first
  registrations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return { registrations }
})
