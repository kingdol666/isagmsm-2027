import type { H3Event } from 'h3'
import type { ZodError, ZodType } from 'zod'

/** Parse + validate a JSON body against a shared zod schema (server-side re-validation). */
export async function parseBody<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  let raw: unknown
  try {
    raw = await readBody(event)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON body' })
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    const details = (result.error as ZodError).issues.map(i => ({
      path: i.path.join('.'),
      message: i.message,
    }))
    throw createError({ statusCode: 422, statusText: 'Validation failed', data: { details } })
  }
  return result.data
}

/** Map a DomainError to its HTTP status; re-throw anything else. */
export function sendDomainError(error: unknown): never {
  if (error instanceof Error && 'statusCode' in error) {
    throw createError({
      statusCode: (error as { statusCode: number }).statusCode,
      statusMessage: error.message,
    })
  }
  throw error
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 路径参数 UUID 守卫：非 UUID 直接 404，绝不触达数据库。
 * 防止 Postgres uuid 强转异常 → 500 + SQL/内部路径泄露（V-1）。
 */
export function assertUuidParam(id: string | undefined): string {
  if (!id || !UUID_RE.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  return id
}
