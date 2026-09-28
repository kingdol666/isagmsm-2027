import { relations } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

/*
 * PPS 2026 domain chain (each stage is its OWN entity, never merged):
 *   User → Registration → Order → Payment → Credential → Check-in
 *
 * Money is stored as integer fen (1 CNY = 100 fen) to avoid float errors.
 * Status columns are varchar + TS union types (kept migration-friendly).
 */

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  fullName: varchar('full_name', { length: 200 }),
  /** scrypt password — null for seeded/demo users until they set one */
  passwordHash: text('password_hash'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  /** account-level participant info used to prefill conference registrations */
  profile: jsonb('profile'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Email verification codes (signup + password reset). One active per email+purpose. */
export const emailVerifications = pgTable('email_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 320 }).notNull(),
  purpose: varchar('purpose', { length: 20 }).notNull(), // signup | reset
  codeHash: varchar('code_hash', { length: 64 }).notNull(), // sha256 hex
  attempts: integer('attempts').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex('email_verifications_email_purpose_uq').on(table.email, table.purpose),
])

export const registrationTypes = pgTable('registration_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  priceFen: integer('price_fen').notNull(),
  currency: varchar('currency', { length: 8 }).notNull().default('CNY'),
  description: text('description').notNull().default(''),
  availability: varchar('availability', { length: 30 }).notNull().default('available'), // available | on_invitation
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
})

export const registrations = pgTable('registrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  typeId: uuid('type_id').notNull().references(() => registrationTypes.id),
  status: varchar('status', { length: 30 }).notNull().default('submitted'), // submitted | confirmed | cancelled
  displayId: varchar('display_id', { length: 30 }).notNull().unique(), // PPS26-000123
  fullName: varchar('full_name', { length: 200 }).notNull(),
  englishName: varchar('english_name', { length: 200 }),
  email: varchar('email', { length: 320 }).notNull(),
  phone: varchar('phone', { length: 40 }),
  affiliation: varchar('affiliation', { length: 300 }).notNull(),
  department: varchar('department', { length: 200 }),
  position: varchar('position', { length: 120 }),
  country: varchar('country', { length: 100 }).notNull(),
  dietary: varchar('dietary', { length: 200 }),
  invoiceRequired: boolean('invoice_required').notNull().default(false),
  invoiceTitle: varchar('invoice_title', { length: 300 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  registrationId: uuid('registration_id').notNull().references(() => registrations.id),
  orderNo: varchar('order_no', { length: 40 }).notNull().unique(),
  subtotalFen: integer('subtotal_fen').notNull(),
  discountFen: integer('discount_fen').notNull().default(0),
  totalFen: integer('total_fen').notNull(),
  currency: varchar('currency', { length: 8 }).notNull().default('CNY'),
  status: varchar('status', { length: 30 }).notNull().default('pending'), // pending | reviewing | paid | failed | expired | cancelled | refunded
  discountReason: varchar('discount_reason', { length: 100 }),
  /* bank-transfer review flow */
  reference: varchar('reference', { length: 120 }), // 转账流水号（用户提交）
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNote: varchar('review_note', { length: 300 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  provider: varchar('provider', { length: 30 }).notNull(), // mock | wechat | alipay
  providerPaymentNo: varchar('provider_payment_no', { length: 100 }),
  amountFen: integer('amount_fen').notNull(),
  currency: varchar('currency', { length: 8 }).notNull().default('CNY'),
  status: varchar('status', { length: 30 }).notNull().default('pending'), // pending | paid | failed | expired | cancelled | refunded
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const paymentEvents = pgTable(
  'payment_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: varchar('provider', { length: 30 }).notNull(),
    eventId: varchar('event_id', { length: 200 }).notNull(),
    paymentId: uuid('payment_id').references(() => payments.id),
    orderId: uuid('order_id').references(() => orders.id),
    eventType: varchar('event_type', { length: 60 }).notNull(),
    payload: jsonb('payload'),
    accepted: boolean('accepted').notNull().default(false), // false = duplicate/rejected (idempotency log)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    // idempotency: the same provider event can only ever be stored once
    uniqueIndex('payment_events_provider_event_uq').on(table.provider, table.eventId),
  ],
)

export const credentials = pgTable('credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  registrationId: uuid('registration_id').notNull().references(() => registrations.id),
  token: varchar('token', { length: 64 }).notNull().unique(), // cryptographically random, unguessable
  status: varchar('status', { length: 30 }).notNull().default('active'), // active | revoked
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
})

export const checkins = pgTable('checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  credentialId: uuid('credential_id').notNull().references(() => credentials.id),
  method: varchar('method', { length: 20 }).notNull().default('scan'), // scan | manual
  checkedBy: uuid('checked_by'),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  // one check-in per credential — duplicates are impossible at the storage layer
  uniqueIndex('checkins_credential_uq').on(table.credentialId),
])

export const speakers = pgTable('speakers', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  affiliation: varchar('affiliation', { length: 300 }).notNull(),
  talk: text('talk').notNull().default(''),
  monogram: varchar('monogram', { length: 4 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
})

export const programSessions = pgTable('program_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  dayNo: integer('day_no').notNull(),
  label: varchar('label', { length: 60 }).notNull(),
  date: varchar('date', { length: 60 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const programItems = pgTable('program_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => programSessions.id),
  timeRange: varchar('time_range', { length: 40 }).notNull(),
  name: varchar('name', { length: 300 }).notNull(),
  speaker: varchar('speaker', { length: 200 }),
  room: varchar('room', { length: 120 }).notNull(),
  keynote: boolean('keynote').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const venues = pgTable('venues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 300 }).notNull(),
  address: text('address').notNull(),
  city: varchar('city', { length: 120 }).notNull(),
  transport: jsonb('transport').notNull(), // [{ code, name, detail }]
  active: boolean('active').notNull().default(true),
})

export const sponsors = pgTable('sponsors', {
  id: uuid('id').primaryKey().defaultRandom(),
  tier: varchar('tier', { length: 60 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  style: varchar('style', { length: 20 }).notNull().default('serif'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const siteSettings = pgTable('site_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(), // scrypt: salt:hash
  role: varchar('role', { length: 20 }).notNull().default('staff'), // admin | staff
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Atomic counters for human-friendly display ids (PPS26-000123). */
export const counters = pgTable('counters', {
  key: varchar('key', { length: 50 }).primaryKey(),
  value: integer('value').notNull().default(0),
})

/* ---- relations (for typed joins) ---- */

export const registrationsRelations = relations(registrations, ({ one, many }) => ({
  user: one(users, { fields: [registrations.userId], references: [users.id] }),
  type: one(registrationTypes, { fields: [registrations.typeId], references: [registrationTypes.id] }),
  orders: many(orders),
  credentials: many(credentials),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  registration: one(registrations, { fields: [orders.registrationId], references: [registrations.id] }),
  payments: many(payments),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}))

export const credentialsRelations = relations(credentials, ({ one }) => ({
  registration: one(registrations, { fields: [credentials.registrationId], references: [registrations.id] }),
}))
