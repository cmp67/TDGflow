import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

function requestWith(preapprovalId?: string): NextRequest {
  const url = preapprovalId
    ? `http://localhost/api/billing/subscription-status?preapproval_id=${preapprovalId}`
    : 'http://localhost/api/billing/subscription-status'
  return new NextRequest(url)
}

describe('GET /api/billing/subscription-status', () => {
  let agencyAId: string
  let agencyBId: string
  const cnpjA = `22.222.222/${Date.now().toString().slice(-4)}-22`
  const cnpjB = `33.333.333/${Date.now().toString().slice(-4)}-33`

  const emailA      = `tdd-sub-a-${Date.now()}@example.com`
  const emailB      = `tdd-sub-b-${Date.now()}@example.com`
  const emailNoAg   = `tdd-sub-noag-${Date.now()}@example.com`

  let preapprovalIdA: string

  beforeAll(async () => {
    const { rows: agencyRows } = await sql`
      INSERT INTO tdg_agencies (name, cnpj)
      VALUES
        ('__TDD_SUB_AGENCY_A__', ${cnpjA}),
        ('__TDD_SUB_AGENCY_B__', ${cnpjB})
      RETURNING id
    `
    agencyAId = agencyRows[0].id as string
    agencyBId = agencyRows[1].id as string

    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, agency_id)
      VALUES
        ('TDD Sub A',     ${emailA},    '__TDD_SUB_AGENCY_A__', 'x', 'agent', ${agencyAId}),
        ('TDD Sub B',     ${emailB},    '__TDD_SUB_AGENCY_B__', 'x', 'agent', ${agencyBId}),
        ('TDD Sub NoAg',  ${emailNoAg}, 'N/A', 'x', 'agent', NULL)
    `

    preapprovalIdA = `tdd-preapproval-${Date.now()}`
    await sql`
      INSERT INTO tdg_agency_subscriptions (agency_id, mp_preapproval_id, plan_tier, status, transaction_amount, next_payment_date)
      VALUES (${agencyAId}, ${preapprovalIdA}, 'growth', 'authorized', 77.37, NOW() + INTERVAL '30 days')
    `
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_agency_subscriptions WHERE agency_id IN (${agencyAId}, ${agencyBId})`
    await sql`DELETE FROM tdg_users WHERE email IN (${emailA}, ${emailB}, ${emailNoAg})`
    await sql`DELETE FROM tdg_agencies WHERE id IN (${agencyAId}, ${agencyBId})`
  })

  it('returns 401 when there is no session', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await GET(requestWith())
    expect(res.status).toBe(401)
  })

  it('returns status "none" when the agency has no subscription row yet', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailB))
    const res = await GET(requestWith())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.status).toBe('none')
  })

  it('returns 422 when the caller has no agency_id at all', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailNoAg))
    const res = await GET(requestWith())
    expect(res.status).toBe(422)
  })

  it('returns the latest subscription for the caller\'s own agency', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const res = await GET(requestWith())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.status).toBe('authorized')
    expect(body.planTier).toBe('growth')
    expect(body.transactionAmount).toBe(77.37)
  })

  it('resolves by preapproval_id when given, scoped to the caller\'s own agency', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const res = await GET(requestWith(preapprovalIdA))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.status).toBe('authorized')
  })

  it('returns 404 (not 403) when preapproval_id belongs to a different agency — does not confirm existence', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailB))
    const res = await GET(requestWith(preapprovalIdA))
    expect(res.status).toBe(404)
  })

  it('returns 404 for a preapproval_id that does not exist at all', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const res = await GET(requestWith('does-not-exist'))
    expect(res.status).toBe(404)
  })
})
