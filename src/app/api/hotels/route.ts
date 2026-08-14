import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { logAudit } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function isAdmin(email: string): Promise<boolean> {
  const { rows } = await sql`SELECT role FROM tdg_users WHERE email = ${email} LIMIT 1`
  return rows[0]?.role === 'admin'
}

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
  created_by: string | null
  can_edit: boolean
  benefits: { id: string; category: string; description: string; commission_pct: number | null }[]
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Quem cadastrou o fornecedor — base pra permissão de edição (só o
  // criador edita; fornecedor sem criador registrado, admin resolve).
  await sql`ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS created_by TEXT`

  const userIsAdmin = await isAdmin(session.user.email)

  // tested_count/pending_lead_count alimentam o mesmo indicador de status já
  // usado em "Na prática" (dourado=confirmado, coral=a testar) — em vez de
  // um badge novo, a própria bolinha do card (antes decorativa) passa a
  // significar algo real.
  // benefits vem de subquery escalar (não LEFT JOIN direto) pra não
  // multiplicar linhas junto com reviews e corromper tested_count/
  // pending_lead_count no GROUP BY.
  const { rows } = await sql`
    SELECT h.id, h.name, h.entity_type, h.location, h.country, h.region, h.description,
           h.contact_email, h.contact_phone, h.website_url, h.currency, h.group_name,
           h.image_url, h.dot_color, h.tags, h.profiles, h.gallery, h.created_by,
           COUNT(*) FILTER (WHERE r.status = 'published')::int AS tested_count,
           COUNT(*) FILTER (WHERE r.status = 'a_testar')::int AS pending_lead_count,
           COALESCE(
             (SELECT json_agg(json_build_object(
                'id', b.id, 'category', b.category, 'description', b.description, 'commission_pct', b.commission_pct
              ) ORDER BY b.created_at)
              FROM tdg_hotel_benefits b WHERE b.hotel_id = h.id),
             '[]'
           ) AS benefits
    FROM tdg_hotels h
    LEFT JOIN tdg_hotel_reviews r ON r.hotel_id = h.id
    GROUP BY h.id
    ORDER BY h.name
  `

  const hotels = rows.map(r => ({
    ...r,
    can_edit: r.created_by === session.user!.email || (r.created_by === null && userIsAdmin),
  }))

  return NextResponse.json({ hotels: hotels as HotelRow[] })
}

/* ── PATCH — editar dados do fornecedor (nome, localização, descrição...).
   Regra da Carla, 14/08: só quem cadastrou o fornecedor pode editar. Caso
   real que motivou: "Mandarin Oriental Miami" (que não existe mais) com
   dica na verdade sobre o Hong Kong — dado de catálogo errado, sem forma
   de corrigir. Fallback: fornecedores sem criador registrado (criados
   antes deste campo existir, ou vindos do MAX via WhatsApp) não têm dono
   identificável — ficariam eternamente sem correção possível sem esse
   fallback, que era exatamente o caso do Mandarin Oriental. Admin resolve
   esses. ──────────────────────────────────────────────────────────── */
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, fields } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await sql`ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS created_by TEXT`

  const { rows: hotelRows } = await sql`SELECT created_by, name FROM tdg_hotels WHERE id = ${id}`
  if (!hotelRows.length) return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 })
  const createdBy = hotelRows[0].created_by as string | null

  const isCreator = createdBy !== null && createdBy === session.user.email
  const isUnclaimed = createdBy === null
  if (!isCreator && !(isUnclaimed && (await isAdmin(session.user.email)))) {
    return NextResponse.json({ error: 'Só quem cadastrou este fornecedor pode editá-lo' }, { status: 403 })
  }

  const f = (fields ?? {}) as Record<string, unknown>
  const { rows } = await sql`
    UPDATE tdg_hotels SET
      name        = COALESCE(${(f.name as string) || null}, name),
      location    = COALESCE(${(f.location as string) || null}, location),
      country     = COALESCE(${(f.country as string) || null}, country),
      region      = COALESCE(${(f.region as string) || null}, region),
      description = COALESCE(${(f.description as string) || null}, description)
    WHERE id = ${id}
    RETURNING id, name, location, country, region, description
  `

  await logAudit({
    entityType: 'hotel',
    entityId: id,
    action: 'update',
    summary: `editou fornecedor "${hotelRows[0].name}" → "${rows[0].name}" (${Object.keys(f).join(', ')})`,
    changedBy: session.user.email,
    changedByName: session.user.name,
  })

  return NextResponse.json({ hotel: rows[0] })
}
