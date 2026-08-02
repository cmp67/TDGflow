import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { matchesSearch } from '@/lib/normalize'

export const dynamic = 'force-dynamic'

const GROUP_LIMIT = 50

/* Super Busca real da TDG Knowledge Base (Fase 8, decisão #9 do plano) —
   cruza conhecimento de destino, hotéis, reviews e contatos numa busca só,
   resultados agrupados por tipo de entidade (nunca misturados numa lista).

   Mesmo padrão de fetch-all + filtro em JS (normalizeSearch) já usado em
   /api/knowledge-tips e OfertasList.tsx — os 4 volumes somados ficam na
   casa dos milhares de linhas, e não há extensão `unaccent` no Postgres
   deste projeto pra fazer accent-folding em SQL puro. Cada grupo é capado
   em 50 resultados (retorna o total real pra UI mostrar "+N mais"). */
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
    })
  }

  const [knowledgeRows, hotelRows, reviewRows, contactRows] = await Promise.all([
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
             COALESCE(source_date, visit_date)::text AS recency_date, import_approval
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

  return NextResponse.json({
    knowledge: { items: knowledgeMatches.slice(0, GROUP_LIMIT), total: knowledgeMatches.length },
    hotels: { items: hotelMatches.slice(0, GROUP_LIMIT), total: hotelMatches.length },
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
  })
}
