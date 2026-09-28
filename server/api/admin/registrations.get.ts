import { listRegistrations } from '../../repositories/registrations'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const query = getQuery(event)
  const result = await listRegistrations(db, {
    search: typeof query.search === 'string' ? query.search : undefined,
    status: typeof query.status === 'string' ? query.status : undefined,
    page: Number(query.page) || 1,
    pageSize: Number(query.pageSize) || 20,
  })
  return result
})
