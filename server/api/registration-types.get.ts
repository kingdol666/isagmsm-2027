import { listActiveTypes } from '../repositories/registration-types'

/** Public registration types with server-owned prices (display only). */
export default defineEventHandler(async () => {
  const db = useDb()
  const types = await listActiveTypes(db)
  return types.map(t => ({
    id: t.id,
    code: t.code,
    name: t.name,
    priceFen: t.priceFen,
    priceYuan: t.priceFen / 100,
    currency: t.currency,
    description: t.description,
    availability: t.availability,
  }))
})
