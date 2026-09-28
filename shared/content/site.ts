import type {
  ImportantDate,
  ProgramDay,
  RegistrationTypeContent,
  SiteNavItem,
  SiteSpeaker,
  SponsorRow,
  TransitItem,
} from '../types/site'

/**
 * CMS-like site content — the single source for all conference facts shown on
 * the public homepage. Sample data is clearly marked; replace with real facts
 * (or DB-managed content) before go-live. Prices shown on the homepage are
 * display-only: the order total is ALWAYS computed server-side from the
 * registration_types table.
 */

export const siteMeta = {
  shortName: 'PPS·26',
  name: 'PPS 2026',
  fullName: 'Polymer Processing Symposium 2026',
  tagline: 'Materials · Processing · Manufacturing · Intelligence',
  dates: '15—17 October 2026',
  datesShort: '15—17 OCT 2026',
  location: 'Hefei · China',
  email: 'secretariat@pps2026-conf.org',
  copyright: '© 2026 PPS 2026 Organising Committee',
} as const

export const siteNav: SiteNavItem[] = [
  { code: '00', label: 'Symposium', href: '#symposium' },
  { code: '01', label: 'About', href: '#about' },
  { code: '02', label: 'Themes', href: '#themes' },
  { code: '03', label: 'Speakers', href: '#speakers' },
  { code: '04', label: 'Program', href: '#program' },
  { code: '05', label: 'Dates', href: '#dates' },
  { code: '06', label: 'Venue', href: '#venue' },
  { code: '07', label: 'Register', href: '#registration' },
  { code: '08', label: 'Sponsors', href: '#sponsors' },
]

export const aboutContent = {
  code: 'PPS26—01',
  tag: 'The Symposium',
  title: 'About the Symposium',
  facts: [
    { label: 'Format', value: '3 days' },
    { label: 'Tracks', value: '8 research themes' },
    { label: 'Keynotes', value: '4 invited lectures' },
  ],
  paragraphs: [
    'PPS 2026 is an international symposium dedicated to polymer processing — the science and engineering that turns polymer materials into real products. Over three days, researchers and engineers from academia and industry will gather in Hefei to exchange the latest advances across extrusion, molding, rheology, additive manufacturing and process simulation.',
    'Polymer processing is entering a new era: materials, process engineering, computation and intelligent manufacturing are converging. PPS 2026 provides a forum for this convergence — where rheologists meet data scientists, where simulation meets the production line, and where fundamental insight becomes industrial practice.',
  ],
} as const

export const themesContent = {
  code: 'PPS26—02',
  tag: '08 Research Units',
  title: 'Research',
  titleEm: 'Themes',
  items: [
    { no: '01', title: 'Extrusion', desc: 'Single- and twin-screw extrusion, reactive processing, compounding' },
    { no: '02', title: 'Injection Molding', desc: 'Precision molding, micro-injection, process control' },
    { no: '03', title: 'Film Processing', desc: 'Blown and cast film, flexible packaging, multilayer structures' },
    { no: '04', title: 'Fiber Spinning', desc: 'Melt spinning, nanofibers, structure formation in fibers' },
    { no: '05', title: 'Polymer Rheology', desc: 'Extensional rheology, viscoelasticity, flow characterization' },
    { no: '06', title: 'Additive Manufacturing', desc: '3D printing polymers, sintering, printed functional devices' },
    { no: '07', title: 'Process Simulation', desc: 'Finite element flow modeling, numerical process design' },
    { no: '08', title: 'AI & Digital Twins', desc: 'Machine learning for processing, virtual process lines' },
  ],
} as const

/* Sample speakers — fictional persons for template purposes; replace with
   confirmed keynote list. Monogram plates by design (no photos). */
export const speakersContent = {
  code: 'PPS26—03',
  tag: '4 Keynote Lectures',
  items: [
    {
      code: 'K—01',
      name: 'Prof. Elena Marchetti',
      affiliation: 'Politecnico di Torino, Italy',
      talk: 'Reactive Extrusion: Where Materials Chemistry Meets Process Engineering',
      monogram: 'EM',
    },
    {
      code: 'K—02',
      name: 'Prof. Hiroshi Tanaka',
      affiliation: 'Tokyo Institute of Technology, Japan',
      talk: 'Precision Injection Molding for Micro-Optical Components',
      monogram: 'HT',
    },
    {
      code: 'K—03',
      name: 'Prof. Sarah Chen',
      affiliation: 'Massachusetts Institute of Technology, USA',
      talk: 'Machine Learning Models for Polymer Process Simulation',
      monogram: 'SC',
    },
    {
      code: 'K—04',
      name: 'Prof. Lars Johansson',
      affiliation: 'KTH Royal Institute of Technology, Sweden',
      talk: 'Fiber Spinning at the Nanoscale: Structure Control in Processing',
      monogram: 'LJ',
    },
  ] satisfies SiteSpeaker[],
} as const

export const programContent = {
  code: 'PPS26—04',
  tag: '3 Days · 6 Halls & Areas',
  title: 'Program',
  days: [
    {
      id: 'day1',
      label: 'Day 1 — 15 Oct',
      date: 'Day 1 · 15 October 2026',
      items: [
        { time: '08:30–09:00', name: 'Opening Ceremony', room: 'Main Hall' },
        { time: '09:00–10:00', name: 'Keynote: Reactive Extrusion', speaker: 'E. Marchetti', room: 'Main Hall', keynote: true },
        { time: '10:30–12:00', name: 'Session A: Advances in Extrusion', room: 'Hall A' },
        { time: '13:30–15:00', name: 'Session B: Rheology & Characterization', room: 'Hall A' },
        { time: '15:30–17:00', name: 'Session C: Polymer Processing Simulation', room: 'Hall B' },
        { time: '17:30–18:30', name: 'Welcome Reception', room: 'Lobby' },
      ],
    },
    {
      id: 'day2',
      label: 'Day 2 — 16 Oct',
      date: 'Day 2 · 16 October 2026',
      items: [
        { time: '09:00–10:00', name: 'Keynote: Machine Learning for Process Simulation', speaker: 'S. Chen', room: 'Main Hall', keynote: true },
        { time: '10:30–12:00', name: 'Session D: Injection Molding', room: 'Hall A' },
        { time: '13:30–15:00', name: 'Session E: Film Processing & Flexible Packaging', room: 'Hall B' },
        { time: '15:30–17:00', name: 'Session F: Additive Manufacturing', room: 'Hall A' },
        { time: '17:00–18:00', name: 'Poster Session I', room: 'Exhibition Area' },
      ],
    },
    {
      id: 'day3',
      label: 'Day 3 — 17 Oct',
      date: 'Day 3 · 17 October 2026',
      items: [
        { time: '09:00–10:00', name: 'Keynote: Fiber Spinning at the Nanoscale', speaker: 'L. Johansson', room: 'Main Hall', keynote: true },
        { time: '10:30–12:00', name: 'Session G: AI & Digital Twins', room: 'Hall B' },
        { time: '13:30–15:00', name: 'Session H: Fiber Spinning & Textile Materials', room: 'Hall A' },
        { time: '15:30–16:30', name: 'Closing Remarks & Awards', room: 'Main Hall' },
      ],
    },
  ] satisfies ProgramDay[],
} as const

export const datesContent = {
  code: 'PPS26—05',
  tag: 'Schedule Ledger',
  title: 'Important Dates',
  items: [
    { label: 'Call for Abstracts', date: '01 May 2026' },
    { label: 'Early Registration Deadline', date: '01 Aug 2026' },
    { label: 'Regular Registration Deadline', date: '01 Sep 2026' },
    { label: 'Symposium', date: '15—17 Oct 2026', hot: true },
  ] satisfies ImportantDate[],
} as const

/* Sample venue — to be confirmed by the organising committee. */
export const venueContent = {
  code: 'PPS26—06',
  tag: 'Hefei · Anhui · CN',
  title: 'The',
  titleEm: 'Venue',
  name: 'Hefei Binhu International Convention & Exhibition Centre',
  address: 'Binhu International Convention & Exhibition Centre, Hefei, Anhui Province, China',
  transit: [
    { code: 'Air', name: 'Hefei Xinqiao International Airport', detail: 'approx. 40 min by car' },
    { code: 'Rail', name: 'Hefei South Railway Station (High-Speed)', detail: 'approx. 25 min by car' },
    { code: 'Metro', name: 'Metro Line 1', detail: 'Binhu Convention Centre Station' },
    { code: 'Hotels', name: 'Partner hotel list to be announced.' },
  ] satisfies TransitItem[],
  mapLabel: 'Map — to be embedded',
} as const

/* Sample prices — display only; order totals are computed server-side
   from the registration_types table. */
export const registrationContent = {
  code: 'PPS26—07',
  tag: '4 Categories',
  title: 'Registration',
  note: 'Prices in CNY. Sample data.',
  types: [
    { code: 'R—01', name: 'Student', price: 1600, description: 'For undergraduate & graduate students (valid ID required)', availability: 'available' },
    { code: 'R—02', name: 'Academic', price: 2400, description: 'Faculty & research staff of universities and institutes', availability: 'available' },
    { code: 'R—03', name: 'Industry', price: 3600, description: 'Professionals & engineers from industry', availability: 'available' },
    { code: 'R—04', name: 'Invited Speaker', price: 0, description: 'By invitation of the organising committee', availability: 'on_invitation' },
  ] satisfies RegistrationTypeContent[],
} as const

/* All sponsor names are fictional sample wordmarks. */
export const sponsorsContent = {
  code: 'PPS26—08',
  tag: 'Partners',
  title: 'Sponsors',
  note: 'Sample wordmarks — full partner list to be announced.',
  rows: [
    { tier: 'Platinum', names: [{ text: 'PolyNova Materials', style: 'serif' }] },
    { tier: 'Gold', names: [{ text: 'RheoTech Instruments', style: 'sans' }, { text: 'FilaForm Systems', style: 'sans2' }] },
    { tier: 'Silver', names: [{ text: 'MesoScale Labs', style: 'mono' }] },
    { tier: 'Academic Partner', names: [{ text: 'Anhui Polymer Society', style: 'serifit' }] },
  ] satisfies SponsorRow[],
} as const

export const footerContent = {
  line: '15—17 October 2026 · Hefei, China',
  hostNote: 'Host organisation: to be confirmed',
} as const
