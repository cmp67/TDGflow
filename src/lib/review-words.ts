/* As palavras de quem registrou — nunca editadas (crítica da rede, 18/10/2026:
   "a IA melhora/edita o que a gente disse"). Tudo que a pessoa digitou ou
   falou fica em raw_answers; esta função devolve isso em ordem, com rótulo,
   pra ser o conteúdo principal do card. O que a IA derivou (highlights,
   client_profile...) é resumo automático, secundário e rotulado. */

const LABELS: [key: string, label: string][] = [
  ['impressions', 'Como foi'],
  ['client_said', 'O que o cliente contou'],
  ['why_it_matters', 'Por que chamou atenção'],
  ['client_profile', 'Para quem'],
  ['must_experience', 'Imperdível'],
  ['heads_up', 'Ressalva'],
  ['notes', 'Notas'],
]

export type OwnWords = { key: string; label: string; text: string }

export function ownWords(raw: unknown): OwnWords[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
  const r = raw as Record<string, unknown>
  const out: OwnWords[] = []
  for (const [key, label] of LABELS) {
    const v = r[key]
    if (typeof v === 'string' && v.trim()) out.push({ key, label, text: v.trim() })
  }
  return out
}

/* O trecho principal (o primeiro campo livre), pra lista compacta. */
export function ownWordsLead(raw: unknown): string | null {
  return ownWords(raw)[0]?.text ?? null
}

export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] || 'quem registrou'
}
