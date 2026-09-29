import { listParticipants } from '../repositories/console'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const db = useDb()
  const rows = await listParticipants(db, {
    q: typeof query.q === 'string' ? query.q.trim() || undefined : undefined,
    status: typeof query.status === 'string' ? query.status : undefined,
  })
  return { rows }
})
