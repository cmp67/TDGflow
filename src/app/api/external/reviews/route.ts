import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Rota server-to-server pro Gonna Travel GUEST consumir as dicas/avaliações
// reais da rede TDG (handoff 25/08 — recomendação de hotel embasada na
// prova social dos TDs, não só no catálogo). Mesmo padrão de bearer secret
// já usado em /api/external/hotels — nenhum segredo novo, reusa
// TDG_FLOW_API_SECRET já provisionado nos dois lados (Vercel + Fly.io).
// Também falha fechado (401) se a env var estiver ausente — mesma decisão
// de não repetir o comportamento aberto de AGENT_SECRET/MCP_SECRET aqui.
const EXTERNAL_SECRET = (process.env.TDG_FLOW_API_SECRET ?? '').trim()

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20

// Diferente de tdg_hotels, tdg_hotel_reviews não tem agency_id — dicas são
// sempre da rede toda, sem acervo privado por agência. Não existe aqui a
// lógica exclusiva-vs-união que o endpoint de hotéis precisou.
interface ExternalReviewRow {
  id: string
  hotel_name: string
  country: string | null
  agent_name: string
  agency_name: string
  visit_type: string | null
  visit_date: string | null
  overall_rating: number | null
  highlights: string[] | null
  client_profile: string | null
  must_experience: string | null
  heads_up: string | null
  photo_urls: string[] | null
  media_usage_authorized: boolean
}

export async function GET(req: NextRequest) {
  if (!EXTERNAL_SECRET) {
    return NextResponse.json({ error: 'Rota não configurada (TDG_FLOW_API_SECRET ausente)' }, { status: 401 })
  }
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (token !== EXTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const hotelName = searchParams.get('hotel_name')?.trim() || undefined
  const limitParam = Number(searchParams.get('limit'))
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_LIMIT) : DEFAULT_LIMIT

  let sqlQuery = `
    SELECT id, hotel_name, country, agent_name, agency_name, visit_type, visit_date,
           overall_rating, highlights, client_profile, must_experience, heads_up,
           photo_urls, media_usage_authorized
    FROM tdg_hotel_reviews
    WHERE status = 'published'
  `
  const params: unknown[] = []
  let i = 1

  if (hotelName) {
    sqlQuery += ` AND hotel_name ILIKE $${i++}`
    params.push(`%${hotelName}%`)
  }

  sqlQuery += ` ORDER BY visit_date DESC NULLS LAST LIMIT $${i++}`
  params.push(limit)

  const { rows } = await sql.query<ExternalReviewRow>(sqlQuery, params)

  // Foto sem autorização de uso não sai daqui — decisão da Carla, 25/08,
  // sem exceção pra consumidor externo, mesmo quando o resto da dica é
  // publicável.
  const reviews = rows.map(r => ({
    id: r.id,
    hotel_name: r.hotel_name,
    country: r.country,
    agent_name: r.agent_name,
    agency_name: r.agency_name,
    visit_type: r.visit_type,
    visit_date: r.visit_date,
    overall_rating: r.overall_rating,
    highlights: r.highlights,
    client_profile: r.client_profile,
    must_experience: r.must_experience,
    heads_up: r.heads_up,
    photo_urls: r.media_usage_authorized ? (r.photo_urls ?? []) : [],
  }))

  return NextResponse.json({ reviews, total: reviews.length })
}
