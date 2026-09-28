import { listOrders } from '../../repositories/orders'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const query = getQuery(event)
  const result = await listOrders(db, {
    status: typeof query.status === 'string' ? query.status : undefined,
    page: Number(query.page) || 1,
    pageSize: Number(query.pageSize) || 20,
  })
  return result
})
