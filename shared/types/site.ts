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
}

export interface RegistrationTypeContent {
  code: string
  name: string
  price: number
  description: string
  availability: 'available' | 'on_invitation'
}

export interface SponsorName {
  text: string
  style: 'serif' | 'sans' | 'sans2' | 'mono' | 'serifit'
}

export interface SponsorRow {
  tier: string
  names: SponsorName[]
}
