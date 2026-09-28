import { createPaymentRequestSchema } from '#shared/schemas/order'
import { createPaymentForOrder } from '../../services/payment.service'
import { parseBody, sendDomainError } from '../../utils/validation'
import { enforceRateLimit } from '../../utils/rate-limit'

/** Create a provider payment for an order (amounts always read server-side). */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'payments', 30, 60_000)
  try {
    const body = await parseBody(event, createPaymentRequestSchema)
    const db = useDb()
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
