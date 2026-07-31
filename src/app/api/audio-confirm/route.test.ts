import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { POST } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

function postReq(body: unknown) {
  return new Request('http://localhost/api/audio-confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

describe('POST /api/audio-confirm — escopo por agency_id', () => {
  const agencyA = `__TDD Confirm Agency A ${Date.now()}__`
  const agencyB = `__TDD Confirm Agency B ${Date.now()}__`
  const emailA = `tdd-audio-confirm-a-${Date.now()}@example.com`
  const emailB = `tdd-audio-confirm-b-${Date.now()}@example.com`
  let agencyAId: string
  let agencyBId: string
  let idAgencyA: string
  let idAgencyB: string

  beforeAll(async () => {
    const { rows: agencies } = await sql`
      INSERT INTO tdg_agencies (name, cnpj)
      VALUES (${agencyA}, ${`__TDD_CNPJ_CA_${Date.now()}__`}), (${agencyB}, ${`__TDD_CNPJ_CB_${Date.now()}__`})
      RETURNING id
    `
    agencyAId = agencies[0].id as string
    agencyBId = agencies[1].id as string

    await sql`INSERT INTO tdg_users (name, email, agency_name, agency_id, password_hash, role) VALUES ('TDD A', ${emailA}, ${agencyA}, ${agencyAId}, 'x', 'agent')`
    await sql`INSERT INTO tdg_users (name, email, agency_name, agency_id, password_hash, role) VALUES ('TDD B', ${emailB}, ${agencyB}, ${agencyBId}, 'x', 'agent')`

    const { rows: rowsA } = await sql`
      INSERT INTO tdg_audio_inputs (agent_name, agency, agency_id, visit_type, status)
      VALUES ('TDD A', ${agencyA}, ${agencyAId}, 'MEETING', 'transcribed') RETURNING id`
    idAgencyA = rowsA[0].id

    const { rows: rowsB } = await sql`
      INSERT INTO tdg_audio_inputs (agent_name, agency, agency_id, visit_type, status)
      VALUES ('TDD B', ${agencyB}, ${agencyBId}, 'MEETING', 'transcribed') RETURNING id`
    idAgencyB = rowsB[0].id
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_audio_inputs WHERE id = ANY(${[idAgencyA, idAgencyB]})`
    await sql`DELETE FROM tdg_users WHERE email = ANY(${[emailA, emailB]})`
    await sql`DELETE FROM tdg_agencies WHERE id = ANY(${[agencyAId, agencyBId]})`
  })

  it('sem sessão retorna 401', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await POST(postReq({ id: idAgencyA, audio_shared: true, summary: {} }))
    expect(res.status).toBe(401)
  })

  it('em item de outra agência retorna 404 (nunca confirma que existe)', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const res = await POST(postReq({ id: idAgencyB, audio_shared: true, summary: {} }))
    expect(res.status).toBe(404)
  })

  it('na própria agência confirma com sucesso', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const res = await POST(postReq({ id: idAgencyA, audio_shared: true, summary: { note: 'ok' } }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.input.confirmed_at).not.toBeNull()
  })
})
