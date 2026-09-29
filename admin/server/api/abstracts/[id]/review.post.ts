import { reviewAbstractSchema } from '../../../../../shared/schemas/abstract'
import { reviewAbstract } from '../../../services/console.service'
import { getConsoleMailer } from '../../../services/mail.service'
import { parseBody, sendDomainError } from '../../../utils/validation'

/** 审稿：接收 / 返稿（意见必填），结果邮件通知投稿人注册邮箱。 */
export default defineEventHandler(async (event) => {
  try {
    const admin = requireConsoleAdmin(event)
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing abstract id' })
    const input = await parseBody(event, reviewAbstractSchema)
    const db = useDb()
    const mailer = getConsoleMailer(process.env)
    const abstract = await reviewAbstract(db, id, admin.username, input, mailer)
    return { abstract }
  }
  catch (error) {
    sendDomainError(error)
  }
})
