import type { DbExecutor } from '../db'
import { DomainError } from './registration.service'
import { findRegistrationById } from '../repositories/credential-ops'
import { setCredentialStatus } from '../repositories/credentials'
import { ensureCredential } from './credential.service'

/**
 * 管理端凭证操作：
 *  - issue：为「已确认缴费」的报名下发凭证（幂等，已下发则返回原凭证）
 *  - revoke / restore：撤销（QR 立即失效）与恢复
 */
export async function issueCredentialForRegistration(db: DbExecutor, registrationId: string) {
  const registration = await findRegistrationById(db, registrationId)
  if (!registration) throw new DomainError(404, '报名记录不存在')
  if (registration.status !== 'confirmed') {
    throw new DomainError(409, '该报名尚未确认缴费，请先在缴费审批中通过')
  }
  const credential = await ensureCredential(db, registrationId)
  return credential
}

export async function setCredentialStatusForRegistration(
  db: DbExecutor,
  registrationId: string,
  action: 'revoke' | 'restore',
) {
  const existing = await ensureCredential(db, registrationId)
  const next = action === 'revoke' ? 'revoked' : 'active'
  await setCredentialStatus(db, existing.id, next)
  return { ...existing, status: next }
}
