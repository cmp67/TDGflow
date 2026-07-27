import { describe, it, expect, afterEach } from 'vitest'
import { sql } from '@vercel/postgres'
import { getOrCreateAgreementWindow } from './subscriptions'

describe('getOrCreateAgreementWindow', () => {
  const testKey = `__tdd_agreement_window_${Date.now()}__`

  afterEach(async () => {
    await sql`DELETE FROM tdg_agreement_window WHERE key = ${testKey}`
  })

  it('persists the window computed on first call', async () => {
    const startDate = new Date('2026-08-05T00:00:00.000Z')
    const endDate   = new Date('2028-08-05T00:00:00.000Z')

    const result = await getOrCreateAgreementWindow(() => ({ startDate, endDate }), testKey)

    expect(result.startDate.toISOString()).toBe(startDate.toISOString())
    expect(result.endDate.toISOString()).toBe(endDate.toISOString())
  })

  it('ignores the compute callback on later calls — every caller shares the first-written window', async () => {
    const first = await getOrCreateAgreementWindow(
      () => ({ startDate: new Date('2026-08-05T00:00:00.000Z'), endDate: new Date('2028-08-05T00:00:00.000Z') }),
      testKey,
    )

    // A "later agency" computes a completely different window — it must NOT win.
    const second = await getOrCreateAgreementWindow(
      () => ({ startDate: new Date('2026-11-05T00:00:00.000Z'), endDate: new Date('2029-11-05T00:00:00.000Z') }),
      testKey,
    )

    expect(second.startDate.toISOString()).toBe(first.startDate.toISOString())
    expect(second.endDate.toISOString()).toBe(first.endDate.toISOString())
  })
})
