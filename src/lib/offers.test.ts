import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { sql } from '@vercel/postgres'
import { getOffers } from './offers'

const originalFetch = global.fetch

function bemgsyResponse(offers: unknown[]) {
  return { ok: true, json: async () => offers } as Response
}

// @vercel/postgres (driver HTTP do Neon) também usa fetch por baixo — um
// mock cego de global.fetch quebrava as queries reais de setup/asserção
// junto com a chamada ao Bemgsy Central. Só intercepta a URL fake do
// Central; tudo mais (Neon) passa direto pro fetch de verdade.
function mockBemgsyFetch(offers: unknown[]) {
  global.fetch = vi.fn((url: string | URL | Request, opts?: RequestInit) => {
    const href = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
    if (href.includes('tdd-fake.supabase.co')) return Promise.resolve(bemgsyResponse(offers))
    return originalFetch(url, opts)
  }) as typeof fetch
}

describe('getOffers — combo entre propriedades sem hotel_id (achado da Carla, 27/08)', () => {
  // Nomes deliberadamente sem "Martinhal" — o catálogo real de produção
  // já tem "Martinhal Sagres" etc. curtos, e o matcher casa por substring;
  // fixture com esse nome colidiria com os hotéis de verdade e poluiria
  // a asserção (achado rodando o teste: bateu 8, não 4, por causa disso).
  const suffix = Date.now()
  const hotelNames = {
    sagres: `TddComboHotelZarco${suffix}`,
    quintaDoLago: `TddComboHotelFragata${suffix}`,
    chiado: `TddComboHotelCaravela${suffix}`,
    oriente: `TddComboHotelNau${suffix}`,
  }
  const hotelIds: Record<string, string> = {}

  beforeAll(async () => {
    process.env.BEMGSY_CENTRAL_SUPABASE_URL = 'https://tdd-fake.supabase.co'
    process.env.BEMGSY_CENTRAL_SUPABASE_ANON_KEY = 'tdd-fake-key'

    for (const [key, name] of Object.entries(hotelNames)) {
      const { rows } = await sql`
        INSERT INTO tdg_hotels (name, entity_type, country) VALUES (${name}, 'hotel', 'Portugal') RETURNING id
      `
      hotelIds[key] = rows[0].id as string
    }
  })

  afterAll(async () => {
    await sql.query('DELETE FROM tdg_hotels WHERE id = ANY($1)', [Object.values(hotelIds)])
  })

  afterEach(() => { global.fetch = originalFetch })

  it('expande oferta com hotel_id nulo em uma linha por hotel citado no texto', async () => {
    mockBemgsyFetch([
      {
        id: 'combo-1',
        hotel_id: null,
        title: 'Combo Algarve + Lisboa para o mercado brasileiro no Martinhal',
        description: `Reservas combinando ${hotelNames.sagres} ou ${hotelNames.quintaDoLago} com ${hotelNames.chiado} ou ${hotelNames.oriente} ganham comissão extra.`,
        commission_percentage: 15,
        valid_until: '2027-01-01',
        offer_type: 'seasonal',
        image_url: null,
        smart_tags: [],
        created_at: '2026-07-27',
      },
    ])

    const offers = await getOffers()
    const names = offers.map(o => o.hotel_name).sort()
    expect(names).toEqual(Object.values(hotelNames).sort())
    expect(offers.every(o => o.commission === 15)).toBe(true)
    // ids únicos por hotel — nenhuma review/favorito colide entre as 4 linhas
    expect(new Set(offers.map(o => o.id)).size).toBe(4)
  })

  it('sem nenhum hotel citado no texto: mantém o comportamento antigo (hotel_name = título da oferta)', async () => {
    mockBemgsyFetch([
      {
        id: 'combo-2',
        hotel_id: null,
        title: '__TDD Oferta Genérica Sem Hotel Citado__',
        description: 'Nenhum hotel real mencionado aqui.',
        commission_percentage: 8,
        valid_until: '2027-01-01',
        offer_type: 'seasonal',
        image_url: null,
        smart_tags: [],
        created_at: '2026-07-27',
      },
    ])

    const offers = await getOffers()
    expect(offers).toHaveLength(1)
    expect(offers[0].hotel_name).toBe('__TDD Oferta Genérica Sem Hotel Citado__')
    expect(offers[0].hotel_id).toBeNull()
  })

  it('oferta com hotel_id já preenchido continua exatamente como antes (1 linha, sem expandir)', async () => {
    mockBemgsyFetch([
      {
        id: 'single-1',
        hotel_id: hotelIds.chiado,
        title: 'Lisboa Card',
        description: 'Oferta exclusiva do Chiado.',
        commission_percentage: 10,
        valid_until: '2027-01-01',
        offer_type: 'seasonal',
        image_url: null,
        smart_tags: [],
        created_at: '2026-07-27',
      },
    ])

    const offers = await getOffers()
    expect(offers).toHaveLength(1)
    expect(offers[0].hotel_name).toBe(hotelNames.chiado)
    expect(offers[0].hotel_id).toBe(hotelIds.chiado)
  })
})
