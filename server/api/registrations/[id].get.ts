import { getRegistrationDetail } from '../../services/registration.service'
import { requireUser } from '../../utils/session'
import { sendDomainError } from '../../utils/validation'

/** 报名详情：仅报名人本人可见（越权一律 404，不泄露存在性）。 */
export default defineEventHandler(async (event) => {
  const session = requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing registration id' })
  try {
    const db = useDb()
    const detail = await getRegistrationDetail(db, id)
    if (!detail || detail.registration.userId !== session.userId) {
      throw createError({ statusCode: 404, statusMessage: 'Registration not found' })
    }
    return {
      registration: detail.registration,
      type: detail.type,
    }
  }
  catch (error) {
    sendDomainError(error)
  }
})
