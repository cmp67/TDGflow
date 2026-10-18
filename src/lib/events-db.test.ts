import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'
import { createEvent, listEvents, updateEvent, cancelEvent, setRsvp, listRsvps, networkEventsOnDays, addDays } from './events-db'
import type { EventFields } from './events'

const suffix = Date.now()
const ids: string[] = []
let agencyId: string, userA: { id: string; email: string }, userB: { id: string; email: string }

const base: EventFields = { title: `__TDD Treinamento ${suffix}`, type: 'treinamento', starts_at: '2027-03-10T18:00:00.000Z', ends_at: null, all_day: false, modality: 'online', location: null, link: 'https://meet.google.com/x', description: null, hotel_id: null, visibility: 'rede' }

beforeAll(async () => {
  agencyId = (await sql`INSERT INTO tdg_agencies (name, cnpj) VALUES (${`__TDD Agenda ${suffix}__`}, ${`77.000.000/${String(suffix).slice(-4)}-00`}) RETURNING id`).rows[0].id
  const a = await sql`INSERT INTO tdg_users (name, email, agency_name, password_hash, role, agency_id) VALUES ('TDD Agenda A', ${`tdd-agenda-a-${suffix}@example.com`}, 'TDD', 'x', 'agent', ${agencyId}) RETURNING id, email`
  const b = await sql`INSERT INTO tdg_users (name, email, agency_name, password_hash, role) VALUES ('TDD Agenda B', ${`tdd-agenda-b-${suffix}@example.com`}, 'TDD', 'x', 'agent') RETURNING id, email`
  userA = a.rows[0] as typeof userA; userB = b.rows[0] as typeof userB
})
afterAll(async () => {
  if (ids.length) await sql`DELETE FROM tdg_events WHERE id = ANY(${ids})`
  await sql`DELETE FROM tdg_users WHERE id IN (${userA.id}, ${userB.id})`
  await sql`DELETE FROM tdg_agencies WHERE id = ${agencyId}`
})

describe('agenda da rede — banco', () => {
  it('cria, lista no intervalo com presença, só criadora/admin edita, cancelar some da lista', async () => {
    const ev = await createEvent(base, { email: userA.email, name: 'TDD Agenda A', agencyId })
    ids.push(ev.id)
    const viewerB = { id: userB.id, email: userB.email, agencyId: null, isAdmin: false, name: 'B' }
    expect(await setRsvp(ev.id, userB.id, 'vou')).toBe(true)
    const list = await listEvents(viewerB, { from: '2027-03-01', to: '2027-04-01' })
    const mine = list.find(e => e.id === ev.id)!
    expect(mine).toMatchObject({ rsvp_vou: 1, my_rsvp: 'vou', can_edit: false, created_by_name: 'TDD Agenda A' })
    expect((await listRsvps(ev.id))[0]).toMatchObject({ name: 'TDD Agenda B', status: 'vou' })
    expect(await updateEvent(ev.id, { ...base, title: 'x'.repeat(5) }, viewerB)).toMatchObject({ ok: false, status: 403 })
    const viewerA = { id: userA.id, email: userA.email, agencyId, isAdmin: false, name: 'A' }
    const up = await updateEvent(ev.id, { ...base, title: `${base.title} (v2)` }, viewerA)
    expect(up).toMatchObject({ ok: true, event: { title: `${base.title} (v2)`, can_edit: true } })
    expect(await cancelEvent(ev.id, viewerB)).toMatchObject({ ok: false, status: 403 })
    expect(await cancelEvent(ev.id, viewerA)).toEqual({ ok: true })
    expect((await listEvents(viewerB, { from: '2027-03-01', to: '2027-04-01' })).some(e => e.id === ev.id)).toBe(false)
    expect(await setRsvp(ev.id, userB.id, 'talvez')).toBe(false)
  })
  it('evento de agência só aparece pra quem é da agência; cron só vê a rede, por dia de Brasília', async () => {
    const priv = await createEvent({ ...base, title: `__TDD Interno ${suffix}`, visibility: 'agencia', starts_at: '2027-03-11T01:00:00.000Z' }, { email: userA.email, name: 'A', agencyId })
    const rede = await createEvent({ ...base, title: `__TDD Rede ${suffix}`, starts_at: '2027-03-11T01:00:00.000Z' }, { email: userA.email, name: 'A', agencyId })
    ids.push(priv.id, rede.id)
    const seenByB = await listEvents({ id: userB.id, email: userB.email, agencyId: null, isAdmin: false, name: 'B' }, { from: '2027-03-01', to: '2027-04-01' })
    expect(seenByB.some(e => e.id === priv.id)).toBe(false)
    expect(seenByB.some(e => e.id === rede.id)).toBe(true)
    const seenByA = await listEvents({ id: userA.id, email: userA.email, agencyId, isAdmin: false, name: 'A' }, { from: '2027-03-01', to: '2027-04-01' })
    expect(seenByA.some(e => e.id === priv.id)).toBe(true)
    // 01:00Z de 11/03 = 22:00 de 10/03 em Brasília
    const day = await networkEventsOnDays('2027-03-10', addDays('2027-03-10', 1))
    expect(day.some(e => e.id === rede.id)).toBe(true)
    expect(day.some(e => e.id === priv.id)).toBe(false)
    expect((await networkEventsOnDays('2027-03-11', '2027-03-12')).some(e => e.id === rede.id)).toBe(false)
  })
})
