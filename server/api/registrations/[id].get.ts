import { getRegistrationDetail } from '../../services/registration.service'
import { sendDomainError } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing registration id' })
  try {
    const db = useDb()
    const detail = await getRegistrationDetail(db, id)
    if (!detail) throw createError({ statusCode: 404, statusMessage: 'Registration not found' })
    return {
      registration: detail.registration,
      type: detail.type,
    }
  }
  catch (error) {
    sendDomainError(error)
  }
})
