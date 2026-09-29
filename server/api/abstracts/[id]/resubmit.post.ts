import { resubmitAbstractSchema } from '#shared/schemas/abstract'
import { resubmitAbstract } from '../../../services/abstract.service'
import { assertUuidParam, parseBody, sendDomainError } from '../../../utils/validation'
import { requireUser } from '../../../utils/session'
import { enforceRateLimit } from '../../../utils/rate-limit'

/** 修改重投：仅被返稿的稿件，版本 +1 并回到待审。限流反灌水。 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'abstract-resubmit', 5, 10 * 60_000)
  try {
    const session = requireUser(event)
    const id = assertUuidParam(getRouterParam(event, 'id'))
    const input = await parseBody(event, resubmitAbstractSchema)
    const db = useDb()
    const abstract = await resubmitAbstract(db, id, { id: session.userId, email: session.email }, input)
    return { abstract }
  }
  catch (error) {
    sendDomainError(error)
  }
})
