import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/events-db', async (orig) => ({ ...(await orig<typeof import('@/lib/events-db')>()), getEvent: vi.fn(), updateEvent: vi.fn(), cancelEvent: vi.fn() }))

import { callAgendaTool, mergeEventEdit, AGENDA_TOOLS } from './agenda-tools'
import { getEvent, updateEvent, cancelEvent } from '@/lib/events-db'

const m = <T,>(f: T) => f as unknown as ReturnType<typeof vi.fn>
const user = { id: 'u1', name: 'Carla', email: 'c@x', agency_name: 'TDG', agency_id: 'a1', role: 'user', active: true }
const ev = { id: 'e1', title: 'Festa 5 anos TDG', type: 'outro', starts_at: '2026-10-22T22:00:00.000Z', ends_at: null, all_day: false, modality: 'presencial', location: 'Rua Errada, 1', link: null, description: null, hotel_id: null, visibility: 'rede', cancelled_at: null, can_edit: true, rsvp_vou: 0 }

describe('Max edita e cancela evento (Carla errou o endereço, 19/10/2026)', () => {
  beforeEach(() => vi.clearAllMocks())
  it('as ferramentas existem', () => {
    expect(AGENDA_TOOLS.map(t => t.name)).toEqual(expect.arrayContaining(['update_event', 'cancel_event']))
  })
  it('edição parcial mantém o resto do evento como estava', () => {
    const body = mergeEventEdit(ev as never, { location: 'Rua Mariana Correira, 433' })
    expect(body).toMatchObject({ title: 'Festa 5 anos TDG', starts_at: '2026-10-22T22:00:00.000Z', all_day: false, modality: 'presencial', location: 'Rua Mariana Correira, 433', visibility: 'rede' })
  })
  it('nova data em formato Brasília substitui a anterior', () => {
    expect(mergeEventEdit(ev as never, { starts_at: '2026-10-23 20:00' })).toMatchObject({ starts_at: '2026-10-23 20:00' })
  })
  it('update_event grava com as regras de permissão da Agenda', async () => {
    m(getEvent).mockResolvedValue(ev)
    m(updateEvent).mockResolvedValue({ ok: true, event: { ...ev, location: 'Rua Mariana Correira, 433' } })
    const r = await callAgendaTool(user, 'update_event', { event_id: 'e1', location: 'Rua Mariana Correira, 433' }) as Record<string, unknown>
    expect(r.success).toBe(true)
    expect(m(updateEvent).mock.calls[0][1]).toMatchObject({ location: 'Rua Mariana Correira, 433', title: 'Festa 5 anos TDG' })
    expect(m(updateEvent).mock.calls[0][2]).toMatchObject({ id: 'u1', email: 'c@x', isAdmin: false })
  })
  it('quem não criou recebe a recusa da Agenda', async () => {
    m(getEvent).mockResolvedValue({ ...ev, can_edit: false })
    m(updateEvent).mockResolvedValue({ ok: false, status: 403, error: 'Só quem criou o evento (ou admin) edita' })
    expect(await callAgendaTool(user, 'update_event', { event_id: 'e1', location: 'x' })).toEqual({ success: false, error: 'Só quem criou o evento (ou admin) edita' })
  })
  it('cancel_event cancela', async () => {
    m(cancelEvent).mockResolvedValue({ ok: true })
    expect(await callAgendaTool(user, 'cancel_event', { event_id: 'e1' })).toMatchObject({ success: true })
  })
  it('sem identidade não edita', async () => {
    expect(await callAgendaTool(null, 'update_event', { event_id: 'e1' })).toMatchObject({ success: false })
  })
})
