import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export interface HotelRow {
  id: string
  name: string
  entity_type: string
  location: string | null
  country: string | null
  region: string | null
  description: string | null
  contact_email: string | null
  contact_phone: string | null
  website_url: string | null
  currency: string | null
  group_name: string | null
  image_url: string | null
  dot_color: string | null
  tags: string[]
  profiles: string[]
  gallery: { label: string; url: string }[]
  tested_count: number
  pending_lead_count: number
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // tested_count/pending_lead_count alimentam o mesmo indicador de status já
  // usado em "Na prática" (dourado=confirmado, coral=a testar) — em vez de
  // um badge novo, a própria bolinha do card (antes decorativa) passa a
  // significar algo real.
  const { rows } = await sql`
    SELECT h.id, h.name, h.entity_type, h.location, h.country, h.region, h.description,
           h.contact_email, h.contact_phone, h.website_url, h.currency, h.group_name,
           h.image_url, h.dot_color, h.tags, h.profiles, h.gallery,
           COUNT(*) FILTER (WHERE r.status = 'published')::int AS tested_count,
           COUNT(*) FILTER (WHERE r.status = 'a_testar')::int AS pending_lead_count
    FROM tdg_hotels h
    LEFT JOIN tdg_hotel_reviews r ON r.hotel_id = h.id
    GROUP BY h.id
    ORDER BY h.name
  `

  return NextResponse.json({ hotels: rows as HotelRow[] })
}
