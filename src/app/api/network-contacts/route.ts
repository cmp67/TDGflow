import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') ?? 'contacts'   // 'contacts' | 'tips'
  const category = searchParams.get('category')
  const search = searchParams.get('search')?.trim().toLowerCase()

  /* ── Tips tab ───────────────────────────────────────────────── */
  if (tab === 'tips') {
    const { rows } = await sql`
      SELECT id, title, content, source_author, source_date::text AS source_date
      FROM tdg_knowledge
      WHERE type = 'note'
      ORDER BY source_date ASC NULLS LAST, created_at ASC
    `
    let tips = rows
    if (search) {
      tips = tips.filter(t =>
        t.title?.toLowerCase().includes(search) ||
        t.content?.toLowerCase().includes(search)
      )
    }
    return NextResponse.json({ tips, total: rows.length })
  }

  /* ── Contacts tab ───────────────────────────────────────────── */
  const { rows } = await sql`
    SELECT
      id, name, surname, whatsapp, email,
      category, organization, context_trigger,
      source_author, source_date::text AS source_date,
      notes, created_at
    FROM tdg_hotel_contacts
    WHERE is_network_contact = TRUE
    ORDER BY source_date ASC NULLS LAST, created_at ASC
  `

  let contacts = rows
  if (category && category !== 'all') {
    contacts = contacts.filter(c => c.category === category)
  }
  if (search) {
    contacts = contacts.filter(c =>
      c.name?.toLowerCase().includes(search) ||
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
