import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()

vi.mock('mercadopago', () => ({
  MercadoPagoConfig: class { constructor(opts: unknown) { Object.assign(this as object, opts as object) } },
  PreApproval: class { create = mockCreate },
}))

import { createAgencySubscription } from './mercadopago'

describe('createAgencySubscription', () => {
  beforeEach(() => {
    mockCreate.mockReset()
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
          transaction_amount: 1470,
          currency_id:        'BRL',
        }),
      }),
    })
    expect(result).toEqual({ preapprovalId: 'pre-123', initPoint: 'https://mp.example/checkout/pre-123' })
  })

  it('throws if Mercado Pago returns no id/init_point', async () => {
    mockCreate.mockResolvedValue({})
    await expect(createAgencySubscription({
      agencyId: 'agency-1', payerEmail: 'a@example.com', backUrl: 'https://x/confirmacao',
    })).rejects.toThrow('Resposta inesperada')
  })
})
