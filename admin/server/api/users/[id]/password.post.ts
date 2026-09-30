import { z } from 'zod'
import { setUserPassword } from '../../../services/users.service'
import { assertUuidParam, parseBody, sendDomainError } from '../../../utils/validation'

const bodySchema = z.object({
  password: z.string().min(8, '新密码至少 8 位').max(200),
})

/** 强制修改密码：管理员直接设置用户新口令，原口令立即失效。 */
export default defineEventHandler(async (event) => {
  try {
    const id = assertUuidParam(getRouterParam(event, 'id'))
    const { password } = await parseBody(event, bodySchema)
    const result = await setUserPassword(useDb(), id, password)
    console.warn(`[audit] 管理员强制修改用户密码：${result.email}（${id}）`)
    return { ok: true, email: result.email }
  }
  catch (error) {
    sendDomainError(error)
  }
})
