import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/* Fase 6 do plano TDG Knowledge Base — fila de confirmação do autor
   (decisões #14-16). Cobre os dois tipos de conteúdo importado do WhatsApp
   com import_approval: tdg_hotel_reviews e tdg_destination_knowledge.

   scope=mine  → itens cujo source_author bate (ILIKE) com o nome do usuário
                 logado — ele confirma o que ELE disse.
   scope=admin → itens cujo source_author NÃO bate com NENHUM usuário real
                 cadastrado — fallback do admin (decisão #16), só ele vê.
                 Hoje (02/08) isso é ~100% da fila: nenhum dos 228 autores
                 reais da extração tem conta no Flow ainda com nome batendo.
                 Conforme a rede for ganhando contas reais, os itens saem
                 daqui e migram sozinhos pra fila do próprio autor — sem
                 precisar de nenhuma migração de dado, é só o match mudando.

   Não implementa a regra de "30 dias sem ação do autor" (decisão #16) —
   hoje não existe NENHUM item na fila de autor real pra essa regra fazer
   sentido; fica pra quando isso passar a acontecer de verdade. */

const MATCH_CONDITION = (col: string) =>
  `EXISTS (SELECT 1 FROM tdg_users u WHERE ${col} ILIKE '%' || u.name || '%')`

async function isAdmin(email: string): Promise<boolean> {
  const { rows } = await sql.query('SELECT role FROM tdg_users WHERE email = $1 LIMIT 1', [email])
  return rows[0]?.role === 'admin'
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scope = req.nextUrl.searchParams.get('scope') === 'admin' ? 'admin' : 'mine'
  const search = req.nextUrl.searchParams.get('search')?.trim() ?? ''
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '30'), 100)
  const offset = Number(req.nextUrl.searchParams.get('offset') ?? '0')

  if (scope === 'admin' && !(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { rows: userRows } = await sql.query(
    'SELECT name FROM tdg_users WHERE email = $1 LIMIT 1', [session.user.email]
  )
  const myName: string = userRows[0]?.name ?? ''

  // Achado real, 06/08/2026: sem essa trava, scope=mine com myName vazio
  // (usuário sem nome cadastrado, ou não encontrado em tdg_users) virava
  // `ILIKE '%' || '' || '%'` = `ILIKE '%%'`, que bate com QUALQUER
  // source_author — vazando os 1000+ itens pendentes de toda a rede pra
  // qualquer conta nessa situação, não só os itens do próprio usuário.
  if (scope === 'mine' && !myName.trim()) {
    return NextResponse.json({ items: [], total: 0, total_reviews: 0, total_knowledge: 0 })
  }

  const reviewMatchClause = scope === 'admin'
    ? `NOT ${MATCH_CONDITION('r.source_author')}`
    : `r.source_author ILIKE '%' || $1 || '%'`
  const knowledgeMatchClause = scope === 'admin'
    ? `NOT ${MATCH_CONDITION('k.source_author')}`
    : `k.source_author ILIKE '%' || $1 || '%'`

  const matchParam = scope === 'admin' ? [] : [myName]
  const searchClauseReview = search ? `AND (r.hotel_name ILIKE '%' || $${matchParam.length + 1} || '%' OR r.source_author ILIKE '%' || $${matchParam.length + 1} || '%')` : ''
  const searchClauseKnowledge = search ? `AND (k.title ILIKE '%' || $${matchParam.length + 1} || '%' OR k.source_author ILIKE '%' || $${matchParam.length + 1} || '%')` : ''
  const searchParam = search ? [search] : []

  const { rows: reviewRows } = await sql.query(
    `SELECT r.id, 'review' AS content_type, r.hotel_name AS title,
            r.heads_up, r.must_experience, r.client_profile, r.highlights,
            r.source_author, r.source_date::text AS source_date, r.created_at
     FROM tdg_hotel_reviews r
     WHERE r.import_approval = 'pending' AND ${reviewMatchClause} ${searchClauseReview}
     ORDER BY r.source_date DESC NULLS LAST
     LIMIT $${matchParam.length + searchParam.length + 1} OFFSET $${matchParam.length + searchParam.length + 2}`,
    [...matchParam, ...searchParam, limit, offset]
  )

  const { rows: knowledgeRows } = await sql.query(
    `SELECT k.id, 'knowledge' AS content_type, k.title,
            k.content, k.country, k.tags, k.type AS knowledge_type,
            k.source_author, k.source_date::text AS source_date, k.created_at
     FROM tdg_destination_knowledge k
     WHERE k.import_approval = 'pending' AND ${knowledgeMatchClause} ${searchClauseKnowledge}
     ORDER BY k.source_date DESC NULLS LAST
     LIMIT $${matchParam.length + searchParam.length + 1} OFFSET $${matchParam.length + searchParam.length + 2}`,
    [...matchParam, ...searchParam, limit, offset]
  )

  const { rows: countRows } = await sql.query(
    `SELECT
       (SELECT COUNT(*)::int FROM tdg_hotel_reviews r WHERE r.import_approval = 'pending' AND ${reviewMatchClause}) AS reviews,
       (SELECT COUNT(*)::int FROM tdg_destination_knowledge k WHERE k.import_approval = 'pending' AND ${knowledgeMatchClause}) AS knowledge`,
    matchParam
  )
  const totalReviews = countRows[0]?.reviews ?? 0
  const totalKnowledge = countRows[0]?.knowledge ?? 0

  return NextResponse.json({
    items: [...reviewRows, ...knowledgeRows],
    total: totalReviews + totalKnowledge,
    total_reviews: totalReviews,
    total_knowledge: totalKnowledge,
  })
}

/* action: 'approve' | 'delete' | 'edit' */
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, content_type, action, fields } = body as {
    id: string; content_type: 'review' | 'knowledge'; action: string
    fields?: Record<string, unknown>
  }
  if (!id || !content_type || !action) {
    return NextResponse.json({ error: 'id, content_type e action são obrigatórios' }, { status: 400 })
  }

  const table = content_type === 'review' ? 'tdg_hotel_reviews' : 'tdg_destination_knowledge'

  // Achado real, 06/08/2026: a tela só esconde os botões Aprovar/Editar/
  // Excluir de quem não é admin — a API em si não verificava nada, então
  // qualquer usuário autenticado (qualquer agência, qualquer papel)
  // conseguia aprovar/editar/apagar o conteúdo pendente de qualquer outra
  // agência chamando essa rota direto. Toda ação agora exige ser admin OU
  // dono do item (mesmo critério de match por nome já usado no approve).
  const { rows: userRows } = await sql.query(
    'SELECT id, name, role FROM tdg_users WHERE email = $1 LIMIT 1', [session.user.email]
  )
  const actingUser = userRows[0]
  if (!actingUser) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const { rows: itemRows } = await sql.query(
    `SELECT source_author FROM ${table} WHERE id = $1`, [id]
  )
  if (!itemRows.length) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
  const sourceAuthor: string | undefined = itemRows[0]?.source_author
  const isOwnItem = !!sourceAuthor && !!actingUser.name &&
    sourceAuthor.toLowerCase().includes(String(actingUser.name).toLowerCase())

  if (actingUser.role !== 'admin' && !isOwnItem) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (action === 'approve') {
    // Aprovado pelo próprio autor (nome bate) vs. pelo admin em nome dele
    // (decisão #14 — o badge cinza some nos dois casos, só o valor do
    // import_approval registra qual dos dois foi).
    const approvalValue = isOwnItem ? 'approved_by_author' : 'approved_by_admin'

    await sql.query(
      `UPDATE ${table} SET import_approval = $1, import_approval_at = NOW(), import_approval_by = $2 WHERE id = $3`,
      [approvalValue, actingUser.id, id]
    )
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete') {
    await sql.query(`DELETE FROM ${table} WHERE id = $1`, [id])
    return NextResponse.json({ ok: true })
  }

  if (action === 'edit') {
    if (!fields) return NextResponse.json({ error: 'fields required' }, { status: 400 })
    if (content_type === 'knowledge') {
      await sql.query(
        `UPDATE tdg_destination_knowledge SET title = $1, content = $2, country = $3, tags = $4 WHERE id = $5`,
        [fields.title, fields.content ?? null, fields.country ?? null, fields.tags ?? [], id]
      )
    } else {
      await sql.query(
        `UPDATE tdg_hotel_reviews SET highlights = $1, client_profile = $2, must_experience = $3, heads_up = $4 WHERE id = $5`,
        [JSON.stringify(fields.highlights ?? []), fields.client_profile ?? null, fields.must_experience ?? null, fields.heads_up ?? null, id]
      )
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'action inválida' }, { status: 400 })
}
