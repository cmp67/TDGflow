import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { logAudit } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CATEGORIES = ['comissao', 'amenidade', 'pagamento', 'outro'] as const
type Category = (typeof CATEGORIES)[number]

const CATEGORY_LABELS: Record<Category, string> = {
  comissao:  'Comissão diferenciada',
  amenidade: 'Amenidade exclusiva',
  pagamento: 'Condição de pagamento',
  outro:     'Outro',
}

export interface HotelBenefit {
  id: string
  hotel_id: string
  category: Category
  description: string
  commission_pct: number | null
  created_by: string
  created_at: string
}

async function isAdmin(email: string): Promise<boolean> {
  const { rows } = await sql`SELECT role FROM tdg_users WHERE email = ${email} LIMIT 1`
  return rows[0]?.role === 'admin'
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hotelId = req.nextUrl.searchParams.get('hotelId')
  if (!hotelId) return NextResponse.json({ error: 'hotelId required' }, { status: 400 })

  const { rows } = await sql<HotelBenefit>`
    SELECT id, hotel_id, category, description, commission_pct, created_by, created_at::text AS created_at
    FROM tdg_hotel_benefits
    WHERE hotel_id = ${hotelId}
    ORDER BY created_at DESC
  `
  return NextResponse.json({ benefits: rows })
}

// POST — só admin. Condição comercial negociada é informação sensível/
// oficial, diferente de material de treinamento (que qualquer agente
// contribui) ou de review (crowdsourced por natureza).
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdmin(session.user.email))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { hotelId, category, description, commissionPct } = body

  if (!hotelId || !description?.trim()) {
    return NextResponse.json({ error: 'hotelId e description são obrigatórios' }, { status: 400 })
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'category inválida' }, { status: 400 })
  }

  const pct = category === 'comissao' && commissionPct != null ? Number(commissionPct) : null

  const { rows } = await sql<HotelBenefit>`
    INSERT INTO tdg_hotel_benefits (hotel_id, category, description, commission_pct, created_by)
    VALUES (${hotelId}, ${category}, ${description.trim()}, ${pct}, ${session.user.email})
    RETURNING id, hotel_id, category, description, commission_pct, created_by, created_at::text AS created_at
  `

  const summaryDetail = pct != null ? `${pct}% — ${description.trim()}` : description.trim()
  await logAudit({
    entityType: 'hotel_benefit',
    entityId: hotelId,
    action: 'create',
    summary: `adicionou benefício (${CATEGORY_LABELS[category as Category]}): ${summaryDetail}`,
    changedBy: session.user.email,
    changedByName: session.user.name,
  })

  return NextResponse.json({ benefit: rows[0] }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdmin(session.user.email))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { rows } = await sql<HotelBenefit>`
    DELETE FROM tdg_hotel_benefits WHERE id = ${id}
    RETURNING id, hotel_id, category, description, commission_pct, created_by, created_at::text AS created_at
  `
  if (rows.length === 0) return NextResponse.json({ error: 'Benefício não encontrado' }, { status: 404 })

  await logAudit({
    entityType: 'hotel_benefit',
    entityId: rows[0].hotel_id,
    action: 'delete',
    summary: `removeu benefício (${CATEGORY_LABELS[rows[0].category]}): ${rows[0].description}`,
    changedBy: session.user.email,
    changedByName: session.user.name,
  })

  return NextResponse.json({ ok: true })
}
