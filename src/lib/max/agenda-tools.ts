/* Ferramentas de agenda do Max (18/10/2026): registrar evento quando
   marcado, listar o que vem, confirmar presença. Só o Max usa (não entram
   no MCP nem no Modo Flow por ora). register_event/rsvp_event exigem
   identidade pelo telefone — saem em nome de quem fala. */
import type Anthropic from '@anthropic-ai/sdk'
import { parseEvent, EVENT_TYPES, RSVP_STATUSES, eventLine, type RsvpStatus } from '@/lib/events'
import { createEvent, networkEventsOnDays, setRsvp, todayBr, addDays, getEvent } from '@/lib/events-db'
import type { MaxUser } from '@/lib/max/identity'

export const AGENDA_TOOLS: Anthropic.Tool[] = [
  {
    name: 'list_events',
    description: 'Agenda da rede TDG: eventos dos próximos dias (treinamentos, feiras, webinars, reuniões, FAM trips, prazos), com data/hora em Brasília, quantas pessoas confirmaram e o id de cada evento (necessário pra rsvp_event). Use para "o que tem essa semana?", "quando é o treinamento X?".',
    input_schema: { type: 'object' as const, properties: { days: { type: 'number', description: 'Quantos dias à frente (padrão 14, máximo 60)' } } },
  },
  {
    name: 'register_event',
    description: 'Registra um evento na agenda da rede em nome de quem está falando. SEMPRE confirme com a pessoa antes de chamar (título, data/hora, online ou presencial). Data no formato "AAAA-MM-DD HH:MM" em horário de Brasília, ou "AAAA-MM-DD" para dia inteiro.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' }, type: { type: 'string', enum: [...EVENT_TYPES] },
        starts_at: { type: 'string', description: '"AAAA-MM-DD HH:MM" (Brasília) ou "AAAA-MM-DD"' }, ends_at: { type: 'string', description: 'opcional, mesmo formato' },
        modality: { type: 'string', enum: ['online', 'presencial'] }, location: { type: 'string', description: 'endereço/cidade, se presencial' },
        link: { type: 'string', description: 'link de reunião ou inscrição, se houver (http...)' }, description: { type: 'string' },
      },
      required: ['title', 'starts_at'],
    },
  },
  {
    name: 'rsvp_event',
    description: 'Marca a presença de quem está falando num evento da agenda (vou / talvez / nao). Pegue o event_id em list_events.',
    input_schema: { type: 'object' as const, properties: { event_id: { type: 'string' }, status: { type: 'string', enum: [...RSVP_STATUSES] } }, required: ['event_id', 'status'] },
  },
]
export const AGENDA_TOOL_NAMES = new Set(AGENDA_TOOLS.map(t => t.name))
export function isAgendaTool(name: string): boolean { return AGENDA_TOOL_NAMES.has(name) }

export async function callAgendaTool(user: MaxUser | null, name: string, args: Record<string, unknown>): Promise<unknown> {
  if (name === 'list_events') {
    const days = Math.min(Math.max(Number(args.days) || 14, 1), 60)
    const today = todayBr()
    const events = await networkEventsOnDays(today, addDays(today, days))
    return { total: events.length, events: events.map(e => ({ id: e.id, quando: eventLine({ ...e, link: null }), tipo: e.type, link: e.link, confirmadas: e.rsvp_vou, criado_por: e.created_by_name })), abrir_em: '/flow/agenda' }
  }
  if (!user) return { success: false, error: 'Só dá pra registrar ou confirmar presença com o WhatsApp cadastrado no Flow.' }
  if (name === 'register_event') {
    const parsed = parseEvent({ ...args, visibility: 'rede' })
    if (!parsed.ok) return { success: false, error: parsed.error }
    const event = await createEvent(parsed.fields, { email: user.email, name: user.name, agencyId: user.agency_id ?? null }, 'max')
    return { success: true, event: { id: event.id, quando: eventLine(event) }, abrir_em: '/flow/agenda' }
  }
  if (name === 'rsvp_event') {
    const id = typeof args.event_id === 'string' ? args.event_id : ''
    const status = args.status as RsvpStatus
    if (!RSVP_STATUSES.includes(status)) return { success: false, error: 'status deve ser vou, talvez ou nao' }
    const ev = await getEvent(id, null)
    if (!ev || ev.cancelled_at) return { success: false, error: 'Evento não encontrado' }
    await setRsvp(id, user.id, status)
    return { success: true, event: ev.title, status }
  }
  return { error: `ferramenta desconhecida: ${name}` }
}
