import { describe, it, expect, vi } from 'vitest'
import { findPlace, countryFromAddress, readPlacesKey, resolvePhotoUrl } from './places'

const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200 })

describe('Google Places — proposta de enriquecimento', () => {
  it('sem chave → null; país = último pedaço do endereço', () => {
    expect(readPlacesKey({})).toBeNull(); expect(readPlacesKey({ GOOGLE_MAPS_API_KEY: ' k ' })).toBe('k')
    expect(countryFromAddress('Via Serlas 27, 7500 St. Moritz, Switzerland')).toBe('Switzerland')
    expect(countryFromAddress('Rua X')).toBeNull(); expect(countryFromAddress(null)).toBeNull()
  })
  it('find → details → foto resolvida por redirect, sem chave na URL guardada', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ status: 'OK', candidates: [{ place_id: 'P1', name: "Badrutt's Palace Hotel", formatted_address: 'Via Serlas 27, 7500 St. Moritz, Switzerland' }] }))
      .mockResolvedValueOnce(json({ result: { name: "Badrutt's Palace Hotel", formatted_address: 'Via Serlas 27, 7500 St. Moritz, Switzerland', website: 'https://badruttspalace.com', international_phone_number: '+41 81 837 1000', url: 'https://maps.google.com/?cid=1', photos: [{ photo_reference: 'REF' }] } }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://lh3.googleusercontent.com/abc' } }))
    const p = await findPlace("Badrutt's Palace Hotel", 'St. Moritz', 'KEY', fetchMock)
    expect(p).toEqual({ place_id: 'P1', name: "Badrutt's Palace Hotel", address: 'Via Serlas 27, 7500 St. Moritz, Switzerland', website: 'https://badruttspalace.com', phone: '+41 81 837 1000', image_url: 'https://lh3.googleusercontent.com/abc', maps_url: 'https://maps.google.com/?cid=1', country: 'Switzerland' })
    expect(fetchMock.mock.calls[0][0]).toContain(encodeURIComponent("Badrutt's Palace Hotel St. Moritz"))
    expect(p!.image_url).not.toContain('key=')
  })
  it('sem candidato → null; foto sem redirect → null, sem lançar', async () => {
    expect(await findPlace('x', null, 'K', vi.fn().mockResolvedValue(json({ status: 'ZERO_RESULTS', candidates: [] })))).toBeNull()
    expect(await resolvePhotoUrl('R', 'K', vi.fn().mockResolvedValue(new Response('<html>', { status: 400 })))).toBeNull()
  })
})
