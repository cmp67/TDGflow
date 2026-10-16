/* Estado operacional do fornecedor (porte do Trip Flow, 16/10/2026): em
   operação, fechado para reforma (com data prevista de reabertura) ou
   fechado definitivamente (com motivo). Regras puras, sem banco — espelham
   os CHECKs da migration 026. */

export const OPERATIONAL_STATUSES = ['ativo', 'reforma', 'fechado'] as const
export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number]

export const OPERATIONAL_STATUS_LABELS: Record<OperationalStatus, string> = {
  ativo: 'Em operação',
  reforma: 'Fechado para reforma',
  fechado: 'Fechado definitivamente',
}
/* Curto, pro selo no card, onde não cabe frase. */
export const OPERATIONAL_STATUS_SHORT: Record<OperationalStatus, string> = {
  ativo: 'Em operação',
  reforma: 'Em reforma',
  fechado: 'Fechado',
}

export type OperationalFields = {
  operational_status: OperationalStatus
  operational_note: string | null
  reopening_expected: string | null
}

export type OperationalParse = { ok: true; fields: OperationalFields } | { ok: false; error: string }

const MAX_NOTE = 500

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value)
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function parseOperational(body: Record<string, unknown>, today: string): OperationalParse {
  const status = body.operational_status
  if (!OPERATIONAL_STATUSES.includes(status as OperationalStatus)) {
    return { ok: false, error: 'operational_status deve ser ativo, reforma ou fechado' }
  }

  const rawNote = body.operational_note
  if (rawNote !== undefined && rawNote !== null && typeof rawNote !== 'string') {
    return { ok: false, error: 'operational_note deve ser texto' }
  }
  const note = typeof rawNote === 'string' ? rawNote.trim() : ''
  if (note.length > MAX_NOTE) return { ok: false, error: `operational_note passa de ${MAX_NOTE} caracteres` }

  const rawDate = body.reopening_expected
  const reopening = rawDate === undefined || rawDate === null || rawDate === '' ? null : rawDate

  if (status === 'reforma') {
    if (!isIsoDate(reopening)) return { ok: false, error: 'Informe a data prevista de reabertura (AAAA-MM-DD).' }
    // Previsão no passado não é previsão. Depois de gravada ela pode vencer —
    // aí a tela sinaliza, mas nunca muda o estado sozinha.
    if (reopening < today) return { ok: false, error: 'A data prevista de reabertura já passou.' }
  }
  if (status === 'fechado' && !note) {
    return { ok: false, error: 'Diga o que aconteceu: fechou, foi vendido, mudou de bandeira?' }
  }

  return {
    ok: true,
    fields: {
      operational_status: status as OperationalStatus,
      // Ao voltar a operar, motivo e previsão antigos não valem mais.
      operational_note: status === 'ativo' ? null : note || null,
      reopening_expected: status === 'reforma' ? (reopening as string) : null,
    },
  }
}

/* Reforma cuja previsão de reabertura já passou. É sinal pra alguém ligar e
   confirmar — não prova que reabriu. */
export function reopeningOverdue(
  status: OperationalStatus | null | undefined,
  reopening: string | null | undefined,
  today: string,
): boolean {
  return status === 'reforma' && !!reopening && reopening < today
}
