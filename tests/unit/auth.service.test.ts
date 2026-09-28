import { afterAll, describe, expect, it } from 'vitest'
import { createDb } from '../../server/db'
import {
  checkEmailCode,
  login,
  registerAccount,
  requestEmailCode,
  resetPassword,
} from '../../server/services/auth.service'
import { findUserByEmail } from '../../server/repositories/users'

/**
 * Account/auth integration tests (test database): code lifecycle (cooldown,
 * expiry, attempt burn), sign-up, duplicate sign-up, login, password reset.
 * Test passwords are generated per run — never committed literals.
 */

const DATABASE_URL = process.env.DATABASE_URL_TEST
  ?? 'postgresql://pps:pps_dev_pw@localhost:5433/pps2026_test'

const db = createDb(DATABASE_URL)
const runId = Date.now()
const email = `auth-${runId}@example.test`
const password = `pw-${runId}-${Math.random().toString(36).slice(2, 10)}!A`
const newPassword = `pw-${runId}-${Math.random().toString(36).slice(2, 10)}!B`

async function statusCode(email: string, purpose: 'signup' | 'reset') {
  return requestEmailCode(db, email, purpose)
}

afterAll(async () => {
  await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end()
})

describe('auth service (integration)', () => {
  it('sign-up requires a valid code and creates a verified account', async () => {
    const code = await statusCode(email, 'signup')
    const account = await registerAccount(db, {
      email,
      code,
      password,
      fullName: 'Auth Tester',
    })
    expect(account.userId).toBeTruthy()

    const user = await findUserByEmail(db, email)
    expect(user?.emailVerifiedAt).not.toBeNull()
    expect(user?.passwordHash).toBeTruthy()
  })

  it('rejects a second sign-up for an account that already has a password', async () => {
    const code = await statusCode(email, 'signup')
    await expect(registerAccount(db, {
      email,
      code,
      password,
      fullName: 'Auth Tester',
    })).rejects.toThrow('already exists')
  })

  it('rejects wrong codes and burns them after too many attempts', async () => {
    const secondEmail = `attempts-${runId}@example.test`
    await statusCode(secondEmail, 'signup')

    // 4 wrong attempts still keep the code (each failing with a wrong-code error)
    for (let i = 0; i < 4; i++) {
      await expect(checkEmailCode(db, secondEmail, 'signup', '000000')).rejects.toThrow('Wrong code')
    }
    // 5th wrong attempt burns it
    await expect(checkEmailCode(db, secondEmail, 'signup', '000000')).rejects.toThrow('Too many wrong attempts')
    // a freshly requested code works again
    const fresh = await statusCode(secondEmail, 'signup')
    expect(fresh).toMatch(/^\d{6}$/)
  })

  it('enforces the resend cooldown', async () => {
    const thirdEmail = `cooldown-${runId}@example.test`
    await statusCode(thirdEmail, 'signup')
    await expect(statusCode(thirdEmail, 'signup')).rejects.toThrow('wait')
  })

  it('logs in with the right password and rejects the wrong one', async () => {
    const account = await login(db, email, password)
    expect(account.email).toBe(email)
    await expect(login(db, email, `${password}-wrong`)).rejects.toThrow('Invalid email or password')
    await expect(login(db, `nobody-${runId}@example.test`, `${password}-nobody`)).rejects.toThrow('Invalid email or password')
  })

  it('resets the password with the emailed code', async () => {
    const code = await statusCode(email, 'reset')
    await resetPassword(db, { email, code, password: newPassword })
    const account = await login(db, email, newPassword)
    expect(account.userId).toBeTruthy()
    // old password no longer works
    await expect(login(db, email, password)).rejects.toThrow('Invalid email or password')
  })

  it('reset rejects wrong codes', async () => {
    await statusCode(email, 'reset')
    await expect(resetPassword(db, { email, code: '999999', password: newPassword })).rejects.toThrow('Wrong code')
  })
})
