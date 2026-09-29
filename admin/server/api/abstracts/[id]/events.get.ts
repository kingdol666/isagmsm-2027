import { getAbstractTimeline } from '../../../services/console.service'
import { assertUuidParam, sendDomainError } from '../../../utils/validation'

/** 单篇稿件的历史事件。 */
export default defineEventHandler(async (event) => {
  try {
    const id = assertUuidParam(getRouterParam(event, 'id'))
    const db = useDb()
    return { events: await getAbstractTimeline(db, id) }
  }
  catch (error) {
    sendDomainError(error)
  }
})
