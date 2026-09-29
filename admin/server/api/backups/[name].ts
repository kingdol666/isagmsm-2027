import { createReadStream } from 'node:fs'
import { deleteBackup, resolveBackupPath } from '../../services/backup.service'
import { sendDomainError } from '../../utils/validation'

/** 下载 / 删除单个备份（文件名白名单 + 路径穿越防护在 service 层）。 */
export default defineEventHandler(async (event) => {
  try {
    const name = getRouterParam(event, 'name')
    if (!name) throw createError({ statusCode: 400, statusMessage: 'Missing backup name' })

    if (event.method === 'DELETE') {
      await deleteBackup(name)
      return { deleted: name }
    }

    // GET → 下载
    const target = resolveBackupPath(name)
    setHeader(event, 'content-type', 'application/octet-stream')
    setHeader(event, 'content-disposition', `attachment; filename="${name}"`)
    setHeader(event, 'cache-control', 'no-store')
    return sendStream(event, createReadStream(target))
  }
  catch (error) {
    sendDomainError(error)
  }
})
