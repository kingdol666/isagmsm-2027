import QRCode from 'qrcode'
import { findPaymentById } from '../../../repositories/payments'
import { assertUuidParam } from '../../../utils/validation'

/** SVG QR encoding the mock cashier URL (what a phone camera would scan). */
export default defineEventHandler(async (event) => {
  const id = assertUuidParam(getRouterParam(event, 'id'))
  const db = useDb()
  const payment = await findPaymentById(db, id)
  if (!payment) throw createError({ statusCode: 404, statusMessage: 'Payment not found' })

  const config = useRuntimeConfig(event)
  const payload = (payment.payload as { cashierUrl?: string }) ?? {}
  const url = new URL(payload.cashierUrl ?? `/pay/mock/${payment.id}`, config.public.siteUrl)

  setHeader(event, 'content-type', 'image/svg+xml')
  setHeader(event, 'cache-control', 'no-store')
  return QRCode.toString(url.toString(), {
    type: 'svg',
    margin: 1,
    color: { dark: '#111111', light: '#F7F6F2' },
  })
})
