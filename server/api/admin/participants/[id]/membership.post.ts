import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { registrations } from '../../../../db/schema'
import { findRegistrationById } from '../../../../repositories/credential-ops'
import { DomainError } from '../../../../services/registration.service'
import { parseBody, sendDomainError } from '../../../../utils/validation'
import { requireAdmin } from '../../../../utils/session'

const memberSchema = z.object({
  isMember: z.boolean(),
})

/** 管理端赋予 / 取消会员标识（默认非会员，依据线下缴费情况手动设置）。 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const registrationId = getRouterParam(event, 'id')
  if (!registrationId) throw createError({ statusCode: 400, statusMessage: 'Missing registration id' })

  try {
    const { isMember } = await parseBody(event, memberSchema)
    const db = useDb()
    const registration = await findRegistrationById(db, registrationId)
    if (!registration) throw new DomainError(404, '报名记录不存在')

    await db.update(registrations)
      .set({ isMember, updatedAt: new Date() })
      .where(eq(registrations.id, registrationId))

    return { registrationId, isMember }
  }
  catch (error) {
    sendDomainError(error)
  }
})
