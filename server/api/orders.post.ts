import { createOrderRequestSchema } from '#shared/schemas/order'
import { createOrderForRegistration } from '../services/order.service'
import { parseBody, sendDomainError } from '../utils/validation'
import { enforceRateLimit } from '../utils/rate-limit'
import { requireUser } from '../utils/session'
import { findRegistrationDetail } from '../repositories/registrations'

/** 为本人的报名创建订单（防越权替他人下单）。 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'orders', 30, 60_000)
  try {
    const session = requireUser(event)
    const { registrationId } = await parseBody(event, createOrderRequestSchema)
    const db = useDb()
    const detail = await findRegistrationDetail(db, registrationId)
    if (!detail || detail.registration.userId !== session.userId) {
      throw createError({ statusCode: 404, statusMessage: 'Registration not found' })
    }
    const order = await createOrderForRegistration(db, registrationId)
    setResponseStatus(event, 201)
    return { order }
  }
  catch (error) {
    sendDomainError(error)
  }
})
