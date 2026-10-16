/* Contatos — vocabulário compartilhado entre lente Contatos, ficha do
   fornecedor e API (16/10/2026). Categoria de pessoa ↔ tipo de fornecedor:
   quando a pessoa chega com organização e a categoria é de fornecedor de
   viagem, o Flow cria (ou acha) o card do fornecedor e vincula — pedido da
   Carla: cartão de DMC lido pela câmera precisa virar card de DMC. */

export const CONTACT_CATEGORIES: { key: string; label: string; color: string; bg: string }[] = [
  { key: 'hotel',      label: 'Hotel',      color: '#005F63', bg: '#E0F4F5' },
  { key: 'dmc',        label: 'DMC',        color: '#1D4ED8', bg: '#DBEAFE' },
  { key: 'guia',       label: 'Guia',       color: '#0369a1', bg: '#e0f2fe' },
  { key: 'operadora',  label: 'Operadora',  color: '#6d28d9', bg: '#ede9fe' },
  { key: 'transfer',   label: 'Transfer',   color: '#b45309', bg: '#fef3c7' },
  { key: 'aérea',      label: 'Aérea',      color: '#0e7490', bg: '#cffafe' },
  { key: 'serviço',    label: 'Serviço',    color: '#047857', bg: '#d1fae5' },
  { key: 'hospedagem', label: 'Hospedagem', color: '#15803d', bg: '#dcfce7' },
  { key: 'fornecedor', label: 'Fornecedor', color: '#475569', bg: '#f1f5f9' },
  { key: 'jurídico',   label: 'Jurídico',   color: '#b91c1c', bg: '#fee2e2' },
  { key: 'tradução',   label: 'Tradução',   color: '#92400e', bg: '#fef3c7' },
  { key: 'médico',     label: 'Médico',     color: '#9d174d', bg: '#fce7f3' },
]

// Categorias que uma pessoa avulsa pode escolher ao se cadastrar. "hotel",
// "transfer", "hospedagem" e "fornecedor" como categoria manual continuam
// fora (entity_type já tipifica) — mas quem escolhe DMC/guia/hospedagem com
// organização ganha o card do fornecedor automaticamente.
export const PERSON_CATEGORY_KEYS = ['dmc', 'guia', 'operadora', 'hospedagem', 'transfer', 'aérea', 'serviço', 'jurídico', 'tradução', 'médico'] as const
export const PERSON_CATEGORIES = PERSON_CATEGORY_KEYS.map(k => CONTACT_CATEGORIES.find(c => c.key === k)!)

/* Categoria de pessoa → tipo de fornecedor que ganha card. Aérea, jurídico,
   tradução e médico são pessoas/serviços, não fornecedor de viagem: nunca
   viram card. Operadora e serviço entram como 'other' até existir tipo próprio. */
export const CATEGORY_TO_ENTITY: Record<string, string> = {
  hospedagem: 'hotel', hotel: 'hotel', dmc: 'dmc', guia: 'guide', transfer: 'transfer', operadora: 'other', fornecedor: 'other', serviço: 'other',
}
export const ENTITY_TO_CATEGORY: Record<string, string> = {
  hotel: 'hotel', dmc: 'dmc', guide: 'guia', transfer: 'transfer', restaurant: 'fornecedor', beach_club: 'fornecedor', other: 'fornecedor', roteiro: 'fornecedor',
}

export const SOURCE_KINDS = ['feira', 'indicacao', 'reuniao', 'viagem', 'whatsapp', 'site', 'outro'] as const
export type SourceKind = (typeof SOURCE_KINDS)[number]
export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  feira: 'Feira', indicacao: 'Indicação', reuniao: 'Reunião comercial', viagem: 'Viagem / FAM trip', whatsapp: 'Grupo de WhatsApp', site: 'Site / pesquisa', outro: 'Outro',
}

export function parseSource(body: Record<string, unknown>): { ok: true; source_kind: SourceKind | null; source_detail: string | null } | { ok: false; error: string } {
  const kind = body.source_kind === undefined || body.source_kind === null || body.source_kind === '' ? null : body.source_kind
  if (kind !== null && !(SOURCE_KINDS as readonly unknown[]).includes(kind)) return { ok: false, error: 'fonte inválida' }
  const detail = typeof body.source_detail === 'string' ? body.source_detail.trim().slice(0, 200) : ''
  return { ok: true, source_kind: kind as SourceKind | null, source_detail: detail || null }
}
