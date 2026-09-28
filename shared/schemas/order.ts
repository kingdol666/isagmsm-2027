import { z } from 'zod'

export const createOrderRequestSchema = z.object({
  registrationId: z.uuid(),
})

export const createPaymentRequestSchema = z.object({
  orderId: z.uuid(),
  provider: z.enum(['mock', 'wechat', 'alipay']),
})

export const mockCashierRequestSchema = z.object({
  paymentId: z.uuid(),
  result: z.enum(['paid', 'failed']),
})
