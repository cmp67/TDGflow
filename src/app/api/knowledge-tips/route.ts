import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

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

// POST — "Registrar nota" (20/08, pedido da Carla): botão pra registrar
// direto no Acervo TDG qualquer coisa que não é review de fornecedor
// (fato, alerta, blacklist etc.) — mesmo destino final de tdg_destination_
// knowledge que a importação do WhatsApp preenche, mas escrito ao vivo por
// gente logada, não extraído depois de um histórico de mensagens. Por
// isso nasce SEM import_approval — quem está digitando é o próprio autor
// nesse instante, a fila de confirmação existe pra resolver ambiguidade
// de "quem disse isso" numa importação em lote, que não existe aqui.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const title = (body.title as string | undefined)?.trim()
  const content = (body.content as string | undefined)?.trim() || null
  const country = (body.country as string | undefined)?.trim() || null
  const tags = Array.isArray(body.tags) ? (body.tags as unknown[]).map(t => String(t).trim()).filter(Boolean) : []
  const type = (body.type as string | undefined) ?? 'note'

  if (!title) return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })
  if (!['fact', 'note', 'link'].includes(type)) {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  }

  const { rows: userRows } = await sql`SELECT name FROM tdg_users WHERE email = ${session.user.email} LIMIT 1`
  const authorName = (userRows[0]?.name as string | undefined) ?? session.user.email

  // sql.query (não a tagged template) — array de tags não é um Primitive
  // aceito pelo tipo do `sql` tagged template do @vercel/postgres, mesma
  // razão pela qual PATCH /api/pending-content já usa sql.query pra
  // atualizar esta mesma coluna.
  const { rows } = await sql.query(
    `INSERT INTO tdg_destination_knowledge (type, title, content, country, tags, source_author, source_date)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
     RETURNING id, title, content, country, tags, source_author, source_date::text AS source_date, import_approval`,
    [type, title, content, country, tags, authorName]
  )
  return NextResponse.json({ tip: rows[0] }, { status: 201 })
}
