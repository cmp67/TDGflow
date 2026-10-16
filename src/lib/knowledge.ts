/* TDG Knowledge Base — vocabulário e validação, sem banco (importável pelo
   navegador). Evolução de 16/10/2026 (decisão da Carla: as peças do Acervo
   do Trip entram na tabela que já existe, nunca um segundo acervo).

   Todo item diz ONDE (país/região), O QUÊ (tipo fechado), QUEM E QUANDO
   (autor e data), se foi TESTADO pela rede ou é indicação A TESTAR, e ATÉ
   QUANDO VALE (revisar_em — passou, aparece "pode estar desatualizado"). */

export const KNOWLEDGE_TYPES = ['fact', 'note', 'link', 'aviso', 'roteiro'] as const
export type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number]
export const KNOWLEDGE_TYPE_LABELS: Record<KnowledgeType, string> = {
  fact: 'Fato',
  note: 'Dica',
  link: 'Link',
  aviso: 'Aviso',
  roteiro: 'Roteiro de referência',
}

// Prazo de revisão por tipo (meses) — aviso muda rápido; roteiro, devagar.
export const REVISAO_MESES: Record<KnowledgeType, number> = { aviso: 6, fact: 12, note: 12, link: 12, roteiro: 24 }

const TITLE_MIN = 3
const TITLE_MAX = 160
const CONTENT_MAX = 8000
const URL_MAX = 2000
const COUNTRY_MAX = 80
const TAG_MAX = 40

export type KnowledgeFields = {
  type: KnowledgeType
  title: string
  content: string | null
  url: string | null
  country: string | null
  region: string | null
  tags: string[]
  testado: boolean | null
}

export type KnowledgeItem = KnowledgeFields & {
  id: string
  source_author: string
  source_date: string
  import_approval: string | null
  revisar_em: string | null
  vencido: boolean
  status: 'publicado' | 'arquivado'
  versao: number
  updated_at: string
  updated_by: string | null
}

/* Mesmo dia N meses depois; se o mês de chegada for mais curto, último dia
   dele (31/08 + 6 meses = 28/02, não 03/03). */
export function revisarEmPadrao(type: KnowledgeType, from = new Date()): string {
  const y = from.getUTCFullYear()
  const m = from.getUTCMonth() + REVISAO_MESES[type]
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const d = new Date(Date.UTC(y, m, Math.min(from.getUTCDate(), lastDay)))
  return d.toISOString().slice(0, 10)
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  return v && v.length <= max ? v : null
}

export type KnowledgeParse = { ok: true; fields: KnowledgeFields } | { ok: false; error: string }

export function parseKnowledgeItem(body: Record<string, unknown>): KnowledgeParse {
  const type = (body.type ?? 'note') as KnowledgeType
  if (!KNOWLEDGE_TYPES.includes(type)) return { ok: false, error: 'tipo deve ser fato, dica, link, aviso ou roteiro' }

  const title = text(body.title, TITLE_MAX)?.replace(/\s+/g, ' ') ?? null
  if (!title || title.length < TITLE_MIN) return { ok: false, error: `Título deve ter entre ${TITLE_MIN} e ${TITLE_MAX} caracteres` }

  const rawContent = body.content
  const content = rawContent === undefined || rawContent === null || rawContent === '' ? null : text(rawContent, CONTENT_MAX)
  if (rawContent && !content) return { ok: false, error: `Conteúdo passa de ${CONTENT_MAX} caracteres` }

  let url: string | null = null
  if (body.url !== undefined && body.url !== null && body.url !== '') {
    url = text(body.url, URL_MAX)
    if (!url || !/^https?:\/\/\S+$/i.test(url)) return { ok: false, error: 'Link deve começar com http:// ou https://' }
  }
  if (type === 'link' && !url) return { ok: false, error: 'Um item do tipo link precisa do link' }
  if (!content && !url) return { ok: false, error: 'Escreva o conteúdo ou informe um link' }

  const country = body.country === undefined || body.country === null || body.country === '' ? null : (text(body.country, COUNTRY_MAX) ?? null)
  const region = body.region === undefined || body.region === null || body.region === '' ? null : (text(body.region, COUNTRY_MAX) ?? null)

  const tags = Array.isArray(body.tags)
    ? Array.from(new Set((body.tags as unknown[]).map(t => String(t).trim().toLowerCase()).filter(t => t && t.length <= TAG_MAX)))
    : []

  const testado = body.testado === true ? true : body.testado === false ? false : null

  return { ok: true, fields: { type, title, content, url, country, region, tags, testado } }
}

export function isVencido(revisarEm: string | null | undefined, today: string): boolean {
  return !!revisarEm && revisarEm < today
}
