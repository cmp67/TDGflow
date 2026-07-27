import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sql } from '@vercel/postgres'

vi.mock('@/lib/asaas', () => ({
  getSubscription: vi.fn(),
  getPayment:      vi.fn(),
}))

import { getSubscription, getPayment } from '@/lib/asaas'
import { POST } from './route'

const mockGetSubscription = getSubscription as unknown as ReturnType<typeof vi.fn>
const mockGetPayment      = getPayment as unknown as ReturnType<typeof vi.fn>

const WEBHOOK_TOKEN = 'test-webhook-token'

function webhookRequest(body: unknown, token: string | null = WEBHOOK_TOKEN): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) headers['asaas-access-token'] = token
  return new NextRequest('http://localhost/api/billing/webhook', {
    method:  'POST',
    headers,
    body:    JSON.stringify(body),
  })
}

describe('POST /api/billing/webhook', () => {
  let agencyId: string
  const cnpj = `55.555.555/${Date.now().toString().slice(-4)}-55`

  beforeAll(async () => {
    process.env.ASAAS_WEBHOOK_TOKEN = WEBHOOK_TOKEN
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

  it('returns 401 when the token header is missing', async () => {
    const res = await POST(webhookRequest({ event: 'SUBSCRIPTION_CREATED', subscription: { id: 'sub-1' } }, null))
    expect(res.status).toBe(401)
    expect(mockGetSubscription).not.toHaveBeenCalled()
  })

  it('returns 401 when the token does not match (forged request)', async () => {
    const res = await POST(webhookRequest({ event: 'SUBSCRIPTION_CREATED', subscription: { id: 'sub-1' } }, 'wrong-token'))
    expect(res.status).toBe(401)
    expect(mockGetSubscription).not.toHaveBeenCalled()
  })

  it('updates the subscription row on SUBSCRIPTION_UPDATED when it already has the real provider id', async () => {
    await sql`
      INSERT INTO tdg_agency_subscriptions (agency_id, provider_subscription_id, plan_tier, status, transaction_amount)
      VALUES (${agencyId}, 'sub-1', 'growth', 'authorized', 77.37)
    `
    mockGetSubscription.mockResolvedValue({
      id: 'sub-1', status: 'INACTIVE', customerId: 'cus-1', externalReference: agencyId, nextDueDate: '2026-08-05',
    })

    const res = await POST(webhookRequest({ event: 'SUBSCRIPTION_UPDATED', subscription: { id: 'sub-1' } }))
    expect(res.status).toBe(200)
    expect(mockGetSubscription).toHaveBeenCalledWith('sub-1')

    const { rows } = await sql`SELECT status FROM tdg_agency_subscriptions WHERE provider_subscription_id = 'sub-1'`
    expect(rows[0].status).toBe('paused')
  })

  it('links the placeholder checkout id to the real subscription id on the first SUBSCRIPTION_CREATED event', async () => {
    await sql`
      INSERT INTO tdg_agency_subscriptions (agency_id, provider_subscription_id, plan_tier, status, transaction_amount)
      VALUES (${agencyId}, 'checkout-provisional', 'growth', 'pending', 77.37)
    `
    mockGetSubscription.mockResolvedValue({
      id: 'sub-real-123', status: 'ACTIVE', customerId: 'cus-real', externalReference: agencyId, nextDueDate: '2026-08-05',
    })

    const res = await POST(webhookRequest({ event: 'SUBSCRIPTION_CREATED', subscription: { id: 'sub-real-123' } }))
    expect(res.status).toBe(200)

    const { rows } = await sql`SELECT status, provider_subscription_id, provider_customer_id FROM tdg_agency_subscriptions WHERE agency_id = ${agencyId}`
    expect(rows).toHaveLength(1)
    expect(rows[0].provider_subscription_id).toBe('sub-real-123')
    expect(rows[0].provider_customer_id).toBe('cus-real')
    expect(rows[0].status).toBe('authorized')
  })

  it('cancels directly (no re-fetch) on SUBSCRIPTION_DELETED', async () => {
    await sql`
      INSERT INTO tdg_agency_subscriptions (agency_id, provider_subscription_id, plan_tier, status, transaction_amount)
      VALUES (${agencyId}, 'sub-del', 'growth', 'authorized', 77.37)
    `
    const res = await POST(webhookRequest({ event: 'SUBSCRIPTION_DELETED', subscription: { id: 'sub-del' } }))
    expect(res.status).toBe(200)
    expect(mockGetSubscription).not.toHaveBeenCalled()

    const { rows } = await sql`SELECT status FROM tdg_agency_subscriptions WHERE provider_subscription_id = 'sub-del'`
    expect(rows[0].status).toBe('cancelled')
  })

  it('bumps next_payment_date on a PAYMENT_CONFIRMED event', async () => {
    await sql`
      INSERT INTO tdg_agency_subscriptions (agency_id, provider_subscription_id, plan_tier, status, transaction_amount)
      VALUES (${agencyId}, 'sub-pay', 'growth', 'authorized', 77.37)
    `
    mockGetPayment.mockResolvedValue({ status: 'CONFIRMED', subscriptionId: 'sub-pay', confirmedDate: '2026-07-05T12:00:00Z' })

    const res = await POST(webhookRequest({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay-1' } }))
    expect(res.status).toBe(200)
    expect(mockGetPayment).toHaveBeenCalledWith('pay-1')

    const { rows } = await sql`SELECT next_payment_date FROM tdg_agency_subscriptions WHERE provider_subscription_id = 'sub-pay'`
    expect(new Date(rows[0].next_payment_date as string).getUTCMonth()).toBe(new Date('2026-08-05').getUTCMonth())
  })

  it('is a safe no-op (still 200) when the payment references a subscription we never recorded', async () => {
    mockGetPayment.mockResolvedValue({ status: 'RECEIVED', subscriptionId: 'sub-unknown', confirmedDate: '2026-07-05T12:00:00Z' })
    const res = await POST(webhookRequest({ event: 'PAYMENT_RECEIVED', payment: { id: 'pay-unknown' } }))
    expect(res.status).toBe(200)
  })

  it('acknowledges (200) but ignores unknown event types', async () => {
    const res = await POST(webhookRequest({ event: 'PAYMENT_CHECKOUT_VIEWED', payment: { id: 'x-1' } }))
    expect(res.status).toBe(200)
    expect(mockGetSubscription).not.toHaveBeenCalled()
    expect(mockGetPayment).not.toHaveBeenCalled()
  })
})
