import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { POST, GET } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

function postReq(body: unknown) {
  return new Request('http://localhost/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

function getReq(query: string) {
  return new Request(`http://localhost/api/reviews?${query}`) as unknown as Parameters<typeof GET>[0]
}

describe('POST /api/reviews — hotel_id find-or-create (Fase 1)', () => {
  const email = `tdd-reviews-hotelid-${Date.now()}@example.com`
  const createdHotelNames = [
    `__TDD Hotel Novo ${Date.now()}__`,
  ]
  const createdReviewIds: string[] = []

  beforeAll(async () => {
    // Sem agency_id — checkAndDeductCredits falha cedo (NO_AGENCY), então a
    // extração por IA nunca chega a rodar; o teste não depende de rede nem
    // de créditos reais, só do fluxo de gravação da review em si.
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
      VALUES ('TDD Reviewer', ${email}, '__TDD_AGENCY__', 'x', 'agent')
    `
  })

  afterAll(async () => {
    if (createdReviewIds.length) {
      await sql`DELETE FROM tdg_hotel_reviews WHERE id = ANY(${createdReviewIds})`
    }
    await sql`DELETE FROM tdg_users WHERE email = ${email}`
    await sql`DELETE FROM tdg_hotels WHERE name = ANY(${createdHotelNames})`
  })

  it('links to the existing catalog entry by name, case-insensitively', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await POST(postReq({
      hotel_name: 'martinhal sagres', // minúsculo de propósito — catálogo tem "Martinhal Sagres"
      entity_type: 'hotel',
      overall_rating: 4,
      raw_answers: { impressions: 'ótimo' },
    }))
    const body = await res.json()
    expect(res.status).toBe(200)
    createdReviewIds.push(body.review.id)

    const { rows } = await sql`SELECT h.name FROM tdg_hotels h WHERE h.id = ${body.review.hotel_id}`
    expect(rows[0]?.name).toBe('Martinhal Sagres')
  })

  it('creates a new catalog entry for a hotel name not seen before', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await POST(postReq({
      hotel_name: createdHotelNames[0],
      entity_type: 'hotel',
      overall_rating: 3,
      raw_answers: { impressions: 'novo' },
    }))
    const body = await res.json()
    expect(res.status).toBe(200)
    createdReviewIds.push(body.review.id)
    expect(body.review.hotel_id).toBeTruthy()

    const { rows } = await sql`SELECT name FROM tdg_hotels WHERE id = ${body.review.hotel_id}`
    expect(rows[0]?.name).toBe(createdHotelNames[0])
  })

  it('does not attach hotel_id for non-hotel entity types', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await POST(postReq({
      hotel_name: 'Bar da Praia',
      entity_type: 'beach_club',
      overall_rating: 2,
      raw_answers: { impressions: 'legal' },
    }))
    const body = await res.json()
    expect(res.status).toBe(200)
    createdReviewIds.push(body.review.id)
    expect(body.review.hotel_id).toBeNull()
  })
})

describe('GET /api/reviews?hotelId= (Fase 2 — ficha do fornecedor puxa as próprias reviews)', () => {
  const email = `tdd-reviews-gethotelid-${Date.now()}@example.com`
  let hotelId: string
  let reviewId: string

  beforeAll(async () => {
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
      VALUES ('TDD Reviewer GET', ${email}, '__TDD_AGENCY__', 'x', 'agent')
    `
    const { rows } = await sql`
      INSERT INTO tdg_hotels (name) VALUES (${`__TDD Ficha Hotel ${Date.now()}__`}) RETURNING id
    `
    hotelId = rows[0].id as string
    const { rows: reviewRows } = await sql`
      INSERT INTO tdg_hotel_reviews (hotel_name, hotel_id, entity_type, agent_name, agency_name, overall_rating, status)
      VALUES ('N/A', ${hotelId}, 'hotel', 'TDD', 'TDD', 4, 'published')
      RETURNING id
    `
    reviewId = reviewRows[0].id as string
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_hotel_reviews WHERE id = ${reviewId}`
    await sql`DELETE FROM tdg_users WHERE email = ${email}`
    await sql`DELETE FROM tdg_hotels WHERE id = ${hotelId}`
  })

  it('returns only reviews for that exact hotel_id', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await GET(getReq(`hotelId=${hotelId}`))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.reviews).toHaveLength(1)
    expect(body.reviews[0].id).toBe(reviewId)
  })
})
