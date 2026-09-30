import type {
  ImportantDate,
  OrgSection,
  ProgramDay,
  RegistrationTypeContent,
  SiteNavItem,
  SiteSpeaker,
  SponsorAdItem,
  SponsorTier,
  TransitItem,
} from '../types/site'

/**
 * ISAGMSM site content — English mirror of site.ts (same export names, same
 * structure key-by-key; parity enforced by tests/unit/i18n.test.ts).
 * Content marked "example" (speakers, hotels, sponsors, contacts) is placeholder
 * data — replace after confirmation by the organizing committee.
 */

export const siteMeta = {
  shortName: 'ISAGMSM',
  name: 'ISAGMSM 2027',
  fullName: 'The 5th International Symposium for Advanced Gel Materials & Soft Matters',
  fullNameZh: '第五届先进凝胶材料与软物质国际学术研讨会',
  fullNameEn: 'The 5th International Symposium for Advanced Gel Materials & Soft Matters',
  theme: 'Gels for Empowerment · Smart Soft Matter',
  dates: 'April 24–26, 2027',
  datesShort: '2027·4·24-26',
  location: 'Hefei, China',
  /* Venue (proposed; to be confirmed in the second circular) */
  venue: 'Hefei Binhu International Convention & Exhibition Centre',
  venueEn: 'Hefei Binhu International Convention & Exhibition Centre',
  venueAddress: '3899 Jinxiu Avenue, Baohe District, Hefei, Anhui (at the corner of Luzhou Avenue and Jinxiu Avenue)',
  venueNote: 'The venue is subject to the second circular',
  email: 'isagmsm@conference.example.org',
  abstractsEmail: 'abstracts@conference.example.org',
  copyright: '© 2027 ISAGMSM Organizing Committee',
  /* Important-dates banner (below the header) */
  bannerDates: [
    'Early-bird payment until March 25, 2027',
    'Abstract deadline March 25, 2027',
  ],
} as const

export const siteNav: SiteNavItem[] = [
  { code: '01', label: 'Home', href: '/' },
  { code: '02', label: 'Organizers', href: '/organization' },
  { code: '03', label: 'Call for Abstracts', href: '/abstracts' },
  { code: '04', label: 'Registration', href: '/registration' },
  { code: '05', label: 'Venue & Transport', href: '/transportation' },
  { code: '06', label: 'Hotels', href: '/hotels' },
  { code: '07', label: 'Exhibit & Sponsor', href: '/sponsorship' },
]

export const aboutContent = {
  code: 'ISAGMSM—01',
  tag: 'About',
  title: 'About the Symposium',
  facts: [
    { label: 'Duration', value: '3 days (registration on April 24)' },
    { label: 'Topics', value: '6 research directions' },
    { label: 'Format', value: 'Keynotes · Session talks · Posters' },
  ],
  paragraphs: [
    'Advanced gel materials and soft matter constitute one of the most active research frontiers at the intersection of materials science and human health. The 5th International Symposium for Advanced Gel Materials & Soft Matters (ISAGMSM 2027) will bring together experts from universities, research institutes and industry, in China and abroad, to exchange the latest advances in gel design and synthesis, soft matter physics, stimuli-responsive systems, biomedical translation and scale-up industrialization.',
    'The program features keynote lectures, parallel session talks and poster sessions, with a dedicated platform for young scholars and graduate students. We look forward to meeting you in Hefei to discuss the future of gels and soft matter.',
    '(The symposium introduction is sample copy — please replace after approval by the organizing committee.)',
  ],
} as const

/* Research themes (6 directions, sample division — to be confirmed by the committee) */
export const themesContent = {
  code: 'ISAGMSM—02',
  tag: '06 Research Directions',
  title: 'Abstract',
  titleEm: 'Topics',
  items: [
    { no: 'A', title: 'Gel Design & Synthesis', desc: 'Molecular design and controlled synthesis of hydrogels, organogels, ionogels and aerogels' },
    { no: 'B', title: 'Soft Matter Physics & Structure', desc: 'Gelation mechanisms, network structure and dynamics, rheology, self-assembly and interface science' },
    { no: 'C', title: 'Stimuli-Responsive & Smart Gels', desc: 'Thermo/pH/light/electro/magnetic responsive systems, actuators, soft robotics' },
    { no: 'D', title: 'Biomedical Gel Materials', desc: 'Tissue engineering, drug delivery, wound dressings, cell culture and bioprinting' },
    { no: 'E', title: 'Characterization, Modeling & AI', desc: 'Large-facility characterization, multiscale simulation, data-driven approaches and machine learning' },
    { no: 'F', title: 'Industrialization & Applications', desc: 'Flexible electronics, energy devices, agriculture and consumer products, scale-up and engineering' },
  ],
} as const

/* Example speakers — fictional names/institutions for template demo; replace with the confirmed list */
export const speakersContent: { code: string, tag: string, items: SiteSpeaker[] } = {
  code: 'ISAGMSM—03',
  tag: '4 keynote lectures (to be invited)',
  items: [
    {
      code: 'K—01',
      name: 'Prof. Zhiyuan Lin',
      affiliation: 'University of Science and Technology of China',
      talk: 'Interfacial Reinforcement Strategies for Double-Network Ionogels',
      monogram: '林',
    },
    {
      code: 'K—02',
      name: 'Prof. Marika Tanaka',
      affiliation: 'The University of Tokyo',
      talk: 'Sliding-Ring Network Design in Biomimetic Hydrogels',
      monogram: 'M',
    },
    {
      code: 'K—03',
      name: 'Prof. Wangshu Chen',
      affiliation: 'Zhejiang University',
      talk: 'Industrialization Pathways for Stimuli-Responsive Gel Actuators',
      monogram: '陈',
    },
    {
      code: 'K—04',
      name: 'Prof. Lars Andersen',
      affiliation: 'University of Copenhagen',
      talk: 'Dynamic Hydrogels for Cell Culture',
      monogram: 'L',
    },
  ],
}

export const programContent: { code: string, tag: string, title: string, days: ProgramDay[] } = {
  code: 'ISAGMSM—04',
  tag: '3 days · Registration + Opening + Sessions',
  title: 'Scientific Program',
  days: [
    {
      id: 'day1',
      label: 'Day 1 · April 24',
      date: 'April 24 · Registration day',
      items: [
        { time: '14:00–20:00', name: 'Conference Registration', room: 'Hotel Lobby' },
        { time: '19:00–21:00', name: 'Young Scholars Salon', room: 'Session Room 1' },
      ],
    },
    {
      id: 'day2',
      label: 'Day 2 · April 25',
      date: 'April 25 · Opening day',
      items: [
        { time: '08:30–09:00', name: 'Opening Ceremony', room: 'Main Auditorium' },
        { time: '09:00–12:00', name: 'Keynote Lectures', room: 'Main Auditorium', keynote: true },
        { time: '13:30–18:00', name: 'Parallel Sessions A / B', room: 'Session Rooms' },
      ],
    },
    {
      id: 'day3',
      label: 'Day 3 · April 26',
      date: 'April 26 · Sessions day',
      items: [
        { time: '08:30–12:00', name: 'Parallel Sessions C / D', room: 'Session Rooms' },
        { time: '13:30–16:00', name: 'Poster Session', room: 'Poster Area' },
        { time: '16:00–16:30', name: 'Closing Ceremony & Awards', room: 'Main Auditorium' },
      ],
    },
  ],
}

export const datesContent: { code: string, tag: string, title: string, items: ImportantDate[] } = {
  code: 'ISAGMSM—05',
  tag: 'Key milestones',
  title: 'Important Dates',
  items: [
    { label: 'Abstract Submission Deadline', date: 'March 25, 2027' },
    { label: 'Acceptance Notification', date: 'April 5, 2027' },
    { label: 'Early-bird Payment Deadline', date: 'March 25, 2027' },
    { label: 'Symposium', date: 'April 24–26, 2027', hot: true },
  ],
}

/* Organizers (sample structure — roster is placeholder, to be confirmed) */
export const organizationContent: { code: string, tag: string, title: string, sections: OrgSection[] } = {
  code: 'ISAGMSM—06',
  tag: 'Organizers',
  title: 'Organizers',
  sections: [
    {
      title: 'Hosted by',
      kind: 'units',
      entries: [
        { name: '(Host institution — to be confirmed)' },
      ],
    },
    {
      title: 'Organized by',
      kind: 'units',
      entries: [
        { name: '(Organizing institution — to be confirmed)' },
      ],
    },
    {
      title: 'Symposium Leadership',
      kind: 'people',
      entries: [
        { role: 'Chair', name: '(TBC)' },
        { role: 'Executive Chair', name: '(TBC)' },
        { role: 'Secretary', name: '(TBC)' },
      ],
    },
    {
      title: 'Scientific Committee',
      kind: 'people',
      entries: [
        { role: 'Chair', name: '(TBC)' },
        { role: 'Vice Chair', name: '(TBC · ordered by surname stroke count)' },
        { role: 'Members', name: '(TBC · ordered by surname stroke count)' },
      ],
    },
    {
      title: 'Organizing Committee',
      kind: 'people',
      entries: [
        { role: 'Chair', name: '(TBC)' },
        { role: 'Members', name: '(TBC)' },
      ],
    },
  ],
}

/* Call for abstracts */
export const abstractsContent = {
  code: 'ISAGMSM—07',
  tag: 'Call for Abstracts',
  title: 'Call for Abstracts',
  intro: 'Papers within the scope of the symposium that have not been published in domestic or international journals or presented at other conferences are eligible. Abstracts may be written in Chinese or English, must not exceed one A4 page, and should follow the conference template. Authors bear responsibility for their content.',
  requirements: [
    'Abstracts must not exceed one A4 page, in Chinese or English, following the conference template (see the download area)',
    'Select a research topic and presentation type when submitting (oral / poster / abstract only); the final type is determined by the Scientific Committee',
    'Recommended poster size: 90 cm (W) × 120 cm (H); print in color and bring it on site',
    'Submission deadline: March 25, 2027; acceptance notifications will be sent to the submission inbox before April 5, 2027',
  ],
  submit: {
    channel: 'Send the abstract (Word format) to the abstracts inbox with the subject line "ISAGMSM Abstract-Name-Topic"',
    email: 'abstracts@conference.example.org',
    deadline: 'March 25, 2027',
  },
  contact: 'Abstracts contact: Symposium Secretariat (abstracts@conference.example.org · phone TBC)',
} as const

/* Registration (info page + online registration entry) */
export const registrationInfoContent = {
  code: 'ISAGMSM—08',
  tag: 'Registration',
  title: 'Registration',
  /* Fee table (sample prices — replace after committee confirmation) */
  feeTable: {
    note: 'The registration fee covers the conference fee and materials (accommodation not included)',
    headers: ['Category', 'Early-bird payment (before 2027/3/25)', 'Standard payment'],
    rows: [
      ['Regular delegate', '¥2,000', '¥2,400'],
      ['Student delegate (with valid ID)', '¥1,200', '¥1,600'],
    ],
  },
  steps: [
    'Register online: click "Register Now" below, fill in your details and submit — a unique registration ID (ISAGMSM-xxxxxx) is generated automatically',
    'Bank transfer: transfer to the account on this page and put "RegistrationID-Name" in the transfer remark (e.g. ISAGMSM-000012-Zhang San)',
    'Submit for review: after transferring, click "I have completed the transfer" on the payment page and enter the transfer reference number for the secretariat to review',
    'Receive your credential: once the secretariat verifies the transfer and approves, an electronic credential (with on-site check-in QR code) is issued automatically',
  ],
  bank: {
    accountName: '(Account name — to be confirmed)',
    bank: '(Bank — to be confirmed)',
    accountNumber: '(Account number — to be confirmed)',
    remarkFormat: 'RegistrationID-Name',
    deadline: 'Bank transfer deadline: April 15, 2027',
  },
  invoice: 'Invoices: issued collectively by the secretariat after approval; collect on site with your registration ID.',
  notice: 'For combined transfers of multiple participants, attach the participant list (registration ID, name, amount). Refund requests must reach the secretariat before April 10, 2027; later requests cannot be processed.',
} as const

/* Venue & transportation (sample info based on the Hefei venue — to be confirmed) */
export const transportationContent: { code: string, tag: string, title: string, venueName: string, reportPoint: string, transit: TransitItem[], mapLabel: string } = {
  code: 'ISAGMSM—09',
  tag: 'Venue & Transportation',
  title: 'Venue & Transportation',
  venueName: 'Hefei Binhu International Convention & Exhibition Centre',
  reportPoint: 'On-site registration: the exhibition centre lobby hall (subject to the second circular)',
  transit: [
    { code: 'Venue', name: 'Hefei Binhu International Convention & Exhibition Centre', detail: '3899 Jinxiu Avenue, Baohe District · corner of Luzhou Avenue and Jinxiu Avenue', lng: 117.2952, lat: 31.7213 },
    { code: 'Metro', name: 'Metro Line 1 · Binhu Convention Centre Station', detail: 'Direct to the venue; about 240 m walk along Jinxiu Avenue', lng: 117.2938, lat: 31.7205 },
    { code: 'HSR', name: 'Hefei South Railway Station', detail: 'About 10 km from the venue, ~20 min by taxi; Metro Line 1 runs direct to Binhu Convention Centre Station', lng: 117.3124, lat: 31.7897 },
    { code: 'Rail', name: 'Hefei Railway Station', detail: 'About 20 km from the venue; Metro Line 1 direct, ~40 min', lng: 117.3109, lat: 31.9075 },
    { code: 'Airport', name: 'Hefei Xinqiao International Airport', detail: 'About 50 km from the venue, ~1 h drive; airport shuttle / taxi', lng: 116.6455, lat: 31.9835 },
  ],
  mapLabel: 'Map — to be embedded',
}

/* Hotels (sample hotel info based on the Hefei venue — to be confirmed) */
export const hotelsContent = {
  code: 'ISAGMSM—10',
  tag: 'Hotels',
  title: 'Hotels',
  intro: 'The secretariat has arranged the following partner hotels at negotiated rates — book early. Booking channel: the online booking link will be published in the second circular.',
  booking: {
    channel: 'Online booking link (published in the second circular) / arranged by the secretariat',
    note: 'Negotiated rates include breakfast; mention "ISAGMSM Symposium" when booking to get the conference rate.',
  },
  hotels: [
    {
      name: 'Main Conference Hotel (example)',
      stars: 'Five-Diamond',
      price: '¥350 / room-night (incl. breakfast)',
      address: 'Baohe District, Hefei (exact address TBC)',
      intro: 'Right next to the Hefei Binhu International Convention & Exhibition Centre — walk to the main venue.',
      lng: 117.2901,
      lat: 31.7182,
    },
    {
      name: 'Partner Hotel A (example)',
      stars: 'Five-Diamond',
      price: '¥350 / room-night (incl. breakfast)',
      address: 'Baohe District, Hefei (exact address TBC)',
      intro: 'About 5 minutes on foot from the main venue; deluxe rooms and suites.',
      lng: 117.2989,
      lat: 31.7238,
    },
    {
      name: 'Partner Hotel B (example)',
      stars: 'Four-Diamond',
      price: '¥260 / room-night (incl. breakfast)',
      address: 'Baohe District, Hefei (exact address TBC)',
      intro: 'About 5 minutes by car from the main venue; modern rooms, great value.',
      lng: 117.2862,
      lat: 31.7261,
    },
  ],
} as const

/* Exhibition & sponsorship (sample prices benchmarked against similar conferences — to be confirmed) */
export const sponsorshipContent = {
  code: 'ISAGMSM—11',
  tag: 'Exhibit & Sponsorship',
  title: 'Exhibition & Sponsorship',
  intro: 'An industry exhibition area and multiple sponsorship options are available alongside the symposium. Companies in instrumentation, consumables, biotechnology and new materials are welcome to discuss cooperation.',
  tiers: [
    {
      tier: 'Platinum Sponsorship',
      price: '¥80,000',
      quota: '1 slot',
      benefits: ['Certificate of honour · Symposium supporter', 'One booth (backdrop + table & chairs)', '3 complimentary registrations', 'Full-page color ad on the back cover of the program book', 'One flyer in the conference bag'],
    },
    {
      tier: 'Gold Sponsorship',
      price: '¥60,000',
      quota: '2 slots',
      benefits: ['Certificate of honour · Symposium supporter', 'One booth (backdrop + table & chairs)', '2 complimentary registrations', 'Full-page color ad on the inside cover of the program book'],
    },
    {
      tier: 'Silver Sponsorship',
      price: '¥40,000',
      quota: '4 slots',
      benefits: ['Certificate of honour · Symposium supporter', 'One booth (backdrop + table & chairs)', 'Color ad in the program book'],
    },
  ] satisfies SponsorTier[],
  adItems: [
    { item: 'Coffee-break sponsorship', benefit: 'Naming rights', price: '¥15,000', quota: '1' },
    { item: 'Conference-bag flyer', benefit: 'One flyer in every conference bag', price: '¥8,000', quota: '5' },
    { item: 'Session talk', benefit: '15-minute presentation slot', price: '¥10,000', quota: '5' },
    { item: 'Standard booth', benefit: 'Backdrop + table & chairs + power', price: '¥16,000', quota: 'Unlimited' },
  ] satisfies SponsorAdItem[],
  contact: 'Sponsorship contact: Symposium Secretariat (sponsor@conference.example.org · phone TBC)',
  paymentNote: 'Sponsorship fees are also paid by bank transfer; please note "Exhibition/Sponsorship-Company Name" in the remittance.',
} as const

/* Registration categories (display only; authoritative prices live in the registration_types table) */
export const registrationContent = {
  code: 'ISAGMSM—12',
  tag: 'Registration categories',
  title: 'Registration Categories',
  note: 'Prices in CNY · sample prices, subject to the payment page',
  types: [
    { code: 'R—01', name: 'Student Delegate', price: 1200, description: 'Undergraduate and graduate students (show valid ID at registration)', availability: 'available' },
    { code: 'R—02', name: 'Regular Delegate', price: 2000, description: 'Faculty and researchers from universities and research institutes', availability: 'available' },
    { code: 'R—03', name: 'Industry Delegate', price: 2400, description: 'Industry technical and business representatives', availability: 'available' },
    { code: 'R—04', name: 'Invited Speaker', price: 0, description: 'By invitation of the Organizing Committee', availability: 'on_invitation' },
  ] satisfies RegistrationTypeContent[],
} as const

export const footerContent = {
  line: 'April 24–26, 2027 · Hefei, China',
  hostNote: 'Host organisation: to be confirmed',
} as const
