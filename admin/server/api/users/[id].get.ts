import { findUserById, listUserRegistrations } from '../../services/users.service'
import { assertUuidParam, sendDomainError } from '../../utils/validation'

/** 用户详情：账号信息 + 个人资料 + 该用户名下的全部报名记录。 */
export default defineEventHandler(async (event) => {
  try {
    const id = assertUuidParam(getRouterParam(event, 'id'))
    const user = await findUserById(useDb(), id)
    if (!user) throw createError({ statusCode: 404, statusMessage: '用户不存在' })

    const registrations = await listUserRegistrations(useDb(), id)
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        profile: user.profile ?? null,
        emailVerified: user.emailVerifiedAt != null,
        hasPassword: user.passwordHash != null,
        createdAt: user.createdAt,
      },
      registrations,
    }
  }
  catch (error) {
    sendDomainError(error)
  }
})
