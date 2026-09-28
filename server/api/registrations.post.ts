import { createRegistrationRequestSchema } from '#shared/schemas/registration'
import { submitRegistration } from '../services/registration.service'
import { createOrderForRegistration } from '../services/order.service'
import { parseBody, sendDomainError } from '../utils/validation'
import { enforceRateLimit } from '../utils/rate-limit'
import { requireUser } from '../utils/session'
import { findUserById } from '../repositories/users'

/** Submit a conference registration for the signed-in account + create its pending order. */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'registrations', 20, 60_000)
  try {
    const session = requireUser(event)
    const { participant } = await parseBody(event, createRegistrationRequestSchema)
    const db = useDb()
    const user = await findUserById(db, session.userId)
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Account not found' })
    const registration = await submitRegistration(db, participant, { id: user.id, email: user.email, fullName: user.fullName })
    const order = await createOrderForRegistration(db, registration.id)
    setResponseStatus(event, 201)
    return {
      registration,
      order: {
        id: order.id,
        orderNo: order.orderNo,
        subtotalFen: order.subtotalFen,
        discountFen: order.discountFen,
        totalFen: order.totalFen,
        currency: order.currency,
        status: order.status,
      },
    }
  }
  catch (error) {
    sendDomainError(error)
  }
})
