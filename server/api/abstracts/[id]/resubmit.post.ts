import { resubmitAbstractSchema } from '#shared/schemas/abstract'
import { resubmitAbstract } from '../../../services/abstract.service'
import { assertUuidParam, sendDomainError } from '../../../utils/validation'
import { parseAbstractFields, parseAbstractMultipart } from '../../../utils/abstract-multipart'
import { requireUser } from '../../../utils/session'
import { enforceRateLimit } from '../../../utils/rate-limit'

/**
 * 修改重投：multipart/form-data —— 修改后的表单字段 + 新版本附件（必填，每版独立存储）。
 * 仅被返稿的稿件，版本 +1 并回到待审。限流反灌水。
 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'abstract-resubmit', 10, 10 * 60_000)
  try {
    const session = requireUser(event)
    const id = assertUuidParam(getRouterParam(event, 'id'))
    const { fields, file } = await parseAbstractMultipart(event)
    if (!file) {
      throw createError({ statusCode: 422, statusMessage: '请上传新版稿件附件（Word 或 PDF，≤10MB）' })
    }
    const input = parseAbstractFields(fields, resubmitAbstractSchema)
    const db = useDb()
    const abstract = await resubmitAbstract(
      db,
      id,
      { id: session.userId, email: session.email },
      input,
      file,
    )
    return { abstract }
  }
  catch (error) {
    sendDomainError(error)
  }
})
