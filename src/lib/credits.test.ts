import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'
import {
  checkAndDeductCredits,
  getQuotaStatus,
  INSUFFICIENT_BALANCE,
  NO_AGENCY,
} from './credits'

// Integration tests — these hit the real dev Postgres database (Neon) via
// @vercel/postgres, exercising the actual tdg_agency_cycles / tdg_credits_*
// tables now that agency_id is a real uuid FK to tdg_agencies(id).
//
// A disposable agency row is created before the suite and fully torn down
// afterwards, so no real agency data is touched.

function currentPeriod(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
}

describe('checkAndDeductCredits (post agency_id-uuid migration)', () => {
  let testAgencyId: string
  const testCnpj = `00.000.000/${Date.now().toString().slice(-4)}-00`

  beforeAll(async () => {
    const { rows } = await sql`
      INSERT INTO tdg_agencies (name, cnpj)
      VALUES ('__TDD_TEST_AGENCY__', ${testCnpj})
      RETURNING id
    `
    testAgencyId = rows[0].id as string
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_credits_ledger WHERE agency_id = ${testAgencyId}`
    await sql`DELETE FROM tdg_agency_cycles WHERE agency_id = ${testAgencyId}`
    await sql`DELETE FROM tdg_credits_balance WHERE agency_id = ${testAgencyId}`
    await sql`DELETE FROM tdg_agencies WHERE id = ${testAgencyId}`
  })

  it('accepts a real agency uuid and deducts from the monthly quota', async () => {
    const result = await checkAndDeductCredits({
      agencyId: testAgencyId,
      action: 'chat',
      userEmail: 'tdd-test@example.com',
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.source).toBe('quota')

    const status = await getQuotaStatus(testAgencyId)
    expect(status.consumed).toBeGreaterThanOrEqual(9)
  })

  it('fails closed with NO_AGENCY when the caller has no agency assigned', async () => {
    const result = await checkAndDeductCredits({
      agencyId: null,
      action: 'chat',
      userEmail: 'no-agency@example.com',
    })

    expect(result).toEqual({ ok: false, reason: NO_AGENCY })
  })

  it('falls through to INSUFFICIENT_BALANCE once quota, pool and top-up are all exhausted', async () => {
    const period = currentPeriod()

    // Ensure a cycle row exists, then zero it out so the quota step fails.
    await sql`
      INSERT INTO tdg_agency_cycles (agency_id, period, quota)
      VALUES (${testAgencyId}, ${period}, 500)
      ON CONFLICT (agency_id, period) DO NOTHING
    `
    await sql`
      UPDATE tdg_agency_cycles
      SET quota = 0, consumed = 0
      WHERE agency_id = ${testAgencyId} AND period = ${period}
    `

    const result = await checkAndDeductCredits({
      agencyId: testAgencyId,
      action: 'chat',
      userEmail: 'tdd-test@example.com',
    })

    expect(result).toEqual({ ok: false, reason: INSUFFICIENT_BALANCE })
  })

  it('rejects an agency_id that does not exist in tdg_agencies (FK enforced)', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000'

    await expect(
      checkAndDeductCredits({
        agencyId: fakeUuid,
        action: 'chat',
        userEmail: 'tdd-test@example.com',
      })
    ).rejects.toThrow()
  })
})
