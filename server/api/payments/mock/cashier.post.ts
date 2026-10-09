import { createHmac, randomUUID } from 'node:crypto'
import { mockCashierRequestSchema } from '#shared/schemas/order'
import { findPaymentById } from '../../../repositories/payments'
import { findOrderById } from '../../../repositories/orders'
import { getPaymentProvider } from '../../../payments'
import { handlePaymentCallback } from '../../../services/payment.service'
import { parseBody, sendDomainError } from '../../../utils/validation'

/**
 * Mock cashier action (hosted page). Simulates the phone-side payment: builds
 * the provider event, HMAC-signs it, and pushes it through the SAME webhook
 * verification + handling path a real provider callback would take.
 */
export default defineEventHandler(async (event) => {
  try {
    const { paymentId, result } = await parseBody(event, mockCashierRequestSchema)
    const config = useRuntimeConfig(event)
    const db = useDb()

    const payment = await findPaymentById(db, paymentId)
    if (!payment) throw createError({ statusCode: 404, statusMessage: 'Payment not found' })
    if (payment.provider !== 'mock') throw createError({ statusCode: 400, statusMessage: 'Not a mock payment' })
    if (payment.status !== 'pending') {
      // 过期/已支付/已失败的支付不可再操作 —— 模拟"过期二维码扫了也付不了"
      throw createError({ statusCode: 409, statusMessage: `该支付已${payment.status === 'expired' ? '过期' : '处理完成'}，请回到支付页重新生成订单` })
    }
    const order = await findOrderById(db, payment.orderId)
    if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })

    const body = JSON.stringify({
      eventId: randomUUID(),
      eventType: `mock.${result}`,
      providerPaymentNo: payment.providerPaymentNo,
      orderNo: order.orderNo,
      result,
      amountFen: payment.amountFen,
    })
    const signature = createHmac('sha256', config.mockPaymentSecret).update(body).digest('hex')

    const provider = getPaymentProvider('mock', { mockPaymentSecret: config.mockPaymentSecret })
    const callbackEvent = provider.verifyCallback({ 'x-mock-signature': signature }, body)
    if (!callbackEvent) throw createError({ statusCode: 500, statusMessage: 'Mock signature self-check failed' })

    return await handlePaymentCallback(db, 'mock', callbackEvent)
  }
  catch (error) {
    sendDomainError(error)
  }
})
