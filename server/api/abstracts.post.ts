import { submitAbstractSchema } from '#shared/schemas/abstract'
import { submitAbstract } from '../services/abstract.service'
import { sendDomainError } from '../utils/validation'
import { parseAbstractFields, parseAbstractMultipart } from '../utils/abstract-multipart'
import { requireUser } from '../utils/session'
import { enforceRateLimit } from '../utils/rate-limit'
import { findUserById } from '../repositories/users'

/**
 * 投稿：multipart/form-data —— 表单字段 + 稿件附件（Word/PDF，≤10MB，必填）。
 * 附件存对象存储（MinIO OSS），每个版本独立一份。限流反灌水。
 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'abstracts', 10, 10 * 60_000)
  try {
    const session = requireUser(event)
    const { fields, file } = await parseAbstractMultipart(event)
    if (!file) {
      throw createError({ statusCode: 422, statusMessage: '请上传稿件附件（Word 或 PDF，≤10MB）' })
    }
    const input = parseAbstractFields(fields, submitAbstractSchema)
    const db = useDb()
    const user = await findUserById(db, session.userId)
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Account not found' })
    const abstract = await submitAbstract(
      db,
      { id: user.id, email: user.email, fullName: user.fullName },
      input,
      file,
    )
    setResponseStatus(event, 201)
    return { abstract }
  }
  catch (error) {
    sendDomainError(error)
  }
})
