import { listAbstractsForAdmin } from '../../services/abstract.service'
import { sendDomainError } from '../../utils/validation'
import { requireStaff } from '../../utils/session'

/** 管理端稿件列表（含投稿人邮箱）。 */
export default defineEventHandler(async (event) => {
  try {
    requireStaff(event)
    const db = useDb()
    const abstracts = await listAbstractsForAdmin(db)
    return { abstracts }
  }
  catch (error) {
    sendDomainError(error)
  }
})
