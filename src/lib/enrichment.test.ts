import { describe, it, expect, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'
import { proposeEnrichment, reviewEnrichment } from './enrichment'

const suffix = Date.now()
const ids: string[] = []
afterAll(async () => { if (ids.length) await sql`DELETE FROM tdg_hotels WHERE id = ANY(${ids})` })

describe('enriquecimento do fornecedor', () => {
  it('proposta pendente não toca no card; criadora aprova só os campos escolhidos; país só se vazio', async () => {
    const { rows } = await sql`INSERT INTO tdg_hotels (name, entity_type, created_by, country) VALUES (${`__TDD Enrich ${suffix}__`}, 'hotel', 'criadora@example.com', 'Suíça') RETURNING id`
    const id = rows[0].id as string; ids.push(id)
    const r = await proposeEnrichment(id, async () => ({ place_id: 'P', name: 'X', address: 'Via Serlas 27, St. Moritz, Switzerland', website: 'https://x.com', phone: '+41 1', image_url: 'https://lh3.googleusercontent.com/a', maps_url: null, country: 'Switzerland' }))
    expect(r?.status).toBe('pending')
    let h = (await sql`SELECT image_url, location, website_url, country, enrichment_status, google_place_id FROM tdg_hotels WHERE id = ${id}`).rows[0]
    expect(h).toMatchObject({ image_url: null, location: null, website_url: null, enrichment_status: 'pending', google_place_id: 'P' })
    expect(await reviewEnrichment(id, { email: 'outra@example.com', isAdmin: false }, 'approve')).toMatchObject({ ok: false, status: 403 })
    expect(await reviewEnrichment(id, { email: 'criadora@example.com', isAdmin: false }, 'approve', ['image_url', 'location', 'country'])).toEqual({ ok: true })
    h = (await sql`SELECT image_url, location, website_url, country, enrichment_status FROM tdg_hotels WHERE id = ${id}`).rows[0]
    expect(h).toMatchObject({ image_url: 'https://lh3.googleusercontent.com/a', location: 'Via Serlas 27, St. Moritz, Switzerland', website_url: null, country: 'Suíça', enrichment_status: 'approved' })
    expect(await reviewEnrichment(id, { email: 'criadora@example.com', isAdmin: false }, 'approve')).toMatchObject({ ok: false, status: 409 })
  })
  it('sem resultado → not_found; card sem criador: só admin revisa; descartar não muda nada', async () => {
    const { rows } = await sql`INSERT INTO tdg_hotels (name, entity_type) VALUES (${`__TDD Enrich NF ${suffix}__`}, 'dmc') RETURNING id`
    const id = rows[0].id as string; ids.push(id)
    expect((await proposeEnrichment(id, async () => null))?.status).toBe('not_found')
    await proposeEnrichment(id, async () => ({ place_id: 'Q', name: 'Y', address: null, website: 'https://y', phone: null, image_url: null, maps_url: null, country: null }))
    expect(await reviewEnrichment(id, { email: 'alguem@example.com', isAdmin: false }, 'reject')).toMatchObject({ ok: false, status: 403 })
    expect(await reviewEnrichment(id, { email: 'admin@example.com', isAdmin: true }, 'reject')).toEqual({ ok: true })
    expect((await sql`SELECT website_url, enrichment_status FROM tdg_hotels WHERE id = ${id}`).rows[0]).toEqual({ website_url: null, enrichment_status: 'rejected' })
  })
})
