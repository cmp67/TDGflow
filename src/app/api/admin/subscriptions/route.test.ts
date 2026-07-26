import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

describe('GET /api/admin/subscriptions (global admin — billing status across all agencies)', () => {
  let agencyNoneId:    string
  let agencyLatestId:  string
  const cnpjNone   = `91.000.001/${Date.now().toString().slice(-4)}-01`
  const cnpjLatest = `91.000.002/${Date.now().toString().slice(-4)}-02`

  const emailAdmin = `tdd-admin-subs-${Date.now()}@example.com`
  const emailAgent = `tdd-agent-subs-${Date.now()}@example.com`

  beforeAll(async () => {
    const { rows: none } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES ('__TDD_SUBS_AGENCY_NONE__', ${cnpjNone}) RETURNING id
    `
    agencyNoneId = none[0].id as string

    const { rows: latest } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES ('__TDD_SUBS_AGENCY_LATEST__', ${cnpjLatest}) RETURNING id
    `
    agencyLatestId = latest[0].id as string

    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, agency_id)
      VALUES
        ('TDD Admin', ${emailAdmin}, 'N/A', 'x', 'admin', NULL),
        ('TDD Agent', ${emailAgent}, '__TDD_SUBS_AGENCY_NONE__', 'x', 'agent', ${agencyNoneId})
    `

    // Older, superseded row — should NOT be what the endpoint reports.
    await sql`
      INSERT INTO tdg_agency_subscriptions (agency_id, mp_preapproval_id, plan_tier, status, transaction_amount, created_at)
      VALUES (${agencyLatestId}, 'pre-old', 'growth', 'cancelled', 77.37, NOW() - INTERVAL '1 day')
    `
    // Newest row for the same agency — this is the one that should win.
    await sql`
      INSERT INTO tdg_agency_subscriptions (agency_id, mp_preapproval_id, plan_tier, status, transaction_amount, next_payment_date)
      VALUES (${agencyLatestId}, 'pre-new', 'growth', 'authorized', 77.37, NOW() + INTERVAL '10 days')
    `
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_agency_subscriptions WHERE agency_id IN (${agencyNoneId}, ${agencyLatestId})`
    await sql`DELETE FROM tdg_users WHERE email IN (${emailAdmin}, ${emailAgent})`
    await sql`DELETE FROM tdg_agencies WHERE id IN (${agencyNoneId}, ${agencyLatestId})`
  })

  it('returns 401 with no session', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 403 for a non-admin caller', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAgent))
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('reports status "none" for an agency with no subscription row at all', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin))
    const res  = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    const row = body.agencies.find((a: { id: string }) => a.id === agencyNoneId)
    expect(row.status).toBe('none')
    expect(row.transactionAmount).toBeNull()
  })

  it('reports the most recent subscription row, not an older superseded one', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailAdmin))
    const res  = await GET()
    const body = await res.json()

    const row = body.agencies.find((a: { id: string }) => a.id === agencyLatestId)
    expect(row.status).toBe('authorized')
    expect(row.mpPreapprovalId).toBe('pre-new')
    expect(row.transactionAmount).toBe(77.37)
    expect(row.nextPaymentDate).not.toBeNull()
  })
})
