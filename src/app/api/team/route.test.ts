import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

describe('GET /api/team (agency_admin sees only their own agency\'s roster)', () => {
  let agencyAId: string
  let agencyBId: string
  const cnpjA = `90.000.021/${Date.now().toString().slice(-4)}-21`
  const cnpjB = `90.000.022/${Date.now().toString().slice(-4)}-22`

  const emailAdmin        = `tdd-admin-roster-${Date.now()}@example.com`
  const emailAgentA       = `tdd-agent-a-roster-${Date.now()}@example.com`
  const emailAgencyAdminA = `tdd-aa-a-roster-${Date.now()}@example.com`
  const emailAgentB       = `tdd-agent-b-roster-${Date.now()}@example.com`

  beforeAll(async () => {
    const { rows: a } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES ('__TDD_ROSTER_AGENCY_A__', ${cnpjA}) RETURNING id
    `
    agencyAId = a[0].id as string
    const { rows: b } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES ('__TDD_ROSTER_AGENCY_B__', ${cnpjB}) RETURNING id
    `
    agencyBId = b[0].id as string

    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, agency_id)
      VALUES
        ('TDD Admin',          ${emailAdmin},        'N/A',                    'x', 'admin',        NULL),
        ('TDD Agent A',        ${emailAgentA},       '__TDD_ROSTER_AGENCY_A__', 'x', 'agent',        ${agencyAId}),
        ('TDD Agency Admin A', ${emailAgencyAdminA}, '__TDD_ROSTER_AGENCY_A__', 'x', 'agency_admin', ${agencyAId}),
        ('TDD Agent B',        ${emailAgentB},       '__TDD_ROSTER_AGENCY_B__', 'x', 'agent',        ${agencyBId})
    `
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_users WHERE email IN (${emailAdmin}, ${emailAgentA}, ${emailAgencyAdminA}, ${emailAgentB})`
    await sql`DELETE FROM tdg_agencies WHERE id IN (${agencyAId}, ${agencyBId})`
  })

  it('returns 401 with no session', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('blocks a plain agent', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAgentA))
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns only agency A\'s members for agency_admin A — never agency B\'s', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAgencyAdminA))
    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    const emails = json.members.map((m: { email: string }) => m.email)
    expect(emails).toContain(emailAgentA)
    expect(emails).toContain(emailAgencyAdminA)
    expect(emails).not.toContain(emailAgentB)
  })

  it('gives the global admin a clear error instead of leaking every agency (no agency_id of its own)', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin))
    const res = await GET()
    expect(res.status).toBe(422)
  })
})
