import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export interface HotelRow {
  id: string
  name: string
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
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows } = await sql`
    SELECT id, name, location, country, region, description,
           contact_email, contact_phone, website_url, currency, group_name,
           image_url, dot_color, tags, profiles, gallery
    FROM tdg_hotels
    ORDER BY name
  `

  return NextResponse.json({ hotels: rows as HotelRow[] })
}
