export interface SiteNavItem {
  code: string
  label: string
  href: string
}

export interface SiteSpeaker {
  code: string
  name: string
  affiliation: string
  talk: string
  monogram: string
}

export interface ProgramItem {
  time: string
  name: string
  speaker?: string
  room: string
  keynote?: boolean
}

export interface ProgramDay {
  id: string
  label: string
  date: string
  items: ProgramItem[]
}

export interface ImportantDate {
  label: string
  date: string
  hot?: boolean
}

export interface TransitItem {
  code: string
  name: string
  detail?: string
  /** 高德坐标（lng, lat）— 用 https://lbs.amap.com/tools/picker 校准 */
  lng?: number
  lat?: number
}

export interface RegistrationTypeContent {
  code: string
  name: string
  price: number
  description: string
  availability: 'available' | 'on_invitation'
}

export interface SponsorRow {
  tier: string
  names: Array<{ text: string, style: 'serif' | 'sans' | 'sans2' | 'mono' | 'serifit' }>
}

/* ---- gel-specific content structures ---- */

export interface OrgSection {
  title: string
  kind: 'units' | 'people'
  entries: Array<{ role?: string, name: string, note?: string }>
}

export interface AbstractTopic {
  no: string
  title: string
  scope: string
}

export interface HotelItem {
  name: string
  stars: string
  price: string
  address: string
  intro: string
}

export interface SponsorTier {
  tier: string
  price: string
  quota: string
  benefits: string[]
}

export interface SponsorAdItem {
  item: string
  benefit: string
  price: string
  quota: string
}
