import { createPaymentRequestSchema } from '#shared/schemas/order'
import { createPaymentForOrder } from '../../services/payment.service'
import { assertUuidParam, parseBody, sendDomainError } from '../../utils/validation'
import { enforceRateLimit } from '../../utils/rate-limit'
import { requireUser } from '../../utils/session'
import { findOrderById } from '../../repositories/orders'
import { findRegistrationDetail } from '../../repositories/registrations'

/** Create a provider payment for an order (amounts always read server-side; owner-only). */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'payments', 30, 60_000)
  try {
    const session = requireUser(event)
    const body = await parseBody(event, createPaymentRequestSchema)
    const orderId = assertUuidParam(body.orderId)
    const db = useDb()
    const order = await findOrderById(db, orderId)
    const detail = order ? await findRegistrationDetail(db, order.registrationId) : null
    if (!order || detail?.registration.userId !== session.userId) {
      throw createError({ statusCode: 404, statusMessage: 'Order not found' })
    }
    const { mockPaymentSecret } = useRuntimeConfig(event)
    const payment = await createPaymentForOrder(db, body.orderId, body.provider, mockPaymentSecret)
    setResponseStatus(event, 201)
    return {
      payment: {
        id: payment.id,
        provider: payment.provider,
        providerPaymentNo: payment.providerPaymentNo,
        status: payment.status,
        amountFen: payment.amountFen,
        currency: payment.currency,
        payload: payment.payload,
      },
    }
  }
  catch (error) {
    sendDomainError(error)
  }
})
