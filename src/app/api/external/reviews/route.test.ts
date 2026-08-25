import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'
import { GET } from './route'

const SECRET = (process.env.TDG_FLOW_API_SECRET ?? '').trim()

function req(qs: string, token = SECRET) {
  return new Request(`http://localhost/api/external/reviews${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }) as unknown as Parameters<typeof GET>[0]
}

describe('GET /api/external/reviews — consumo server-to-server (Gonna Travel GUEST)', () => {
  const suffix = Date.now()
  const publishedHotel = `__TDD External Review Published__${suffix}`
  const pendingHotel = `__TDD External Review Pending__${suffix}`
  const unauthorizedPhotoHotel = `__TDD External Review NoPhotoAuth__${suffix}`
  const ids: string[] = []

  beforeAll(async () => {
    const { rows: publishedRows } = await sql`
      INSERT INTO tdg_hotel_reviews (hotel_name, agent_name, agency_name, status, overall_rating, highlights, photo_urls, media_usage_authorized)
      VALUES (${publishedHotel}, 'TDD Agent', 'TDD Agency', 'published', 5, ${JSON.stringify(['Vista incrível'])}, ${JSON.stringify(['https://example.com/foto.jpg'])}, true)
      RETURNING id
    `
    ids.push(publishedRows[0].id as string)

    const { rows: pendingRows } = await sql`
      INSERT INTO tdg_hotel_reviews (hotel_name, agent_name, agency_name, status, overall_rating)
      VALUES (${pendingHotel}, 'TDD Agent', 'TDD Agency', 'a_testar', 4)
      RETURNING id
    `
    ids.push(pendingRows[0].id as string)

    const { rows: noPhotoAuthRows } = await sql`
      INSERT INTO tdg_hotel_reviews (hotel_name, agent_name, agency_name, status, overall_rating, photo_urls, media_usage_authorized)
      VALUES (${unauthorizedPhotoHotel}, 'TDD Agent', 'TDD Agency', 'published', 5, ${JSON.stringify(['https://example.com/nao-autorizada.jpg'])}, false)
      RETURNING id
    `
    ids.push(noPhotoAuthRows[0].id as string)
  })

  afterAll(async () => {
    await sql.query('DELETE FROM tdg_hotel_reviews WHERE id = ANY($1)', [ids])
  })

  it('rejeita sem token', async () => {
    const res = await GET(req('', ''))
    expect(res.status).toBe(401)
  })

  it('rejeita token errado', async () => {
    const res = await GET(req('', 'token-errado'))
    expect(res.status).toBe(401)
  })

  it('só retorna reviews publicadas, nunca pendentes', async () => {
    const res = await GET(req('?hotel_name=__TDD External Review'))
    const body = await res.json()
    const names = body.reviews.map((r: { hotel_name: string }) => r.hotel_name)
    expect(names).toContain(publishedHotel)
    expect(names).not.toContain(pendingHotel)
  })

  it('inclui agent_name e agency_name (atribuição, decisão da Carla 25/08)', async () => {
    const res = await GET(req(`?hotel_name=${encodeURIComponent(publishedHotel)}`))
    const body = await res.json()
    const review = body.reviews.find((r: { hotel_name: string }) => r.hotel_name === publishedHotel)
    expect(review.agent_name).toBe('TDD Agent')
    expect(review.agency_name).toBe('TDD Agency')
  })

  it('nunca retorna foto sem media_usage_authorized, mesmo publicada', async () => {
    const res = await GET(req(`?hotel_name=${encodeURIComponent(unauthorizedPhotoHotel)}`))
    const body = await res.json()
    const review = body.reviews.find((r: { hotel_name: string }) => r.hotel_name === unauthorizedPhotoHotel)
    expect(review.photo_urls).toEqual([])
  })

  it('retorna foto quando media_usage_authorized é true', async () => {
    const res = await GET(req(`?hotel_name=${encodeURIComponent(publishedHotel)}`))
    const body = await res.json()
    const review = body.reviews.find((r: { hotel_name: string }) => r.hotel_name === publishedHotel)
    expect(review.photo_urls).toEqual(['https://example.com/foto.jpg'])
  })
})
