import { listUsers } from '../services/users.service'
import { sendDomainError } from '../utils/validation'

/** 用户管理：所有注册账号（无论是否报名），支持按邮箱/姓名搜索。 */
export default defineEventHandler(async (event) => {
  try {
    const q = getQuery(event).q
    const rows = await listUsers(useDb(), typeof q === 'string' ? q : undefined)
    return { rows }
  }
  catch (error) {
    sendDomainError(error)
  }
})
