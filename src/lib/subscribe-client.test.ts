import { describe, it, expect, vi, afterEach } from 'vitest'
import { subscribeToGrowth } from './subscribe-client'

const originalFetch = global.fetch

function mockFetch(status: number, body: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response)
}

describe('subscribeToGrowth', () => {
  afterEach(() => { global.fetch = originalFetch })

  it('maps 401 to unauthenticated', async () => {
    mockFetch(401, {})
    expect(await subscribeToGrowth()).toEqual({ status: 'unauthenticated' })
  })

  it('maps 422 to no_agency', async () => {
    mockFetch(422, {})
    expect(await subscribeToGrowth()).toEqual({ status: 'no_agency' })
  })

  it('maps 409 to already_subscribed', async () => {
    mockFetch(409, {})
    expect(await subscribeToGrowth()).toEqual({ status: 'already_subscribed' })
  })

  it('maps a successful response to ok + initPoint', async () => {
    mockFetch(200, { initPoint: 'https://mp.example/checkout/abc' })
    expect(await subscribeToGrowth()).toEqual({ status: 'ok', initPoint: 'https://mp.example/checkout/abc' })
  })

  it('maps a network failure to error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('boom'))
    expect(await subscribeToGrowth()).toEqual({ status: 'error', message: 'Não foi possível conectar ao servidor.' })
  })
})
