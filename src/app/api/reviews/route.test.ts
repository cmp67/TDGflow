import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { POST } from './route'

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
