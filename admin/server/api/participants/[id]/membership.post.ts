import { z } from 'zod'
import { setMembershipWithBinding } from '../../../services/console.service'
import { assertUuidParam, parseBody, sendDomainError } from '../../../utils/validation'

const schema = z.object({ isMember: z.boolean() })

/**
 * 会员开关（仅 admin）：
 *  - 设为会员：之后才能收款确认下发凭证 / 手动下发凭证；
 *  - 取消会员：同一事务内自动吊销该参会人全部 active 凭证（QR 立即失效）。
 */
export default defineEventHandler(async (event) => {
  try {
    const id = assertUuidParam(getRouterParam(event, 'id'))
    const { isMember } = await parseBody(event, schema)
    const db = useDb()
    return await setMembershipWithBinding(db, id, isMember)
  }
  catch (error) {
    sendDomainError(error)
  }
})
