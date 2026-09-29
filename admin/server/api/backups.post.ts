import { createBackup } from '../services/backup.service'
import { sendDomainError } from '../utils/validation'

/** 触发一次立即备份（管理台专属）。 */
export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const name = await createBackup(config.databaseUrl)
    setResponseStatus(event, 201)
    return { created: name }
  }
  catch (error) {
    sendDomainError(error)
  }
})
