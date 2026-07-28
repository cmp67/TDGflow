import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

describe('GET /api/offers (ofertas reais do Bemgsy Central, nunca mock)', () => {
  let hotelId: string
  const hotelName = `__TDD Offer Hotel ${Date.now()}__`

  beforeAll(async () => {
    const { rows } = await sql`
      INSERT INTO tdg_hotels (name, location, image_url) VALUES (${hotelName}, 'Algarve, Portugal', 'https://example.com/photo.jpg')
      RETURNING id
    `
    hotelId = rows[0].id as string
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_hotels WHERE id = ${hotelId}`
  })

  it('returns 401 with no session', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('resolves hotel name/location/photo from the local catalog by hotel_id, and formats highlights from smart_tags', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('any@example.com'))
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          id: 'offer-1',
          hotel_id: hotelId,
          title: 'Oferta de teste',
          description: 'Descrição da oferta',
          commission_percentage: 15,
          valid_until: '2027-01-01T00:00:00+00:00',
          offer_type: 'seasonal',
          image_url: null,
          smart_tags: [
            { emoji: '🎁', label: 'Noites Grátis', category: 'benefit' },
            { emoji: '💰', label: 'Comissão 15%', category: 'financial' },
          ],
        },
      ]),
    } as Response)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.offers).toHaveLength(1)
    const offer = body.offers[0]
    expect(offer.hotel_name).toBe(hotelName)
    expect(offer.location).toBe('Algarve, Portugal')
    expect(offer.image_url).toBe('https://example.com/photo.jpg') // fallback pra foto do hotel quando a oferta não tem própria
    expect(offer.commission).toBe(15)
    expect(offer.highlights).toContain('🎁 Noites Grátis')
    expect(offer.highlights.join(' ')).not.toContain('Comissão 15%') // já aparece em destaque na foto, não repete

    fetchSpy.mockRestore()
  })

  it('sem hotel_id, usa o título da oferta como nome (ex: combo cross-hotel)', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('any@example.com'))
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          id: 'offer-combo',
          hotel_id: null,
          title: 'Combo Algarve + Lisboa',
          description: null,
          commission_percentage: 15,
          valid_until: '2027-01-01T00:00:00+00:00',
          offer_type: 'seasonal',
          image_url: null,
          smart_tags: [],
        },
      ]),
    } as Response)

    const res = await GET()
    const body = await res.json()
    expect(body.offers[0].hotel_name).toBe('Combo Algarve + Lisboa')

    fetchSpy.mockRestore()
  })

  it('rota externa fora do ar não quebra a resposta — devolve lista vazia', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('any@example.com'))
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: false } as Response)

    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.offers).toEqual([])

    fetchSpy.mockRestore()
  })
})
