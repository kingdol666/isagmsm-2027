import { createHmac } from 'node:crypto'
import { getPaymentProvider } from '../../../payments'
import { handlePaymentCallback } from '../../../services/payment.service'
import { enforceRateLimit } from '../../../utils/rate-limit'

/**
 * Mock provider webhook — the ONLY path that can mark a mock payment paid.
 * Signature (HMAC-SHA256 over the raw body) is verified before processing;
 * handling is idempotent via payment_events.
 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'webhook-mock', 60, 60_000)
  const config = useRuntimeConfig(event)
  const rawBody = await readRawBody(event)
  if (!rawBody) throw createError({ statusCode: 400, statusMessage: 'Missing body' })

  const headers = getHeaders(event) as Record<string, string>
  const provider = getPaymentProvider('mock', { mockPaymentSecret: config.mockPaymentSecret })
  const callbackEvent = provider.verifyCallback(headers, rawBody)
  if (!callbackEvent) {
    console.warn('[webhook:mock] rejected — header:', String(headers['x-mock-signature']),
      '| server-computed:', createHmac('sha256', config.mockPaymentSecret).update(rawBody).digest('hex'),
      '| typeof-rawBody:', typeof rawBody, '| body:', String(rawBody))
    throw createError({ statusCode: 401, statusMessage: 'Invalid webhook signature' })
  }

  const db = useDb()
  const result = await handlePaymentCallback(db, 'mock', callbackEvent)
  return result
})
