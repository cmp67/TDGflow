import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/mercadopago', () => ({ createAgencySubscription: vi.fn() }))

import { auth } from '@/auth'
import { createAgencySubscription } from '@/lib/mercadopago'
import { POST } from './route'

const mockAuth   = auth as unknown as ReturnType<typeof vi.fn>
const mockCreate = createAgencySubscription as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

function request(): NextRequest {
  return new NextRequest('http://localhost/api/billing/subscribe', { method: 'POST' })
}

describe('POST /api/billing/subscribe', () => {
  let agencyId: string
  const cnpj = `44.444.444/${Date.now().toString().slice(-4)}-44`
  const email = `tdd-subscribe-${Date.now()}@example.com`
  const emailNoAgency = `tdd-subscribe-noag-${Date.now()}@example.com`

  beforeAll(async () => {
    const { rows } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES ('__TDD_SUBSCRIBE_AGENCY__', ${cnpj}) RETURNING id
    `
    agencyId = rows[0].id as string

    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, agency_id)
      VALUES
        ('TDD Subscribe',       ${email},         '__TDD_SUBSCRIBE_AGENCY__', 'x', 'agent', ${agencyId}),
        ('TDD Subscribe NoAg',  ${emailNoAgency}, 'N/A', 'x', 'agent', NULL)
    `
  })

  afterEach(async () => {
    await sql`DELETE FROM tdg_agency_subscriptions WHERE agency_id = ${agencyId}`
    mockCreate.mockReset()
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_users WHERE email IN (${email}, ${emailNoAgency})`
    await sql`DELETE FROM tdg_agencies WHERE id = ${agencyId}`
  })

  it('returns 401 when there is no session', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await POST(request())
    expect(res.status).toBe(401)
  })

  it('returns 422 when the caller has no agency_id', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailNoAgency))
    const res = await POST(request())
    expect(res.status).toBe(422)
  })

  it('creates a subscription tagged with the agency and persists a pending row', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    mockCreate.mockResolvedValue({ preapprovalId: 'pre-abc', initPoint: 'https://mp.example/checkout/pre-abc' })

    const res  = await POST(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.initPoint).toBe('https://mp.example/checkout/pre-abc')
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ agencyId, payerEmail: email }))

    const { rows } = await sql`SELECT * FROM tdg_agency_subscriptions WHERE agency_id = ${agencyId}`
    expect(rows).toHaveLength(1)
    expect(rows[0].mp_preapproval_id).toBe('pre-abc')
    expect(rows[0].status).toBe('pending')
    expect(Number(rows[0].transaction_amount)).toBe(77.37)
  })

  it('returns 409 when the agency already has an authorized subscription', async () => {
    await sql`
      INSERT INTO tdg_agency_subscriptions (agency_id, mp_preapproval_id, plan_tier, status, transaction_amount)
      VALUES (${agencyId}, 'pre-existing', 'growth', 'authorized', 77.37)
    `
    mockAuth.mockResolvedValueOnce(sessionFor(email))

    const res = await POST(request())
    expect(res.status).toBe(409)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns 500 with a clear error when Mercado Pago call fails', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    mockCreate.mockRejectedValue(new Error('MERCADOPAGO_ACCESS_TOKEN não configurado'))

    const res = await POST(request())
    expect(res.status).toBe(500)

    const { rows } = await sql`SELECT * FROM tdg_agency_subscriptions WHERE agency_id = ${agencyId}`
    expect(rows).toHaveLength(0)
  })
})
