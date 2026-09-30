import type { H3Event } from 'h3'
import type { ZodError, ZodType } from 'zod'
import { MAX_ATTACHMENT_BYTES } from '../../shared/schemas/abstract'

/**
 * 投稿 multipart 解析 —— 表单字段 + 附件一次提交。
 * 正文上限：附件 10MB + 表单字段余量；超限在读取前拒绝（413）。
 */

export interface AbstractMultipart {
  fields: Record<string, string>
  file: { fileName: string, contentType: string, data: Buffer } | null
}

export async function parseAbstractMultipart(event: H3Event): Promise<AbstractMultipart> {
  const length = Number(getHeader(event, 'content-length') ?? 0)
  if (length > MAX_ATTACHMENT_BYTES + 512 * 1024) {
    throw createError({ statusCode: 413, statusMessage: '附件大小不能超过 10MB' })
  }

  let parts: Array<{ name?: string, filename?: string, type?: string, data: Buffer }>
  try {
    parts = await readMultipartFormData(event) ?? []
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: '请求格式错误：需要 multipart/form-data' })
  }

  const fields: Record<string, string> = {}
  let file: AbstractMultipart['file'] = null
  for (const part of parts) {
    if (!part.name) continue
    if (part.name === 'file') {
      if (part.filename) {
        file = { fileName: part.filename, contentType: part.type ?? '', data: part.data }
      }
    }
    else {
      fields[part.name] = part.data.toString('utf8')
    }
  }
  return { fields, file }
}

/** authors 以 JSON 字符串随表单提交 —— 解析失败按 422 处理，绝不让脏结构进 schema。 */
function withParsedAuthors(fields: Record<string, string>): unknown {
  const { authors, ...rest } = fields
  let parsedAuthors: unknown
  try {
    parsedAuthors = JSON.parse(authors ?? '')
  }
  catch {
    parsedAuthors = undefined // 非 JSON → schema 校验统一拒绝
  }
  return { ...rest, authors: parsedAuthors }
}

/** multipart 字段的 zod 校验（错误格式与 parseBody 一致：422 + details）。 */
export function parseAbstractFields<T>(fields: Record<string, string>, schema: ZodType<T>): T {
  const result = schema.safeParse(withParsedAuthors(fields))
  if (!result.success) {
    const details = (result.error as ZodError).issues.map(i => ({
      path: i.path.join('.'),
      message: i.message,
    }))
    throw createError({ statusCode: 422, statusText: 'Validation failed', data: { details } })
  }
  return result.data
}
