import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET, POST } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

// Fixtures próprios, descartáveis — evita depender de dado real da produção
// (achado 01/08: este arquivo dependia de um hotel "La Sivoliere" que
// existia só por acaso; a Carla pediu limpeza dos dados de teste/fake
// reviews na base real, o que quebrou o teste sem ter nada a ver com o
// código do endpoint em si).
function postReq(body: unknown) {
  return new Request('http://localhost/api/hotels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

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

describe('acervo privado por agência (migration 021)', () => {
  const suffix = Date.now()
  const agencyAName = `__TDD Hotels Agency A ${suffix}__`
  const agencyBName = `__TDD Hotels Agency B ${suffix}__`
  const emailA = `tdd-hotels-agencya-${suffix}@example.com`
  const emailB = `tdd-hotels-agencyb-${suffix}@example.com`
  const emailNoAgency = `tdd-hotels-noagency-${suffix}@example.com`
  let agencyAId: string
  let agencyBId: string
  const createdHotelIds: string[] = []

  beforeAll(async () => {
    const { rows: aRows } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES (${agencyAName}, ${`__TDD_CNPJ_HOTELS_A_${suffix}__`}) RETURNING id
    `
    agencyAId = aRows[0].id as string
    const { rows: bRows } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES (${agencyBName}, ${`__TDD_CNPJ_HOTELS_B_${suffix}__`}) RETURNING id
    `
    agencyBId = bRows[0].id as string

    await sql`
      INSERT INTO tdg_users (name, email, agency_name, agency_id, password_hash, role)
      VALUES ('TDD Hotels A', ${emailA}, ${agencyAName}, ${agencyAId}, 'x', 'agent')
    `
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, agency_id, password_hash, role)
      VALUES ('TDD Hotels B', ${emailB}, ${agencyBName}, ${agencyBId}, 'x', 'agent')
    `
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
      VALUES ('TDD Hotels No Agency', ${emailNoAgency}, '', 'x', 'agent')
    `
  })

  afterAll(async () => {
    if (createdHotelIds.length) await sql`DELETE FROM tdg_hotels WHERE id = ANY(${createdHotelIds})`
    await sql`DELETE FROM tdg_users WHERE email IN (${emailA}, ${emailB}, ${emailNoAgency})`
    await sql`DELETE FROM tdg_agencies WHERE id IN (${agencyAId}, ${agencyBId})`
  })

  it('POST sem agência atribuída retorna 400, não cria nada', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailNoAgency))
    const res = await POST(postReq({ name: `__TDD Hotel Sem Agencia ${suffix}__` }))
    expect(res.status).toBe(400)
  })

  it('POST cria hotel privado da agência do usuário logado', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const res = await POST(postReq({
      name: `__TDD Hotel Privado A ${suffix}__`,
      location: 'Local Teste',
      country: 'Brasil',
    }))
    const body = await res.json()
    expect(res.status).toBe(201)
    createdHotelIds.push(body.hotel.id)
    expect(body.hotel.agency_id).toBe(agencyAId)
  })

  it('hotel privado da agência A não aparece pra agência B nem pra quem não tem agência', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const createRes = await POST(postReq({ name: `__TDD Hotel Só A Ve ${suffix}__` }))
    const createBody = await createRes.json()
    createdHotelIds.push(createBody.hotel.id)

    mockAuth.mockResolvedValueOnce(sessionFor(emailB))
    const resB = await GET()
    const bodyB = await resB.json()
    expect(bodyB.hotels.find((h: { name: string }) => h.name === `__TDD Hotel Só A Ve ${suffix}__`)).toBeUndefined()

    mockAuth.mockResolvedValueOnce(sessionFor(emailNoAgency))
    const resNone = await GET()
    const bodyNone = await resNone.json()
    expect(bodyNone.hotels.find((h: { name: string }) => h.name === `__TDD Hotel Só A Ve ${suffix}__`)).toBeUndefined()

    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const resA = await GET()
    const bodyA = await resA.json()
    const found = bodyA.hotels.find((h: { name: string }) => h.name === `__TDD Hotel Só A Ve ${suffix}__`)
    expect(found).toBeTruthy()
    expect(found.is_private).toBe(true)
  })

  it('duas agências podem ter, cada uma, seu próprio hotel privado com o mesmo nome', async () => {
    const sharedName = `__TDD Hotel Nome Comum ${suffix}__`

    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const resA = await POST(postReq({ name: sharedName }))
    const bodyA = await resA.json()
    expect(resA.status).toBe(201)
    createdHotelIds.push(bodyA.hotel.id)

    mockAuth.mockResolvedValueOnce(sessionFor(emailB))
    const resB = await POST(postReq({ name: sharedName }))
    const bodyB = await resB.json()
    expect(resB.status).toBe(201)
    createdHotelIds.push(bodyB.hotel.id)

    expect(bodyA.hotel.id).not.toBe(bodyB.hotel.id)
  })

  it('POST chamado 2x pela mesma agência é idempotente (não duplica)', async () => {
    const name = `__TDD Hotel Idempotente ${suffix}__`

    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const res1 = await POST(postReq({ name }))
    const body1 = await res1.json()
    expect(res1.status).toBe(201)
    createdHotelIds.push(body1.hotel.id)

    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const res2 = await POST(postReq({ name }))
    const body2 = await res2.json()
    expect(res2.status).toBe(200)
    expect(body2.hotel.id).toBe(body1.hotel.id)
  })

  it('POST retorna 409 quando o nome já existe compartilhado com a rede', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const res = await POST(postReq({ name: 'Martinhal Sagres' }))
    expect(res.status).toBe(409)
  })

  it('POST rejeita tipo de fornecedor inválido', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const res = await POST(postReq({ name: `__TDD Hotel Tipo Invalido ${suffix}__`, entity_type: 'castelo' }))
    expect(res.status).toBe(400)
  })
})
