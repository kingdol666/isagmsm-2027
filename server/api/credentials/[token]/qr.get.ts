import QRCode from 'qrcode'
import { getCredentialView } from '../../../services/credential.service'

/** SVG QR encoding the public verification URL of a credential. */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token || token.length < 20) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid credential token' })
  }
  const db = useDb()
  const view = await getCredentialView(db, token)
  if (!view) throw createError({ statusCode: 404, statusMessage: 'Credential not found' })

  const config = useRuntimeConfig(event)
  const verifyUrl = new URL(`/verify/${token}`, config.public.siteUrl).toString()

  setHeader(event, 'content-type', 'image/svg+xml')
  setHeader(event, 'cache-control', 'no-store')
  return QRCode.toString(verifyUrl, {
    type: 'svg',
    margin: 1,
    color: { dark: '#111111', light: '#F7F6F2' },
  })
})
