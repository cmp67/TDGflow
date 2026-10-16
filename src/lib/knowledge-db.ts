/* TDG Knowledge Base — acesso ao banco. Só o servidor importa.
   Edição guarda a versão anterior (tdg_conteudo_versoes) na mesma
   transação e renova o prazo de revisão; duas pessoas editando ao mesmo
   tempo, a segunda recebe 409. Nada se apaga: arquiva-se. */

import { sql, db } from '@vercel/postgres'
import { revisarEmPadrao, type KnowledgeFields, type KnowledgeItem } from '@/lib/knowledge'

export const KNOWLEDGE_COLS = `id, type, title, content, url, country, region, tags, testado,
  source_author, source_date::text AS source_date, import_approval,
  revisar_em::text AS revisar_em, (revisar_em < current_date) AS vencido,
  status, versao, updated_at::text AS updated_at, updated_by`

export type Autor = { email: string; name: string }
type Fail = { ok: false; status: 400 | 403 | 404 | 409; error: string }

export async function listKnowledge(): Promise<KnowledgeItem[]> {
  const { rows } = await sql.query(
    `SELECT ${KNOWLEDGE_COLS} FROM tdg_destination_knowledge WHERE status = 'publicado'
      ORDER BY source_date DESC NULLS LAST, created_at DESC`,
  )
  return rows as KnowledgeItem[]
}

export async function getKnowledge(id: string): Promise<KnowledgeItem | null> {
  const { rows } = await sql.query(`SELECT ${KNOWLEDGE_COLS} FROM tdg_destination_knowledge WHERE id = $1`, [id])
  return (rows[0] as KnowledgeItem | undefined) ?? null
}

/* Nasce publicado e sem import_approval — quem digita é o próprio autor
   nesse instante; a fila de confirmação é só da importação em lote. */
export async function createKnowledge(f: KnowledgeFields, autor: Autor): Promise<KnowledgeItem> {
  const { rows } = await sql.query(
    `INSERT INTO tdg_destination_knowledge
       (type, title, content, url, country, region, tags, testado, source_author, source_date, revisar_em, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE, $10, $11)
     RETURNING ${KNOWLEDGE_COLS}`,
    [f.type, f.title, f.content, f.url, f.country, f.region, f.tags, f.testado, autor.name, revisarEmPadrao(f.type), autor.email],
  )
  return rows[0] as KnowledgeItem
}

export async function updateKnowledge(id: string, f: KnowledgeFields, versaoEsperada: number, by: Autor): Promise<Fail | { ok: true; item: KnowledgeItem }> {
  const client = await db.connect()
  try {
    await client.sql`BEGIN`
    const { rows: cur } = await client.sql`SELECT * FROM tdg_destination_knowledge WHERE id = ${id} FOR UPDATE`
    const before = cur[0]
    if (!before || before.status === 'arquivado') { await client.sql`ROLLBACK`; return { ok: false, status: 404, error: 'Item não encontrado' } }
    if (Number(before.versao) !== versaoEsperada) {
      await client.sql`ROLLBACK`
      return { ok: false, status: 409, error: 'Alguém editou este item antes de você. Recarregue pra ver a versão nova.' }
    }
    await client.query(
      `INSERT INTO tdg_conteudo_versoes (entidade, entidade_id, versao, snapshot, editado_por) VALUES ('knowledge', $1, $2, $3::jsonb, $4)`,
      [id, before.versao, JSON.stringify(before), by.email],
    )
    const { rows } = await client.query(
      `UPDATE tdg_destination_knowledge
          SET type = $2, title = $3, content = $4, url = $5, country = $6, region = $7, tags = $8, testado = $9,
              revisar_em = $10, versao = versao + 1, updated_at = now(), updated_by = $11
        WHERE id = $1 RETURNING ${KNOWLEDGE_COLS}`,
      [id, f.type, f.title, f.content, f.url, f.country, f.region, f.tags, f.testado, revisarEmPadrao(f.type), by.email],
    )
    await client.sql`COMMIT`
    return { ok: true, item: rows[0] as KnowledgeItem }
  } catch (err) {
    await client.sql`ROLLBACK`.catch(() => undefined)
    throw err
  } finally {
    client.release()
  }
}

/* Arquiva: quem escreveu (nome do autor bate com a conta) ou admin. */
export async function arquivarKnowledge(id: string, by: Autor, isAdmin: boolean): Promise<Fail | { ok: true }> {
  const { rows } = await sql`SELECT source_author, updated_by, status FROM tdg_destination_knowledge WHERE id = ${id}`
  if (!rows[0] || rows[0].status === 'arquivado') return { ok: false, status: 404, error: 'Item não encontrado' }
  const isAuthor = rows[0].source_author === by.name || rows[0].updated_by === by.email
  if (!isAuthor && !isAdmin) return { ok: false, status: 403, error: 'Só quem escreveu ou o admin arquiva' }
  await sql`UPDATE tdg_destination_knowledge SET status = 'arquivado', arquivado_em = now(), arquivado_por = ${by.email} WHERE id = ${id}`
  return { ok: true }
}

export type KnowledgeVersion = { versao: number; editado_por: string; editado_em: string; snapshot: Record<string, unknown> }

export async function listKnowledgeVersoes(id: string): Promise<KnowledgeVersion[]> {
  const { rows } = await sql`
    SELECT versao, editado_por, editado_em::text AS editado_em, snapshot FROM tdg_conteudo_versoes
     WHERE entidade = 'knowledge' AND entidade_id = ${id} ORDER BY versao DESC`
  return rows as KnowledgeVersion[]
}

/* Busca pro Max e pro Modo Flow: destino, título, conteúdo ou tag, sem
   acento (sem a extensão unaccent no Neon — translate() cobre o português).
   Devolve autor, data, testado e se pode estar desatualizado — o agente
   cita isso na resposta. */
const FOLD_FROM = 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ'
const FOLD_TO = 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
const fold = (col: string) => `lower(translate(coalesce(${col}, ''), '${FOLD_FROM}', '${FOLD_TO}'))`

export async function searchKnowledge(query: string, type: string | undefined, limit = 10): Promise<KnowledgeItem[]> {
  const q = `%${query.trim().toLowerCase()}%`
  const { rows } = await sql.query(
    `SELECT ${KNOWLEDGE_COLS} FROM tdg_destination_knowledge
      WHERE status = 'publicado'
        AND ($2::text IS NULL OR type = $2)
        AND (${fold('country')} LIKE ${fold('$1')} OR ${fold('region')} LIKE ${fold('$1')}
             OR ${fold('title')} LIKE ${fold('$1')} OR ${fold('content')} LIKE ${fold('$1')}
             OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE ${fold('t')} LIKE ${fold('$1')}))
      ORDER BY (testado IS TRUE) DESC, source_date DESC NULLS LAST
      LIMIT $3`,
    [q, type ?? null, Math.min(Math.max(limit, 1), 30)],
  )
  return rows as KnowledgeItem[]
}
