/* Agenda da rede — vocabulário, validação e formatação, sem banco (vale no
   navegador e no Max). Decisão da Carla 18/10/2026. Horários sempre
   exibidos em Brasília; guardados em UTC. */

export const EVENT_TYPES = ['treinamento', 'feira', 'webinar', 'reuniao', 'famtrip', 'prazo', 'outro'] as const
export type EventType = (typeof EVENT_TYPES)[number]
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  treinamento: 'Treinamento', feira: 'Feira', webinar: 'Webinar', reuniao: 'Reunião da rede', famtrip: 'FAM trip', prazo: 'Prazo', outro: 'Outro',
}
export const MODALITIES = ['online', 'presencial'] as const
export type Modality = (typeof MODALITIES)[number]
export const RSVP_STATUSES = ['vou', 'talvez', 'nao'] as const
export type RsvpStatus = (typeof RSVP_STATUSES)[number]
export const RSVP_LABELS: Record<RsvpStatus, string> = { vou: 'Vou', talvez: 'Talvez', nao: 'Não vou' }

export const TZ = 'America/Sao_Paulo'

export type EventFields = {
  title: string
  type: EventType
  starts_at: string           // ISO
  ends_at: string | null      // ISO
  all_day: boolean
  modality: Modality | null
  location: string | null
  link: string | null
  description: string | null
  hotel_id: string | null
  visibility: 'rede' | 'agencia'
}

export type EventRow = EventFields & {
  id: string
  agency_id: string | null
  created_by: string
  created_by_name: string
  created_via: 'flow' | 'max'
  created_at: string
  cancelled_at: string | null
  rsvp_vou: number
  rsvp_talvez: number
  my_rsvp: RsvpStatus | null
  can_edit: boolean
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const text = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim().replace(/\s+/g, ' ')
  return t && t.length <= max ? t : null
}

/* Data/hora de entrada: ISO completo ("2026-10-28T15:00:00-03:00"), ou
   "AAAA-MM-DD" (vira dia inteiro, meia-noite de Brasília), ou
   "AAAA-MM-DD HH:MM" em Brasília. */
export function parseWhen(v: unknown): { iso: string; allDay: boolean } | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  let m = s.match(/^(\d{4}-\d{2}-\d{2})$/)
  if (m) return isValid(`${m[1]}T00:00:00-03:00`) ? { iso: new Date(`${m[1]}T00:00:00-03:00`).toISOString(), allDay: true } : null
  m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})$/)
  if (m) return isValid(`${m[1]}T${m[2]}:${m[3]}:00-03:00`) ? { iso: new Date(`${m[1]}T${m[2]}:${m[3]}:00-03:00`).toISOString(), allDay: false } : null
  if (isValid(s)) return { iso: new Date(s).toISOString(), allDay: false }
  return null
}
function isValid(s: string): boolean { const d = new Date(s); return !Number.isNaN(d.getTime()) }

export type EventParse = { ok: true; fields: EventFields } | { ok: false; error: string }

export function parseEvent(body: Record<string, unknown>): EventParse {
  const title = text(body.title, 160)
  if (!title || title.length < 3) return { ok: false, error: 'Título deve ter entre 3 e 160 caracteres' }
  const type = (body.type ?? 'outro') as EventType
  if (!EVENT_TYPES.includes(type)) return { ok: false, error: 'Tipo inválido' }
  const start = parseWhen(body.starts_at)
  if (!start) return { ok: false, error: 'Informe quando começa (data ou data e hora)' }
  let ends: string | null = null
  if (body.ends_at !== undefined && body.ends_at !== null && body.ends_at !== '') {
    const e = parseWhen(body.ends_at)
    if (!e) return { ok: false, error: 'Data de fim inválida' }
    if (e.iso < start.iso) return { ok: false, error: 'O fim não pode ser antes do começo' }
    ends = e.iso
  }
  const allDay = body.all_day === true || (body.all_day === undefined && start.allDay)
  const modality = body.modality === undefined || body.modality === null || body.modality === '' ? null : body.modality
  if (modality !== null && !MODALITIES.includes(modality as Modality)) return { ok: false, error: 'Modalidade deve ser online ou presencial' }
  let link: string | null = null
  if (body.link !== undefined && body.link !== null && body.link !== '') {
    link = text(body.link, 2000)
    if (!link || !/^https?:\/\/\S+$/i.test(link)) return { ok: false, error: 'Link deve começar com http:// ou https://' }
  }
  const location = body.location === undefined || body.location === null || body.location === '' ? null : text(body.location, 300)
  const description = body.description === undefined || body.description === null || body.description === '' ? null : (typeof body.description === 'string' ? body.description.trim().slice(0, 4000) : null)
  const hotel_id = typeof body.hotel_id === 'string' && UUID_RE.test(body.hotel_id) ? body.hotel_id : null
  const visibility = body.visibility === 'agencia' ? 'agencia' : 'rede'
  return { ok: true, fields: { title, type, starts_at: start.iso, ends_at: ends, all_day: allDay, modality: modality as Modality | null, location, link, description, hotel_id, visibility } }
}

/* ── formatação (Brasília) ─────────────────────────────────────────── */
const fmtDate = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' })
const fmtWeekday = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'short' })
const fmtTime = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })

export function brDate(iso: string): string { return fmtDate.format(new Date(iso)) }
export function brTime(iso: string): string { return fmtTime.format(new Date(iso)) }
export function brWeekday(iso: string): string { return fmtWeekday.format(new Date(iso)).replace('.', '') }

/* "AAAA-MM-DD" de um instante, em Brasília. */
export function brDay(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/* Linha de evento pro WhatsApp: "ter 28/10 · 15:00 — Treinamento Six Senses (online) · 4 confirmadas" */
export function eventLine(e: Pick<EventRow, 'title' | 'type' | 'starts_at' | 'all_day' | 'modality' | 'location' | 'link' | 'rsvp_vou'>): string {
  const when = e.all_day ? `${brWeekday(e.starts_at)} ${brDate(e.starts_at)}` : `${brWeekday(e.starts_at)} ${brDate(e.starts_at)} · ${brTime(e.starts_at)}`
  const where = e.modality === 'online' ? ' (online)' : e.location ? ` (${e.location})` : ''
  const who = e.rsvp_vou > 0 ? ` · ${e.rsvp_vou} confirmada${e.rsvp_vou > 1 ? 's' : ''}` : ''
  return `${when} — *${e.title}*${where}${who}${e.link ? `\n${e.link}` : ''}`
}

export function agendaMessage(title: string, events: Parameters<typeof eventLine>[0][], empty: string | null): string | null {
  if (events.length === 0) return empty
  return `*${title}*\n\n${events.map(eventLine).join('\n')}`
}
