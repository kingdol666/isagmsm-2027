import { resubmitAbstractSchema } from '#shared/schemas/abstract'
import { resubmitAbstract } from '../../../services/abstract.service'
import { parseBody, sendDomainError } from '../../../utils/validation'
import { requireUser } from '../../../utils/session'

/** 修改重投：仅被返稿的稿件，版本 +1 并回到待审。 */
export default defineEventHandler(async (event) => {
  try {
    const session = requireUser(event)
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing abstract id' })
    const input = await parseBody(event, resubmitAbstractSchema)
    const db = useDb()
    const abstract = await resubmitAbstract(db, id, { id: session.userId, email: session.email }, input)
    return { abstract }
  }
  catch (error) {
    sendDomainError(error)
  }
})
