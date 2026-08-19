import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'
import { GET } from './route'

const SECRET = (process.env.TDG_FLOW_API_SECRET ?? '').trim()

function req(qs: string, token = SECRET) {
  return new Request(`http://localhost/api/external/hotels${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }) as unknown as Parameters<typeof GET>[0]
}

describe('GET /api/external/hotels — consumo server-to-server (Gonna Travel GUEST)', () => {
  let agencyId: string
  let sharedHotelId: string
  let privateHotelId: string
  let otherAgencyId: string
  let otherPrivateHotelId: string

  beforeAll(async () => {
    const suffix = Date.now()
    const { rows: agencyRows } = await sql`
      INSERT INTO tdg_agencies (name, cnpj, is_test) VALUES (${'__TDD_EXTERNAL_AGENCY__' + suffix}, ${'00.' + suffix + '/0001-00'}, true) RETURNING id
    `
    agencyId = agencyRows[0].id as string

    const { rows: otherAgencyRows } = await sql`
      INSERT INTO tdg_agencies (name, cnpj, is_test) VALUES (${'__TDD_EXTERNAL_AGENCY_OTHER__' + suffix}, ${'00.' + suffix + '/0002-00'}, true) RETURNING id
    `
    otherAgencyId = otherAgencyRows[0].id as string

    const { rows: sharedRows } = await sql`
      INSERT INTO tdg_hotels (name, entity_type, region, country) VALUES ('__TDD External Shared__', 'hotel', '__TDD Region__', '__TDD Country__') RETURNING id
    `
    sharedHotelId = sharedRows[0].id as string

    const { rows: privateRows } = await sql`
      INSERT INTO tdg_hotels (name, entity_type, region, agency_id) VALUES ('__TDD External Private__', 'hotel', '__TDD Region__', ${agencyId}) RETURNING id
    `
    privateHotelId = privateRows[0].id as string

    const { rows: otherPrivateRows } = await sql`
      INSERT INTO tdg_hotels (name, entity_type, agency_id) VALUES ('__TDD External Private Other__', 'hotel', ${otherAgencyId}) RETURNING id
    `
    otherPrivateHotelId = otherPrivateRows[0].id as string
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_hotels WHERE id IN (${sharedHotelId}, ${privateHotelId}, ${otherPrivateHotelId})`
    await sql`DELETE FROM tdg_agencies WHERE id IN (${agencyId}, ${otherAgencyId})`
  })

  it('rejeita sem token', async () => {
    const res = await GET(req('', ''))
    expect(res.status).toBe(401)
  })

  it('rejeita token errado', async () => {
    const res = await GET(req('', 'token-errado'))
    expect(res.status).toBe(401)
  })

  it('sem agency_id: retorna só o catálogo compartilhado, nunca acervo privado de ninguém', async () => {
    const res = await GET(req('?destino=__TDD'))
    const body = await res.json()
    const ids = body.hotels.map((h: { id: string }) => h.id)
    expect(ids).toContain(sharedHotelId)
    expect(ids).not.toContain(privateHotelId)
    expect(ids).not.toContain(otherPrivateHotelId)
  })

  it('com agency_id: retorna compartilhado + acervo privado DESSA agência, não da outra', async () => {
    const res = await GET(req(`?destino=__TDD&agency_id=${agencyId}`))
    const body = await res.json()
    const ids = body.hotels.map((h: { id: string }) => h.id)
    expect(ids).toContain(sharedHotelId)
    expect(ids).toContain(privateHotelId)
    expect(ids).not.toContain(otherPrivateHotelId)
  })

  it('filtra por destino (region/country/location)', async () => {
    const res = await GET(req('?destino=__TDD Region__'))
    const body = await res.json()
    const ids = body.hotels.map((h: { id: string }) => h.id)
    expect(ids).toContain(sharedHotelId)
  })

  it('não retorna campos comerciais sensíveis (sem created_by/can_edit/benefits)', async () => {
    const res = await GET(req('?destino=__TDD'))
    const body = await res.json()
    const hotel = body.hotels.find((h: { id: string }) => h.id === sharedHotelId)
    expect(hotel).not.toHaveProperty('created_by')
    expect(hotel).not.toHaveProperty('can_edit')
    expect(hotel).not.toHaveProperty('benefits')
  })
})
