import { contentDisposition } from '../../../../utils/attachment'
import { findAbstractById, findAbstractEventFile } from '../../../../repositories/abstracts'
import { getAbstractFileBuffer } from '../../../../services/storage.service'
import { assertUuidParam, sendDomainError } from '../../../../utils/validation'
import { requireUser } from '../../../../utils/session'
import { enforceRateLimit } from '../../../../utils/rate-limit'

/**
 * 下载自己稿件的某个版本附件：/api/abstracts/:id/files/:version
 * 仅稿件属主可下载（他人/匿名一律拒绝）；对象键只来自数据库，不接受任何客户端路径。
 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'abstract-file', 60, 60_000)
  try {
    const session = requireUser(event)
    const id = assertUuidParam(getRouterParam(event, 'id'))
    const version = Number(getRouterParam(event, 'version'))
    if (!Number.isInteger(version) || version < 1 || version > 1000) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }

    const db = useDb()
    const abstract = await findAbstractById(db, id)
    if (!abstract || abstract.userId !== session.userId) {
      // 属主校验失败统一 404，不泄露稿件存在性
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }

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
