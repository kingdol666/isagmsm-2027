import { contentDisposition } from '../../../../utils/attachment'
import { findAbstractById, findAbstractEventFile } from '../../../../repositories/console'
import { getAbstractFileBuffer } from '../../../../services/storage.service'
import { assertUuidParam, sendDomainError } from '../../../../utils/validation'

/**
 * 管理台下载稿件附件：/api/abstracts/:id/files/:version
 * 会话由 console-api 中间件统一守卫；对象键只来自数据库，不接受任何客户端路径。
 */
export default defineEventHandler(async (event) => {
  try {
    const id = assertUuidParam(getRouterParam(event, 'id'))
    const version = Number(getRouterParam(event, 'version'))
    if (!Number.isInteger(version) || version < 1 || version > 1000) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }

    const db = useDb()
    const abstract = await findAbstractById(db, id)
    if (!abstract) throw createError({ statusCode: 404, statusMessage: 'Not found' })

    const meta = await findAbstractEventFile(db, id, version)
    if (!meta?.fileKey) throw createError({ statusCode: 404, statusMessage: '该版本没有附件' })

    const buffer = await getAbstractFileBuffer(meta.fileKey)
    if (!buffer) throw createError({ statusCode: 404, statusMessage: '附件不存在' })

    setResponseHeader(event, 'content-type', meta.fileType ?? 'application/octet-stream')
    setResponseHeader(event, 'content-length', buffer.length)
    setResponseHeader(event, 'content-disposition', contentDisposition(meta.fileName ?? 'attachment'))
    setResponseHeader(event, 'cache-control', 'private, no-store')
    return buffer
  }
  catch (error) {
    sendDomainError(error)
  }
})
