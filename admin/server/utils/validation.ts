import type { H3Event } from 'h3'
import type { ZodSchema } from 'zod'

/** 服务端领域错误（statusCode + 中文 message），由 sendDomainError 映射为 HTTP 响应。 */
export class DomainError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

export async function parseBody<T>(event: H3Event, schema: ZodSchema<T>): Promise<T> {
  return await readValidatedBody(event, body => schema.parse(body))
}

export function sendDomainError(error: unknown): never {
  if (error instanceof DomainError) {
    throw createError({ statusCode: error.statusCode, statusMessage: error.message })
  }
  throw error
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 路径参数 UUID 守卫：非 UUID 直接 404，绝不触达数据库。
 * 防止 Postgres uuid 强转异常 → 500 + SQL/内部路径泄露。
 */
export function assertUuidParam(id: string | undefined): string {
  if (!id || !UUID_RE.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  return id
}
