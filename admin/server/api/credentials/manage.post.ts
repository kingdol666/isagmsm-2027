import { z } from 'zod'
import { manageCredential } from '../../services/console.service'
import { parseBody, sendDomainError } from '../../utils/validation'

const schema = z.object({
  registrationId: z.string().uuid(),
  action: z.enum(['issue', 'revoke', 'restore']),
})

/** 凭证管理：下发（仅会员）/ 撤销（QR 立即失效）/ 恢复。 */
export default defineEventHandler(async (event) => {
  try {
    const { registrationId, action } = await parseBody(event, schema)
    const db = useDb()
    return { credential: await manageCredential(db, registrationId, action) }
  }
  catch (error) {
    sendDomainError(error)
  }
})
