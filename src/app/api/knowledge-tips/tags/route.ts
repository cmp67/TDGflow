import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Vocabulário de tags do Acervo TDG — pedido da Carla, 20/08: a
// auto-classificação da importação do WhatsApp já produziu um conjunto
// limpo e consistente (kebab-case, ex: "vistos-documentacao",
// "restaurantes") — 589/617 notas já têm tag. Esta rota expõe essa lista
// (ordenada por uso) pra dois consumos: autocomplete no formulário de
// nota (converge o vocabulário em vez de deixar texto livre solto) e
// chips de filtro no topo do Acervo TDG.
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows } = await sql`
    SELECT tag, COUNT(*)::int AS count
    FROM tdg_destination_knowledge, unnest(tags) AS tag
    GROUP BY tag
    ORDER BY count DESC, tag ASC
  `

  return NextResponse.json({ tags: rows })
}
