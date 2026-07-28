import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_hotel_contacts (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      hotel_id            UUID REFERENCES tdg_hotels(id) ON DELETE SET NULL,
      added_by            TEXT,
      name                TEXT NOT NULL,
      surname             TEXT NOT NULL,
      title               TEXT,
      email               TEXT,
      whatsapp            TEXT,
      notes               TEXT,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      source_author       TEXT,
      source_date         DATE,
      category            TEXT,
      context_trigger     TEXT,
      organization        TEXT
    )
  `
}

/* Contact Hub: um contato pode ou não estar vinculado a um fornecedor.
   Sem hotelId → contato de rede (pessoa), aparece na lente "Contatos".
   Com hotelId → contato daquela ficha, também visível na lente Contatos
   via organization/hotel_id (uma fonte, duas vistas). */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureTable()

  const hotelId = req.nextUrl.searchParams.get('hotelId')
  const search = req.nextUrl.searchParams.get('search')?.trim().toLowerCase()
  const category = req.nextUrl.searchParams.get('category')

  if (hotelId) {
    const { rows } = await sql`
      SELECT id, hotel_id, added_by, name, surname, title, email, whatsapp, notes, category, organization, created_at
      FROM tdg_hotel_contacts
      WHERE hotel_id = ${hotelId}
      ORDER BY created_at DESC
    `
    return NextResponse.json({ contacts: rows })
  }

  // Lente "Contatos" — rede inteira, sem escopo de fornecedor
  const { rows } = await sql`
    SELECT
      id, hotel_id, added_by, name, surname, title, email, whatsapp, notes,
      source_author, source_date::text AS source_date, category, context_trigger,
      organization, created_at
    FROM tdg_hotel_contacts
    ORDER BY source_date ASC NULLS LAST, created_at DESC
  `

  let contacts = rows
  if (category && category !== 'all') {
    contacts = contacts.filter(c => c.category === category)
  }
  if (search) {
    contacts = contacts.filter(c =>
      `${c.name} ${c.surname}`.toLowerCase().includes(search) ||
      c.organization?.toLowerCase().includes(search) ||
      c.context_trigger?.toLowerCase().includes(search) ||
      c.source_author?.toLowerCase().includes(search) ||
      c.whatsapp?.includes(search)
    )
  }

  const counts: Record<string, number> = {}
  for (const c of rows) {
    counts[c.category ?? 'outro'] = (counts[c.category ?? 'outro'] ?? 0) + 1
  }

  return NextResponse.json({ contacts, total: rows.length, counts })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureTable()

  const body = await req.json()
  const { hotelId, name, surname, title, email, whatsapp, notes, category, organization } = body

  if (!name || !surname) {
    return NextResponse.json({ error: 'name and surname required' }, { status: 400 })
  }
  if (!hotelId && !category) {
    return NextResponse.json({ error: 'category is required for a contact without hotelId' }, { status: 400 })
  }

  const addedBy = session.user?.name ?? 'Agente'

  // Vinculado a um fornecedor: categoria default 'hotel', organization vem
  // do nome do fornecedor (snapshot — é o que aparece como subtítulo na
  // lente Contatos). Sem fornecedor: quem cadastra escolhe a categoria e
  // pode informar a própria organização (ex: nome do escritório).
  let finalOrganization = organization ?? null
  if (hotelId) {
    const { rows: hotelRows } = await sql`SELECT name FROM tdg_hotels WHERE id = ${hotelId}`
    finalOrganization = hotelRows[0]?.name ?? finalOrganization
  }
  const finalCategory = category ?? 'hotel'

  const { rows } = await sql`
    INSERT INTO tdg_hotel_contacts
      (hotel_id, added_by, name, surname, title, email, whatsapp, notes, category, organization)
    VALUES (${hotelId ?? null}, ${addedBy}, ${name}, ${surname}, ${title ?? null}, ${email ?? null}, ${whatsapp ?? null}, ${notes ?? null}, ${finalCategory}, ${finalOrganization})
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
