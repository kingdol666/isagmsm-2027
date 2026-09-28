import { listPayments } from '../../repositories/payments'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const query = getQuery(event)
  const result = await listPayments(db, {
    status: typeof query.status === 'string' ? query.status : undefined,
    page: Number(query.page) || 1,
    pageSize: Number(query.pageSize) || 20,
  })
  return result
})
