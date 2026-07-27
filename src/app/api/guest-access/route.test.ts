import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET, POST, PATCH } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string, name: string) {
  return { user: { email, name } }
}

describe('GET/POST /api/guest-access', () => {
  let agencyId: string
  const cnpj             = `66.666.666/${Date.now().toString().slice(-4)}-66`
  const emailAdmin       = `tdd-guest-admin-${Date.now()}@example.com`
  const emailAgent       = `tdd-guest-agent-${Date.now()}@example.com`
  const emailNoAgency    = `tdd-guest-noag-${Date.now()}@example.com`
  const emailGlobalAdmin = `tdd-guest-global-admin-${Date.now()}@example.com`

  beforeAll(async () => {
    const { rows } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES ('__TDD_GUEST_ACCESS_AGENCY__', ${cnpj}) RETURNING id
    `
    agencyId = rows[0].id as string

    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, agency_id)
      VALUES
        ('TDD Guest Admin',        ${emailAdmin},       '__TDD_GUEST_ACCESS_AGENCY__', 'x', 'agency_admin', ${agencyId}),
        ('TDD Guest Agent',        ${emailAgent},       '__TDD_GUEST_ACCESS_AGENCY__', 'x', 'agent',        ${agencyId}),
        ('TDD Guest NoAg',         ${emailNoAgency},    'N/A',                         'x', 'agency_admin', NULL),
        ('TDD Guest Global Admin', ${emailGlobalAdmin}, 'Bemgsy',                      'x', 'admin',        NULL)
    `

    // The table is normally created lazily by ensureTables() inside the route
    // handlers, but the 401 test returns before that runs — create it up
    // front so afterEach's cleanup DELETE never races against a missing table.
    await sql`
      CREATE TABLE IF NOT EXISTS tdg_guest_activation_requests (
        id                  SERIAL PRIMARY KEY,
        agency_id           UUID NOT NULL,
        agency_name         TEXT NOT NULL,
        requested_by_email  TEXT NOT NULL,
        requested_by_name   TEXT NOT NULL,
        status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
  })

  afterEach(async () => {
    await sql`DELETE FROM tdg_guest_activation_requests WHERE agency_id = ${agencyId}`
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_users WHERE email IN (${emailAdmin}, ${emailAgent}, ${emailNoAgency}, ${emailGlobalAdmin})`
    await sql`DELETE FROM tdg_agencies WHERE id = ${agencyId}`
  })

  it('returns 401 when there is no session', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('returns 403 when the caller is a plain agent', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAgent, 'TDD Guest Agent'))
    const res = await POST()
    expect(res.status).toBe(403)
  })

  it('returns 422 when the caller has no agency_id', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailNoAgency, 'TDD Guest NoAg'))
    const res = await POST()
    expect(res.status).toBe(422)
  })

  it('reports "none" from GET before any request has been made', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin, 'TDD Guest Admin'))
    const res  = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ status: 'none', requestedAt: null, requestedByName: null })
  })

  it('creates a pending request on first POST as agency_admin', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin, 'TDD Guest Admin'))
    const res  = await POST()
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.status).toBe('pending')
    expect(body.requestedByName).toBe('TDD Guest Admin')
    expect(body.requestedAt).toBeTruthy()

    const { rows } = await sql`SELECT * FROM tdg_guest_activation_requests WHERE agency_id = ${agencyId}`
    expect(rows).toHaveLength(1)
    expect(rows[0].requested_by_email).toBe(emailAdmin)
    expect(rows[0].requested_by_name).toBe('TDD Guest Admin')
    expect(rows[0].agency_name).toBe('__TDD_GUEST_ACCESS_AGENCY__')
    expect(rows[0].status).toBe('pending')
  })

  it('is idempotent — a second POST returns the existing request without duplicating it', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin, 'TDD Guest Admin'))
    await POST()

    mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin, 'TDD Guest Admin'))
    const res  = await POST()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe('pending')

    const { rows } = await sql`SELECT * FROM tdg_guest_activation_requests WHERE agency_id = ${agencyId}`
    expect(rows).toHaveLength(1)
  })

  it('reflects the created request status via GET', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin, 'TDD Guest Admin'))
    await POST()

    mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin, 'TDD Guest Admin'))
    const res  = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe('pending')
    expect(body.requestedByName).toBe('TDD Guest Admin')
    expect(body.requestedAt).toBeTruthy()
  })

  it('GET omits pendingRequests for a non-admin caller', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin, 'TDD Guest Admin'))
    const res  = await GET()
    const body = await res.json()
    expect(body.pendingRequests).toBeUndefined()
  })

  it('GET includes pendingRequests (cross-agency) for the global admin', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin, 'TDD Guest Admin'))
    await POST()

    mockAuth.mockResolvedValueOnce(sessionFor(emailGlobalAdmin, 'TDD Guest Global Admin'))
    const res  = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(body.pendingRequests)).toBe(true)
    const mine = body.pendingRequests.find((r: { agencyName: string }) => r.agencyName === '__TDD_GUEST_ACCESS_AGENCY__')
    expect(mine).toBeTruthy()
    expect(mine.requestedByEmail).toBe(emailAdmin)
  })

  describe('PATCH (approve/reject)', () => {
    it('returns 401 when there is no session', async () => {
      mockAuth.mockResolvedValueOnce(null)
      const res = await PATCH(new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ id: 1, status: 'approved' }) }))
      expect(res.status).toBe(401)
    })

    it('returns 403 when the caller is not the global admin', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin, 'TDD Guest Admin'))
      const res = await PATCH(new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ id: 1, status: 'approved' }) }))
      expect(res.status).toBe(403)
    })

    it('returns 400 for an invalid status value', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailGlobalAdmin, 'TDD Guest Global Admin'))
      const res = await PATCH(new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ id: 1, status: 'bogus' }) }))
      expect(res.status).toBe(400)
    })

    it('returns 404 when the request id does not exist or is already processed', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailGlobalAdmin, 'TDD Guest Global Admin'))
      const res = await PATCH(new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ id: 999999999, status: 'approved' }) }))
      expect(res.status).toBe(404)
    })

    it('approves a pending request, which then disappears from the admin pending list', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin, 'TDD Guest Admin'))
      await POST()

      // Consulta direta ao banco — não chama auth(), não deve enfileirar mock.
      const { rows } = await sql`SELECT id FROM tdg_guest_activation_requests WHERE agency_id = ${agencyId}`
      const id = rows[0].id as number

      mockAuth.mockResolvedValueOnce(sessionFor(emailGlobalAdmin, 'TDD Guest Global Admin'))
      const patchRes = await PATCH(new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ id, status: 'approved' }) }))
      expect(patchRes.status).toBe(200)

      mockAuth.mockResolvedValueOnce(sessionFor(emailGlobalAdmin, 'TDD Guest Global Admin'))
      const getRes  = await GET()
      const getBody = await getRes.json()
      expect(getBody.pendingRequests.some((r: { agencyName: string }) => r.agencyName === '__TDD_GUEST_ACCESS_AGENCY__')).toBe(false)

      mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin, 'TDD Guest Admin'))
      const ownRes  = await GET()
      const ownBody = await ownRes.json()
      expect(ownBody.status).toBe('approved')
    })
  })
})
