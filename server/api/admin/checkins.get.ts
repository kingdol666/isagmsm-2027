import { listCheckinsDetail } from '../../repositories/checkins'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const rows = await listCheckinsDetail(db, 200)
  return {
    rows: rows.map(({ checkin, registration }) => ({
      id: checkin.id,
      method: checkin.method,
      checkedInAt: checkin.checkedInAt,
      displayId: registration.displayId,
      fullName: registration.fullName,
      affiliation: registration.affiliation,
    })),
  }
})
