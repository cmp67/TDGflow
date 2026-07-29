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

describe('GET/POST/PATCH /api/audio-queue — escopo por agency_id', () => {
  const agencyA = `__TDD Queue Agency A ${Date.now()}__`
  const agencyB = `__TDD Queue Agency B ${Date.now()}__`
  const emailA = `tdd-audio-queue-a-${Date.now()}@example.com`
  const emailB = `tdd-audio-queue-b-${Date.now()}@example.com`
  let agencyAId: string
  let agencyBId: string
  let idAgencyA: string
  let idAgencyB: string

  beforeAll(async () => {
    const { rows: agencies } = await sql`
      INSERT INTO tdg_agencies (name, cnpj)
      VALUES (${agencyA}, ${`__TDD_CNPJ_QA_${Date.now()}__`}), (${agencyB}, ${`__TDD_CNPJ_QB_${Date.now()}__`})
      RETURNING id
    `
    agencyAId = agencies[0].id as string
    agencyBId = agencies[1].id as string

    await sql`INSERT INTO tdg_users (name, email, agency_name, agency_id, password_hash, role) VALUES ('TDD A', ${emailA}, ${agencyA}, ${agencyAId}, 'x', 'agent')`
    await sql`INSERT INTO tdg_users (name, email, agency_name, agency_id, password_hash, role) VALUES ('TDD B', ${emailB}, ${agencyB}, ${agencyBId}, 'x', 'agent')`

    const { rows: rowsA } = await sql`
      INSERT INTO tdg_audio_inputs (agent_name, agency, agency_id, visit_type, status)
      VALUES ('TDD A', ${agencyA}, ${agencyAId}, 'MEETING', 'pending') RETURNING id`
    idAgencyA = rowsA[0].id

    const { rows: rowsB } = await sql`
      INSERT INTO tdg_audio_inputs (agent_name, agency, agency_id, visit_type, status)
      VALUES ('TDD B', ${agencyB}, ${agencyBId}, 'MEETING', 'pending') RETURNING id`
    idAgencyB = rowsB[0].id
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_audio_inputs WHERE id = ANY(${[idAgencyA, idAgencyB]})`
    await sql`DELETE FROM tdg_users WHERE email = ANY(${[emailA, emailB]})`
    await sql`DELETE FROM tdg_agencies WHERE id = ANY(${[agencyAId, agencyBId]})`
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
