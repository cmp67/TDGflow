/* Data de origem do card (Carla, 19/10/2026): todo card diz de quando é.
   Visita registrada → mês da visita. Relato importado do grupo → dia em que
   a pessoa falou no WhatsApp. Sem nenhum dos dois → dia do registro no Flow.
   Datas só-dia (YYYY-MM-DD) são lidas ao meio-dia UTC pra não voltar um dia
   no fuso de Brasília. */
export interface ReviewOriginFields {
  visit_date: string | null
  source?: string | null
  source_date?: string | null
  created_at: string
}

const TZ = 'America/Sao_Paulo'

function asDate(iso: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00Z`) : new Date(iso)
}

function fmt(iso: string, withDay: boolean): string {
  const d = asDate(iso)
  if (Number.isNaN(d.getTime())) return ''
  const opts: Intl.DateTimeFormatOptions = withDay
    ? { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }
    : { month: 'short', year: 'numeric', timeZone: TZ }
  return d.toLocaleDateString('pt-BR', opts).replace(/ de /g, ' ')
}

export function originDateLabel(r: ReviewOriginFields): string {
  if (r.visit_date) return `visita em ${fmt(r.visit_date, false)}`
  if (r.source === 'whatsapp_import' && r.source_date) return `no grupo em ${fmt(r.source_date, true)}`
  return `registrado em ${fmt(r.created_at, true)}`
}
