import { z } from 'zod'
import { issueCredentialForRegistration, setCredentialStatusForRegistration } from '../../../services/admin-credential.service'
import { parseBody, sendDomainError } from '../../../utils/validation'
import { requireAdmin } from '../../../utils/session'

const credentialActionSchema = z.object({
  registrationId: z.uuid(),
  action: z.enum(['issue', 'revoke', 'restore']),
})

/**
 * 管理端凭证操作：
 *  - issue：为已确认缴费的报名下发 QR 凭证（幂等）
 *  - revoke / restore：撤销 / 恢复
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  try {
    const { registrationId, action } = await parseBody(event, credentialActionSchema)
    const db = useDb()
    if (action === 'issue') {
      const credential = await issueCredentialForRegistration(db, registrationId)
      return { action, token: credential.token, status: credential.status }
    }
    const result = await setCredentialStatusForRegistration(db, registrationId, action)
    return { action, token: result.token, status: result.status }
  }
  catch (error) {
    sendDomainError(error)
  }
})
