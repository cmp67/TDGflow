import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getCallerContext } from '@/lib/invites'

export const dynamic = 'force-dynamic'

const NO_AGENCY_ERROR = 'Usuário sem agência vinculada'
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

interface Brand {
  logoUrl:        string | null
  primaryColor:   string | null
  secondaryColor: string | null
  footerText:     string | null
}

function mapRow(row: Record<string, unknown> | undefined): Brand {
  return {
    logoUrl:        (row?.logo_url as string | null) ?? null,
    primaryColor:   (row?.primary_color as string | null) ?? null,
    secondaryColor: (row?.secondary_color as string | null) ?? null,
    footerText:     (row?.footer_text as string | null) ?? null,
  }
}

// GET /api/brand — qualquer membro autenticado da agência lê a marca dela
// (é o que o FlowShell usa pra decidir logo/cor). Sem customização ainda
// configurada, devolve tudo null — a UI cai pro padrão TDG Flow sozinha.
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { agencyId } = await getCallerContext(session.user.email)
  if (!agencyId) return NextResponse.json({ error: NO_AGENCY_ERROR }, { status: 422 })

  const { rows } = await sql`SELECT * FROM tdg_brand WHERE agency_id = ${agencyId} LIMIT 1`
  return NextResponse.json({ brand: mapRow(rows[0]) })
}

// PUT /api/brand — só agency_admin (da própria agência) ou admin global.
// Esqueleto Bemgsy nunca é customizável aqui — só logo/cor/rodapé, os
// únicos campos que existem na tabela.
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role, agencyId } = await getCallerContext(session.user.email)
  if (role !== 'admin' && role !== 'agency_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!agencyId) return NextResponse.json({ error: NO_AGENCY_ERROR }, { status: 422 })

  const body = await req.json()
  const { primaryColor, secondaryColor, footerText } = body as {
    primaryColor?: string | null; secondaryColor?: string | null; footerText?: string | null
  }

  if (primaryColor && !HEX_COLOR.test(primaryColor)) {
    return NextResponse.json({ error: 'primaryColor precisa ser um hex válido (#RRGGBB)' }, { status: 400 })
  }
  if (secondaryColor && !HEX_COLOR.test(secondaryColor)) {
    return NextResponse.json({ error: 'secondaryColor precisa ser um hex válido (#RRGGBB)' }, { status: 400 })
  }

  const { rows } = await sql`
    INSERT INTO tdg_brand (agency_id, primary_color, secondary_color, footer_text)
    VALUES (${agencyId}, ${primaryColor || null}, ${secondaryColor || null}, ${footerText || null})
    ON CONFLICT (agency_id) DO UPDATE
    SET primary_color   = ${primaryColor || null},
        secondary_color = ${secondaryColor || null},
        footer_text     = ${footerText || null},
        updated_at      = now()
    RETURNING *
  `
  return NextResponse.json({ brand: mapRow(rows[0]) })
}
