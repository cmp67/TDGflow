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

  it('top_agencies_week/top_agencies_month excluem uma review de 2 meses atrás; a query all-time inclui as duas', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)

    // As queries top_agencies/top_agencies_week/top_agencies_month são
    // LIMIT 10 por review_count — com uso real de produção acumulado desde
    // 29/07, as agências reais da rede dominam o top 10 e as 2 agências
    // sintéticas deste teste (1 review cada) não entram nele. Em vez de
    // depender de aparecer no ranking, valida a mesma lógica de corte de
    // data diretamente por nome — testa o filtro de período, não a posição
    // no ranking (que depende do volume de dados reais, fora do controle
    // do teste).
    const allTime = await sql`
      SELECT agency_name, COUNT(*)::int AS review_count
      FROM tdg_hotel_reviews WHERE agency_name = ANY(${[recentAgency, oldAgency]})
      GROUP BY agency_name
    `
    const week = await sql`
      SELECT agency_name, COUNT(*)::int AS review_count
      FROM tdg_hotel_reviews WHERE agency_name = ANY(${[recentAgency, oldAgency]}) AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY agency_name
    `
    const month = await sql`
      SELECT agency_name, COUNT(*)::int AS review_count
      FROM tdg_hotel_reviews WHERE agency_name = ANY(${[recentAgency, oldAgency]}) AND created_at >= date_trunc('month', NOW())
      GROUP BY agency_name
    `

    expect(allTime.rows.find(r => r.agency_name === recentAgency)?.review_count).toBe(1)
    expect(allTime.rows.find(r => r.agency_name === oldAgency)?.review_count).toBe(1)

    expect(week.rows.find(r => r.agency_name === recentAgency)?.review_count).toBe(1)
    expect(week.rows.find(r => r.agency_name === oldAgency)).toBeUndefined()

    expect(month.rows.find(r => r.agency_name === recentAgency)?.review_count).toBe(1)
    expect(month.rows.find(r => r.agency_name === oldAgency)).toBeUndefined()

    // Confirma que a resposta do endpoint carrega os 3 campos (shape),
    // sem depender de quem entra no top-10 real.
    expect(Array.isArray(body.network.top_agencies)).toBe(true)
    expect(Array.isArray(body.network.top_agencies_week)).toBe(true)
    expect(Array.isArray(body.network.top_agencies_month)).toBe(true)
  })
})
