import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchSubscriptionStatus } from './subscription-status-client'

const originalFetch = global.fetch

function mockFetch(status: number, body: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response)
}

describe('fetchSubscriptionStatus', () => {
  afterEach(() => { global.fetch = originalFetch })

  it('maps 401 to unauthenticated', async () => {
    mockFetch(401, {})
    expect(await fetchSubscriptionStatus()).toEqual({ status: 'unauthenticated' })
  })

  it('maps 422 to no_agency', async () => {
    mockFetch(422, {})
    expect(await fetchSubscriptionStatus()).toEqual({ status: 'no_agency' })
  })

  it('maps an authorized subscription with full fields', async () => {
    mockFetch(200, { status: 'authorized', planTier: 'growth', transactionAmount: 77.37, nextPaymentDate: '2026-08-05' })
    expect(await fetchSubscriptionStatus()).toEqual({
      status: 'authorized', planTier: 'growth', transactionAmount: 77.37, nextPaymentDate: '2026-08-05',
    })
  })

  it('maps status "none" when there is no subscription yet', async () => {
    mockFetch(200, { status: 'none' })
    expect(await fetchSubscriptionStatus()).toEqual({ status: 'none' })
  })

  it('maps a network failure to error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('boom'))
    expect(await fetchSubscriptionStatus()).toEqual({ status: 'error', message: 'Não foi possível conectar ao servidor.' })
  })

  it('always calls the endpoint without a query param — status is resolved by session, never by an id in the URL', async () => {
    mockFetch(200, { status: 'pending' })
    await fetchSubscriptionStatus()
    expect(global.fetch).toHaveBeenCalledWith('/api/billing/subscription-status')
  })
})
