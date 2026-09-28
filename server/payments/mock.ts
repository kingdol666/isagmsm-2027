import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { CreatePaymentRequest, CreatePaymentResult, PaymentProvider, ProviderCallbackEvent } from './types'

const SIGNATURE_HEADER = 'x-mock-signature'

/**
 * MockPaymentProvider — simulates a QR cashier (PENDING → PAID / FAILED /
 * EXPIRED). The "scan" happens on our own hosted mock cashier page, which
 * calls the signed webhook endpoint; the webhook is the ONLY thing that can
 * mark a payment paid, exactly like a real provider.
 */
export function createMockProvider(secret: string): PaymentProvider {
  return {
    name: 'mock',

    async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResult> {
      const providerPaymentNo = `MOCK-${randomBytes(12).toString('hex')}`
      return {
        providerPaymentNo,
        payload: {
          // the mock cashier simulates scanning the QR with a phone
          cashierUrl: `/pay/mock/${request.paymentId}`,
          qrContent: `PPS26-MOCK-PAY:${providerPaymentNo}`,
          amountFen: request.amountFen,
          orderNo: request.orderNo,
        },
      }
    },

    verifyCallback(headers: Record<string, string>, rawBody: string): ProviderCallbackEvent | null {
      const signature = headers[SIGNATURE_HEADER]
      if (!signature) return null
      const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
      const a = Buffer.from(signature, 'utf8')
      const b = Buffer.from(expected, 'utf8')
      if (a.length !== b.length || !timingSafeEqual(a, b)) return null

      try {
        const body = JSON.parse(rawBody) as {
          eventId?: string
          eventType?: string
          providerPaymentNo?: string
          orderNo?: string
          result?: string
          amountFen?: number
        }
        if (!body.eventId || !body.providerPaymentNo || !body.result) return null
        const result = body.result
        if (result !== 'paid' && result !== 'failed' && result !== 'expired') return null
        return {
          eventId: body.eventId,
          eventType: body.eventType ?? `mock.${result}`,
          providerPaymentNo: body.providerPaymentNo,
          orderNo: body.orderNo,
          status: result,
          amountFen: body.amountFen,
        }
      }
      catch {
        return null
      }
    },

    async queryPayment(): Promise<'pending'> {
      // The mock provider relies on its webhook; active queries stay pending.
      return 'pending'
    },
  }
}
