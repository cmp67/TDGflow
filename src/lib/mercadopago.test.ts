import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()

vi.mock('mercadopago', () => ({
  MercadoPagoConfig: class { constructor(opts: unknown) { Object.assign(this as object, opts as object) } },
  PreApproval: class { create = mockCreate },
}))

// Pass-through by default — most tests just care that createAgencySubscription
// delegates the end_date decision to the shared-window helper, not that it
// recomputes one locally. Tests that care about the shared value override
// this per-call with mockResolvedValueOnce.
const mockGetOrCreateAgreementWindow = vi.fn(
  (computeDefault: () => { startDate: Date; endDate: Date }, _key?: string) => Promise.resolve(computeDefault()),
)
vi.mock('@/lib/subscriptions', () => ({
  getOrCreateAgreementWindow: (computeDefault: () => { startDate: Date; endDate: Date }, key?: string) =>
    mockGetOrCreateAgreementWindow(computeDefault, key),
}))

import { createAgencySubscription } from './mercadopago'

describe('createAgencySubscription', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockGetOrCreateAgreementWindow.mockClear()
    mockGetOrCreateAgreementWindow.mockImplementation(
      (computeDefault: () => { startDate: Date; endDate: Date }) => Promise.resolve(computeDefault()),
    )
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-token'
  })

  it('throws if MERCADOPAGO_ACCESS_TOKEN is not configured', async () => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN
    await expect(createAgencySubscription({
      agencyId: 'agency-1', payerEmail: 'a@example.com', backUrl: 'https://x/confirmacao',
    })).rejects.toThrow('MERCADOPAGO_ACCESS_TOKEN')
  })

  it('sends external_reference = agencyId and payer_email, with fixed Growth pricing', async () => {
    mockCreate.mockResolvedValue({ id: 'pre-123', init_point: 'https://mp.example/checkout/pre-123' })

    const result = await createAgencySubscription({
      agencyId: 'agency-1', payerEmail: 'admin@agencia.com', backUrl: 'https://tdg-flow.example/flow/billing/confirmacao',
    })

    expect(mockCreate).toHaveBeenCalledWith({
      body: expect.objectContaining({
        external_reference: 'agency-1',
        payer_email:        'admin@agencia.com',
        back_url:           'https://tdg-flow.example/flow/billing/confirmacao',
        auto_recurring: expect.objectContaining({
          frequency:          1,
          frequency_type:     'months',
          transaction_amount: 77.37,
          currency_id:        'BRL',
          start_date:         expect.any(String),
          end_date:           expect.any(String),
        }),
      }),
    })
    expect(result).toEqual({ preapprovalId: 'pre-123', initPoint: 'https://mp.example/checkout/pre-123' })
  })

  it('anchors start_date on day 5 and caps end_date 24 months later', async () => {
    mockCreate.mockResolvedValue({ id: 'pre-123', init_point: 'https://mp.example/checkout/pre-123' })

    await createAgencySubscription({
      agencyId: 'agency-1', payerEmail: 'admin@agencia.com', backUrl: 'https://tdg-flow.example/flow/billing/confirmacao',
    })

    const { auto_recurring } = mockCreate.mock.calls[0][0].body
    const start = new Date(auto_recurring.start_date)
    const end   = new Date(auto_recurring.end_date)

    expect(start.getUTCDate()).toBe(5)
    expect(end.getUTCDate()).toBe(5)
    expect(
      (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth()),
    ).toBe(24)
  })

  it('uses the shared end_date from getOrCreateAgreementWindow, not a locally recomputed one', async () => {
    mockCreate.mockResolvedValue({ id: 'pre-123', init_point: 'https://mp.example/checkout/pre-123' })
    const sharedEndDate = new Date('2028-03-05T00:00:00.000Z')
    mockGetOrCreateAgreementWindow.mockResolvedValueOnce({
      startDate: new Date('2026-03-05T00:00:00.000Z'),
      endDate:   sharedEndDate,
    })

    await createAgencySubscription({
      agencyId: 'agency-late-joiner', payerEmail: 'admin@agencia.com', backUrl: 'https://tdg-flow.example/flow/billing/confirmacao',
    })

    const { auto_recurring } = mockCreate.mock.calls[0][0].body
    expect(auto_recurring.end_date).toBe(sharedEndDate.toISOString())
    expect(typeof mockGetOrCreateAgreementWindow.mock.calls[0][0]).toBe('function')
  })

  it('throws if Mercado Pago returns no id/init_point', async () => {
    mockCreate.mockResolvedValue({})
    await expect(createAgencySubscription({
      agencyId: 'agency-1', payerEmail: 'a@example.com', backUrl: 'https://x/confirmacao',
    })).rejects.toThrow('Resposta inesperada')
  })
})
