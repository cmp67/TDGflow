import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/* Super Busca (padrão obrigatório em todo campo de busca Bemgsy) —
   case-insensitive, accent-insensitive, parcial. Mesmo padrão de
   OfertasList.tsx, aplicado aqui do lado do servidor. */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/* Dicas gerais de destino (não são review de um fornecedor específico) —
   antes vivia atrás de /api/network-contacts?tab=tips, uma rota que também
   servia contatos de rede sem nenhuma relação com isso. Separado no Contact
   Hub: contatos ficam em /api/hotel-contacts, dicas ficam aqui.

   Fase 5 (02/08): fonte trocou de tdg_knowledge (tabela antiga, vazia,
   ligada a hotel_id) pra tdg_destination_knowledge — onde vive o conhecimento
   de destino importado do WhatsApp (país + tags temáticas). Busca cobre
   título, conteúdo, país e tag — uma palavra-chave como "golpe" ou "aéreo"
   traz tudo daquele tema, mesmo sem bater no texto literal. */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search')?.trim()

  const { rows } = await sql`
    SELECT id, title, content, country, tags, source_author, source_date::text AS source_date,
           import_approval
    FROM tdg_destination_knowledge
    ORDER BY source_date DESC NULLS LAST, created_at DESC
  `

  let tips = rows
  if (search) {
    const q = normalize(search)
    tips = tips.filter(t => {
      const haystack = normalize([
        t.title ?? '',
        t.content ?? '',
        t.country ?? '',
        ...(t.tags ?? []),
      ].join(' '))
      return haystack.includes(q)
    })
  }

  return NextResponse.json({ tips, total: rows.length })
}
