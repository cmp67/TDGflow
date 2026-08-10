import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { matchesSearch } from '@/lib/normalize'
import { getOffers } from '@/lib/offers'

export const dynamic = 'force-dynamic'

const GROUP_LIMIT = 50

/* Super Busca global do TDG Flow (Fase 8 → 8d, decisão #9 do plano +
   pedido explícito da Carla, 02/08: "precisa existir no TDG Flow", acessível
   de qualquer tela, não só da TDG Knowledge Base). Cruza conhecimento de
   destino, hotéis, reviews, contatos e ofertas numa busca só, agrupados por
   tipo (nunca misturados numa lista).

   "Inteligência" (Fase 8d) — um dos objetivos centrais do produto é guiar
   a recomendação levando em conta oferta vigente prestes a expirar +
   experiência testada pela rede. Por isso o grupo Hotéis não é só uma
   lista — cada hotel já vem com quantas reviews confirmadas tem e se há
   oferta ativa (e em quantos dias expira), pra a resposta da busca já
   apontar pra recomendação certa sem precisar abrir mais nada.

   Mesmo padrão de fetch-all + filtro em JS (normalizeSearch) já usado em
   /api/knowledge-tips e OfertasList.tsx — os volumes somados ficam na casa
   dos milhares de linhas, e não há extensão `unaccent` no Postgres deste
   projeto pra fazer accent-folding em SQL puro. Cada grupo é capado em 50
   resultados (retorna o total real pra UI mostrar "+N mais"). */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search')?.trim()
  if (!search) {
    return NextResponse.json({
      knowledge: { items: [], total: 0 },
      hotels: { items: [], total: 0 },
      reviews: { items: [], total: 0 },
      contacts: { items: [], total: 0 },
      offers: { items: [], total: 0 },
    })
  }

  const [knowledgeRows, hotelRows, reviewRows, contactRows, offerRows] = await Promise.all([
    sql`
      SELECT id, title, content, country, tags, source_author, source_date::text AS source_date,
             import_approval
      FROM tdg_destination_knowledge
      ORDER BY source_date DESC NULLS LAST, created_at DESC
    `,
    sql`
      SELECT id, name, entity_type, country, location, image_url, website_url, tags
      FROM tdg_hotels
      ORDER BY name ASC
    `,
    sql`
      SELECT id, hotel_id, hotel_name, country, entity_type, client_profile, must_experience,
             heads_up, highlights, overall_rating, source_author,
             COALESCE(source_date, visit_date)::text AS source_date, import_approval
      FROM tdg_hotel_reviews
      WHERE status = 'published'
      ORDER BY COALESCE(source_date, visit_date) DESC NULLS LAST, created_at DESC
    `,
    sql`
      SELECT c.id, c.hotel_id, c.name, c.surname, c.title, c.organization, c.category,
             h.name AS hotel_name
      FROM tdg_hotel_contacts c
      LEFT JOIN tdg_hotels h ON h.id = c.hotel_id
      ORDER BY c.created_at DESC
    `,
    getOffers(),
  ])

  const knowledgeMatches = knowledgeRows.rows.filter(t =>
    matchesSearch([t.title, t.content, t.country, ...(t.tags ?? [])], search)
  )

  const hotelMatches = hotelRows.rows.filter(h =>
    matchesSearch([h.name, h.country, h.location, ...(h.tags ?? [])], search)
  )

  const reviewMatchesAll = reviewRows.rows.filter(r =>
    matchesSearch(
      [r.hotel_name, r.country, r.client_profile, r.must_experience, r.heads_up, ...(r.highlights ?? [])],
      search
    )
  )
  // Já vem ordenado por recência — dedupe mantendo a 1ª ocorrência por hotel
  // (mesmo padrão de DISTINCT ON (hotel_name) já usado em /api/reviews).
  const seenHotels = new Set<string>()
  const reviewMatches = reviewMatchesAll.filter(r => {
    const key = r.hotel_id ?? r.hotel_name
    if (seenHotels.has(key)) return false
    seenHotels.add(key)
    return true
  })

  const contactMatches = contactRows.rows.filter(c =>
    matchesSearch([c.name, c.surname, c.organization, c.hotel_name], search)
  )

  // Ofertas — não expiradas só (recomendar oferta vencida não ajuda
  // ninguém), ordenadas por quem expira primeiro (urgência primeiro).
  const now = Date.now()
  const offersWithExpiry = offerRows
    .map(o => ({
      ...o,
      days_until_expiry: o.valid_until
        ? Math.ceil((new Date(o.valid_until).getTime() - now) / 86_400_000)
        : null,
    }))
    .filter(o => o.days_until_expiry === null || o.days_until_expiry >= 0)

  const offerMatches = offersWithExpiry
    .filter(o => matchesSearch([o.hotel_name, o.offer_type, o.full_description], search))
    .sort((a, b) => (a.days_until_expiry ?? Infinity) - (b.days_until_expiry ?? Infinity))

  // Inteligência do grupo Hotéis — quantas reviews confirmadas + oferta
  // ativa mais próxima de expirar, pra guiar a recomendação direto na busca
  // (um dos objetivos centrais do produto, não só achar o registro).
  const testedCountByHotel = new Map<string, number>()
  for (const r of reviewRows.rows) {
    if (!r.hotel_id) continue
    testedCountByHotel.set(r.hotel_id, (testedCountByHotel.get(r.hotel_id) ?? 0) + 1)
  }
  const offersByHotel = new Map<string, { count: number; soonestDays: number | null }>()
  for (const o of offersWithExpiry) {
    if (!o.hotel_id) continue
    const cur = offersByHotel.get(o.hotel_id) ?? { count: 0, soonestDays: null }
    cur.count += 1
    if (o.days_until_expiry !== null && (cur.soonestDays === null || o.days_until_expiry < cur.soonestDays)) {
      cur.soonestDays = o.days_until_expiry
    }
    offersByHotel.set(o.hotel_id, cur)
  }

  return NextResponse.json({
    knowledge: { items: knowledgeMatches.slice(0, GROUP_LIMIT), total: knowledgeMatches.length },
    hotels: {
      items: hotelMatches.slice(0, GROUP_LIMIT).map(h => ({
        ...h,
        tested_count: testedCountByHotel.get(h.id) ?? 0,
        active_offers_count: offersByHotel.get(h.id)?.count ?? 0,
        soonest_offer_days: offersByHotel.get(h.id)?.soonestDays ?? null,
      })),
      total: hotelMatches.length,
    },
    reviews: { items: reviewMatches.slice(0, GROUP_LIMIT), total: reviewMatches.length },
    // Nunca devolver email/whatsapp/notes num endpoint de busca geral —
    // só o suficiente pra render do card; detalhe completo é clique-through.
    contacts: {
      items: contactMatches.slice(0, GROUP_LIMIT).map(c => ({
        id: c.id, hotel_id: c.hotel_id, name: c.name, surname: c.surname,
        title: c.title, organization: c.organization, category: c.category,
        hotel_name: c.hotel_name,
      })),
      total: contactMatches.length,
    },
    offers: {
      items: offerMatches.slice(0, GROUP_LIMIT).map(o => ({
        id: o.id, hotel_id: o.hotel_id, hotel_name: o.hotel_name, offer_type: o.offer_type,
        commission: o.commission, valid_until: o.valid_until, days_until_expiry: o.days_until_expiry,
      })),
      total: offerMatches.length,
    },
  })
}
