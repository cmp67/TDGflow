import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/* Dicas gerais de destino (não são review de um fornecedor específico) —
   antes vivia atrás de /api/network-contacts?tab=tips, uma rota que também
   servia contatos de rede sem nenhuma relação com isso. Separado no Contact
   Hub: contatos ficam em /api/hotel-contacts, dicas ficam aqui.

   Fase 5 (02/08): fonte trocou de tdg_knowledge (tabela antiga, vazia,
   ligada a hotel_id) pra tdg_destination_knowledge — onde vive o conhecimento
   de destino importado do WhatsApp (país + tags temáticas).

   Fase 8 (02/08): busca saiu daqui — virou /api/search, que cruza esta
   tabela com hotéis/reviews/contatos. Esta rota volta a ser só a listagem
   padrão (sem termo de busca), que é o que DestinosView mostra quando o
   campo de busca está vazio. */
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows } = await sql`
    SELECT id, title, content, country, tags, source_author, source_date::text AS source_date,
           import_approval
    FROM tdg_destination_knowledge
    ORDER BY source_date DESC NULLS LAST, created_at DESC
  `

  return NextResponse.json({ tips: rows, total: rows.length })
}
