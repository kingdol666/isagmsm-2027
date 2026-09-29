import { dashboardStats } from '../repositories/console'

export default defineEventHandler(async () => {
  const db = useDb()
  return dashboardStats(db)
})
