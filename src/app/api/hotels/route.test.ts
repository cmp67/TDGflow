import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

// Fixtures próprios, descartáveis — evita depender de dado real da produção
// (achado 01/08: este arquivo dependia de um hotel "La Sivoliere" que
// existia só por acaso; a Carla pediu limpeza dos dados de teste/fake
// reviews na base real, o que quebrou o teste sem ter nada a ver com o
// código do endpoint em si).
describe('GET /api/hotels (catálogo de fornecedores)', () => {
  const suffix = Date.now()
  const testedHotelName = `__TDD Hotel Testado ${suffix}__`
  const pendingHotelName = `__TDD Hotel Aguardando ${suffix}__`
  const noReviewHotelName = `__TDD Hotel Sem Review ${suffix}__`
  let testedHotelId: string
  let pendingHotelId: string
  let noReviewHotelId: string
  const reviewIds: string[] = []

  beforeAll(async () => {
    const { rows: tested } = await sql`
      INSERT INTO tdg_hotels (name, entity_type) VALUES (${testedHotelName}, 'hotel') RETURNING id
    `
    testedHotelId = tested[0].id as string

    const { rows: pending } = await sql`
      INSERT INTO tdg_hotels (name, entity_type) VALUES (${pendingHotelName}, 'hotel') RETURNING id
    `
    pendingHotelId = pending[0].id as string

    // Fixture próprio pro caso "sem review nenhuma" — antes usava
    // 'Martinhal Sagres' (hotel curado real), quebrou de novo (02/08) assim
    // que o import do WhatsApp deu review de verdade pra ele. Mesma lição
    // do achado de 01/08: nunca depender de um hotel real ficar vazio pra
    // sempre.
    const { rows: noReview } = await sql`
      INSERT INTO tdg_hotels (name, entity_type) VALUES (${noReviewHotelName}, 'hotel') RETURNING id
    `
    noReviewHotelId = noReview[0].id as string

    const { rows: publishedReview } = await sql`
      INSERT INTO tdg_hotel_reviews (hotel_name, hotel_id, agent_name, agency_name, status)
      VALUES (${testedHotelName}, ${testedHotelId}, 'TDD Agent', 'TDD Agency', 'published')
      RETURNING id
    `
    reviewIds.push(publishedReview[0].id as string)

    const { rows: leadReview } = await sql`
      INSERT INTO tdg_hotel_reviews (hotel_name, hotel_id, agent_name, agency_name, status, visit_type)
      VALUES (${pendingHotelName}, ${pendingHotelId}, 'TDD Agent', 'TDD Agency', 'a_testar', 'commercial_meeting')
      RETURNING id
    `
    reviewIds.push(leadReview[0].id as string)
  })

  afterAll(async () => {
    if (reviewIds.length > 0) {
      await sql.query('DELETE FROM tdg_hotel_reviews WHERE id = ANY($1)', [reviewIds])
    }
    await sql`DELETE FROM tdg_hotels WHERE id = ${testedHotelId}`
    await sql`DELETE FROM tdg_hotels WHERE id = ${pendingHotelId}`
    await sql`DELETE FROM tdg_hotels WHERE id = ${noReviewHotelId}`
  })

  it('returns 401 with no session', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns the seeded catalog with all fields the frontend card needs', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('any@example.com'))
    const res  = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(body.hotels)).toBe(true)
    expect(body.hotels.length).toBeGreaterThan(0)

    const sagres = body.hotels.find((h: { name: string }) => h.name === 'Martinhal Sagres')
    expect(sagres).toBeTruthy()
    expect(sagres.location).toBe('Sagres, Algarve, Portugal')
    expect(sagres.currency).toBe('EUR')
    expect(sagres.group_name).toBe('Martinhal')
    expect(Array.isArray(sagres.profiles)).toBe(true)
    expect(sagres.profiles).toContain('Família')
    expect(Array.isArray(sagres.gallery)).toBe(true)
    expect(sagres.gallery[0]).toHaveProperty('label')
  })

  it('includes um hotel criado a partir de review com hotel_id — catálogo cresce organicamente', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('any@example.com'))
    const res  = await GET()
    const body = await res.json()

    const created = body.hotels.find((h: { name: string }) => h.name === testedHotelName)
    expect(created).toBeTruthy()
  })

  it('reports tested_count from published reviews linked by hotel_id', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('any@example.com'))
    const res  = await GET()
    const body = await res.json()

    const testado = body.hotels.find((h: { name: string }) => h.name === testedHotelName)
    expect(testado.tested_count).toBeGreaterThanOrEqual(1)
    expect(testado.pending_lead_count).toBe(0)

    const aguardando = body.hotels.find((h: { name: string }) => h.name === pendingHotelName)
    expect(aguardando.tested_count).toBe(0)
    expect(aguardando.pending_lead_count).toBeGreaterThanOrEqual(1)

    const semReview = body.hotels.find((h: { name: string }) => h.name === noReviewHotelName)
    expect(semReview.tested_count).toBe(0)
    expect(semReview.pending_lead_count).toBe(0)
  })

  it('benefits vem [] quando o fornecedor não tem condição negociada, sem quebrar tested_count', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('any@example.com'))
    const res  = await GET()
    const body = await res.json()

    const semBeneficio = body.hotels.find((h: { name: string }) => h.name === testedHotelName)
    expect(semBeneficio.benefits).toEqual([])
  })
})
