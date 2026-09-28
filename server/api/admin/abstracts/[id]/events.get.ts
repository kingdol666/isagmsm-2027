import { getAbstractEventsForAdmin } from '../../../../services/abstract.service'
import { sendDomainError } from '../../../../utils/validation'
import { requireStaff } from '../../../../utils/session'

/** 管理端查看单篇稿件的历史事件。 */
export default defineEventHandler(async (event) => {
  try {
    requireStaff(event)
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing abstract id' })
    const db = useDb()
    const events = await getAbstractEventsForAdmin(db, id)
    return { events }
  }
  catch (error) {
    sendDomainError(error)
  }
})
