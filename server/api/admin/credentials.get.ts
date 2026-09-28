import { listCredentialsDetail } from '../../repositories/credentials'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const rows = await listCredentialsDetail(db, 200)
  return {
    rows: rows.map(({ credential, registration, type }) => ({
      tokenPreview: `${credential.token.slice(0, 8)}…`,
      token: credential.token,
      status: credential.status,
      issuedAt: credential.issuedAt,
      displayId: registration.displayId,
      fullName: registration.fullName,
      affiliation: registration.affiliation,
      typeName: type.name,
      registrationStatus: registration.status,
    })),
  }
})
