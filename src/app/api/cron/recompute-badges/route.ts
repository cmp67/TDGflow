import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/* Fase 7 — badges de expertise (decisões #17-20 do plano TDG Knowledge
   Base). Vercel Cron, 1x/dia (primeiro cron do projeto — não havia nenhum
   antes, checado em vercel.json).

   Elegibilidade em TODOS os cálculos: review `published` E com
   import_approval confirmado — `IS DISTINCT FROM 'pending'`, não
   `IN ('approved_by_author','approved_by_admin')`. Review orgânica nunca
   teve import_approval (fica NULL pra sempre) e precisa contar igual —
   o IN excluiria toda review orgânica por engano.

   Pioneira é orientado a evento no plano original ("dispara quando uma
   review vira published"); aqui roda dentro do mesmo cron diário em vez de
   um hook em cada lugar do código que pode publicar uma review (POST
   /api/reviews, aprovação da fila do autor, aprovação do admin — múltiplos
   pontos de entrada). Mesmo resultado final (idempotente, nunca duplica),
   só non-realtime — consistente com o resto do cálculo já ser diário. */

const ELIGIBLE = `status = 'published' AND import_approval IS DISTINCT FROM 'pending'`

async function recomputeTitleBadge(
  badgeType: 'voz_do_destino' | 'referencia_categoria',
  groupCol: 'country' | 'entity_type'
) {
  const { rows: leaders } = await sql.query(`
    WITH eligible AS (
      SELECT r.${groupCol} AS context, r.agent_id, COUNT(DISTINCT r.hotel_id) AS hotel_count
      FROM tdg_hotel_reviews r
      WHERE ${ELIGIBLE} AND r.${groupCol} IS NOT NULL AND r.agent_id IS NOT NULL
      GROUP BY r.${groupCol}, r.agent_id
      HAVING COUNT(DISTINCT r.hotel_id) >= 3
    ),
    ranked AS (
      SELECT context, agent_id, hotel_count,
             ROW_NUMBER() OVER (PARTITION BY context ORDER BY hotel_count DESC, agent_id ASC) AS rnk
      FROM eligible
    )
    SELECT context, agent_id, hotel_count FROM ranked WHERE rnk = 1
  `)

  let changed = 0
  for (const leader of leaders) {
    const { rows: currentHolder } = await sql.query(
      `SELECT user_id FROM tdg_badges WHERE badge_type = $1 AND context = $2 AND is_current = true`,
      [badgeType, leader.context]
    )
    if (currentHolder[0]?.user_id === leader.agent_id) continue // titular não mudou

    await sql.query(
      `UPDATE tdg_badges SET is_current = false, lost_at = NOW() WHERE badge_type = $1 AND context = $2 AND is_current = true`,
      [badgeType, leader.context]
    )
    await sql.query(
      `INSERT INTO tdg_badges (user_id, badge_type, context) VALUES ($1, $2, $3)`,
      [leader.agent_id, badgeType, leader.context]
    )
    changed++
  }
  return { evaluated: leaders.length, changed }
}

async function recomputePioneira() {
  const { rows: newPioneers } = await sql.query(`
    WITH hotel_review_counts AS (
      SELECT hotel_id, COUNT(*) AS cnt
      FROM tdg_hotel_reviews
      WHERE ${ELIGIBLE} AND hotel_id IS NOT NULL
      GROUP BY hotel_id
      HAVING COUNT(*) >= 3
    ),
    oldest AS (
      SELECT DISTINCT ON (r.hotel_id) r.hotel_id, r.agent_id
      FROM tdg_hotel_reviews r
      JOIN hotel_review_counts c ON c.hotel_id = r.hotel_id
      WHERE ${ELIGIBLE} AND r.agent_id IS NOT NULL
      ORDER BY r.hotel_id, r.source_date ASC NULLS LAST, r.created_at ASC
    )
    SELECT o.hotel_id, o.agent_id
    FROM oldest o
    WHERE NOT EXISTS (SELECT 1 FROM tdg_badges b WHERE b.badge_type = 'pioneira' AND b.context = o.hotel_id::text)
  `)

  for (const p of newPioneers) {
    await sql.query(
      `INSERT INTO tdg_badges (user_id, badge_type, context, hotel_id) VALUES ($1, 'pioneira', $2, $3)`,
      [p.agent_id, p.hotel_id, p.hotel_id]
    )
  }
  return { created: newPioneers.length }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [vozDoDestino, referenciaCategoria, pioneira] = await Promise.all([
    recomputeTitleBadge('voz_do_destino', 'country'),
    recomputeTitleBadge('referencia_categoria', 'entity_type'),
    recomputePioneira(),
  ])

  return NextResponse.json({ voz_do_destino: vozDoDestino, referencia_categoria: referenciaCategoria, pioneira })
}
