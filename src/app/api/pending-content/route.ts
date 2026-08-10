import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorMatch } from '@/lib/author-match'

export const dynamic = 'force-dynamic'

/* Fase 6 do plano TDG Knowledge Base — fila de confirmação do autor
   (decisões #14-16). Cobre os dois tipos de conteúdo importado do WhatsApp
   com import_approval: tdg_hotel_reviews e tdg_destination_knowledge.

   scope=mine  → itens cujo source_author bate com o nome do usuário logado
                 (ver src/lib/author-match.ts) — ele confirma o que ELE disse.
   scope=admin → itens cujo source_author não bate com NENHUM usuário real
                 cadastrado — fallback do admin (decisão #16).

   Achado real, 10/08: o match antigo (substring exato via SQL ILIKE) fazia
   1600+ itens caírem no fallback do admin mesmo com o autor já tendo conta
   real — "Elaine Alvarenga Scanavacca" (nome legal) nunca batia com "Elaine
   Scanavacca" (nome extraído do WhatsApp, sem o nome do meio). Corrigido:
   match por token (isAuthorMatch), calculado em JS depois de buscar tudo —
   a tabela de usuários é pequena (~20-30) e a fila cabe inteira em memória
   sem problema de performance.

   Não implementa a regra de "30 dias sem ação do autor" (decisão #16) —
   fica pra quando isso passar a fazer sentido de verdade. */

async function getCaller(email: string): Promise<{ id: string; name: string; role: string } | null> {
  const { rows } = await sql.query('SELECT id, name, role FROM tdg_users WHERE email = $1 LIMIT 1', [email])
  return rows[0] ?? null
}

interface PendingRow {
  id: string
  source_author: string | null
  source_date: string | null
  [key: string]: unknown
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scope = req.nextUrl.searchParams.get('scope') === 'admin' ? 'admin' : 'mine'
  const search = req.nextUrl.searchParams.get('search')?.trim() ?? ''
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '30'), 100)
  const offset = Number(req.nextUrl.searchParams.get('offset') ?? '0')

  const caller = await getCaller(session.user.email)
  if (!caller) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  if (scope === 'admin' && caller.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // scope=mine com nome vazio nunca deve virar "bate com tudo" — achado
  // real, 06/08: sem essa trava, um usuário sem nome cadastrado via
  // ILIKE '%%' via um vazamento da fila inteira da rede.
  if (scope === 'mine' && !caller.name.trim()) {
    return NextResponse.json({ items: [], total: 0, total_reviews: 0, total_knowledge: 0 })
  }

  const searchClauseReview = search ? `AND (r.hotel_name ILIKE '%' || $1 || '%' OR r.source_author ILIKE '%' || $1 || '%')` : ''
  const searchClauseKnowledge = search ? `AND (k.title ILIKE '%' || $1 || '%' OR k.source_author ILIKE '%' || $1 || '%')` : ''
  const searchParam = search ? [search] : []

  const [{ rows: allReviewRows }, { rows: allKnowledgeRows }, { rows: allUsers }] = await Promise.all([
    sql.query<PendingRow>(
      `SELECT r.id, 'review' AS content_type, r.hotel_name AS title,
              r.heads_up, r.must_experience, r.client_profile, r.highlights,
              r.source_author, r.source_date::text AS source_date, r.created_at
       FROM tdg_hotel_reviews r
       WHERE r.import_approval = 'pending' ${searchClauseReview}
       ORDER BY r.source_date DESC NULLS LAST`,
      searchParam
    ),
    sql.query<PendingRow>(
      `SELECT k.id, 'knowledge' AS content_type, k.title,
              k.content, k.country, k.tags, k.type AS knowledge_type,
              k.source_author, k.source_date::text AS source_date, k.created_at
       FROM tdg_destination_knowledge k
       WHERE k.import_approval = 'pending' ${searchClauseKnowledge}
       ORDER BY k.source_date DESC NULLS LAST`,
      searchParam
    ),
    sql.query<{ name: string }>('SELECT name FROM tdg_users WHERE name IS NOT NULL AND name <> \'\''),
  ])

  const realNames = allUsers.map(u => u.name)
  const callerName = caller.name
  function matchesScope(sourceAuthor: string | null): boolean {
    if (scope === 'mine') return isAuthorMatch(sourceAuthor, callerName)
    return !realNames.some(name => isAuthorMatch(sourceAuthor, name))
  }

  const matchedReviews = allReviewRows.filter(r => matchesScope(r.source_author))
  const matchedKnowledge = allKnowledgeRows.filter(k => matchesScope(k.source_author))

  const totalReviews = matchedReviews.length
  const totalKnowledge = matchedKnowledge.length
  const items = [...matchedReviews, ...matchedKnowledge].slice(offset, offset + limit)

  return NextResponse.json({
    items,
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

  // Toda ação exige ser admin OU dono do item (mesmo critério de match por
  // token usado no GET — ver src/lib/author-match.ts).
  const caller = await getCaller(session.user.email)
  if (!caller) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const { rows: itemRows } = await sql.query(
    `SELECT source_author FROM ${table} WHERE id = $1`, [id]
  )
  if (!itemRows.length) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
  const sourceAuthor: string | undefined = itemRows[0]?.source_author
  const isOwnItem = isAuthorMatch(sourceAuthor, caller.name)

  if (caller.role !== 'admin' && !isOwnItem) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (action === 'approve') {
    // Aprovado pelo próprio autor (nome bate) vs. pelo admin em nome dele
    // (decisão #14 — o badge cinza some nos dois casos, só o valor do
    // import_approval registra qual dos dois foi).
    const approvalValue = isOwnItem ? 'approved_by_author' : 'approved_by_admin'

    await sql.query(
      `UPDATE ${table} SET import_approval = $1, import_approval_at = NOW(), import_approval_by = $2 WHERE id = $3`,
      [approvalValue, caller.id, id]
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
