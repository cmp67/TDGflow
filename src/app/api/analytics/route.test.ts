import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email, agency: '__TDD_ANALYTICS_AGENCY__' } }
}

describe('GET /api/analytics — top_agencies com filtro de período', () => {
  const email = `tdd-analytics-${Date.now()}@example.com`
  const recentAgency = `__TDD_ANALYTICS_RECENT_${Date.now()}__`
  const oldAgency = `__TDD_ANALYTICS_OLD_${Date.now()}__`
  const hotelName = `__TDD Analytics Hotel ${Date.now()}__`
  const createdReviewIds: string[] = []

  beforeAll(async () => {
    const { rows: recentRows } = await sql`
      INSERT INTO tdg_hotel_reviews (hotel_name, agent_name, agency_name, overall_rating, created_at)
      VALUES (${hotelName}, 'TDD Agent', ${recentAgency}, 5, NOW())
      RETURNING id
    `
    createdReviewIds.push(recentRows[0].id)

    const { rows: oldRows } = await sql`
      INSERT INTO tdg_hotel_reviews (hotel_name, agent_name, agency_name, overall_rating, created_at)
      VALUES (${hotelName}, 'TDD Agent', ${oldAgency}, 4, NOW() - INTERVAL '2 months')
      RETURNING id
    `
    createdReviewIds.push(oldRows[0].id)
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_hotel_reviews WHERE id = ANY(${createdReviewIds})`
  })

  it('sem sessão retorna 401', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('top_agencies (sempre) inclui recente e antiga; top_agencies_week/top_agencies_month só a recente', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)

    const names = (arr: { agency_name: string }[]) => arr.map(a => a.agency_name)

    expect(names(body.network.top_agencies)).toContain(recentAgency)
    expect(names(body.network.top_agencies)).toContain(oldAgency)

    expect(names(body.network.top_agencies_week)).toContain(recentAgency)
    expect(names(body.network.top_agencies_week)).not.toContain(oldAgency)

    expect(names(body.network.top_agencies_month)).toContain(recentAgency)
    expect(names(body.network.top_agencies_month)).not.toContain(oldAgency)
  })
})
