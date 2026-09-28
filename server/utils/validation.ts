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
