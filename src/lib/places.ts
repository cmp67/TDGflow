/* Google Places (API clássica, mesma chave do Trip): acha o lugar pelo nome
   + pista de localização, pega endereço, site, telefone e UMA foto. A foto
   é resolvida pra URL pública (googleusercontent) na hora, pra não guardar
   photo_reference (o Trip aprendeu em 16/09 que elas expiram em lote) nem
   expor a chave numa URL. Sem chave: devolve null e ninguém quebra. */

const BASE = 'https://maps.googleapis.com/maps/api/place'
const TIMEOUT_MS = 8000

export type PlaceProposal = {
  place_id: string
  name: string
  address: string | null
  website: string | null
  phone: string | null
  image_url: string | null
  maps_url: string | null
  country: string | null
}

export function readPlacesKey(env: Record<string, string | undefined> = process.env): string | null {
  const k = (env.GOOGLE_MAPS_API_KEY ?? '').trim()
  return k || null
}

type Fetch = typeof fetch

async function getJson(url: string, fetchImpl: Fetch): Promise<Record<string, unknown>> {
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`Places ${res.status}`)
  return await res.json() as Record<string, unknown>
}

/* País a partir do endereço formatado: último pedaço depois da vírgula. */
export function countryFromAddress(address: string | null): string | null {
  if (!address) return null
  const parts = address.split(',').map(s => s.trim()).filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 1] : null
}

export async function resolvePhotoUrl(photoReference: string, key: string, fetchImpl: Fetch = fetch): Promise<string | null> {
  try {
    const res = await fetchImpl(`${BASE}/photo?photoreference=${encodeURIComponent(photoReference)}&maxwidth=1200&key=${key}`, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) })
    const loc = res.headers.get('location')
    if (loc && /^https:\/\//.test(loc)) return loc
    // alguns runtimes seguem o redirect sozinhos: a URL final serve igual
    if (res.ok && (res.headers.get('content-type') ?? '').startsWith('image/') && res.url && !res.url.includes('key=')) return res.url
    return null
  } catch { return null }
}

export async function findPlace(name: string, hint: string | null, key: string, fetchImpl: Fetch = fetch): Promise<PlaceProposal | null> {
  const input = [name, hint].filter(Boolean).join(' ')
  const find = await getJson(`${BASE}/findplacefromtext/json?input=${encodeURIComponent(input)}&inputtype=textquery&fields=place_id,name,formatted_address&language=pt-BR&key=${key}`, fetchImpl)
  const cand = (Array.isArray(find.candidates) ? find.candidates : [])[0] as Record<string, unknown> | undefined
  if (find.status !== 'OK' || !cand?.place_id) return null
  const details = await getJson(`${BASE}/details/json?place_id=${encodeURIComponent(String(cand.place_id))}&fields=name,formatted_address,website,international_phone_number,photos,url&language=pt-BR&key=${key}`, fetchImpl)
  const d = (details.result ?? {}) as Record<string, unknown>
  const photos = Array.isArray(d.photos) ? d.photos as Array<{ photo_reference?: string }> : []
  const image_url = photos[0]?.photo_reference ? await resolvePhotoUrl(photos[0].photo_reference, key, fetchImpl) : null
  const address = typeof d.formatted_address === 'string' ? d.formatted_address : (typeof cand.formatted_address === 'string' ? cand.formatted_address : null)
  return {
    place_id: String(cand.place_id),
    name: typeof d.name === 'string' ? d.name : String(cand.name ?? name),
    address,
    website: typeof d.website === 'string' ? d.website : null,
    phone: typeof d.international_phone_number === 'string' ? d.international_phone_number : null,
    image_url,
    maps_url: typeof d.url === 'string' ? d.url : null,
    country: countryFromAddress(address),
  }
}
