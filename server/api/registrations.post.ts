import { createRegistrationRequestSchema } from '#shared/schemas/registration'
import { submitRegistration } from '../services/registration.service'
import { createOrderForRegistration } from '../services/order.service'
import { parseBody, sendDomainError } from '../utils/validation'
import { enforceRateLimit } from '../utils/rate-limit'

/** Submit a registration and create its pending order (server-priced). */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'registrations', 20, 60_000)
  try {
    const { participant } = await parseBody(event, createRegistrationRequestSchema)
    const db = useDb()
    const registration = await submitRegistration(db, participant)
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
