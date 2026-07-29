import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { POST } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string, name: string) {
  return { user: { email, name } }
}

function postReq(body: unknown) {
  return new Request('http://localhost/api/suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

describe('POST /api/suggestions — agency_name/agency_id vêm de tdg_users (bug do SELECT agency corrigido)', () => {
  const email = `tdd-suggestions-${Date.now()}@example.com`
  const agencyName = `__TDD Suggestions Agency ${Date.now()}__`
  let agencyId: string
  const createdIds: number[] = []

  beforeAll(async () => {
    const { rows: agencyRows } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES (${agencyName}, ${`__TDD_CNPJ_SUG_${Date.now()}__`}) RETURNING id
    `
    agencyId = agencyRows[0].id as string

    await sql`
      INSERT INTO tdg_users (name, email, agency_name, agency_id, password_hash, role)
      VALUES ('TDD Suggester', ${email}, ${agencyName}, ${agencyId}, 'x', 'agent')
    `
  })

  afterAll(async () => {
    if (createdIds.length) await sql`DELETE FROM tdg_suggestions WHERE id = ANY(${createdIds})`
    await sql`DELETE FROM tdg_users WHERE email = ${email}`
    await sql`DELETE FROM tdg_agencies WHERE id = ${agencyId}`
  })

  it('grava agency_name real (não vazio) e agency_id — antes ficava sempre vazio por SELECT agency inexistente', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email, 'TDD Suggester'))
    const res = await POST(postReq({ title: 'Sugestão de teste', description: 'Descrição de teste' }))
    const body = await res.json()
    expect(res.status).toBe(201)
    createdIds.push(body.suggestion.id)

    const { rows } = await sql`SELECT agency_name, agency_id FROM tdg_suggestions WHERE id = ${body.suggestion.id}`
    expect(rows[0].agency_name).toBe(agencyName)
    expect(rows[0].agency_id).toBe(agencyId)
  })
})
