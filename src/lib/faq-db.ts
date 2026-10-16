/* "Como faço" — acesso ao banco. Só o servidor importa. */

import { sql } from '@vercel/postgres'
import { slugify, type FaqItem, type FaqItemInput, type FaqRequest } from '@/lib/faq'

const ITEM_COLS = `id, slug, pergunta, resposta_md, area, ordem, publicado, updated_at::text AS updated_at`
const REQUEST_COLS = `id, pergunta, contexto, status, created_by, created_at::text AS created_at`

export async function listFaqItems(includeUnpublished: boolean): Promise<FaqItem[]> {
  const where = includeUnpublished ? '' : 'WHERE publicado'
  const { rows } = await sql.query(`SELECT ${ITEM_COLS} FROM tdg_faq_items ${where} ORDER BY area, ordem, pergunta`)
  return rows as FaqItem[]
}

export async function getFaqItemBySlug(slug: string, includeUnpublished: boolean): Promise<FaqItem | null> {
  const { rows } = await sql.query(
    `SELECT ${ITEM_COLS} FROM tdg_faq_items WHERE slug = $1 ${includeUnpublished ? '' : 'AND publicado'} LIMIT 1`,
    [slug],
  )
  return (rows[0] as FaqItem | undefined) ?? null
}

/* Slug nasce da pergunta e nunca muda depois: é a URL que vai pro WhatsApp.
   Colisão ganha sufixo numérico. */
async function uniqueSlug(base: string): Promise<string> {
  for (let n = 0; n < 20; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`
    const { rows } = await sql`SELECT 1 FROM tdg_faq_items WHERE slug = ${candidate}`
    if (rows.length === 0) return candidate
  }
  return `${base}-${Date.now()}`
}

export async function createFaqItem(input: FaqItemInput, by: string): Promise<FaqItem> {
  const slug = await uniqueSlug(slugify(input.pergunta))
  const { rows } = await sql.query(
    `INSERT INTO tdg_faq_items (slug, pergunta, resposta_md, area, ordem, publicado, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING ${ITEM_COLS}`,
    [slug, input.pergunta, input.resposta_md, input.area, input.ordem, input.publicado, by],
  )
  return rows[0] as FaqItem
}

export async function updateFaqItem(id: string, input: FaqItemInput, by: string): Promise<FaqItem | null> {
  const { rows } = await sql.query(
    `UPDATE tdg_faq_items SET pergunta = $2, resposta_md = $3, area = $4, ordem = $5, publicado = $6,
            updated_by = $7, updated_at = now()
      WHERE id = $1 RETURNING ${ITEM_COLS}`,
    [id, input.pergunta, input.resposta_md, input.area, input.ordem, input.publicado, by],
  )
  return (rows[0] as FaqItem | undefined) ?? null
}

export async function listOpenFaqRequests(): Promise<FaqRequest[]> {
  const { rows } = await sql.query(`SELECT ${REQUEST_COLS} FROM tdg_faq_requests WHERE status = 'aberta' ORDER BY created_at`)
  return rows as FaqRequest[]
}

export async function createFaqRequest(pergunta: string, contexto: string | null, by: string): Promise<FaqRequest> {
  const { rows } = await sql.query(
    `INSERT INTO tdg_faq_requests (pergunta, contexto, created_by) VALUES ($1, $2, $3) RETURNING ${REQUEST_COLS}`,
    [pergunta, contexto, by],
  )
  return rows[0] as FaqRequest
}

export async function resolveFaqRequest(
  id: string, status: 'respondida' | 'descartada', by: string, itemId: string | null,
): Promise<boolean> {
  const { rowCount } = await sql.query(
    `UPDATE tdg_faq_requests SET status = $2, resolved_by = $3, resolved_at = now(), item_id = $4
      WHERE id = $1 AND status = 'aberta'`,
    [id, status, by, itemId],
  )
  return (rowCount ?? 0) > 0
}
