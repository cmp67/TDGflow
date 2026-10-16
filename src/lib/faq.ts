/* "Como faço" (porte do Trip Flow, 16/10/2026): vocabulário e validação,
   sem banco — pode ser importado pelo navegador. A Carla escreve, a rede lê.
   Guardado no banco (edita pela tela, sem deploy — diferente da Wiki, que
   continua como está). Slug estável = URL pro WhatsApp. tdg_faq_requests é
   o motor de vida: "não achei o que procurava" vira rascunho pra responder. */

export const FAQ_AREAS = ['fornecedores', 'dicas', 'conhecimento', 'ofertas', 'lumis', 'conta', 'geral', 'glossario'] as const
export type FaqArea = typeof FAQ_AREAS[number]
export const FAQ_AREA_LABELS: Record<FaqArea, string> = {
  fornecedores: 'Fornecedores',
  dicas: 'Na prática',
  conhecimento: 'TDG Knowledge Base',
  ofertas: 'Ofertas',
  lumis: 'Lumis e assinatura',
  conta: 'Conta e acesso',
  geral: 'Geral',
  glossario: 'Glossário',
}
export const GLOSSARY_AREA: FaqArea = 'glossario'

export type FaqItem = {
  id: string
  slug: string
  pergunta: string
  resposta_md: string
  area: FaqArea
  ordem: number
  publicado: boolean
  updated_at: string
}

export type FaqRequest = {
  id: string
  pergunta: string
  contexto: string | null
  status: 'aberta' | 'respondida' | 'descartada'
  created_by: string
  created_at: string
}

const MAX_PERGUNTA = 200
const MAX_RESPOSTA = 20000
const MAX_CONTEXTO = 200

/* Slug estável: vira a URL que a Carla cola no WhatsApp. Só se gera na
   criação; depois nunca muda, mesmo que a pergunta seja reescrita. */
export function slugify(text: string): string {
  const base = text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
  return base || 'pergunta'
}

export type FaqItemInput = { pergunta: string; resposta_md: string; area: FaqArea; publicado: boolean; ordem: number }
export type FaqItemParse = { ok: true; fields: FaqItemInput } | { ok: false; error: string }

export function parseFaqItem(body: Record<string, unknown>): FaqItemParse {
  const pergunta = typeof body.pergunta === 'string' ? body.pergunta.trim() : ''
  if (!pergunta) return { ok: false, error: 'Escreva a pergunta.' }
  if (pergunta.length > MAX_PERGUNTA) return { ok: false, error: `A pergunta passa de ${MAX_PERGUNTA} caracteres.` }

  const resposta = typeof body.resposta_md === 'string' ? body.resposta_md.trim() : ''
  if (!resposta) return { ok: false, error: 'Escreva a resposta.' }
  if (resposta.length > MAX_RESPOSTA) return { ok: false, error: 'A resposta é longa demais.' }

  const area = body.area
  if (!(FAQ_AREAS as readonly unknown[]).includes(area)) return { ok: false, error: 'Escolha a área.' }

  const publicado = body.publicado === undefined ? true : body.publicado
  if (typeof publicado !== 'boolean') return { ok: false, error: 'publicado deve ser true/false' }

  const ordemRaw = body.ordem === undefined || body.ordem === null || body.ordem === '' ? 0 : Number(body.ordem)
  if (!Number.isInteger(ordemRaw) || ordemRaw < 0 || ordemRaw > 9999) return { ok: false, error: 'ordem inválida' }

  return { ok: true, fields: { pergunta, resposta_md: resposta, area: area as FaqArea, publicado, ordem: ordemRaw } }
}

export type FaqRequestParse = { ok: true; pergunta: string; contexto: string | null } | { ok: false; error: string }

export function parseFaqRequest(body: Record<string, unknown>): FaqRequestParse {
  const pergunta = typeof body.pergunta === 'string' ? body.pergunta.trim() : ''
  if (pergunta.length < 5) return { ok: false, error: 'Descreva a dúvida com um pouco mais de detalhe.' }
  if (pergunta.length > MAX_PERGUNTA) return { ok: false, error: `A pergunta passa de ${MAX_PERGUNTA} caracteres.` }
  const contexto = typeof body.contexto === 'string' ? body.contexto.trim().slice(0, MAX_CONTEXTO) : ''
  return { ok: true, pergunta, contexto: contexto || null }
}

/* Busca da tela: sem acento, minúsculo, casa pergunta e resposta. Lista é
   pequena — nada de índice, nada de endpoint. */
export function foldFaq(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function matchesFaq(item: Pick<FaqItem, 'pergunta' | 'resposta_md'>, query: string): boolean {
  const q = foldFaq(query.trim())
  if (!q) return true
  return foldFaq(item.pergunta).includes(q) || foldFaq(item.resposta_md).includes(q)
}

/* Índice compacto pro Assistente: ele precisa saber SE existe resposta
   antes de tentar responder — e nunca deduzir do sistema. */
export function faqIndexForPrompt(items: Pick<FaqItem, 'slug' | 'pergunta' | 'area'>[]): string {
  if (items.length === 0) return '(nenhum item ainda)'
  return items.map(i => `- [${FAQ_AREA_LABELS[i.area]}] ${i.pergunta} (slug: ${i.slug})`).join('\n')
}
