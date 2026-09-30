import { z } from 'zod'
import { accountProfileSchema } from '../../../../../shared/schemas/auth'
import { updateUserProfile } from '../../../services/users.service'
import { assertUuidParam, parseBody, sendDomainError } from '../../../utils/validation'

const bodySchema = z.object({
  profile: accountProfileSchema,
})

/** 编辑用户个人资料：与门户「个人中心-我的资料」同一存储（users.fullName + users.profile）。 */
export default defineEventHandler(async (event) => {
  try {
    const id = assertUuidParam(getRouterParam(event, 'id'))
    const { profile } = await parseBody(event, bodySchema)
    const result = await updateUserProfile(useDb(), id, profile)
    return { ok: true, fullName: result?.fullName ?? null }
  }
  catch (error) {
    sendDomainError(error)
  }
})
