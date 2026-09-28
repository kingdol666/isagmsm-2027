import { createOrderRequestSchema } from '#shared/schemas/order'
import { createOrderForRegistration } from '../services/order.service'
import { parseBody, sendDomainError } from '../utils/validation'
import { enforceRateLimit } from '../utils/rate-limit'

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'orders', 30, 60_000)
  try {
    const { registrationId } = await parseBody(event, createOrderRequestSchema)
    const db = useDb()
    const order = await createOrderForRegistration(db, registrationId)
    setResponseStatus(event, 201)
    return { order }
  }
  catch (error) {
    sendDomainError(error)
  }
})
