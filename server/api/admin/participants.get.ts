import { listParticipants } from '../../repositories/participants'
import { findCredentialsForRegistrations } from '../../repositories/credential-ops'
import { countReviewing } from '../../repositories/order-review'

/** 统一参会人员管理列表：信息 + 缴费 + 凭证 + 签到，一次查全。 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const query = getQuery(event)

  const result = await listParticipants(db, {
    search: typeof query.search === 'string' ? query.search : undefined,
    status: typeof query.status === 'string' ? query.status : undefined,
    page: Number(query.page) || 1,
    pageSize: Number(query.pageSize) || 20,
  })

  const credentialRows = await findCredentialsForRegistrations(
    db,
    result.rows.map(r => r.registration.id),
  )
  const credentialByReg = new Map(credentialRows.map(c => [c.registrationId, c]))
  const reviewing = await countReviewing(db)

  return {
    ...result,
    reviewingCount: reviewing,
    rows: result.rows.map((row) => {
      const credential = credentialByReg.get(row.registration.id)
      return {
        registrationId: row.registration.id,
        displayId: row.registration.displayId,
        fullName: row.registration.fullName,
        email: row.registration.email,
        phone: row.registration.phone,
        affiliation: row.registration.affiliation,
        country: row.registration.country,
        status: row.registration.status,
        createdAt: row.registration.createdAt,
        typeName: row.typeName,
        order: row.order,
        credential: credential
          ? {
              id: credential.id,
              token: credential.token,
              status: credential.status,
              checkedInAt: credential.checkedInAt,
            }
          : null,
      }
    }),
  }
})
