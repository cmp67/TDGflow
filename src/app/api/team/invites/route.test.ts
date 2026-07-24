import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { POST } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/team/invites', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/team/invites (agency_admin invites its own team; cross-agency leakage is the point of this suite)', () => {
  let agencyAId: string
  let agencyBId: string
  const cnpjA = `90.000.011/${Date.now().toString().slice(-4)}-11`
  const cnpjB = `90.000.012/${Date.now().toString().slice(-4)}-12`

  const emailAdmin        = `tdd-admin-team-${Date.now()}@example.com`
  const emailAgentA       = `tdd-agent-a-team-${Date.now()}@example.com`
  const emailAgencyAdminA = `tdd-aa-a-team-${Date.now()}@example.com`
  const emailAgencyAdminB = `tdd-aa-b-team-${Date.now()}@example.com`

  beforeAll(async () => {
    const { rows: a } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES ('__TDD_TEAM_AGENCY_A__', ${cnpjA}) RETURNING id
    `
    agencyAId = a[0].id as string
    const { rows: b } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES ('__TDD_TEAM_AGENCY_B__', ${cnpjB}) RETURNING id
    `
    agencyBId = b[0].id as string

    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, agency_id)
      VALUES
        ('TDD Admin',          ${emailAdmin},        'N/A',                 'x', 'admin',        NULL),
        ('TDD Agent A',        ${emailAgentA},       '__TDD_TEAM_AGENCY_A__', 'x', 'agent',        ${agencyAId}),
        ('TDD Agency Admin A', ${emailAgencyAdminA}, '__TDD_TEAM_AGENCY_A__', 'x', 'agency_admin', ${agencyAId}),
        ('TDD Agency Admin B', ${emailAgencyAdminB}, '__TDD_TEAM_AGENCY_B__', 'x', 'agency_admin', ${agencyBId})
    `
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_invites WHERE agency_id IN (${agencyAId}, ${agencyBId})`
    await sql`DELETE FROM tdg_users WHERE email IN (${emailAdmin}, ${emailAgentA}, ${emailAgencyAdminA}, ${emailAgencyAdminB})`
    await sql`DELETE FROM tdg_agencies WHERE id IN (${agencyAId}, ${agencyBId})`
  })

  it('returns 401 with no session', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await POST(postRequest({}))
    expect(res.status).toBe(401)
  })

  it('blocks a plain agent from generating any invite', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAgentA))
    const res = await POST(postRequest({}))
    expect(res.status).toBe(403)
  })

  it('agency_admin invite is always role=agent scoped to their own agency, ignoring the body', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAgencyAdminA))
    // Forged body: tries to escalate role and target another agency.
    const res = await POST(postRequest({ agency_id: agencyBId, role: 'agency_admin' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    const { rows } = await sql`SELECT role, agency_id FROM tdg_invites WHERE token = ${json.token}`
    expect(rows[0].role).toBe('agent')
    expect(rows[0].agency_id).toBe(agencyAId)
    expect(rows[0].agency_id).not.toBe(agencyBId)
  })

  it('two different agency_admins never collide on each other\'s agency', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAgencyAdminA))
    const a = await (await POST(postRequest({}))).json()

    mockAuth.mockResolvedValueOnce(sessionFor(emailAgencyAdminB))
    const b = await (await POST(postRequest({}))).json()

    expect(a.token).not.toBe(b.token)

    const { rows: rowA } = await sql`SELECT agency_id FROM tdg_invites WHERE token = ${a.token}`
    const { rows: rowB } = await sql`SELECT agency_id FROM tdg_invites WHERE token = ${b.token}`
    expect(rowA[0].agency_id).toBe(agencyAId)
    expect(rowB[0].agency_id).toBe(agencyBId)
  })

  it('global admin can target an explicit agency/role', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin))
    const res = await POST(postRequest({ agency_id: agencyBId, role: 'agency_admin' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    const { rows } = await sql`SELECT role, agency_id FROM tdg_invites WHERE token = ${json.token}`
    expect(rows[0].role).toBe('agency_admin')
    expect(rows[0].agency_id).toBe(agencyBId)
  })

  it('global admin gets 400 without agency_id (admin has no agency of its own to default to)', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin))
    const res = await POST(postRequest({}))
    expect(res.status).toBe(400)
  })
})
