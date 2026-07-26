import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'
import { sql } from '@vercel/postgres'

vi.mock('@/lib/mercadopago', () => ({
  getSubscription: vi.fn(),
  getPayment:      vi.fn(),
}))

import { getSubscription, getPayment } from '@/lib/mercadopago'
import { POST } from './route'

const mockGetSubscription = getSubscription as unknown as ReturnType<typeof vi.fn>
const mockGetPayment      = getPayment as unknown as ReturnType<typeof vi.fn>

const WEBHOOK_SECRET = 'test-webhook-secret'

function signedHeaders(dataId: string) {
  const ts        = Date.now().toString()
  const requestId = 'req-abc-123'
  const manifest  = `id:${dataId};request-id:${requestId};ts:${ts};`
  const hash      = createHmac('sha256', WEBHOOK_SECRET).update(manifest).digest('hex')
  return { 'x-signature': `ts=${ts},v1=${hash}`, 'x-request-id': requestId }
}

function webhookRequest(dataId: string, body: unknown, headers: Record<string, string>): NextRequest {
  return new NextRequest(`http://localhost/api/billing/webhook?data.id=${dataId}`, {
    method:  'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body:    JSON.stringify(body),
  })
}

describe('POST /api/billing/webhook', () => {
  let agencyId: string
  const cnpj = `55.555.555/${Date.now().toString().slice(-4)}-55`

  beforeAll(async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = WEBHOOK_SECRET
    const { rows } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES ('__TDD_WEBHOOK_AGENCY__', ${cnpj}) RETURNING id
    `
    agencyId = rows[0].id as string
  })

  afterEach(async () => {
    await sql`DELETE FROM tdg_agency_subscriptions WHERE agency_id = ${agencyId}`
    mockGetSubscription.mockReset()
    mockGetPayment.mockReset()
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_agencies WHERE id = ${agencyId}`
  })

  it('returns 401 when the signature is missing', async () => {
    const res = await POST(webhookRequest('pre-1', { type: 'subscription_preapproval', data: { id: 'pre-1' } }, {}))
    expect(res.status).toBe(401)
    expect(mockGetSubscription).not.toHaveBeenCalled()
  })

  it('returns 401 when the signature does not match (forged request)', async () => {
    const headers = signedHeaders('pre-1')
    headers['x-signature'] = headers['x-signature'].replace(/v1=.*/, 'v1=0000000000000000000000000000000000000000000000000000000000000000')
    const res = await POST(webhookRequest('pre-1', { type: 'subscription_preapproval', data: { id: 'pre-1' } }, headers))
    expect(res.status).toBe(401)
    expect(mockGetSubscription).not.toHaveBeenCalled()
  })

  it('updates the subscription row on a valid subscription_preapproval event', async () => {
    await sql`
      INSERT INTO tdg_agency_subscriptions (agency_id, mp_preapproval_id, plan_tier, status, transaction_amount)
      VALUES (${agencyId}, 'pre-1', 'growth', 'pending', 77.37)
    `
    mockGetSubscription.mockResolvedValue({ status: 'authorized', externalReference: agencyId, nextPaymentDate: '2026-08-05T00:00:00Z' })

    const res = await POST(webhookRequest('pre-1', { type: 'subscription_preapproval', data: { id: 'pre-1' } }, signedHeaders('pre-1')))
    expect(res.status).toBe(200)
    expect(mockGetSubscription).toHaveBeenCalledWith('pre-1')

    const { rows } = await sql`SELECT status, next_payment_date FROM tdg_agency_subscriptions WHERE mp_preapproval_id = 'pre-1'`
    expect(rows[0].status).toBe('authorized')
  })

  it('is a safe no-op (still 200) when the preapproval id is not in our database', async () => {
    mockGetSubscription.mockResolvedValue({ status: 'authorized', externalReference: 'unknown', nextPaymentDate: null })
    const res = await POST(webhookRequest('pre-unknown', { type: 'subscription_preapproval', data: { id: 'pre-unknown' } }, signedHeaders('pre-unknown')))
    expect(res.status).toBe(200)
  })

  it('bumps next_payment_date on an approved subscription_authorized_payment event', async () => {
    await sql`
      INSERT INTO tdg_agency_subscriptions (agency_id, mp_preapproval_id, plan_tier, status, transaction_amount)
      VALUES (${agencyId}, 'pre-2', 'growth', 'authorized', 77.37)
    `
    mockGetPayment.mockResolvedValue({ status: 'approved', externalReference: agencyId, dateApproved: '2026-07-05T12:00:00Z' })

    const res = await POST(webhookRequest('pay-1', { type: 'subscription_authorized_payment', data: { id: 'pay-1' } }, signedHeaders('pay-1')))
    expect(res.status).toBe(200)
    expect(mockGetPayment).toHaveBeenCalledWith('pay-1')

    const { rows } = await sql`SELECT next_payment_date FROM tdg_agency_subscriptions WHERE mp_preapproval_id = 'pre-2'`
    expect(new Date(rows[0].next_payment_date as string).getUTCMonth()).toBe(new Date('2026-08-05').getUTCMonth())
  })

  it('acknowledges (200) but ignores unknown event types', async () => {
    const res = await POST(webhookRequest('x-1', { type: 'merchant_order', data: { id: 'x-1' } }, signedHeaders('x-1')))
    expect(res.status).toBe(200)
    expect(mockGetSubscription).not.toHaveBeenCalled()
    expect(mockGetPayment).not.toHaveBeenCalled()
  })
})
