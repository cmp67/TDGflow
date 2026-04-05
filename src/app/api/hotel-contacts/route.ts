import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_hotel_contacts (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      hotel_id    UUID NOT NULL,
      added_by    TEXT,
      name        TEXT NOT NULL,
      surname     TEXT NOT NULL,
      title       TEXT,
      email       TEXT,
      whatsapp    TEXT,
      notes       TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hotelId = req.nextUrl.searchParams.get('hotelId')
  if (!hotelId) return NextResponse.json({ error: 'hotelId required' }, { status: 400 })

  await ensureTable()

  const { rows } = await sql`
    SELECT id, hotel_id, added_by, name, surname, title, email, whatsapp, notes, created_at
    FROM tdg_hotel_contacts
    WHERE hotel_id = ${hotelId}
    ORDER BY created_at DESC
  `

  return NextResponse.json({ contacts: rows })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureTable()

  const body = await req.json()
  const { hotelId, name, surname, title, email, whatsapp, notes } = body

  if (!hotelId || !name || !surname) {
    return NextResponse.json({ error: 'hotelId, name and surname required' }, { status: 400 })
  }

  const addedBy = session.user?.name ?? 'Agente'

  const { rows } = await sql`
    INSERT INTO tdg_hotel_contacts (hotel_id, added_by, name, surname, title, email, whatsapp, notes)
    VALUES (${hotelId}, ${addedBy}, ${name}, ${surname}, ${title ?? null}, ${email ?? null}, ${whatsapp ?? null}, ${notes ?? null})
    RETURNING *
  `

  return NextResponse.json({ contact: rows[0] })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await sql`DELETE FROM tdg_hotel_contacts WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
