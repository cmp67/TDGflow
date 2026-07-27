import { describe, it, expect, afterEach, vi } from 'vitest'
import { fetchOwnBalance, buyTopUp } from './topup-client'

// Pure client-side helpers around GET/POST /api/credits — no React rendering
// involved (the project has no component-testing infra set up yet), so we
// unit test the fetch/response-mapping logic in isolation by mocking
// `global.fetch` directly. This is the layer the UI component depends on;
// covering it gives us confidence in all the status-code branches (200,
// 400, 401, 422, 500, network failure) without needing jsdom/RTL.

function mockFetchOnce(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  })
}

describe('fetchOwnBalance', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns ready with balance on 200', async () => {
    global.fetch = mockFetchOnce(200, { balance: { balance: 2500, tier: 'pkg_100' } }) as unknown as typeof fetch

    const result = await fetchOwnBalance()

    expect(result).toEqual({ status: 'ready', balance: { balance: 2500, tier: 'pkg_100' } })
  })

  it('returns unauthenticated on 401', async () => {
    global.fetch = mockFetchOnce(401, { error: 'Unauthorized' }) as unknown as typeof fetch

    const result = await fetchOwnBalance()

    expect(result).toEqual({ status: 'unauthenticated' })
  })

  it('returns no_agency on 422', async () => {
    global.fetch = mockFetchOnce(422, { error: 'Usuário sem agência vinculada' }) as unknown as typeof fetch

    const result = await fetchOwnBalance()

    expect(result).toEqual({ status: 'no_agency' })
  })

  it('returns error with server message on 500', async () => {
    global.fetch = mockFetchOnce(500, { error: 'boom' }) as unknown as typeof fetch

    const result = await fetchOwnBalance()

    expect(result).toEqual({ status: 'error', message: 'boom' })
  })

  it('returns a generic error when the body has no error message', async () => {
    global.fetch = mockFetchOnce(500, {}) as unknown as typeof fetch

    const result = await fetchOwnBalance()

    expect(result.status).toBe('error')
  })

  it('maps a 200 response with no balance to no_agency (e.g. admin accounts with no agency_id)', async () => {
    // GET /api/credits only includes `balance` when the caller has an
    // agency_id — admins without one (all 4 today) get 200 + no `balance`,
    // not an error. This must render the same graceful "no agency" state
    // as the explicit 422, not a scary server-error banner.
    global.fetch = mockFetchOnce(200, { tiers: [], lumiSettings: {}, agencyBreakdown: [] }) as unknown as typeof fetch

    const result = await fetchOwnBalance()

    expect(result).toEqual({ status: 'no_agency' })
  })

  it('returns error when fetch throws (network failure)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch

    const result = await fetchOwnBalance()

    expect(result.status).toBe('error')
  })
})

describe('buyTopUp', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('sends action=top_up and the chosen tier, returns updated balance on 200', async () => {
    const fetchMock = mockFetchOnce(200, { ok: true, balance: { balance: 9500, tier: 'pkg_500' } })
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await buyTopUp('pkg_500')

    expect(result).toEqual({ status: 'ok', balance: { balance: 9500, tier: 'pkg_500' } })
    expect(fetchMock).toHaveBeenCalledWith('/api/credits', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'top_up', tier: 'pkg_500' }),
    }))
  })

  it('returns invalid_tier on 400', async () => {
    global.fetch = mockFetchOnce(400, { error: 'Tier inválido' }) as unknown as typeof fetch

    const result = await buyTopUp('not-a-tier' as never)

    expect(result).toEqual({ status: 'invalid_tier', message: 'Tier inválido' })
  })

  it('returns unauthenticated on 401', async () => {
    global.fetch = mockFetchOnce(401, { error: 'Unauthorized' }) as unknown as typeof fetch

    const result = await buyTopUp('pkg_100')

    expect(result).toEqual({ status: 'unauthenticated' })
  })

  it('returns no_agency on 422', async () => {
    global.fetch = mockFetchOnce(422, { error: 'Usuário sem agência vinculada' }) as unknown as typeof fetch

    const result = await buyTopUp('pkg_100')

    expect(result).toEqual({ status: 'no_agency' })
  })

  it('returns error with server message on 500', async () => {
    global.fetch = mockFetchOnce(500, { error: 'db down' }) as unknown as typeof fetch

    const result = await buyTopUp('pkg_100')

    expect(result).toEqual({ status: 'error', message: 'db down' })
  })

  it('returns error when fetch throws (network failure)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch

    const result = await buyTopUp('pkg_100')

    expect(result.status).toBe('error')
  })
})
