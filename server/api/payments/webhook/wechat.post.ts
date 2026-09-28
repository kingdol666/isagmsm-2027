import { getPaymentProvider } from '../../../payments'
import { handlePaymentCallback } from '../../../services/payment.service'
import { enforceRateLimit } from '../../../utils/rate-limit'

/**
 * WeChat Pay v3 webhook. Signature is verified against platform certificates
 * inside the adapter; handling is idempotent via payment_events.
 * (Active once WECHAT_* credentials are configured — see PAYMENT.md.)
 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'webhook-wechat', 60, 60_000)
  const config = useRuntimeConfig(event)
  const rawBody = await readRawBody(event)
  if (!rawBody) throw createError({ statusCode: 400, statusMessage: 'Missing body' })

  const provider = getPaymentProvider('wechat', { mockPaymentSecret: config.mockPaymentSecret })
  const headers = getHeaders(event) as Record<string, string>
  const callbackEvent = provider.verifyCallback(headers, rawBody)
  if (!callbackEvent) {
    // WeChat expects 4xx/5xx to retry; a plain 401 is the correct rejection.
    throw createError({ statusCode: 401, statusMessage: 'Invalid webhook signature' })
  }

  const db = useDb()
  const result = await handlePaymentCallback(db, 'wechat', callbackEvent)
  return { code: 'SUCCESS', message: result.duplicate ? 'DUPLICATE' : 'OK' }
})
