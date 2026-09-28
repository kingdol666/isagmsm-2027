import { getCredentialView } from '../../services/credential.service'

/** Public credential lookup by unguessable token (the QR content). */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token || token.length < 20) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid credential token' })
  }
  const db = useDb()
  const view = await getCredentialView(db, token)
  if (!view) throw createError({ statusCode: 404, statusMessage: 'Credential not found' })
  return { credential: view }
})
