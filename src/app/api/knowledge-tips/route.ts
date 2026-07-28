import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/* Dicas gerais de destino (não são review de um fornecedor específico) —
   antes vivia atrás de /api/network-contacts?tab=tips, uma rota que também
   servia contatos de rede sem nenhuma relação com isso. Separado no Contact
   Hub: contatos ficam em /api/hotel-contacts, dicas ficam aqui. */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search')?.trim().toLowerCase()

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
