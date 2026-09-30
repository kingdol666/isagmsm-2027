import { desc, eq, ilike, or, sql } from 'drizzle-orm'
import type { DbExecutor } from '../db'
import { users, registrations, registrationTypes } from '../db/schema'
import { hashPassword } from './crypto'
import { DomainError } from '../utils/validation'

/**
 * 用户（注册账号）管理 —— 管理台查看所有注册账号、强制修改密码、编辑个人资料。
 * 无论该用户是否提交过报名，只要注册即可见（数据源 = users 表本体）。
 */

export interface UserListRow {
  id: string
  email: string
  fullName: string | null
  emailVerified: boolean
  hasPassword: boolean
  registrationCount: number
  createdAt: Date
}

export async function listUsers(db: DbExecutor, q: string | undefined): Promise<UserListRow[]> {
  const search = q?.trim()
  const where = search
    ? or(ilike(users.email, `%${search}%`), ilike(users.fullName, `%${search}%`))
    : undefined

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      emailVerified: sql<boolean>`${users.emailVerifiedAt} is not null`,
      hasPassword: sql<boolean>`${users.passwordHash} is not null`,
      registrationCount: sql<number>`(select count(*)::int from ${registrations} where ${registrations.userId} = ${users.id})`,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(500)

  return rows
}

export async function findUserById(db: DbExecutor, id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return rows[0] ?? null
}

/** 强制修改密码：管理台直接设置新口令（用户原口令立即失效）。 */
export async function setUserPassword(db: DbExecutor, userId: string, password: string) {
  const user = await findUserById(db, userId)
  if (!user) throw new DomainError(404, '用户不存在')
  await db.update(users).set({ passwordHash: hashPassword(password) }).where(eq(users.id, userId))
  return { email: user.email }
}

export interface EditableProfile {
  fullName: string
  englishName?: string
  phone?: string
  affiliation: string
  department?: string
  position?: string
  country: string
  dietary?: string
}

/** 编辑个人资料：与门户「个人中心-我的资料」同一存储（users.fullName + users.profile）。 */
export async function updateUserProfile(db: DbExecutor, userId: string, profile: EditableProfile) {
  const user = await findUserById(db, userId)
  if (!user) throw new DomainError(404, '用户不存在')
  const rows = await db.update(users)
    .set({ fullName: profile.fullName, profile })
    .where(eq(users.id, userId))
    .returning({ fullName: users.fullName, profile: users.profile })
  return rows[0] ?? null
}

/** 用户名下的报名记录（管理台详情展示用）。 */
export async function listUserRegistrations(db: DbExecutor, userId: string) {
  return db.select({
    id: registrations.id,
    displayId: registrations.displayId,
    typeName: registrationTypes.name,
    status: registrations.status,
    isMember: registrations.isMember,
    createdAt: registrations.createdAt,
  }).from(registrations)
    .leftJoin(registrationTypes, eq(registrations.typeId, registrationTypes.id))
    .where(eq(registrations.userId, userId))
    .orderBy(desc(registrations.createdAt))
}

export { hashPassword } from './crypto'
