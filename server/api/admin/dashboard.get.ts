import { countAll, countByStatus } from '../../repositories/registrations'
import { countCheckins } from '../../repositories/checkins'
import { sumPaidRevenue } from '../../repositories/orders'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const [registrationsTotal, byStatus, checkins, revenueFen] = await Promise.all([
    countAll(db),
    countByStatus(db),
    countCheckins(db),
    sumPaidRevenue(db),
  ])

  return {
    registrationsTotal,
    confirmed: byStatus.confirmed ?? 0,
    submitted: byStatus.submitted ?? 0,
    checkins,
    revenueFen,
  }
})
