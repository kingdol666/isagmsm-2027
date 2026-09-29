import { submitAbstractSchema } from '#shared/schemas/abstract'
import { submitAbstract } from '../services/abstract.service'
import { parseBody, sendDomainError } from '../utils/validation'
import { requireUser } from '../utils/session'
import { enforceRateLimit } from '../utils/rate-limit'
import { findUserById } from '../repositories/users'

/** 投稿：已注册账号提交稿件（姓名/机构/作者列表均必填）。限流反灌水。 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'abstracts', 5, 10 * 60_000)
  try {
    const session = requireUser(event)
    const input = await parseBody(event, submitAbstractSchema)
    const db = useDb()
    const user = await findUserById(db, session.userId)
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Account not found' })
    const abstract = await submitAbstract(db, { id: user.id, email: user.email, fullName: user.fullName }, input)
    setResponseStatus(event, 201)
    return { abstract }
  }
  catch (error) {
    sendDomainError(error)
  }
})
