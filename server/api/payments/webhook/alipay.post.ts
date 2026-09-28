import { getPaymentProvider } from '../../../payments'
import { handlePaymentCallback } from '../../../services/payment.service'
import { enforceRateLimit } from '../../../utils/rate-limit'

/**
 * Alipay async notify endpoint. Body is form-urlencoded; the adapter verifies
 * the RSA2 signature with the Alipay public key, handling is idempotent.
 * (Active once ALIPAY_* credentials are configured — see PAYMENT.md.)
 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'webhook-alipay', 60, 60_000)
  const config = useRuntimeConfig(event)
  const rawBody = (await readRawBody(event, false))?.toString('utf8')
  if (!rawBody) throw createError({ statusCode: 400, statusMessage: 'Missing body' })

  const provider = getPaymentProvider('alipay', { mockPaymentSecret: config.mockPaymentSecret })
  const headers = getHeaders(event) as Record<string, string>
  const callbackEvent = provider.verifyCallback(headers, rawBody)
  if (!callbackEvent) {
    // Alipay convention: respond "fail" (non-success) so it retries.
    setResponseStatus(event, 200)
    return 'fail'
  }

  const db = useDb()
  const result = await handlePaymentCallback(db, 'alipay', callbackEvent)
  // Alipay convention: plain "success" text stops retries.
  setHeader(event, 'content-type', 'text/plain')
  return result.duplicate ? 'success (duplicate)' : 'success'
})
