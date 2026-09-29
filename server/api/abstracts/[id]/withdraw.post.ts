import { withdrawAbstract } from '../../../services/abstract.service'
import { assertUuidParam, sendDomainError } from '../../../utils/validation'
import { requireUser } from '../../../utils/session'

/** 撤回稿件：仅本人、仅待审/已返稿状态；撤回后管理台不再显示。 */
export default defineEventHandler(async (event) => {
  try {
    const session = requireUser(event)
    const id = assertUuidParam(getRouterParam(event, 'id'))
    const db = useDb()
    const abstract = await withdrawAbstract(db, id, { id: session.userId, email: session.email })
    return { abstract }
  }
  catch (error) {
    sendDomainError(error)
  }
})
