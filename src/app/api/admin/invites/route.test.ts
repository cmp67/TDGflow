import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sql } from '@vercel/postgres'

// Mock the session the same way credits/route.test.ts does — real Neon dev DB
// for everything else.
vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET, POST } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/invites', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET/POST /api/admin/invites (global admin generates one agency_admin invite per agency)', () => {
  let agencyAId: string
  let agencyBId: string
  const cnpjA = `90.000.001/${Date.now().toString().slice(-4)}-01`
  const cnpjB = `90.000.002/${Date.now().toString().slice(-4)}-02`

  const emailAdmin       = `tdd-admin-inv-${Date.now()}@example.com`
  const emailAgent       = `tdd-agent-inv-${Date.now()}@example.com`
  const emailAgencyAdmin = `tdd-agencyadmin-inv-${Date.now()}@example.com`

  beforeAll(async () => {
    const { rows: a } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES ('__TDD_INVITES_AGENCY_A__', ${cnpjA}) RETURNING id
    `
    agencyAId = a[0].id as string
    const { rows: b } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES ('__TDD_INVITES_AGENCY_B__', ${cnpjB}) RETURNING id
    `
    agencyBId = b[0].id as string

    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, agency_id)
      VALUES
        ('TDD Admin',        ${emailAdmin},       'N/A',                    'x', 'admin',        NULL),
        ('TDD Agent',        ${emailAgent},       '__TDD_INVITES_AGENCY_A__', 'x', 'agent',        ${agencyAId}),
        ('TDD Agency Admin', ${emailAgencyAdmin}, '__TDD_INVITES_AGENCY_A__', 'x', 'agency_admin', ${agencyAId})
    `
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_invites WHERE agency_id IN (${agencyAId}, ${agencyBId})`
    await sql`DELETE FROM tdg_users WHERE email IN (${emailAdmin}, ${emailAgent}, ${emailAgencyAdmin})`
    await sql`DELETE FROM tdg_agencies WHERE id IN (${agencyAId}, ${agencyBId})`
  })

  describe('GET', () => {
    it('returns 401 with no session', async () => {
      mockAuth.mockResolvedValueOnce(null)
      const res = await GET()
      expect(res.status).toBe(401)
    })

    it('returns 403 for a non-admin (agency_admin) caller', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAgencyAdmin))
      const res = await GET()
      expect(res.status).toBe(403)
    })

    it('returns 403 for a plain agent', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAgent))
      const res = await GET()
      expect(res.status).toBe(403)
    })

    it('lists agencies with status for a global admin', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin))
      const res = await GET()
      const json = await res.json()

      expect(res.status).toBe(200)
      const agencyA = json.agencies.find((a: { id: string }) => a.id === agencyAId)
      const agencyB = json.agencies.find((a: { id: string }) => a.id === agencyBId)
      // Agency A already has a registered agency_admin user.
      expect(agencyA.status).toBe('registered')
      // Agency B has no user and no invite yet.
      expect(agencyB.status).toBe('none')
    })
  })

  describe('POST', () => {
    it('returns 401 with no session', async () => {
      mockAuth.mockResolvedValueOnce(null)
      const res = await POST(postRequest({ agency_id: agencyBId }))
      expect(res.status).toBe(401)
    })

    it('blocks a non-admin (agency_admin) caller', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAgencyAdmin))
      const res = await POST(postRequest({ agency_id: agencyBId }))
      expect(res.status).toBe(403)
    })

    it('blocks a plain agent', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAgent))
      const res = await POST(postRequest({ agency_id: agencyBId }))
      expect(res.status).toBe(403)
    })

    it('rejects a missing agency_id', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin))
      const res = await POST(postRequest({}))
      expect(res.status).toBe(400)
    })

    it('rejects an agency_id that does not exist', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin))
      const res = await POST(postRequest({ agency_id: '00000000-0000-0000-0000-000000000000' }))
      expect(res.status).toBe(404)
    })

    it('creates a new agency_admin invite for an agency with none yet', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin))
      const res = await POST(postRequest({ agency_id: agencyBId }))
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(typeof json.token).toBe('string')
      expect(json.token.length).toBeGreaterThanOrEqual(32)
      expect(json.reused).toBe(false)

      const { rows } = await sql`SELECT role, agency_id FROM tdg_invites WHERE token = ${json.token}`
      expect(rows[0].role).toBe('agency_admin')
      expect(rows[0].agency_id).toBe(agencyBId)
    })

    it('reuses the existing pending invite instead of minting a second one', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin))
      const first = await (await POST(postRequest({ agency_id: agencyBId }))).json()

      mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin))
      const second = await (await POST(postRequest({ agency_id: agencyBId }))).json()

      expect(second.token).toBe(first.token)
      expect(second.reused).toBe(true)

      const { rows } = await sql`
        SELECT count(*)::int AS n FROM tdg_invites
        WHERE agency_id = ${agencyBId} AND role = 'agency_admin' AND used_at IS NULL
      `
      expect(rows[0].n).toBe(1)
    })

    it('force=true invalidates the old pending invite and mints a fresh one', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin))
      const before = await (await POST(postRequest({ agency_id: agencyBId }))).json()

      mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin))
      const after = await (await POST(postRequest({ agency_id: agencyBId, force: true }))).json()

      expect(after.token).not.toBe(before.token)

      const { rows: oldInvite } = await sql`SELECT expires_at FROM tdg_invites WHERE token = ${before.token}`
      expect(new Date(oldInvite[0].expires_at as string).getTime()).toBeLessThanOrEqual(Date.now())
    })
  })
})
