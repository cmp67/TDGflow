export interface Hotel {
  id: string
  name: string
  location: string
  country: string
  region: string
  networks: string[]
  room_types: string[]
  description: string
  tags: string[]
}

export interface Contract {
  id: string
  hotel_id: string
  advantage_type: string
  description: string
  valid_from: string
  valid_until: string
}

export interface Promotion {
  id: string
  hotel_id: string
  title: string
  description: string
  commission_rate: number
  booking_deadline: string
  stay_from: string
  stay_until: string
  is_active: boolean
}

export interface HotelWithDetails extends Hotel {
  contracts: Contract[]
  promotions: Promotion[]
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface AudioInput {
  id: string
  agent_name: string
  agency: string
  hotel_id?: string
  visit_type: 'SITE_INSPECTION' | 'MEETING' | 'DEBRIEF'
  transcript: string
  summary: Record<string, unknown>
  audio_url?: string
  audio_shared: boolean
}
