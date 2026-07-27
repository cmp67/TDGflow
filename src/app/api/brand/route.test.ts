import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET, PUT } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

function putRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/brand', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('GET/PUT /api/brand', () => {
  let agencyId: string
  const cnpj = `77.777.777/${Date.now().toString().slice(-4)}-77`

  const emailAgent       = `tdd-brand-agent-${Date.now()}@example.com`
  const emailAgencyAdmin = `tdd-brand-agadmin-${Date.now()}@example.com`
  const emailNoAgency    = `tdd-brand-noag-${Date.now()}@example.com`

  beforeAll(async () => {
    const { rows } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES ('__TDD_BRAND_AGENCY__', ${cnpj}) RETURNING id
    `
    agencyId = rows[0].id as string

    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, agency_id)
      VALUES
        ('TDD Brand Agent',       ${emailAgent},       '__TDD_BRAND_AGENCY__', 'x', 'agent',         ${agencyId}),
        ('TDD Brand AgencyAdmin', ${emailAgencyAdmin}, '__TDD_BRAND_AGENCY__', 'x', 'agency_admin',   ${agencyId}),
        ('TDD Brand NoAg',        ${emailNoAgency},    'N/A', 'x', 'agent', NULL)
    `
  })

  afterEach(async () => {
    await sql`DELETE FROM tdg_brand WHERE agency_id = ${agencyId}`
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_users WHERE email IN (${emailAgent}, ${emailAgencyAdmin}, ${emailNoAgency})`
    await sql`DELETE FROM tdg_agencies WHERE id = ${agencyId}`
  })

  describe('GET', () => {
    it('returns 401 when there is no session', async () => {
      mockAuth.mockResolvedValueOnce(null)
      const res = await GET()
      expect(res.status).toBe(401)
    })

    it('returns 422 when the caller has no agency_id', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailNoAgency))
      const res = await GET()
      expect(res.status).toBe(422)
    })

    it('returns all-null brand when the agency never configured one — UI falls back to the TDG Flow default alone', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAgent))
      const res = await GET()
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.brand).toEqual({ logoUrl: null, primaryColor: null, secondaryColor: null, footerText: null })
    })

    it('a plain agent can read the brand — everyone in the agency sees the same skin', async () => {
      await sql`INSERT INTO tdg_brand (agency_id, primary_color) VALUES (${agencyId}, '#A87C4F')`
      mockAuth.mockResolvedValueOnce(sessionFor(emailAgent))
      const res = await GET()
      const json = await res.json()
      expect(json.brand.primaryColor).toBe('#A87C4F')
    })
  })

  describe('PUT', () => {
    it('returns 401 when there is no session', async () => {
      mockAuth.mockResolvedValueOnce(null)
      const res = await PUT(putRequest({ primaryColor: '#A87C4F' }))
      expect(res.status).toBe(401)
    })

    it('returns 403 for a plain agent — only agency_admin/admin can write the brand', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAgent))
      const res = await PUT(putRequest({ primaryColor: '#A87C4F' }))
      expect(res.status).toBe(403)
    })

    it('returns 400 for an invalid hex color', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAgencyAdmin))
      const res = await PUT(putRequest({ primaryColor: 'not-a-color' }))
      expect(res.status).toBe(400)
    })

    it('agency_admin creates the brand row on first save', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAgencyAdmin))
      const res = await PUT(putRequest({ primaryColor: '#A87C4F', secondaryColor: '#C15A34', footerText: 'Minha Agência' }))
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.brand).toEqual({ logoUrl: null, primaryColor: '#A87C4F', secondaryColor: '#C15A34', footerText: 'Minha Agência' })
    })

    it('a second save updates the same row instead of creating a duplicate', async () => {
      mockAuth.mockResolvedValueOnce(sessionFor(emailAgencyAdmin))
      await PUT(putRequest({ primaryColor: '#111111' }))
      mockAuth.mockResolvedValueOnce(sessionFor(emailAgencyAdmin))
      await PUT(putRequest({ primaryColor: '#222222' }))

      const { rows } = await sql`SELECT primary_color FROM tdg_brand WHERE agency_id = ${agencyId}`
      expect(rows).toHaveLength(1)
      expect(rows[0].primary_color).toBe('#222222')
    })
  })
})
