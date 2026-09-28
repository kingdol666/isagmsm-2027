import { listMyAbstractsWithEvents } from '../../services/abstract.service'
import { sendDomainError } from '../../utils/validation'
import { requireUser } from '../../utils/session'

/** 我的投稿：稿件 + 完整历史记录（投稿/重投/接收/返稿 + 意见）。 */
export default defineEventHandler(async (event) => {
  try {
    const session = requireUser(event)
    const db = useDb()
    const abstracts = await listMyAbstractsWithEvents(db, session.userId)
    return { abstracts }
  }
  catch (error) {
    sendDomainError(error)
  }
})
