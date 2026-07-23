import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sql } from '@vercel/postgres'

// `@/auth` wraps NextAuth (cookies/JWT) — too heavy to exercise for a route
// unit test, so we mock the session directly and let the route hit the real
// dev Postgres for everything else, same integration style as credits.test.ts.
vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET, POST } from './route'
import { getBalance } from '@/lib/credits'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/credits', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET/POST /api/credits (self-service top-up, post agency_id migration)', () => {
  let agencyId: string
  const cnpj = `11.111.111/${Date.now().toString().slice(-4)}-11`

  const emailWithAgency  = `tdd-with-agency-${Date.now()}@example.com`
  const emailNoAgency    = `tdd-no-agency-${Date.now()}@example.com`
  const emailAdmin       = `tdd-admin-${Date.now()}@example.com`

  beforeAll(async () => {
    const { rows } = await sql`
      INSERT INTO tdg_agencies (name, cnpj)
      VALUES ('__TDD_ROUTE_TEST_AGENCY__', ${cnpj})
      RETURNING id
    `
    agencyId = rows[0].id as string

    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, agency_id)
      VALUES
        ('TDD With Agency', ${emailWithAgency}, '__TDD_ROUTE_TEST_AGENCY__', 'x', 'agent', ${agencyId}),
        ('TDD No Agency',   ${emailNoAgency},   'N/A', 'x', 'agent', NULL),
        ('TDD Admin',       ${emailAdmin},      'N/A', 'x', 'admin', NULL)
    `
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_users WHERE email IN (${emailWithAgency}, ${emailNoAgency}, ${emailAdmin})`
    await sql`DELETE FROM tdg_credits_ledger WHERE agency_id = ${agencyId}`
    await sql`DELETE FROM tdg_agency_cycles WHERE agency_id = ${agencyId}`
    await sql`DELETE FROM tdg_credits_balance WHERE agency_id = ${agencyId}`
    await sql`DELETE FROM tdg_agencies WHERE id = ${agencyId}`
  })

  describe('GET', () => {
    it('returns 401 when there is no session', async () => {
      mockAuth.mockResolvedValueOnce(null)
      const res = await GET()
      expect(res.status).toBe(401)
    })

    it('returns a clear 422 when the logged-in user has no agency_id', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailNoAgency))
      const res = await GET()
      const json = await res.json()

      expect(res.status).toBe(422)
      expect(json.error).toBeTruthy()
    })

    it('returns balance/consumption scoped to the caller\'s own agency', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailWithAgency))
      const res = await GET()
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.balance).toEqual({ balance: 0, tier: 'starter' })
      expect(json.creditsThisMonth).toBe(0)
      // Not an admin — must not receive the cross-agency network view.
      expect(json.agencyBreakdown).toBeUndefined()
      expect(json.lumiSettings).toBeUndefined()
    })

    it('gives an admin the network-wide fields even without their own agency_id', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin))
      const res = await GET()
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.balance).toBeUndefined()
      expect(Array.isArray(json.agencyBreakdown)).toBe(true)
      expect(json.lumiSettings).toBeTruthy()
    })
  })

  describe('POST action=top_up', () => {
    it('returns 401 when there is no session', async () => {
      mockAuth.mockResolvedValueOnce(null)
      const res = await POST(postRequest({ tier: 'starter' }))
      expect(res.status).toBe(401)
    })

    it('returns a clear 422 when the logged-in user has no agency_id', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailNoAgency))
      const res = await POST(postRequest({ tier: 'starter' }))
      const json = await res.json()

      expect(res.status).toBe(422)
      expect(json.error).toBeTruthy()
    })

    it('tops up only the caller\'s own agency, never a hardcoded pseudo-agency', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailWithAgency))
      const res = await POST(postRequest({ tier: 'starter', note: 'tdd' }))
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.ok).toBe(true)
      expect(json.balance.balance).toBe(2500)

      const persisted = await getBalance(agencyId)
      expect(persisted.balance).toBe(2500)
    })

    it('rejects an invalid tier', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailWithAgency))
      const res = await POST(postRequest({ tier: 'not-a-real-tier' }))
      expect(res.status).toBe(400)
    })
  })

  describe('POST admin-only actions (set_mode / distribute / contribute)', () => {
    it('blocks set_mode for a non-admin user', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailWithAgency))
      const res = await POST(postRequest({ action: 'set_mode', mode: 'free' }))
      expect(res.status).toBe(403)
    })

    it('blocks distribute for a non-admin user', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailWithAgency))
      const res = await POST(postRequest({ action: 'distribute', total: 1000 }))
      expect(res.status).toBe(403)
    })

    it('blocks contribute for a non-admin user', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailWithAgency))
      const res = await POST(postRequest({ action: 'contribute', agencyName: 'Anyone', amount: 10 }))
      expect(res.status).toBe(403)
    })

    it('blocks set_mode for a user with no agency at all (not just non-admin)', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailNoAgency))
      const res = await POST(postRequest({ action: 'set_mode', mode: 'free' }))
      expect(res.status).toBe(403)
    })

    it('allows set_mode for an admin', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin))
      const res = await POST(postRequest({ action: 'set_mode', mode: 'free' }))
      expect(res.status).toBe(200)
    })
  })
})
