import { getAbstractTimeline } from '../../../services/console.service'
import { sendDomainError } from '../../../utils/validation'

/** 单篇稿件的历史事件。 */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing abstract id' })
    const db = useDb()
    return { events: await getAbstractTimeline(db, id) }
  }
  catch (error) {
    sendDomainError(error)
  }
})
