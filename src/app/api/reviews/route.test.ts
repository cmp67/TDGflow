import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { POST, GET, PATCH } from './route'

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

  it('generaliza o find-or-create pra qualquer entity_type — catálogo é de fornecedores, não só hotel', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const beachClubName = `__TDD Beach Club ${Date.now()}__`
    createdHotelNames.push(beachClubName)
    const res = await POST(postReq({
      hotel_name: beachClubName,
      entity_type: 'beach_club',
      overall_rating: 2,
      raw_answers: { impressions: 'legal' },
    }))
    const body = await res.json()
    expect(res.status).toBe(200)
    createdReviewIds.push(body.review.id)
    expect(body.review.hotel_id).toBeTruthy()

    const { rows } = await sql`SELECT name, entity_type FROM tdg_hotels WHERE id = ${body.review.hotel_id}`
    expect(rows[0]?.name).toBe(beachClubName)
    expect(rows[0]?.entity_type).toBe('beach_club')
  })

  it('um hotel e um beach club podem coincidir de nome sem conflito (catálogo escopado por nome+tipo)', async () => {
    const sharedName = `__TDD Nome Compartilhado ${Date.now()}__`
    createdHotelNames.push(sharedName)

    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const hotelRes = await POST(postReq({
      hotel_name: sharedName, entity_type: 'hotel', overall_rating: 5, raw_answers: { impressions: 'ótimo' },
    }))
    const hotelBody = await hotelRes.json()
    createdReviewIds.push(hotelBody.review.id)

    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const beachRes = await POST(postReq({
      hotel_name: sharedName, entity_type: 'beach_club', overall_rating: 4, raw_answers: { impressions: 'bom' },
    }))
    const beachBody = await beachRes.json()
    createdReviewIds.push(beachBody.review.id)

    expect(hotelBody.review.hotel_id).not.toBe(beachBody.review.hotel_id)
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

  it('starts with view_count 0 and favorite_count 0', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await GET(getReq(`hotelId=${hotelId}`))
    const body = await res.json()

    expect(body.reviews[0].view_count).toBe(0)
    expect(body.reviews[0].favorite_count).toBe(0)
  })

  it('PATCH action=view soma 1 ao view_count, sem exigir agentId', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const patchReq = new Request('http://localhost/api/reviews', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_id: reviewId, action: 'view' }),
    }) as unknown as Parameters<typeof PATCH>[0]
    const res = await PATCH(patchReq)
    expect(res.status).toBe(200)

    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const getRes = await GET(getReq(`hotelId=${hotelId}`))
    const body = await getRes.json()
    expect(body.reviews[0].view_count).toBe(1)
  })

  it('favorite_count reflete quantos agentes distintos favoritaram, não só o usuário atual', async () => {
    const otherEmail = `tdd-reviews-fav2-${Date.now()}@example.com`
    await sql`INSERT INTO tdg_users (name, email, agency_name, password_hash, role) VALUES ('TDD Fav 2', ${otherEmail}, '__TDD_AGENCY__', 'x', 'agent')`

    mockAuth.mockResolvedValueOnce(sessionFor(email))
    await PATCH(new Request('http://localhost/api/reviews', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_id: reviewId, action: 'add' }),
    }) as unknown as Parameters<typeof PATCH>[0])

    mockAuth.mockResolvedValueOnce(sessionFor(otherEmail))
    await PATCH(new Request('http://localhost/api/reviews', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_id: reviewId, action: 'add' }),
    }) as unknown as Parameters<typeof PATCH>[0])

    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await GET(getReq(`hotelId=${hotelId}`))
    const body = await res.json()
    expect(body.reviews[0].favorite_count).toBe(2)

    await sql`DELETE FROM tdg_review_favorites WHERE review_id = ${reviewId}`
    await sql`DELETE FROM tdg_users WHERE email = ${otherEmail}`
  })
})

describe('POST /api/reviews — agency_id (migration 020) grava a FK real da agência do usuário', () => {
  const email = `tdd-reviews-agencyid-${Date.now()}@example.com`
  const agencyName = `__TDD Reviews Agency ${Date.now()}__`
  let agencyId: string
  const createdReviewIds: string[] = []

  beforeAll(async () => {
    const { rows: agencyRows } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES (${agencyName}, ${`__TDD_CNPJ_REV_${Date.now()}__`}) RETURNING id
    `
    agencyId = agencyRows[0].id as string
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, agency_id, password_hash, role)
      VALUES ('TDD Reviewer AgencyId', ${email}, ${agencyName}, ${agencyId}, 'x', 'agent')
    `
  })

  afterAll(async () => {
    if (createdReviewIds.length) await sql`DELETE FROM tdg_hotel_reviews WHERE id = ANY(${createdReviewIds})`
    await sql`DELETE FROM tdg_users WHERE email = ${email}`
    await sql`DELETE FROM tdg_agencies WHERE id = ${agencyId}`
  })

  it('grava agency_id junto com agency_name', async () => {
    // visit_type=commercial_meeting entra no caminho de lead (isLead), que
    // pula a extração por IA — evita chamada real ao Anthropic só porque
    // esse teste (diferente dos outros do arquivo) usa um agencyId real.
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await POST(postReq({
      hotel_name: `__TDD Hotel AgencyId ${Date.now()}__`,
      entity_type: 'hotel',
      visit_type: 'commercial_meeting',
      raw_answers: { why_it_matters: 'motivo de teste' },
    }))
    const body = await res.json()
    expect(res.status).toBe(200)
    createdReviewIds.push(body.review.id)
    expect(body.review.agency_id).toBe(agencyId)
  })
})
