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

function patchReq(body: unknown) {
  return new Request('http://localhost/api/reviews', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PATCH>[0]
}

describe('PATCH /api/reviews action=edit — status needs_review (dica com dado incerto, achado 26/08)', () => {
  const suffix = Date.now()
  const email = `__tdd_needs_review_${suffix}__@example.com`
  const otherEmail = `__tdd_needs_review_other_${suffix}__@example.com`
  const correctedHotelName = `__TDD Corrected Hotel__${suffix}`
  const createdHotelNames = [correctedHotelName]
  const reviewIds: string[] = []

  beforeAll(async () => {
    await sql`ALTER TABLE tdg_hotel_reviews DROP CONSTRAINT IF EXISTS tdg_hotel_reviews_status_check`
    await sql`ALTER TABLE tdg_hotel_reviews ADD CONSTRAINT tdg_hotel_reviews_status_check CHECK (status = ANY (ARRAY['published', 'a_testar', 'needs_review']))`

    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
      VALUES ('TDD Needs Review', ${email}, '__TDD_AGENCY__', 'x', 'agent')
    `
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
      VALUES ('TDD Other', ${otherEmail}, '__TDD_AGENCY__', 'x', 'agent')
    `

    const { rows: userRows } = await sql`SELECT id FROM tdg_users WHERE email = ${email}`
    const agentId = userRows[0].id

    const { rows } = await sql`
      INSERT INTO tdg_hotel_reviews (hotel_name, agent_id, agent_name, agency_name, status, source, heads_up)
      VALUES (${`__TDD Uncertain Name__${suffix}`}, ${agentId}, 'TDD Needs Review', '__TDD_AGENCY__', 'needs_review', 'max_whatsapp', 'Texto original do TD')
      RETURNING id
    `
    reviewIds.push(rows[0].id)
  })

  afterAll(async () => {
    await sql.query('DELETE FROM tdg_hotel_reviews WHERE id = ANY($1)', [reviewIds])
    await sql`DELETE FROM tdg_users WHERE email IN (${email}, ${otherEmail})`
    await sql.query('DELETE FROM tdg_hotels WHERE name = ANY($1)', [createdHotelNames])
  })

  it('só o autor pode confirmar/editar — outro usuário toma 403', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(otherEmail))
    const res = await PATCH(patchReq({ review_id: reviewIds[0], action: 'edit', fields: { confirm: true } }))
    expect(res.status).toBe(403)
  })

  it('autor corrige o nome do hotel: publica, resolve hotel_id, cria fornecedor no catálogo', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await PATCH(patchReq({ review_id: reviewIds[0], action: 'edit', fields: { hotel_name: correctedHotelName } }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.review.status).toBe('published')
    expect(body.review.hotel_name).toBe(correctedHotelName)
    expect(body.review.hotel_id).toBeTruthy()

    const { rows: hotelRows } = await sql`SELECT id FROM tdg_hotels WHERE name = ${correctedHotelName}`
    expect(hotelRows.length).toBe(1)
  })
})

describe('PATCH /api/reviews action=edit — confirmar sem alterar o nome', () => {
  const suffix = Date.now() + 1
  const email = `__tdd_needs_review_confirm_${suffix}__@example.com`
  const existingHotelName = `__TDD Existing Hotel__${suffix}`
  const createdHotelNames = [existingHotelName]
  const reviewIds: string[] = []

  beforeAll(async () => {
    await sql`ALTER TABLE tdg_hotel_reviews DROP CONSTRAINT IF EXISTS tdg_hotel_reviews_status_check`
    await sql`ALTER TABLE tdg_hotel_reviews ADD CONSTRAINT tdg_hotel_reviews_status_check CHECK (status = ANY (ARRAY['published', 'a_testar', 'needs_review']))`

    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
      VALUES ('TDD Confirm', ${email}, '__TDD_AGENCY__', 'x', 'agent')
    `
    const { rows: userRows } = await sql`SELECT id FROM tdg_users WHERE email = ${email}`
    const agentId = userRows[0].id

    const { rows } = await sql`
      INSERT INTO tdg_hotel_reviews (hotel_name, agent_id, agent_name, agency_name, status, source)
      VALUES (${existingHotelName}, ${agentId}, 'TDD Confirm', '__TDD_AGENCY__', 'needs_review', 'max_whatsapp')
      RETURNING id
    `
    reviewIds.push(rows[0].id)
  })

  afterAll(async () => {
    await sql.query('DELETE FROM tdg_hotel_reviews WHERE id = ANY($1)', [reviewIds])
    await sql`DELETE FROM tdg_users WHERE email = ${email}`
    await sql.query('DELETE FROM tdg_hotels WHERE name = ANY($1)', [createdHotelNames])
  })

  it('confirm=true sem hotel_name: publica usando o nome já capturado', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await PATCH(patchReq({ review_id: reviewIds[0], action: 'edit', fields: { confirm: true } }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.review.status).toBe('published')
    expect(body.review.hotel_name).toBe(existingHotelName)
    expect(body.review.hotel_id).toBeTruthy()
  })
})
