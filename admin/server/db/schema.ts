import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

/**
 * 管理台自己的 schema 副本 —— 列定义与门户 server/db/schema.ts 保持一致
 * （门户拥有迁移；本文件仅供本应用的类型化查询使用）。
 */

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('staff'), // admin | staff
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  fullName: varchar('full_name', { length: 200 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const registrationTypes = pgTable('registration_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  priceFen: integer('price_fen').notNull(),
  currency: varchar('currency', { length: 8 }).notNull().default('CNY'),
  active: boolean('active').notNull().default(true),
})

export const registrations = pgTable('registrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  typeId: uuid('type_id').notNull(),
  status: varchar('status', { length: 30 }).notNull().default('submitted'),
  displayId: varchar('display_id', { length: 30 }).notNull().unique(),
  fullName: varchar('full_name', { length: 200 }).notNull(),
  englishName: varchar('english_name', { length: 200 }),
  email: varchar('email', { length: 320 }).notNull(),
  phone: varchar('phone', { length: 40 }),
  affiliation: varchar('affiliation', { length: 300 }).notNull(),
  department: varchar('department', { length: 200 }),
  position: varchar('position', { length: 120 }),
  country: varchar('country', { length: 100 }).notNull(),
  isMember: boolean('is_member').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  registrationId: uuid('registration_id').notNull(),
  orderNo: varchar('order_no', { length: 40 }).notNull().unique(),
  subtotalFen: integer('subtotal_fen').notNull(),
  discountFen: integer('discount_fen').notNull().default(0),
  totalFen: integer('total_fen').notNull(),
  currency: varchar('currency', { length: 8 }).notNull().default('CNY'),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  reference: varchar('reference', { length: 120 }),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNote: varchar('review_note', { length: 300 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const credentials = pgTable('credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  registrationId: uuid('registration_id').notNull(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  status: varchar('status', { length: 30 }).notNull().default('active'), // active | revoked
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
})

export const checkins = pgTable('checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  credentialId: uuid('credential_id').notNull(),
  method: varchar('method', { length: 20 }).notNull().default('scan'),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }).notNull().defaultNow(),
})

export const abstracts = pgTable('abstracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  topic: varchar('topic', { length: 10 }).notNull(),
  reportType: varchar('report_type', { length: 20 }).notNull(),
  abstractText: text('abstract_text').notNull(),
  submitterName: varchar('submitter_name', { length: 120 }).notNull(),
  submitterAffiliation: varchar('submitter_affiliation', { length: 300 }).notNull(),
  authors: jsonb('authors').$type<Array<{ name: string, affiliation: string }>>().notNull(),
  status: varchar('status', { length: 20 }).notNull().default('submitted'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const abstractEvents = pgTable('abstract_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  abstractId: uuid('abstract_id').notNull(),
  kind: varchar('kind', { length: 20 }).notNull(),
  comment: text('comment'),
  /** 投稿/重投时的稿件内容快照（完整版本历史） */
  snapshot: jsonb('snapshot').$type<Record<string, unknown> | null>(),
  actor: varchar('actor', { length: 200 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
