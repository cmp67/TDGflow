/* Enriquecimento do card do fornecedor — banco. Proposta guardada em
   tdg_hotels.enrichment (jsonb) com status 'pending'; quem criou o card (ou
   admin) aprova campo a campo ou descarta. Nada entra no card sem revisão. */
import { sql } from '@vercel/postgres'
import { findPlace, readPlacesKey, type PlaceProposal } from '@/lib/places'

export type EnrichmentStatus = 'pending' | 'approved' | 'rejected' | 'not_found'
export const ENRICH_FIELDS = ['image_url', 'location', 'website_url', 'contact_phone', 'country'] as const
export type EnrichField = (typeof ENRICH_FIELDS)[number]

type Finder = (name: string, hint: string | null) => Promise<PlaceProposal | null>

export async function proposeEnrichment(hotelId: string, finder?: Finder): Promise<{ status: EnrichmentStatus; proposal: PlaceProposal | null } | null> {
  const { rows } = await sql`SELECT name, location, country, enrichment_status FROM tdg_hotels WHERE id = ${hotelId}`
  const h = rows[0]
  if (!h) return null
  const key = readPlacesKey()
  const find: Finder = finder ?? ((n, hint) => (key ? findPlace(n, hint, key) : Promise.resolve(null)))
  const hint = (h.location as string | null) || (h.country as string | null) || null
  const proposal = await find(h.name as string, hint)
  const status: EnrichmentStatus = proposal ? 'pending' : 'not_found'
  await sql`UPDATE tdg_hotels SET enrichment = ${proposal ? JSON.stringify(proposal) : null}, enrichment_status = ${status}, enriched_at = now(), enrichment_reviewed_by = NULL, google_place_id = COALESCE(${proposal?.place_id ?? null}, google_place_id) WHERE id = ${hotelId}`
  return { status, proposal }
}

/* Dispara sem bloquear quem chamou (card acabou de nascer). Erro vira log. */
export function proposeEnrichmentInBackground(hotelId: string): void {
  proposeEnrichment(hotelId).catch(err => console.warn('[enrichment] falhou', { hotelId: hotelId.slice(0, 8), error: err instanceof Error ? err.message : String(err) }))
}

export async function reviewEnrichment(hotelId: string, by: { email: string; isAdmin: boolean }, action: 'approve' | 'reject', fields: EnrichField[] = [...ENRICH_FIELDS]): Promise<{ ok: true } | { ok: false; status: 403 | 404 | 409; error: string }> {
  const { rows } = await sql`SELECT created_by, enrichment, enrichment_status FROM tdg_hotels WHERE id = ${hotelId}`
  const h = rows[0]
  if (!h) return { ok: false, status: 404, error: 'Fornecedor não encontrado' }
  const isCreator = h.created_by !== null && h.created_by === by.email
  if (!isCreator && !(h.created_by === null && by.isAdmin) && !by.isAdmin) return { ok: false, status: 403, error: 'Só quem criou o card (ou admin) revisa os dados encontrados' }
  if (h.enrichment_status !== 'pending' || !h.enrichment) return { ok: false, status: 409, error: 'Não há proposta pendente' }
  if (action === 'reject') {
    await sql`UPDATE tdg_hotels SET enrichment_status = 'rejected', enrichment_reviewed_by = ${by.email} WHERE id = ${hotelId}`
    return { ok: true }
  }
  const p = h.enrichment as PlaceProposal
  const want = new Set(fields.filter(f => (ENRICH_FIELDS as readonly string[]).includes(f)))
  await sql`
    UPDATE tdg_hotels SET
      image_url     = CASE WHEN ${want.has('image_url')} AND ${p.image_url ?? null}::text IS NOT NULL THEN ${p.image_url ?? null} ELSE image_url END,
      location      = CASE WHEN ${want.has('location')} AND ${p.address ?? null}::text IS NOT NULL THEN ${p.address ?? null} ELSE location END,
      website_url   = CASE WHEN ${want.has('website_url')} AND ${p.website ?? null}::text IS NOT NULL THEN ${p.website ?? null} ELSE website_url END,
      contact_phone = CASE WHEN ${want.has('contact_phone')} AND ${p.phone ?? null}::text IS NOT NULL THEN ${p.phone ?? null} ELSE contact_phone END,
      country       = CASE WHEN ${want.has('country')} AND ${p.country ?? null}::text IS NOT NULL AND country IS NULL THEN ${p.country ?? null} ELSE country END,
      enrichment_status = 'approved', enrichment_reviewed_by = ${by.email}
    WHERE id = ${hotelId}`
  return { ok: true }
}
