/* eslint-disable no-console */
/**
 * Development seed — realistic demo data so no page is ever empty.
 * Idempotent: wipes business tables (dev only!) then inserts fresh data.
 * Run: pnpm db:seed
 */
import { randomBytes, randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { createDb } from '../index'
import * as schema from '../schema'
import { hashPassword } from '../../repositories/admin-users'
import { computePrice } from '../../services/pricing.service'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://pps:pps_dev_pw@localhost:5433/pps2026'
const db = createDb(DATABASE_URL)

const {
  users, registrationTypes, registrations, orders, payments, paymentEvents,
  credentials, checkins, speakers, programSessions, programItems,
  venues, sponsors, siteSettings, adminUsers, counters,
} = schema

async function wipe() {
  // dev-only reset, child tables first
  await db.delete(checkins)
  await db.delete(credentials)
  await db.delete(paymentEvents)
  await db.delete(payments)
  await db.delete(orders)
  await db.delete(registrations)
  await db.delete(users)
  await db.delete(registrationTypes)
  await db.delete(programItems)
  await db.delete(programSessions)
  await db.delete(speakers)
  await db.delete(venues)
  await db.delete(sponsors)
  await db.delete(siteSettings)
  await db.delete(adminUsers)
  await db.delete(counters)
}

const TYPES = [
  { code: 'student', name: '学生代表', priceFen: 120000, description: '本科生与研究生（报到时出示有效证件）', availability: 'available', sortOrder: 1 },
  { code: 'academic', name: '正式代表', priceFen: 200000, description: '高校、科研院所教师与研究人员', availability: 'available', sortOrder: 2 },
  { code: 'industry', name: '企业代表', priceFen: 240000, description: '企业技术人员与商务代表', availability: 'available', sortOrder: 3 },
  { code: 'invited', name: '特邀报告人', priceFen: 0, description: '由组织委员会邀请', availability: 'on_invitation', sortOrder: 4 },
]

const SPEAKERS = [
  { slug: 'marchetti', code: 'K—01', name: 'Prof. Elena Marchetti', affiliation: 'Politecnico di Torino, Italy', talk: 'Double-Network Ionogels: Interfacial Toughening Strategies', monogram: 'EM', sortOrder: 1 },
  { slug: 'tanaka', code: 'K—02', name: 'Prof. Hiroshi Tanaka', affiliation: 'Tokyo Institute of Technology, Japan', talk: 'Sliding-Ring Networks in Biomimetic Hydrogels', monogram: 'HT', sortOrder: 2 },
  { slug: 'chen', code: 'K—03', name: 'Prof. Sarah Chen', affiliation: 'Massachusetts Institute of Technology, USA', talk: 'Machine Learning for Gel Network Design', monogram: 'SC', sortOrder: 3 },
  { slug: 'johansson', code: 'K—04', name: 'Prof. Lars Johansson', affiliation: 'KTH Royal Institute of Technology, Sweden', talk: 'Stimuli-Responsive Gels: From Actuation to Soft Robotics', monogram: 'LJ', sortOrder: 4 },
  { slug: 'okonkwo', code: 'I—05', name: 'Dr. Amara Okonkwo', affiliation: 'University of Manchester, UK', talk: 'Hydrogel Scaffolds for Wound Healing and Drug Delivery', monogram: 'AO', sortOrder: 5 },
  { slug: 'li-wei', code: 'I—06', name: 'Prof. Li Wei', affiliation: 'University of Science and Technology of China', talk: 'Aerogels for Flexible Electronics and Energy Storage', monogram: 'LW', sortOrder: 6 },
  { slug: 'muller', code: 'I—07', name: 'Dr. Stefan Müller', affiliation: 'RWTH Aachen, Germany', talk: 'Rheology and Network Dynamics of Physical Gels', monogram: 'SM', sortOrder: 7 },
  { slug: 'park', code: 'I—08', name: 'Prof. Ji-Hyun Park', affiliation: 'KAIST, South Korea', talk: 'Bioprinted Hydrogels for Tissue Engineering', monogram: 'JP', sortOrder: 8 },
  { slug: 'rossi', code: 'I—09', name: 'Dr. Marco Rossi', affiliation: 'Fraunhofer LBF, Germany', talk: 'Scale-Up Engineering of Smart Gel Manufacturing', monogram: 'MR', sortOrder: 9 },
  { slug: 'nakamura', code: 'I—10', name: 'Prof. Yuki Nakamura', affiliation: 'Kyoto University, Japan', talk: 'Self-Assembly and Interfacial Science of Soft Matters', monogram: 'YN', sortOrder: 10 },
]

const SESSIONS = [
  { dayNo: 1, label: 'Day 1 — 24 Apr', date: 'Day 1 · 24 April 2027', sortOrder: 1 },
  { dayNo: 2, label: 'Day 2 — 25 Apr', date: 'Day 2 · 25 April 2027', sortOrder: 2 },
  { dayNo: 3, label: 'Day 3 — 26 Apr', date: 'Day 3 · 26 April 2027', sortOrder: 3 },
]

const ITEMS: Record<number, Array<[string, string, string | null, string, boolean?]>> = {
  1: [
    ['08:30–09:00', 'Opening Ceremony', null, 'Main Hall'],
    ['09:00–10:00', 'Keynote: Double-Network Ionogels', 'E. Marchetti', 'Main Hall', true],
    ['10:30–12:00', 'Session A: Gel Design & Synthesis', null, 'Hall A'],
    ['13:30–15:00', 'Session B: Soft Matter Physics & Rheology', null, 'Hall A'],
    ['15:30–17:00', 'Session C: Stimuli-Responsive Gels', null, 'Hall B'],
    ['17:30–18:30', 'Welcome Reception', null, 'Lobby'],
  ],
  2: [
    ['09:00–10:00', 'Keynote: Machine Learning for Gel Network Design', 'S. Chen', 'Main Hall', true],
    ['10:30–12:00', 'Session D: Biomedical Gel Materials', null, 'Hall A'],
    ['13:30–15:00', 'Session E: Characterization & Modeling', null, 'Hall B'],
    ['15:30–17:00', 'Session F: Hydrogels for Tissue Engineering', null, 'Hall A'],
    ['17:00–18:00', 'Poster Session I', null, 'Exhibition Area'],
  ],
  3: [
    ['09:00–10:00', 'Keynote: Stimuli-Responsive Gels in Soft Robotics', 'L. Johansson', 'Main Hall', true],
    ['10:30–12:00', 'Session G: Aerogels & Flexible Electronics', null, 'Hall B'],
    ['13:30–15:00', 'Session H: Industrialization & Applications', null, 'Hall A'],
    ['15:30–16:30', 'Closing Remarks & Awards', null, 'Main Hall'],
  ],
}

const SPONSORS = [
  { tier: 'Platinum', name: 'PolyNova Materials', style: 'serif', sortOrder: 1 },
  { tier: 'Gold', name: 'RheoTech Instruments', style: 'sans', sortOrder: 2 },
  { tier: 'Gold', name: 'FilaForm Systems', style: 'sans2', sortOrder: 3 },
  { tier: 'Silver', name: 'MesoScale Labs', style: 'mono', sortOrder: 4 },
  { tier: 'Academic Partner', name: 'Anhui Polymer Society', style: 'serifit', sortOrder: 5 },
]

const FAKE_PARTICIPANTS = [
  { fullName: 'Zhang Wei', email: 'zhang.wei@example.edu', affiliation: 'USTC, School of Chemistry', country: 'China', type: 'student', outcome: 'paid' },
  { fullName: 'Emily Carter', email: 'e.carter@example.ac.uk', affiliation: 'University of Manchester', country: 'United Kingdom', type: 'academic', outcome: 'paid' },
  { fullName: 'Rajesh Kumar', email: 'r.kumar@example.in', affiliation: 'IIT Delhi', country: 'India', type: 'student', outcome: 'paid' },
  { fullName: 'Ana Silva', email: 'ana.silva@example.br', affiliation: 'UFSCar', country: 'Brazil', type: 'academic', outcome: 'paid' },
  { fullName: 'Chen Jing', email: 'chen.jing@example.com', affiliation: 'Sinopec Research Institute', country: 'China', type: 'industry', outcome: 'pending' },
  { fullName: 'David Lee', email: 'd.lee@example.sg', affiliation: 'NUS Materials Science', country: 'Singapore', type: 'academic', outcome: 'pending' },
  { fullName: 'Marta Kowalska', email: 'm.kowalska@example.pl', affiliation: 'IPPT PAN', country: 'Poland', type: 'academic', outcome: 'paid' },
  { fullName: 'Liu Yang', email: 'liu.yang@example.edu.cn', affiliation: 'HFUT', country: 'China', type: 'student', outcome: 'submitted' },
  { fullName: 'Tom Becker', email: 't.becker@example.de', affiliation: 'BASF SE', country: 'Germany', type: 'industry', outcome: 'submitted' },
  { fullName: 'Yuki Sato', email: 'y.sato@example.jp', affiliation: 'Toyota Central R&D', country: 'Japan', type: 'industry', outcome: 'confirmed_no_order' },
]

async function seed() {
  await wipe()

  /* registration types */
  const typeRows = await db.insert(registrationTypes).values(TYPES).returning()
  const typeByCode = new Map(typeRows.map(t => [t.code, t]))

  /* content */
  await db.insert(speakers).values(SPEAKERS)
  const sessionRows = await db.insert(programSessions).values(SESSIONS).returning()
  const itemValues = sessionRows.flatMap(s =>
    (ITEMS[s.dayNo] ?? []).map(([timeRange, name, speaker, room, keynote], i) => ({
      sessionId: s.id,
      timeRange,
      name,
      speaker,
      room,
      keynote: keynote ?? false,
      sortOrder: i + 1,
    })),
  )
  await db.insert(programItems).values(itemValues)
  await db.insert(venues).values({
    name: 'Hefei Binhu International Convention & Exhibition Centre',
    address: 'Binhu International Convention & Exhibition Centre, Hefei, Anhui Province, China',
    city: 'Hefei',
    transport: [
      { code: 'Air', name: 'Hefei Xinqiao International Airport', detail: 'approx. 40 min by car' },
      { code: 'Rail', name: 'Hefei South Railway Station (High-Speed)', detail: 'approx. 25 min by car' },
      { code: 'Metro', name: 'Metro Line 1', detail: 'Binhu Convention Centre Station' },
      { code: 'Hotels', name: 'Partner hotel list to be announced.', detail: null },
    ],
  })
  await db.insert(sponsors).values(SPONSORS)

  /* settings */
  await db.insert(siteSettings).values([
    { key: 'early_bird_deadline', value: '2027-03-09T23:59:59+08:00' },
    { key: 'regular_registration_deadline', value: '2027-04-15T23:59:59+08:00' },
    { key: 'call_for_abstracts_open', value: '2026-12-01T00:00:00+08:00' },
  ])

  /* admin users (dev defaults — set ADMIN_PASSWORD in real deployments) */
  // 注意：空字符串视为未设置（--env-file=.env 里 `ADMIN_PASSWORD=` 会得到空串）
  await db.insert(adminUsers).values([
    { username: 'admin', passwordHash: hashPassword(process.env.ADMIN_PASSWORD || 'pps26-admin'), role: 'admin' },
    { username: 'staff', passwordHash: hashPassword(process.env.STAFF_PASSWORD || 'pps26-staff'), role: 'staff' },
  ])

  /* 门户演示登录账号（可密码登录的现成账号；真实用户走邮箱验证注册） */
  await db.insert(users).values({
    email: 'demo.user@example.test',
    fullName: '演示用户',
    passwordHash: hashPassword(process.env.DEMO_PASSWORD || 'Demo-2027-Pass!'),
    emailVerifiedAt: new Date(),
  })

  /* fake participants across the domain chain */
  let regSeq = 0
  const issuedCredentials: Array<{ token: string, name: string }> = []

  for (const p of FAKE_PARTICIPANTS) {
    const type = typeByCode.get(p.type)!

    const user = (await db.insert(users).values({ email: p.email, fullName: p.fullName }).returning())[0]!
    regSeq += 1
      const registration = (await db.insert(registrations).values({
        userId: user.id,
        typeId: type.id,
        status: p.outcome === 'paid' ? 'confirmed' : 'submitted',
        displayId: `ISAGMSM-${String(regSeq).padStart(6, '0')}`,
        fullName: p.fullName,
        email: p.email,
        affiliation: p.affiliation,
        country: p.country,
        phone: `+86 13${String(100000000 + regSeq).slice(0, 8)}`,
      }).returning())[0]!

    if (p.outcome === 'confirmed_no_order') continue

    const breakdown = computePrice({ priceFen: type.priceFen, currency: type.currency }, { now: new Date('2027-05-20T00:00:00+08:00') })
    const order = (await db.insert(orders).values({
      registrationId: registration.id,
      orderNo: `ISAGMSM-ORD-${String(regSeq).padStart(6, '0')}`,
      subtotalFen: breakdown.subtotalFen,
      discountFen: breakdown.discountFen,
      totalFen: breakdown.totalFen,
      currency: 'CNY',
      status: p.outcome === 'paid' ? 'paid' : 'pending',
    }).returning())[0]!

    if (p.outcome === 'paid') {
      const payment = (await db.insert(payments).values({
        orderId: order.id,
        provider: 'mock',
        providerPaymentNo: `MOCK-${randomBytes(12).toString('hex')}`,
        amountFen: order.totalFen,
        currency: order.currency,
        status: 'paid',
      }).returning())[0]!
      await db.insert(paymentEvents).values({
        provider: 'mock',
        eventId: randomUUID(),
        paymentId: payment.id,
        orderId: order.id,
        eventType: 'mock.paid',
        accepted: true,
      })
      const token = randomBytes(32).toString('base64url')
      await db.insert(credentials).values({ registrationId: registration.id, token, status: 'active' })
      issuedCredentials.push({ token, name: p.fullName })
    }
  }

  /* two on-site check-ins for dashboard realism */
  for (const cred of issuedCredentials.slice(0, 2)) {
    const row = await db.select().from(credentials).where(eq(credentials.token, cred.token)).limit(1)
    await db.insert(checkins).values({ credentialId: row[0]!.id, method: 'scan' })
  }

  /* advance counters so future live registrations never collide with seeded ids */
  await db.insert(counters).values([
    { key: 'registration', value: regSeq },
    { key: 'order', value: regSeq },
  ])

  console.log(`Seed complete: ${typeRows.length} types, ${SPEAKERS.length} speakers, ${FAKE_PARTICIPANTS.length} participants, ${issuedCredentials.length} credentials.`)
  console.log('Admin login: admin / (ADMIN_PASSWORD or pps26-admin) · staff / pps26-staff')
  process.exit(0)
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
