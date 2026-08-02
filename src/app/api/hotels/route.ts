import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getAgencyId } from '@/lib/agency'

export const dynamic = 'force-dynamic'

const ENTITY_TYPES = ['hotel', 'beach_club', 'transfer', 'guide', 'restaurant', 'other'] as const
type EntityType = (typeof ENTITY_TYPES)[number]

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
  benefits: { id: string; category: string; description: string; commission_pct: number | null }[]
  agency_id: string | null
  is_private: boolean
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agencyId = await getAgencyId(session.user?.email ?? '')

  // agency_id — acervo privado por agência (migration 021): NULL continua
  // sendo o catálogo compartilhado com a rede toda (comportamento de
  // sempre); preenchido só aparece pra quem é da mesma agência.
  await sql`ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES tdg_agencies(id)`

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
           h.image_url, h.dot_color, h.tags, h.profiles, h.gallery, h.agency_id,
           (h.agency_id IS NOT NULL) AS is_private,
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
    WHERE h.agency_id IS NULL OR h.agency_id = ${agencyId}::uuid
    GROUP BY h.id
    ORDER BY h.name
  `

  return NextResponse.json({ hotels: rows as HotelRow[] })
}

// POST — acervo privado da agência (migration 021, worktree feat/private-tenant):
// diferente do find-or-create em POST /api/reviews (que sempre nasce
// compartilhado com a rede, é o espírito de "Na prática"), este endpoint é
// o ponto de entrada deliberado pra uma agência cadastrar um fornecedor que
// só ELA enxerga — obrigatório ter agência atribuída.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agencyId = await getAgencyId(session.user.email)
  if (!agencyId) {
    return NextResponse.json(
      { error: 'Sua conta não tem agência atribuída — não é possível criar um item do acervo privado.' },
      { status: 400 }
    )
  }

  const body = await req.json()
  const name = (body.name as string | undefined)?.trim()
  const entityType = (body.entity_type as string | undefined) || 'hotel'
  const location = (body.location as string | undefined)?.trim() || null
  const country = (body.country as string | undefined)?.trim() || null
  const description = (body.description as string | undefined)?.trim() || null

  if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  if (!ENTITY_TYPES.includes(entityType as EntityType)) {
    return NextResponse.json({ error: 'Tipo de fornecedor inválido' }, { status: 400 })
  }

  await sql`ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES tdg_agencies(id)`

  // Colisão só existe DENTRO do mesmo escopo (índices parciais da migration
  // 021): um compartilhado com a rede (agency_id NULL), ou um privado desta
  // MESMA agência. O mesmo nome já usado privadamente por OUTRA agência não
  // conta — cada uma tem seu próprio acervo.
  const { rows: existing } = await sql`
    SELECT id, agency_id FROM tdg_hotels
    WHERE lower(trim(name)) = lower(${name}) AND entity_type = ${entityType}
      AND (agency_id IS NULL OR agency_id = ${agencyId}::uuid)
  `
  if (existing[0]) {
    if (existing[0].agency_id === agencyId) {
      return NextResponse.json({ hotel: existing[0] })
    }
    return NextResponse.json(
      { error: 'Já existe um fornecedor com este nome — se for da rede, ele já aparece no catálogo compartilhado.' },
      { status: 409 }
    )
  }

  const { rows } = await sql`
    INSERT INTO tdg_hotels (name, entity_type, location, country, description, agency_id)
    VALUES (${name}, ${entityType}, ${location}, ${country}, ${description}, ${agencyId})
    ON CONFLICT (lower(trim(name)), entity_type, agency_id) WHERE agency_id IS NOT NULL DO NOTHING
    RETURNING id, name, entity_type, location, country, description, agency_id
  `
  if (!rows[0]) {
    // Corrida: outra requisição criou o mesmo nome pra esta agência entre o SELECT e o INSERT.
    const { rows: raced } = await sql`
      SELECT id, name, entity_type, location, country, description, agency_id FROM tdg_hotels
      WHERE lower(trim(name)) = lower(${name}) AND entity_type = ${entityType} AND agency_id = ${agencyId}::uuid
    `
    return NextResponse.json({ hotel: raced[0] })
  }
  return NextResponse.json({ hotel: rows[0] }, { status: 201 })
}
