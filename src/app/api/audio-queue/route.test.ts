import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET, POST, PATCH } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

function jsonReq(method: string, body: unknown) {
  return new Request('http://localhost/api/audio-queue', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

describe('GET/POST/PATCH /api/audio-queue — escopo por agência', () => {
  const emailA = `tdd-audio-queue-a-${Date.now()}@example.com`
  const emailB = `tdd-audio-queue-b-${Date.now()}@example.com`
  let idAgencyA: string
  let idAgencyB: string

  beforeAll(async () => {
    await sql`INSERT INTO tdg_users (name, email, agency_name, password_hash, role) VALUES ('TDD A', ${emailA}, '__TDD_QUEUE_A__', 'x', 'agent')`
    await sql`INSERT INTO tdg_users (name, email, agency_name, password_hash, role) VALUES ('TDD B', ${emailB}, '__TDD_QUEUE_B__', 'x', 'agent')`

    const { rows: rowsA } = await sql`
      INSERT INTO tdg_audio_inputs (agent_name, agency, visit_type, status)
      VALUES ('TDD A', '__TDD_QUEUE_A__', 'MEETING', 'pending') RETURNING id`
    idAgencyA = rowsA[0].id

    const { rows: rowsB } = await sql`
      INSERT INTO tdg_audio_inputs (agent_name, agency, visit_type, status)
      VALUES ('TDD B', '__TDD_QUEUE_B__', 'MEETING', 'pending') RETURNING id`
    idAgencyB = rowsB[0].id
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_audio_inputs WHERE id = ANY(${[idAgencyA, idAgencyB]})`
    await sql`DELETE FROM tdg_users WHERE email = ANY(${[emailA, emailB]})`
  })

  it('GET sem sessão retorna 401', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('GET só retorna itens da própria agência', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    const ids = body.items.map((i: { id: string }) => i.id)
    expect(ids).toContain(idAgencyA)
    expect(ids).not.toContain(idAgencyB)
  })

  it('POST (transcrever) sem sessão retorna 401', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await POST(jsonReq('POST', { id: idAgencyA }))
    expect(res.status).toBe(401)
  })

  it('POST (transcrever) em item de outra agência retorna 403', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const res = await POST(jsonReq('POST', { id: idAgencyB }))
    expect(res.status).toBe(403)
  })

  it('PATCH sem sessão retorna 401', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await PATCH(jsonReq('PATCH', { id: idAgencyA, interlocutor_name: 'X' }))
    expect(res.status).toBe(401)
  })

  it('PATCH em item de outra agência retorna 403', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const res = await PATCH(jsonReq('PATCH', { id: idAgencyB, interlocutor_name: 'X' }))
    expect(res.status).toBe(403)
  })

  it('PATCH na própria agência funciona', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const res = await PATCH(jsonReq('PATCH', { id: idAgencyA, interlocutor_name: 'Novo Nome' }))
    expect(res.status).toBe(200)
    const { rows } = await sql`SELECT interlocutor_name FROM tdg_audio_inputs WHERE id = ${idAgencyA}`
    expect(rows[0].interlocutor_name).toBe('Novo Nome')
  })
})
