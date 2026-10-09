import QRCode from 'qrcode'
import { findPaymentById } from '../../../repositories/payments'
import { assertUuidParam } from '../../../utils/validation'

/** SVG QR — 真实渠道（支付宝 precreate）编码其官方 qr_code 串，扫码直接拉起支付宝；
 *  mock 编码收银台绝对地址（模拟手机相机扫码后打开的页面）。 */
export default defineEventHandler(async (event) => {
  const id = assertUuidParam(getRouterParam(event, 'id'))
  const db = useDb()
  const payment = await findPaymentById(db, id)
  if (!payment) throw createError({ statusCode: 404, statusMessage: 'Payment not found' })

  const config = useRuntimeConfig(event)
  const payload = (payment.payload as { cashierUrl?: string, qrContent?: string }) ?? {}
  const content = payload.qrContent
    ?? new URL(payload.cashierUrl ?? `/pay/mock/${payment.id}`, config.public.siteUrl).toString()

  setHeader(event, 'content-type', 'image/svg+xml')
  setHeader(event, 'cache-control', 'no-store')
  return QRCode.toString(content, {
    type: 'svg',
    margin: 1,
    color: { dark: '#111111', light: '#F7F6F2' },
  })
})
