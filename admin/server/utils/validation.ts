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
