import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGetOrCreateAgreementWindow = vi.fn(
  (computeDefault: () => { startDate: Date; endDate: Date }) => Promise.resolve(computeDefault()),
)
vi.mock('@/lib/subscriptions', () => ({
  getOrCreateAgreementWindow: (computeDefault: () => { startDate: Date; endDate: Date }) =>
    mockGetOrCreateAgreementWindow(computeDefault),
}))

import { createAgencyCheckout, getSubscription, getPayment } from './asaas'

const originalFetch = global.fetch

describe('createAgencyCheckout', () => {
  beforeEach(() => {
    mockGetOrCreateAgreementWindow.mockClear()
    mockGetOrCreateAgreementWindow.mockImplementation(
      (computeDefault: () => { startDate: Date; endDate: Date }) => Promise.resolve(computeDefault()),
    )
    process.env.ASAAS_API_KEY = 'test-key'
    process.env.ASAAS_ENV     = 'sandbox'
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('throws if ASAAS_API_KEY is not configured', async () => {
    delete process.env.ASAAS_API_KEY
    await expect(createAgencyCheckout({
      agencyId: 'agency-1', agencyName: 'Agência Teste', agencyCnpj: '11.111.111/0001-11',
      payerEmail: 'a@example.com', successUrl: 'https://x/confirmacao', cancelUrl: 'https://x/confirmacao',
    })).rejects.toThrow('ASAAS_API_KEY')
  })

  it('sends externalReference = agencyId, cnpj do responsável, e preço fixo do Growth', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ id: 'checkout-123', checkoutUrl: 'https://checkout.asaas.com/checkout-123' }),
    })
    global.fetch = mockFetch as unknown as typeof fetch

    const result = await createAgencyCheckout({
      agencyId: 'agency-1', agencyName: 'Agência Teste', agencyCnpj: '11.111.111/0001-11',
      payerEmail: 'admin@agencia.com', successUrl: 'https://tdg-flow.example/flow/billing/confirmacao', cancelUrl: 'https://tdg-flow.example/flow/billing/confirmacao',
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api-sandbox.asaas.com/v3/checkouts',
      expect.objectContaining({ method: 'POST' }),
    )
    const call = mockFetch.mock.calls[0][1] as RequestInit
    const body = JSON.parse(call.body as string)

    expect(body.externalReference).toBe('agency-1')
    expect(body.customerData).toEqual({ name: 'Agência Teste', email: 'admin@agencia.com', cpfCnpj: '11.111.111/0001-11' })
    expect(body.items).toEqual([{ name: 'TDG Flow — Plano Growth', quantity: 1, price: 77.37 }])
    expect(body.subscription.cycle).toBe('MONTHLY')
    expect(body.chargeTypes).toEqual(['RECURRENT'])

    expect(result).toEqual({ checkoutId: 'checkout-123', checkoutUrl: 'https://checkout.asaas.com/checkout-123' })
  })

  it('anchors nextDueDate on day 5 and caps endDate 24 months later', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ id: 'checkout-123', checkoutUrl: 'https://checkout.asaas.com/checkout-123' }),
    })
    global.fetch = mockFetch as unknown as typeof fetch

    await createAgencyCheckout({
      agencyId: 'agency-1', agencyName: 'Agência Teste', agencyCnpj: '11.111.111/0001-11',
      payerEmail: 'admin@agencia.com', successUrl: 'https://x/confirmacao', cancelUrl: 'https://x/confirmacao',
    })

    const call = mockFetch.mock.calls[0][1] as RequestInit
    const { subscription } = JSON.parse(call.body as string)
    const start = new Date(subscription.nextDueDate)
    const end   = new Date(subscription.endDate)

    expect(start.getUTCDate()).toBe(5)
    expect(end.getUTCDate()).toBe(5)
    expect(
      (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth()),
    ).toBe(24)
  })

  it('uses the shared endDate from getOrCreateAgreementWindow, not a locally recomputed one', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ id: 'checkout-123', checkoutUrl: 'https://checkout.asaas.com/checkout-123' }),
    })
    global.fetch = mockFetch as unknown as typeof fetch

    const sharedEndDate = new Date('2028-03-05T00:00:00.000Z')
    mockGetOrCreateAgreementWindow.mockResolvedValueOnce({
      startDate: new Date('2026-03-05T00:00:00.000Z'),
      endDate:   sharedEndDate,
    })

    await createAgencyCheckout({
      agencyId: 'agency-late-joiner', agencyName: 'Agência Teste', agencyCnpj: '11.111.111/0001-11',
      payerEmail: 'admin@agencia.com', successUrl: 'https://x/confirmacao', cancelUrl: 'https://x/confirmacao',
    })

    const call = mockFetch.mock.calls[0][1] as RequestInit
    const { subscription } = JSON.parse(call.body as string)
    expect(subscription.endDate).toBe('2028-03-05')
  })

  it('throws with the Asaas error body when the API call fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 400, text: () => Promise.resolve('{"errors":[{"description":"cpfCnpj inválido"}]}'),
    }) as unknown as typeof fetch

    await expect(createAgencyCheckout({
      agencyId: 'agency-1', agencyName: 'Agência Teste', agencyCnpj: 'invalido',
      payerEmail: 'a@example.com', successUrl: 'https://x/confirmacao', cancelUrl: 'https://x/confirmacao',
    })).rejects.toThrow(/cpfCnpj inválido/)
  })

  it('throws if Asaas returns no id/checkoutUrl', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }) as unknown as typeof fetch

    await expect(createAgencyCheckout({
      agencyId: 'agency-1', agencyName: 'Agência Teste', agencyCnpj: '11.111.111/0001-11',
      payerEmail: 'a@example.com', successUrl: 'https://x/confirmacao', cancelUrl: 'https://x/confirmacao',
    })).rejects.toThrow('Resposta inesperada')
  })
})

describe('getSubscription / getPayment', () => {
  beforeEach(() => {
    process.env.ASAAS_API_KEY = 'test-key'
    process.env.ASAAS_ENV     = 'sandbox'
  })
  afterEach(() => { global.fetch = originalFetch })

  it('getSubscription reads status/customer/externalReference/nextDueDate from the resource', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({
        id: 'sub-1', status: 'ACTIVE', customer: 'cus-1', externalReference: 'agency-1', nextDueDate: '2026-08-05',
      }),
    }) as unknown as typeof fetch

    const result = await getSubscription('sub-1')
    expect(result).toEqual({ id: 'sub-1', status: 'ACTIVE', customerId: 'cus-1', externalReference: 'agency-1', nextDueDate: '2026-08-05' })
  })

  it('getPayment falls back to paymentDate when confirmedDate is absent', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({
        status: 'RECEIVED', subscription: 'sub-1', confirmedDate: null, paymentDate: '2026-07-05',
      }),
    }) as unknown as typeof fetch

    const result = await getPayment('pay-1')
    expect(result).toEqual({ status: 'RECEIVED', subscriptionId: 'sub-1', confirmedDate: '2026-07-05' })
  })
})
